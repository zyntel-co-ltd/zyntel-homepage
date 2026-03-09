"""
Explore LabGuruV3 - build UNION of all analyzer test counts.
Run: py -3.11 scripts/data-fetching/explore_labguru_schema.py
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
start, end = '2026-03-01', '2026-03-31'

# Bc5380: TestCodeId -> TestCodesBc5380.Id
cur.execute(f"""
    SELECT tc.OtherName, 'BC5380' as Analyzer, COUNT(*) as cnt
    FROM [{labguru}].dbo.TestResultsBc5380 tr
    INNER JOIN [{labguru}].dbo.ResultsBc5380 res ON tr.ResultId = res.Id
    INNER JOIN [{labguru}].dbo.Labno l ON CAST(res.LabNo AS varchar(50)) = CAST(l.LabNo AS varchar(50))
    INNER JOIN [{labguru}].dbo.TestCodesBc5380 tc ON tr.TestCodeId = tc.Id
    WHERE CAST(l.Datein AS date) >= ? AND CAST(l.Datein AS date) <= ?
    GROUP BY tc.OtherName
    ORDER BY cnt DESC
""", (start, end))
rows = cur.fetchall()
print(f"BC5380 tests (Mar 2026): {len(rows)} rows, sample:")
for r in rows[:8]:
    print(" ", r)

# E411
cur.execute(f"""
    SELECT tc.OtherName, 'E411' as Analyzer, COUNT(*) as cnt
    FROM [{labguru}].dbo.TestResultsE411 tr
    INNER JOIN [{labguru}].dbo.ResultsE411 res ON tr.ResultID = res.Id
    INNER JOIN [{labguru}].dbo.Labno l ON CAST(res.LabNo AS varchar(50)) = CAST(l.LabNo AS varchar(50))
    INNER JOIN [{labguru}].dbo.TestCodesE411 tc ON tr.TestCode = tc.TestCode
    WHERE CAST(l.Datein AS date) >= ? AND CAST(l.Datein AS date) <= ?
    GROUP BY tc.OtherName
    ORDER BY cnt DESC
""", (start, end))
rows = cur.fetchall()
print(f"\nE411 tests: {len(rows)} rows, sample:")
for r in rows[:8]:
    print(" ", r)

# E411 - check column names (ResultID vs ResultId)
cur.execute(f"SELECT COLUMN_NAME FROM [{labguru}].INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TestResultsE411'")
print(f"\nTestResultsE411 cols: {[r[0] for r in cur.fetchall()]}")
cur.execute(f"SELECT COUNT(*) FROM [{labguru}].dbo.ResultsE411 r INNER JOIN [{labguru}].dbo.Labno l ON CAST(r.LabNo AS varchar(50)) = CAST(l.LabNo AS varchar(50)) WHERE CAST(l.Datein AS date) >= '2026-01-01'")
print("ResultsE411 with Labno (2026+):", cur.fetchone()[0])

# Check Manual and Other
for tbl in ['TestResultsManual', 'TestResultsManualSub']:
    try:
        cur.execute(f"SELECT COLUMN_NAME FROM [{labguru}].INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{tbl}'")
        print(f"\n{tbl}: {[r[0] for r in cur.fetchall()]}")
    except Exception as e:
        print(f"{tbl}: {e}")

cur.close()
conn.close()
print("\nDone.")
