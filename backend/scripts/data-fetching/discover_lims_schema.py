"""
Discover LabGuru LIMS DB schema - run to see column names for Labno and Labrequest.
Usage: py -3.11 scripts/data-fetching/discover_lims_schema.py
Requires: LIMS_DB_SERVER, LIMS_DB_USER, LIMS_DB_PASSWORD, LIMS_DB_KRANIUM, LIMS_DB_LABGURU in .env
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

BASE = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE / '.env')

try:
    import pyodbc
except ImportError:
    print("Install pyodbc: pip install pyodbc")
    sys.exit(1)

server = os.getenv('LIMS_DB_SERVER')
user = os.getenv('LIMS_DB_USER')
pwd = os.getenv('LIMS_DB_PASSWORD')
kranium = os.getenv('LIMS_DB_KRANIUM', 'Kranium')
labguru = os.getenv('LIMS_DB_LABGURU', 'LabGuruV3')

if not all([server, user, pwd]):
    print("Set LIMS_DB_SERVER, LIMS_DB_USER, LIMS_DB_PASSWORD in .env")
    sys.exit(1)

conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};UID={user};PWD={pwd};TrustServerCertificate=yes;"
conn = pyodbc.connect(conn_str)
cur = conn.cursor()

for db, tbl in [(labguru, 'Labno'), (kranium, 'Labrequest')]:
    print(f"\n=== {db}.dbo.{tbl} ===")
    try:
        cur.execute(f"SELECT TOP 1 * FROM [{db}].dbo.[{tbl}]")
        cols = [c[0] for c in cur.description]
        print("Columns:", cols)
    except Exception as e:
        print(f"Error: {e}")

cur.close()
conn.close()
print("\nDone. Use these column names in LIMS_DB_DATE_COL or LIMS_DB_QUERY.")
