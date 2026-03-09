"""
Explore LabGuruV3 tables to find where LabGuru computes test counts.
Run: py -3.11 scripts/data-fetching/explore_labguru_counts.py
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

# CountTestsDone, CountTestsReqd, CountRequested
for tbl in ['CountTestsDone', 'CountTestsReqd', 'CountRequested']:
    try:
        cur.execute(f"SELECT TOP 3 * FROM LabGuruV3.dbo.[{tbl}]")
        cols = [c[0] for c in cur.description]
        print(f"\n=== {tbl} ===")
        print("Columns:", cols)
        for row in cur.fetchall():
            print(" ", row)
        cur.execute(f"SELECT COUNT(*) FROM LabGuruV3.dbo.[{tbl}]")
        print("Total rows:", cur.fetchone()[0])
    except Exception as e:
        print(f"{tbl}: {e}")

# RequestedTestsStats
try:
    cur.execute("SELECT TOP 5 * FROM LabGuruV3.dbo.RequestedTestsStats")
    cols = [c[0] for c in cur.description]
    print(f"\n=== RequestedTestsStats ===")
    print("Columns:", cols)
    for row in cur.fetchall():
        print(" ", row)
except Exception as e:
    print(f"RequestedTestsStats: {e}")

# TestResults - structure
try:
    cur.execute("SELECT TOP 2 * FROM LabGuruV3.dbo.TestResults")
    cols = [c[0] for c in cur.description]
    print(f"\n=== TestResults (sample) ===")
    print("Columns:", cols[:15], "...")
except Exception as e:
    print(f"TestResults: {e}")

# Labrequest vs LabRequestsAll - same data?
try:
    cur.execute("SELECT COUNT(*) FROM Kranium.dbo.Labrequest WHERE CAST(request_date AS date) >= '2026-03-01'")
    k = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM LabGuruV3.dbo.LabRequestsAll")
    lg = cur.fetchone()[0]
    print(f"\n=== Row counts ===")
    print(f"Kranium.Labrequest (Mar 2026+): {k}")
    print(f"LabGuruV3.LabRequestsAll (all): {lg}")
except Exception as e:
    print(f"Count: {e}")

cur.close()
conn.close()
print("\nDone.")
