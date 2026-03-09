"""
Analyze LabGuru test names vs Kranium/meta test names.
Produces side-by-side comparison for mapping/cleaning.

LabGuru counts = resulted tests (when machine hosts via API, user must know exact LabGuru name)
Kranium/meta = canonical tests with prices (what we use for revenue, targets)

Run: py -3.11 scripts/data-fetching/analyze_test_names.py [--days 90] [--output report.csv]
"""
import os
import sys
import csv
from datetime import datetime, timedelta
from pathlib import Path
from collections import Counter
from dotenv import load_dotenv

BASE = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE / '.env')

try:
    import pyodbc
except ImportError:
    print("Install pyodbc: pip install pyodbc")
    sys.exit(1)


def get_labguru_tests(days=90):
    """Get all unique test names from Labrequest (LabGuru) with counts."""
    server = os.getenv('LIMS_DB_SERVER')
    user = os.getenv('LIMS_DB_USER')
    pwd = os.getenv('LIMS_DB_PASSWORD')
    kranium = os.getenv('LIMS_DB_KRANIUM', 'Kranium')
    driver = os.getenv('LIMS_DB_DRIVER', 'SQL Server')
    if not all([server, user, pwd]):
        print("Set LIMS_DB_* in .env")
        return {}
    conn_str = f"DRIVER={{{driver}}};SERVER={server};UID={user};PWD={pwd};TrustServerCertificate=yes;"
    conn = pyodbc.connect(conn_str)
    cur = conn.cursor()
    since = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    cur.execute(f"""
        SELECT testname, COUNT(*) as cnt
        FROM [{kranium}].dbo.Labrequest
        WHERE CAST(request_date AS date) >= '{since}'
        GROUP BY testname
        ORDER BY cnt DESC
    """)
    result = {row[0].strip(): row[1] for row in cur.fetchall() if row[0]}
    cur.close()
    conn.close()
    return result


def get_meta_tests():
    """Get test names from meta.csv (Kranium prices)."""
    meta_path = BASE.parent / 'frontend' / 'public' / 'meta.csv'
    if not meta_path.exists():
        return {}
    with open(meta_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return {row['TestName'].strip() for row in reader if row.get('TestName', '').strip()}


def main():
    days = 90
    output = None
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == '--days' and i + 1 < len(args):
            days = int(args[i + 1])
            i += 2
        elif args[i] == '--output' and i + 1 < len(args):
            output = args[i + 1]
            i += 2
        else:
            i += 1

    print(f"\n=== LabGuru vs Kranium/Meta Test Name Analysis (last {days} days) ===\n")

    labguru = get_labguru_tests(days)
    meta = get_meta_tests()
    print(f"LabGuru unique test names: {len(labguru)}")
    print(f"Meta (Kranium) unique test names: {len(meta)}")

    # Normalize for comparison (case-insensitive, strip)
    meta_lower = {t.lower(): t for t in meta}
    labguru_lower = {t.lower(): t for t in labguru}

    in_both = set(labguru.keys()) & meta
    only_labguru = set(labguru.keys()) - meta
    only_meta = meta - set(labguru.keys())

    # Case-insensitive match
    only_labguru_ci = set()
    for lg in labguru.keys():
        if lg.lower() not in meta_lower:
            only_labguru_ci.add(lg)

    print(f"\nExact match (in both): {len(in_both)}")
    print(f"Only in LabGuru (not in meta): {len(only_labguru)}")
    print(f"Only in meta (not in LabGuru data): {len(only_meta)}")

    # LabGuru total count vs matched count
    total_labguru = sum(labguru.values())
    matched_count = sum(labguru[t] for t in in_both)
    unmatched_count = sum(labguru[t] for t in only_labguru)
    print(f"\nLabGuru total test records: {total_labguru}")
    print(f"  Matched to meta: {matched_count} ({100*matched_count/total_labguru:.1f}%)")
    print(f"  Unmatched: {unmatched_count} ({100*unmatched_count/total_labguru:.1f}%)")

    # Build report
    rows = []
    for name in sorted(labguru.keys(), key=lambda x: -labguru[x]):
        in_meta = name in meta
        rows.append({
            'labguru_testname': name,
            'labguru_count': labguru[name],
            'in_meta': 'YES' if in_meta else 'NO',
            'meta_testname': name if in_meta else '',
        })
    for name in sorted(only_meta):
        if name not in labguru:
            rows.append({
                'labguru_testname': '',
                'labguru_count': 0,
                'in_meta': 'YES',
                'meta_testname': name,
            })

    if output:
        with open(output, 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=['labguru_testname', 'labguru_count', 'in_meta', 'meta_testname'])
            w.writeheader()
            w.writerows(rows)
        print(f"\nReport saved to {output}")

    # Top unmatched by count (likely need mapping)
    print("\n--- Top 20 LabGuru tests NOT in meta (need mapping?) ---")
    unmapped = [(n, labguru[n]) for n in only_labguru]
    unmapped.sort(key=lambda x: -x[1])
    for name, cnt in unmapped[:20]:
        print(f"  {cnt:6}  {name}")

    # Panel suspects (names that might be components)
    print("\n--- Possible panel components (Urea, Creatinine, PT, INR, etc.) ---")
    panel_keywords = ['urea', 'creatinine', 'pt', 'inr', 'ast', 'alt', 'rfts', 'lfts', 'cbc', 'fbc']
    for kw in panel_keywords:
        matches = [(n, labguru[n]) for n in labguru if kw in n.lower()]
        if matches:
            matches.sort(key=lambda x: -x[1])
            print(f"  '{kw}': {[(n, c) for n, c in matches[:5]]}")

    print("\nDone.")


if __name__ == '__main__':
    main()
