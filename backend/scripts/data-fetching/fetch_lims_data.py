import os
import sys
import re
import json
import logging
import time
from datetime import datetime, timedelta
import requests

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None
try:
    import pyodbc
except ImportError:
    pyodbc = None
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from pathlib import Path


# --- Base Paths ---
def get_application_base_dir():
    """Get the backend root directory"""
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    # This script is in backend/scripts/data-fetching/, go up 2 levels to backend/
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

APPLICATION_BASE_DIR = get_application_base_dir()
BACKEND_ROOT = Path(APPLICATION_BASE_DIR)
PROJECT_ROOT = BACKEND_ROOT.parent
PUBLIC_DIR = PROJECT_ROOT / 'frontend' / 'public'
LOGS_DIR = BACKEND_ROOT / 'logs'
DATA_JSON_PATH = PUBLIC_DIR / 'data.json'

os.makedirs(PUBLIC_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

# --- Load ENV ---
load_dotenv(os.path.join(APPLICATION_BASE_DIR, '.env'))
LIMS_URL = os.getenv('LIMS_URL', 'http://192.168.10.84:8080')
LOGIN_URL = f"{LIMS_URL}/index.php?m=login"
HOME_URL = f"{LIMS_URL}/home.php"
SEARCH_URL = f"{LIMS_URL}/search.php"

LIMS_USER = os.getenv('LIMS_USERNAME')
LIMS_PASSWORD = os.getenv('LIMS_PASSWORD')

# Direct LIMS DB (LabGuru SQL Server)
LIMS_FETCH_MODE = os.getenv('LIMS_FETCH_MODE', 'auto').lower()  # db | scrape | auto
LIMS_DB_SERVER = os.getenv('LIMS_DB_SERVER', '192.168.10.84\\MSSQL')
LIMS_DB_USER = os.getenv('LIMS_DB_USER', 'Analytics')
LIMS_DB_PASSWORD = os.getenv('LIMS_DB_PASSWORD', '')
LIMS_DB_KRANIUM = os.getenv('LIMS_DB_KRANIUM', 'Kranium')
LIMS_DB_LABGURU = os.getenv('LIMS_DB_LABGURU', 'LabGuruV3')

# File Paths
DATA_FILE = str(DATA_JSON_PATH)
LAST_RUN_FILE = os.path.join(APPLICATION_BASE_DIR, '.last_run')
COMPREHENSIVE_RUN_FILE = os.path.join(APPLICATION_BASE_DIR, '.last_comprehensive_run')
LOCK_FILE = os.path.join(APPLICATION_BASE_DIR, '.lims_fetch.lock')

# --- Logging ---
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))

file_handler = logging.FileHandler(LOGS_DIR / 'lims_fetcher_debug.log', mode='w', encoding='utf-8')
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))

logging.basicConfig(
    level=logging.DEBUG,
    handlers=[console_handler, file_handler]
)
logger = logging.getLogger('fetch_lims_data')


# --- Login ---
def lims_login(session: requests.Session) -> bool:
    logger.info("Attempting LIMS login...")
    if not LIMS_USER or not LIMS_PASSWORD:
        logger.error("LIMS credentials missing in .env")
        return False
    try:
        login_page_url = f"{LIMS_URL}/index.php?m="
        r1 = session.get(login_page_url)
        logger.debug(f"GET {login_page_url} Status: {r1.status_code}")

        pattern = r'<input\s+name=["\']rdm["\']\s+type=["\']hidden["\']\s+value=["\']([^"\']+)["\']\s*/?>'
        match = re.search(pattern, r1.text, re.IGNORECASE)
        if not match:
            logger.error("rdm token not found on login page")
            return False
        rdm_token = match.group(1)
        logger.debug(f"Found rdm token: {rdm_token}")

        login_post_url = f"{LIMS_URL}/auth.php"
        payload = {
            "username": LIMS_USER,
            "password": LIMS_PASSWORD,
            "action": "auth",
            "rdm": rdm_token,
        }
        headers = {
            "Referer": login_page_url,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        r2 = session.post(login_post_url, data=payload, headers=headers, allow_redirects=True)

        if r2.url.endswith("home.php"):
            logger.info("LIMS login successful.")
            return True
        else:
            logger.error("Login failed: Did not reach home.php after login")
            return False

    except Exception:
        logger.exception("Login sequence failed.")
        return False


# --- Database (for start date fallback) ---
def get_latest_encounter_date_from_db():
    """Query DB for max(encounter_date) from encounters. Returns None if unavailable."""
    if not psycopg2:
        return None
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        logger.warning("DATABASE_URL not set. Cannot query DB for latest encounter date.")
        return None
    try:
        conn = psycopg2.connect(db_url)
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT MAX(encounter_date)::date AS max_date FROM encounters")
            row = cur.fetchone()
            cur.close()
            if row and row['max_date']:
                return row['max_date']
        finally:
            conn.close()
    except Exception as e:
        logger.warning(f"Could not get latest encounter date from DB: {e}")
    return None


# --- Start Date Logic ---
def get_start_date() -> datetime.date:
    logger.info("Determining start date for data fetch...")

    need_comprehensive = should_run_comprehensive()

    if not need_comprehensive and os.path.exists(LAST_RUN_FILE):
        try:
            with open(LAST_RUN_FILE, 'r') as f:
                last_run_timestamp = f.read().strip()
            try:
                last_run_date = datetime.fromisoformat(last_run_timestamp).date()
            except ValueError:
                last_run_date = datetime.strptime(last_run_timestamp, '%Y-%m-%d %H:%M:%S.%f').date()
            logger.info(f"Incremental run: fetching from last run date {last_run_date}")
            return last_run_date
        except Exception as e:
            logger.warning(f"Failed reading {LAST_RUN_FILE}: {e}. Falling back to next source.")

    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                records = json.load(f)
            if records:
                latest_date = None
                for record in records:
                    try:
                        record_date = datetime.fromisoformat(record['EncounterDate']).date()
                        if latest_date is None or record_date > latest_date:
                            latest_date = record_date
                    except (KeyError, ValueError):
                        continue
                if latest_date:
                    logger.info(f"Latest date in existing records: {latest_date}. Fetching from {latest_date}.")
                    return latest_date
        except Exception as e:
            logger.warning(f"Failed reading {DATA_FILE}: {e}. Falling back to next source.")

    db_date = get_latest_encounter_date_from_db()
    if db_date:
        logger.info(f"Latest encounter date from DB: {db_date}. Fetching from {db_date}.")
        return db_date

    default_start = (datetime.now().date() - timedelta(days=1))
    logger.info(f"No .last_run, data.json, or DB data. Using fallback start date: {default_start} (yesterday)")
    return default_start


def should_run_comprehensive():
    """Check if we should run comprehensive search (once per day)"""
    if not os.path.exists(COMPREHENSIVE_RUN_FILE):
        return True
    try:
        with open(COMPREHENSIVE_RUN_FILE, 'r') as f:
            last_comprehensive = datetime.fromisoformat(f.read().strip()).date()
        return last_comprehensive < datetime.now().date()
    except:
        return True


def save_comprehensive_run_timestamp():
    try:
        with open(COMPREHENSIVE_RUN_FILE, 'w') as f:
            f.write(datetime.now().isoformat())
    except Exception as e:
        logger.error(f"Failed to save comprehensive run timestamp: {e}")


def save_last_run_timestamp(timestamp):
    try:
        with open(LAST_RUN_FILE, 'w') as f:
            f.write(timestamp.isoformat())
        logger.info("Updated last run timestamp.")
    except Exception as e:
        logger.error(f"Failed to save last run timestamp: {e}")


# --- Lock ---
def acquire_lock():
    if os.path.exists(LOCK_FILE):
        try:
            lock_age = time.time() - os.path.getmtime(LOCK_FILE)
            if lock_age > 7200:
                logger.warning(f"Found stale lock file ({lock_age/60:.1f} minutes old). Removing it.")
                os.remove(LOCK_FILE)
            else:
                logger.info("Another instance is already running. Exiting.")
                return False
        except Exception as e:
            logger.warning(f"Error checking lock file: {e}")
    try:
        with open(LOCK_FILE, 'w') as f:
            f.write(f"{os.getpid()}\n{datetime.now().isoformat()}")
        logger.debug("Lock acquired successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to acquire lock: {e}")
        return False


def release_lock():
    try:
        if os.path.exists(LOCK_FILE):
            os.remove(LOCK_FILE)
            logger.debug("Lock released")
    except Exception as e:
        logger.error(f"Failed to release lock: {e}")


# --- Parse Patient Table ---
def parse_patient_table(html_content, search_method=""):
    patients = []
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        table = soup.find('table', id='list')

        if not table:
            logger.warning(f"No patient table found using {search_method} search.")
            return patients

        rows = table.find_all('tr')[1:]
        logger.info(f"Found {len(rows)} patients using {search_method} search.")

        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 8:
                logger.warning(f"Skipping malformed patient row with {len(cells)} cells.")
                continue

            try:
                # Parse encounter date (from DD-MM-YYYY to YYYY-MM-DD)
                date_str = cells[0].text.strip()
                encounter_date = datetime.strptime(date_str, '%d-%m-%Y').date().isoformat()
            except ValueError:
                logger.warning(f"Skipping patient with bad date format: {cells[0].text.strip()}")
                continue

            patient = {
                "EncounterDate": encounter_date,
                "InvoiceNo": cells[3].text.strip(),
                "LabNo": cells[1].text.strip(),
                "Src": cells[7].text.strip(),
            }

            if all(patient.values()):
                patients.append(patient)

    except Exception as e:
        logger.exception(f"Error parsing patient table: {e}")

    return patients


# --- Search Methods ---
def search_by_date_range(session, start_date, end_date):
    logger.info(f"Searching by date range: {start_date} to {end_date}")
    search_params = {
        'searchtype': 'daterange',
        'datepicker': start_date.strftime('%Y-%m-%d'),
        'datepicker2': end_date.strftime('%Y-%m-%d'),
        'Get': 'Get'
    }
    try:
        r = session.get(SEARCH_URL, params=search_params, timeout=300)
        r.raise_for_status()
        return parse_patient_table(r.text, "daterange")
    except Exception as e:
        logger.error(f"Date range search failed: {e}")
        return []


def search_by_specific_date(session, date):
    logger.info(f"Searching by specific date: {date}")
    search_params = {
        'searchtype': 'date',
        'datepicker': date.strftime('%Y-%m-%d'),
        'Get': 'Get'
    }
    try:
        r = session.get(SEARCH_URL, params=search_params, timeout=300)
        r.raise_for_status()
        return parse_patient_table(r.text, "date")
    except Exception as e:
        logger.error(f"Specific date search failed for {date}: {e}")
        return []


def search_by_period(session, period):
    logger.info(f"Searching by period: {period}")
    search_params = {
        'searchtype': 'period',
        'criteria': period,
        'Get': 'Get'
    }
    try:
        r = session.get(SEARCH_URL, params=search_params, timeout=300)
        r.raise_for_status()
        return parse_patient_table(r.text, f"period_{period}")
    except Exception as e:
        logger.error(f"Period search failed for {period}: {e}")
        return []


# --- Date Range Generator ---
def date_range(start_date, end_date):
    for n in range(int((end_date - start_date).days) + 1):
        yield start_date + timedelta(n)


# --- Fetch Patient Details ---
def fetch_patient_details(session, patient):
    url = f"{LIMS_URL}/hoverrequest_b.php?iid={patient['InvoiceNo']}&encounterno={patient['LabNo']}"
    details = []
    try:
        r = session.get(url, timeout=30)
        if r.status_code != 200:
            logger.warning(f"Failed to fetch details for patient {patient['LabNo']}: HTTP {r.status_code}")
            return details

        soup = BeautifulSoup(r.text, 'html.parser')
        table = soup.find('table', class_='table-bordered')
        if not table:
            return details

        rows = table.find_all('tr')
        if len(rows) <= 1:
            return details

        for row in rows[1:]:
            cells = row.find_all('td')
            if len(cells) < 3:
                continue
            test_name = cells[2].text.strip()
            if test_name:
                details.append({"TestName": test_name})

    except Exception as e:
        logger.error(f"Error fetching details for {patient['LabNo']}: {e}")

    return details


# --- Validate Record ---
def validate_record_format(record):
    try:
        valid_record = {}
        for field in ["EncounterDate", "InvoiceNo", "LabNo", "Src", "TestName"]:
            if field in record and record[field]:
                valid_record[field] = record[field]
        return len(valid_record) == 5
    except Exception:
        return False


# --- Save Data ---
def save_data(new_records):
    if not new_records:
        logger.info("No new records to save.")
        return

    existing_data = []
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                existing_data = json.load(f)
            logger.info(f"Loaded {len(existing_data)} existing records.")
        except (json.JSONDecodeError, FileNotFoundError):
            logger.warning("Existing data.json is empty or corrupted. Starting fresh.")

    # Deduplicate by LabNo + TestName
    existing_keys = set()
    for r in existing_data:
        existing_keys.add((r.get('LabNo'), r.get('TestName')))

    added = 0
    for record in new_records:
        key = (record.get('LabNo'), record.get('TestName'))
        if key not in existing_keys:
            existing_data.append(record)
            existing_keys.add(key)
            added += 1

    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, indent=2, ensure_ascii=False)

    logger.info(f"Saved {added} new records. Total: {len(existing_data)}")


# --- Direct DB Fetch (LabGuru SQL Server) ---
def fetch_from_lims_db(start_date, end_date):
    """
    Fetch lab records directly from LabGuru SQL Server.
    Kranium.Labrequest = lab tests; LabGuruV3.Labno = Labnos, request dates.
    Returns list of dicts with EncounterDate, InvoiceNo, LabNo, Src, TestName.
    """
    if not pyodbc:
        logger.warning("pyodbc not installed. Run: pip install pyodbc")
        return None
    if not LIMS_DB_SERVER or not LIMS_DB_USER or not LIMS_DB_PASSWORD:
        logger.warning("LIMS_DB_SERVER, LIMS_DB_USER, LIMS_DB_PASSWORD required for DB fetch.")
        return None
    try:
        driver = os.getenv('LIMS_DB_DRIVER', 'ODBC Driver 17 for SQL Server')
        conn_str = (
            f"DRIVER={{{driver}}};"
            f"SERVER={LIMS_DB_SERVER};"
            f"UID={LIMS_DB_USER};"
            f"PWD={LIMS_DB_PASSWORD};"
            f"TrustServerCertificate=yes;"
        )
        conn = pyodbc.connect(conn_str)
        cur = conn.cursor()
        # Join Labno (LabNo, dates) with Labrequest (tests). Column names may vary.
        # Set LIMS_DB_QUERY in .env for custom SQL; use ? for start_date, ? for end_date.
        custom_query = os.getenv('LIMS_DB_QUERY')
        if custom_query:
            cur.execute(custom_query, (start_date, end_date))
        else:
            # Default: try common LabGuru column names (RequestDate, LabNo, InvoiceNo, Src, TestName)
            date_col = os.getenv('LIMS_DB_DATE_COL', 'RequestDate')
            sql = f"""
            SELECT
                CONVERT(varchar(10), l.[{date_col}], 120) AS EncounterDate,
                ISNULL(CAST(l.InvoiceNo AS varchar(50)), '') AS InvoiceNo,
                ISNULL(CAST(l.LabNo AS varchar(50)), '') AS LabNo,
                ISNULL(l.Src, 'N/A') AS Src,
                ISNULL(r.TestName, '') AS TestName
            FROM [{LIMS_DB_LABGURU}].dbo.Labno l
            INNER JOIN [{LIMS_DB_KRANIUM}].dbo.Labrequest r ON r.LabNo = l.LabNo
            WHERE l.[{date_col}] >= ? AND l.[{date_col}] <= ?
            """
            cur.execute(sql, (start_date, end_date))
        rows = cur.fetchall()
        columns = [c[0] for c in cur.description] if cur.description else []
        records = []
        for row in rows:
            d = dict(zip(columns, row))
            enc = d.get('EncounterDate') or d.get('RequestDate') or d.get('encounter_date')
            inv = d.get('InvoiceNo') or d.get('invoice_no') or ''
            lab = d.get('LabNo') or d.get('lab_no') or ''
            src = d.get('Src') or d.get('src') or 'N/A'
            test = d.get('TestName') or d.get('test_name') or ''
            if enc and lab and test:
                if hasattr(enc, 'strftime'):
                    enc = enc.strftime('%Y-%m-%d')
                records.append({
                    "EncounterDate": str(enc),
                    "InvoiceNo": str(inv),
                    "LabNo": str(lab),
                    "Src": str(src),
                    "TestName": str(test),
                })
        cur.close()
        conn.close()
        logger.info(f"DB fetch: {len(records)} records from {start_date} to {end_date}")
        return records
    except pyodbc.Error as e:
        logger.warning(f"LIMS DB fetch failed: {e}")
        return None
    except Exception as e:
        logger.warning(f"LIMS DB fetch error: {e}")
        return None


# --- Optimized Fetch (Scraping) ---
def fetch_lims_data_optimized(session, start_date, is_comprehensive=False):
    end_date = datetime.now().date()
    all_patients = {}

    logger.info(f"Starting {'COMPREHENSIVE' if is_comprehensive else 'OPTIMIZED'} data fetch from {start_date} to {end_date}")

    if is_comprehensive:
        days_to_fetch = (end_date - start_date).days + 1
        logger.info(f"=== COMPREHENSIVE MODE: Daily searches for all {days_to_fetch} days ===")

        for single_date in date_range(start_date, end_date):
            patients = search_by_specific_date(session, single_date)
            logger.info(f"Date {single_date}: Found {len(patients)} patients (Total unique so far: {len(all_patients)})")
            for patient in patients:
                all_patients[patient['LabNo']] = patient

        logger.info("Adding period search as backup for recent data...")
        for patient in search_by_period(session, 'Last 3 Days'):
            all_patients[patient['LabNo']] = patient

    else:
        logger.info("=== OPTIMIZED MODE: Fast incremental update ===")
        for patient in search_by_date_range(session, start_date, end_date):
            all_patients[patient['LabNo']] = patient

        if end_date >= start_date:
            for patient in search_by_specific_date(session, end_date):
                all_patients[patient['LabNo']] = patient

    logger.info(f"Total unique patients found: {len(all_patients)}")
    logger.info("Fetching test details for all patients...")

    final_records = []
    for idx, (lab_no, patient_data) in enumerate(all_patients.items(), 1):
        if idx % 20 == 0:
            logger.info(f"Processing details for patient {idx} of {len(all_patients)}...")
        for test in fetch_patient_details(session, patient_data):
            final_records.append({
                "EncounterDate": patient_data["EncounterDate"],
                "InvoiceNo": patient_data["InvoiceNo"],
                "LabNo": patient_data["LabNo"],
                "Src": patient_data["Src"],
                "TestName": test["TestName"]
            })

    logger.info(f"Fetched {len(final_records)} test records.")
    return final_records


# --- Main ---
def run():
    if not acquire_lock():
        return

    try:
        logger.info("Starting LIMS data fetch...")
        current_run_timestamp = datetime.now()
        start_date_for_fetch = get_start_date()
        end_date = datetime.now().date()
        need_comprehensive = should_run_comprehensive()
        is_first_run = not os.path.exists(LAST_RUN_FILE) and not os.path.exists(DATA_FILE)
        is_comprehensive = need_comprehensive or is_first_run

        new_records = None

        # Try direct DB first when mode is 'db' or 'auto'
        if LIMS_FETCH_MODE in ('db', 'auto'):
            logger.info(f"LIMS fetch mode: {LIMS_FETCH_MODE} (trying direct DB)")
            new_records = fetch_from_lims_db(start_date_for_fetch, end_date)
            if new_records is not None:
                logger.info("Using data from direct LIMS DB.")
            elif LIMS_FETCH_MODE == 'db':
                logger.error("DB fetch failed and mode=db. Exiting.")
                return

        # Fallback to scraping when mode is 'scrape' or when DB failed in 'auto'
        if new_records is None:
            logger.info("Using web scraping (LIMS_FETCH_MODE=scrape or DB fallback)")
            s = requests.Session()
            if not lims_login(s):
                logger.error("Failed to login to LIMS. Exiting.")
                return
            new_records = fetch_lims_data_optimized(s, start_date_for_fetch, is_comprehensive)

        try:

            if new_records:
                save_data(new_records)
            else:
                logger.info("No new records found.")
                # Ensure data.json exists for pipeline even when lab has no patients.
                # Pipeline expects data.json; if missing it exits early. Write [] so it can
                # read, see 0 records, and exit gracefully (DB stays as-is).
                if not os.path.exists(DATA_FILE):
                    with open(DATA_FILE, 'w', encoding='utf-8') as f:
                        json.dump([], f, indent=2, ensure_ascii=False)
                    logger.info("Wrote empty data.json so pipeline can complete (no intermediate file gap).")

            if is_comprehensive:
                save_comprehensive_run_timestamp()
                logger.info("Comprehensive run completed.")
            elif is_first_run:
                logger.info("First run completed successfully.")

        except Exception as e:
            logger.exception("Unexpected error during data fetch")
        finally:
            save_last_run_timestamp(current_run_timestamp)
            logger.info("LIMS fetch complete.")

    finally:
        release_lock()


if __name__ == '__main__':
    run()