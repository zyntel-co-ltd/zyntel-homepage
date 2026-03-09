"""
Compare direct DB fetch vs scraper for data integrity.
Run: py -3.11 scripts/data-fetching/compare_lims_sources.py [date]
Date format: YYYY-MM-DD (default: yesterday)
"""
import os
import sys
import importlib.util
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv

BASE = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE / '.env')

# Load fetch_lims_data module
spec = importlib.util.spec_from_file_location(
    "fetch_lims_data",
    Path(__file__).parent / "fetch_lims_data.py"
)
fetch_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetch_mod)

def run_comparison(target_date=None):
    if target_date is None:
        target_date = (datetime.now() - timedelta(days=1)).date()
    else:
        target_date = datetime.strptime(target_date, '%Y-%m-%d').date()

    print(f"\n=== Comparing LIMS sources for {target_date} ===\n")

    # 1. Direct DB fetch
    print("1. Fetching from direct DB...")
    db_records = fetch_mod.fetch_from_lims_db(target_date, target_date)
    if db_records is None:
        print("   DB fetch failed. Skipping comparison.")
        return
    db_set = {(r['LabNo'], r['TestName']) for r in db_records}
    db_by_test = {}
    for r in db_records:
        t = r['TestName']
        db_by_test[t] = db_by_test.get(t, 0) + 1
    print(f"   DB: {len(db_records)} records, {len(db_set)} unique LabNo+TestName")

    # 2. Scraper fetch (requires login)
    print("\n2. Fetching from scraper...")
    LIMS_USER = os.getenv('LIMS_USERNAME')
    LIMS_PASSWORD = os.getenv('LIMS_PASSWORD')
    if not LIMS_USER or not LIMS_PASSWORD:
        print("   Scraper skipped: LIMS_USERNAME/LIMS_PASSWORD not set")
        scrape_records = []
    else:
        import requests
        s = requests.Session()
        # Ensure fetch_mod has requests in scope for lims_login
        if not fetch_mod.lims_login(s):
            print("   Scraper login failed.")
            scrape_records = []
        else:
            scrape_records = fetch_mod.fetch_lims_data_optimized(s, target_date, is_comprehensive=False)
    scrape_set = {(r['LabNo'], r['TestName']) for r in scrape_records}
    scrape_by_test = {}
    for r in scrape_records:
        t = r['TestName']
        scrape_by_test[t] = scrape_by_test.get(t, 0) + 1
    print(f"   Scraper: {len(scrape_records)} records, {len(scrape_set)} unique LabNo+TestName")

    # 3. Compare
    print("\n3. Comparison:")
    only_db = db_set - scrape_set
    only_scrape = scrape_set - db_set
    both = db_set & scrape_set
    print(f"   In both: {len(both)}")
    print(f"   Only in DB: {len(only_db)}")
    print(f"   Only in Scraper: {len(only_scrape)}")

    if only_db and len(only_db) <= 20:
        print("\n   Sample only-in-DB:", list(only_db)[:5])
    if only_scrape and len(only_scrape) <= 20:
        print("\n   Sample only-in-Scraper:", list(only_scrape)[:5])

    # Test name overlap
    db_tests = set(db_by_test.keys())
    scrape_tests = set(scrape_by_test.keys())
    only_db_tests = db_tests - scrape_tests
    only_scrape_tests = scrape_tests - db_tests
    print(f"\n   Test names in both: {len(db_tests & scrape_tests)}")
    print(f"   Test names only in DB: {len(only_db_tests)}")
    print(f"   Test names only in Scraper: {len(only_scrape_tests)}")
    if only_db_tests:
        print(f"   Sample DB-only tests: {list(only_db_tests)[:5]}")
    if only_scrape_tests:
        print(f"   Sample Scraper-only tests: {list(only_scrape_tests)[:5]}")

    print("\nDone.")


if __name__ == '__main__':
    run_comparison(sys.argv[1] if len(sys.argv) > 1 else None)
