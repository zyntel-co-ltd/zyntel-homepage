"""
Discover schema for all LabGuruV3 analyzer tables.
Run: py -3.11 scripts/data-fetching/explore_all_analyzers.py
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

# All TestResults* and Results* tables
analyzers = ['C311', 'Bc5380', 'Bc6000', 'E411', 'Bs430', 'Bs600M', 'Xs1000', 'Zonci', 'MiniVIDAS', 'Manual']
for name in analyzers:
    tr_tbl = f'TestResults{name}'
    res_tbl = f'Results{name}'
    tc_tbl = f'TestCodes{name}'
    for tbl in [tr_tbl, res_tbl, tc_tbl]:
        try:
            cur.execute(f"SELECT COLUMN_NAME FROM [{labguru}].INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{tbl}'")
            cols = [r[0] for r in cur.fetchall()]
            cur.execute(f"SELECT COUNT(*) FROM [{labguru}].dbo.[{tbl}]")
            cnt = cur.fetchone()[0]
            print(f"{tbl}: {cols} (rows: {cnt})")
        except Exception as e:
            print(f"{tbl}: {e}")

cur.close()
conn.close()
print("\nDone.")
