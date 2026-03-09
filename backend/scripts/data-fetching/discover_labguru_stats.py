"""
Discover how LabGuru statistics uses All* views.
Run: py -3.11 scripts/data-fetching/discover_labguru_stats.py
"""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE / '.env')

import pyodbc
conn = pyodbc.connect(
    f"DRIVER={{{os.getenv('LIMS_DB_DRIVER', 'SQL Server')}}};"
    f"SERVER={os.getenv('LIMS_DB_SERVER')};"
    f"UID={os.getenv('LIMS_DB_USER')};"
    f"PWD={os.getenv('LIMS_DB_PASSWORD')};"
    f"TrustServerCertificate=yes;"
)
cur = conn.cursor()
labguru = os.getenv('LIMS_DB_LABGURU', 'LabGuruV3')

# All* views - check TestCode, TestName, LabNo
views = ['AllBC5380results', 'AllBC6000results', 'AllC311Results', 'AllE411Results', 'AllManualResults', 'AllBs430Results', 'AllBS600MResults', 'AllZonciResults', 'AllMiniVIDASResults']
for v in views:
    try:
        cur.execute(f"SELECT COLUMN_NAME FROM [{labguru}].INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{v}'")
        cols = [r[0] for r in cur.fetchall()]
        has_testcode = 'TestCode' in cols or 'testcode' in [c.lower() for c in cols]
        has_testname = 'TestName' in cols or 'testname' in [c.lower() for c in cols]
        has_labno = 'LabNo' in cols or 'labno' in [c.lower() for c in cols]
        cur.execute(f"SELECT COUNT(*) FROM [{labguru}].dbo.[{v}]")
        cnt = cur.fetchone()[0]
        cur.execute(f"SELECT TOP 3 * FROM [{labguru}].dbo.[{v}]")
        sample = cur.fetchall()
        print(f"{v}: {cnt} rows, TestCode={has_testcode}, TestName={has_testname}, LabNo={has_labno}")
        if sample:
            print(f"  Sample cols:", [c[0] for c in cur.description if 'test' in c[0].lower() or 'lab' in c[0].lower() or 'name' in c[0].lower()])
            for r in sample[:1]:
                d = dict(zip([c[0] for c in cur.description], r))
                for k in ['TestCode', 'TestName', 'LabNo', 'testcode', 'testname', 'labno']:
                    if k in d and d.get(k):
                        print(f"    {k}: {d[k]}")
    except Exception as e:
        print(f"{v}: {e}")

# Query AllBC5380results - TestCode, TestName, count by LabNo date
print("\n=== AllBC5380results grouped by TestCode, TestName (Mar 2026) ===")
cur.execute(f"""
    SELECT TestCode, TestName, COUNT(*) as cnt
    FROM [{labguru}].dbo.AllBC5380results r
    INNER JOIN [{labguru}].dbo.Labno l ON CAST(r.LabNo AS varchar(50)) = CAST(l.LabNo AS varchar(50))
    WHERE CAST(l.Datein AS date) >= '2026-03-01' AND CAST(l.Datein AS date) <= '2026-03-31'
    GROUP BY TestCode, TestName
    ORDER BY cnt DESC
""")
for r in cur.fetchall()[:15]:
    print(" ", r)

# AllManualResults - structure
print("\n=== AllManualResults sample ===")
cur.execute(f"SELECT TOP 3 * FROM [{labguru}].dbo.AllManualResults")
cols = [c[0] for c in cur.description]
print("Columns:", cols)
for r in cur.fetchall():
    print(" ", r)

cur.close()
conn.close()
print("\nDone.")
