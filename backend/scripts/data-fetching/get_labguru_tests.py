"""
Get LabGuru test list - same counting as LabGuru statistics.php / ajax_stats_done_2.php.
Uses All* views (AllBC5380results, AllBC6000results, AllC311Results, etc.) which have
the correct TestCode, TestName grouping (e.g. CBC 5 not individual WBC/HGB).
Manual tests use TestName from TestList mapping (e.g. NLAB0741 -> Malaria Blood Slide*).

Usage: py -3.11 get_labguru_tests.py START_DATE END_DATE
Output: JSON with tests: [{ test, count }]
"""
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

BASE = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE / '.env')


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: get_labguru_tests.py START_DATE END_DATE"}))
        sys.exit(1)
    start_date = sys.argv[1]
    end_date = sys.argv[2]

    try:
        import pyodbc
    except ImportError:
        print(json.dumps({"error": "pyodbc not installed"}))
        sys.exit(1)

    server = os.getenv('LIMS_DB_SERVER')
    user = os.getenv('LIMS_DB_USER')
    pwd = os.getenv('LIMS_DB_PASSWORD')
    labguru = os.getenv('LIMS_DB_LABGURU', 'LabGuruV3')
    driver = os.getenv('LIMS_DB_DRIVER', 'SQL Server')

    if not all([server, user, pwd]):
        print(json.dumps({"error": "LIMS_DB_* not configured"}))
        sys.exit(1)

    try:
        conn = pyodbc.connect(
            f"DRIVER={{{driver}}};SERVER={server};UID={user};PWD={pwd};TrustServerCertificate=yes;"
        )
        cur = conn.cursor()

        # Use All* views - same source as LabGuru ajax_stats_done_2.php
        # These views already have TestCode, TestName (panel-level, e.g. CBC 5 not WBC/HGB)
        views = [
            'AllBC5380results',   # BC5390
            'AllBC6000results',   # BC-760
            'AllC311Results',     # C311
            'AllE411Results',     # E411
            'AllManualResults',   # MANUAL
            'AllBs430Results',    # Bs430
            'AllBS600MResults',   # Bs600M
            'AllXS1000Results',   # XS1000
            'AllZonciResults',    # Zonci
            'AllMiniVIDASResults', # MiniVIDAS
        ]

        # Count distinct (LabNo, TestCode) per TestName - one per test per request, same as LabGuru
        all_rows = []
        for view in views:
            try:
                cur.execute(f"""
                    SELECT ISNULL(x.TestName, '') as TestName, COUNT(*) as cnt
                    FROM (
                        SELECT DISTINCT r.LabNo, r.TestCode, r.TestName
                        FROM [{labguru}].dbo.[{view}] r
                        INNER JOIN [{labguru}].dbo.Labno l ON CAST(r.LabNo AS varchar(50)) = CAST(l.LabNo AS varchar(50))
                        WHERE l.Datein IS NOT NULL
                          AND CAST(l.Datein AS date) >= ? AND CAST(l.Datein AS date) <= ?
                    ) x
                    GROUP BY ISNULL(x.TestName, '')
                """, (start_date, end_date))
                all_rows.extend(cur.fetchall())
            except pyodbc.Error:
                pass

        # Aggregate by test name (sum across analyzers)
        from collections import defaultdict
        agg = defaultdict(int)
        for row in all_rows:
            name = (row[0] or '').strip()
            if name:
                agg[name] += int(row[1])

        tests = [{"test": k, "count": v} for k, v in sorted(agg.items(), key=lambda x: -x[1])]

        cur.close()
        conn.close()

        out = {"tests": tests, "startDate": start_date, "endDate": end_date}
        print(json.dumps(out))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
