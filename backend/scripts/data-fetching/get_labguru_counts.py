"""
Get LabGuru test count using direct DB access (same source as LabGuru's statistics).
Uses LabGuruV3.CountTestsDone joined with Labno for date filter - matches ajax_stats_done_2.php.
Falls back to Kranium.Labrequest if CountTestsDone has no data for period.

Usage: py -3.11 get_labguru_counts.py START_DATE END_DATE
Example: py -3.11 get_labguru_counts.py 2026-03-01 2026-03-31
"""
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

BASE = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE / '.env')


def fetch_from_db(start_date, end_date):
    """
    Use LabGuruV3.CountTestsDone (matches LabGuru's TESTS DONE stats).
    CountTestsDone: LabNo, bc5380tests, xs1000tests, c311tests, e411tests, manualtests, othertests, Total
    Join with Labno for date filter (Datein or similar).
    """
    try:
        import pyodbc
    except ImportError:
        return None, None

    server = os.getenv('LIMS_DB_SERVER')
    user = os.getenv('LIMS_DB_USER')
    pwd = os.getenv('LIMS_DB_PASSWORD')
    labguru = os.getenv('LIMS_DB_LABGURU', 'LabGuruV3')
    kranium = os.getenv('LIMS_DB_KRANIUM', 'Kranium')
    driver = os.getenv('LIMS_DB_DRIVER', 'SQL Server')

    if not all([server, user, pwd]):
        return None, None

    try:
        conn = pyodbc.connect(
            f"DRIVER={{{driver}}};SERVER={server};UID={user};PWD={pwd};TrustServerCertificate=yes;"
        )
        cur = conn.cursor()

        # Try CountTestsDone first (matches LabGuru statistics.php / ajax_stats_done_2.php)
        # Join with Labno - need date column. Labno may have Datein or we join via Labrequest
        date_col = 'Datein'  # Labno date column
        try:
            cur.execute(f"""
                SELECT SUM(c.Total) as total
                FROM [{labguru}].dbo.CountTestsDone c
                INNER JOIN [{labguru}].dbo.Labno l ON CAST(c.LabNo AS varchar(50)) = CAST(l.LabNo AS varchar(50))
                WHERE CAST(l.[{date_col}] AS date) >= ? AND CAST(l.[{date_col}] AS date) <= ?
            """, (start_date, end_date))
            row = cur.fetchone()
            total = row[0] if row and row[0] is not None else None
        except pyodbc.Error:
            total = None

        # Fallback: Kranium.Labrequest (request-level count)
        if total is None:
            cur.execute(f"""
                SELECT COUNT(*) FROM [{kranium}].dbo.Labrequest r
                INNER JOIN [{labguru}].dbo.Labno l ON CAST(r.invoiceno AS varchar(50)) = CAST(l.InvoiceNo AS varchar(50))
                WHERE CAST(r.request_date AS date) >= ? AND CAST(r.request_date AS date) <= ?
            """, (start_date, end_date))
            total = cur.fetchone()[0]

        # Daily breakdown - use same source as total
        daily = []
        try:
            cur.execute(f"""
                SELECT CONVERT(varchar(10), l.[{date_col}], 120) as dt, SUM(c.Total) as cnt
                FROM [{labguru}].dbo.CountTestsDone c
                INNER JOIN [{labguru}].dbo.Labno l ON CAST(c.LabNo AS varchar(50)) = CAST(l.LabNo AS varchar(50))
                WHERE CAST(l.[{date_col}] AS date) >= ? AND CAST(l.[{date_col}] AS date) <= ?
                GROUP BY CONVERT(varchar(10), l.[{date_col}], 120)
                ORDER BY dt
            """, (start_date, end_date))
            daily = [{"date": row[0], "count": int(row[1] or 0)} for row in cur.fetchall()]
        except pyodbc.Error:
            # Fallback daily from Labrequest
            cur.execute(f"""
                SELECT CONVERT(varchar(10), r.request_date, 120) as dt, COUNT(*) as cnt
                FROM [{kranium}].dbo.Labrequest r
                INNER JOIN [{labguru}].dbo.Labno l ON CAST(r.invoiceno AS varchar(50)) = CAST(l.InvoiceNo AS varchar(50))
                WHERE CAST(r.request_date AS date) >= ? AND CAST(r.request_date AS date) <= ?
                GROUP BY CONVERT(varchar(10), r.request_date, 120)
                ORDER BY dt
            """, (start_date, end_date))
            daily = [{"date": row[0], "count": row[1]} for row in cur.fetchall()]

        cur.close()
        conn.close()
        return int(total) if total is not None else None, daily
    except Exception:
        return None, None


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: get_labguru_counts.py START_DATE END_DATE"}))
        sys.exit(1)
    start_date = sys.argv[1]
    end_date = sys.argv[2]

    total, daily = fetch_from_db(start_date, end_date)

    if total is None:
        print(json.dumps({"error": "LabGuru count unavailable"}))
        sys.exit(1)

    out = {"labguruCount": total, "daily": daily or [], "startDate": start_date, "endDate": end_date}
    print(json.dumps(out))


if __name__ == '__main__':
    main()
