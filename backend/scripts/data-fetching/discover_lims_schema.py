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

# Try drivers in order (ODBC 17/18 may need install: https://docs.microsoft.com/sql/connect/odbc/download-odbc-driver-for-sql-server)
drivers = [
    "ODBC Driver 17 for SQL Server",
    "ODBC Driver 18 for SQL Server",
    "ODBC Driver 11 for SQL Server",
    "SQL Server",
]
conn = None
for driver in drivers:
    try:
        conn_str = f"DRIVER={{{driver}}};SERVER={server};UID={user};PWD={pwd};TrustServerCertificate=yes;"
        conn = pyodbc.connect(conn_str)
        print(f"Connected using: {driver}")
        break
    except pyodbc.Error as e:
        if "Data source name not found" in str(e) or "IM002" in str(e):
            continue
        raise
if conn is None:
    print("No SQL Server ODBC driver found. Install: https://docs.microsoft.com/sql/connect/odbc/download-odbc-driver-for-sql-server")
    sys.exit(1)
cur = conn.cursor()

for db, tbl in [(labguru, 'Labno'), (kranium, 'Labrequest')]:
    print(f"\n=== {db}.dbo.{tbl} ===")
    try:
        cur.execute(f"SELECT TOP 1 * FROM [{db}].dbo.[{tbl}]")
        cols = [c[0] for c in cur.description]
        print("Columns:", cols)
        row = cur.fetchone()
        if row:
            d = dict(zip(cols, row))
            if 'Datein' in d:
                print("  Datein sample:", d['Datein'])
            if 'request_date' in d:
                print("  request_date sample:", d['request_date'])
    except Exception as e:
        print(f"Error: {e}")

# Quick count by year
print("\n=== Sample counts ===")
for yr in ['2024', '2025', '2026']:
    try:
        cur.execute(f"SELECT COUNT(*) FROM [{kranium}].dbo.Labrequest WHERE request_date >= '{yr}-03-01' AND request_date < '{yr}-04-01'")
        print(f"Labrequest {yr}-03:", cur.fetchone()[0])
    except Exception as e:
        print(f"Count {yr} error:", e)

# Join: Labno.InvoiceNo = Labrequest.invoiceno
print("\n=== Join (Labno.InvoiceNo = Labrequest.invoiceno) ===")
try:
    cur.execute(f"""
        SELECT COUNT(*) FROM [{labguru}].dbo.Labno l
        INNER JOIN [{kranium}].dbo.Labrequest r ON CAST(r.invoiceno AS varchar(50)) = CAST(l.InvoiceNo AS varchar(50))
        WHERE CAST(r.request_date AS date) >= '2026-03-01'
    """)
    print("Joined rows since 2026-03-01:", cur.fetchone()[0])
except Exception as e:
    print("Error:", e)

# List Kranium and LabGuruV3 tables (for results/analytes discovery)
print("\n=== Kranium tables ===")
try:
    cur.execute(f"SELECT TABLE_NAME FROM [{kranium}].INFORMATION_SCHEMA.TABLES ORDER BY TABLE_NAME")
    for r in cur.fetchall():
        print(" ", r[0])
except Exception as e:
    print("Error:", e)
print("\n=== LabGuruV3 tables ===")
try:
    cur.execute("SELECT TABLE_NAME FROM [LabGuruV3].INFORMATION_SCHEMA.TABLES ORDER BY TABLE_NAME")
    for r in cur.fetchall():
        print(" ", r[0])
except Exception as e:
    print("Error:", e)

cur.close()
conn.close()
print("\nDone. Use these column names in LIMS_DB_DATE_COL or LIMS_DB_QUERY.")
