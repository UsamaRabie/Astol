"""
Astol Fleet Management - PostgreSQL Database Initializer & Migration Tool
Creates the PostgreSQL database if it does not exist, runs migrations, and loads initial/dumped data.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

DB_NAME = os.environ.get('DB_NAME', 'astol_fleet_db')
DB_USER = os.environ.get('DB_USER', 'postgres')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'postgres')
DB_HOST = os.environ.get('DB_HOST', '127.0.0.1')
DB_PORT = os.environ.get('DB_PORT', '5432')

def create_database():
    try:
        import psycopg2
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    except ImportError:
        print("[Error] psycopg2 is not installed. Please run: pip install psycopg2-binary")
        sys.exit(1)

    print(f"[1/4] Connecting to PostgreSQL at {DB_HOST}:{DB_PORT} as user '{DB_USER}'...")
    try:
        conn = psycopg2.connect(
            dbname='postgres',
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Check if database exists
        cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{DB_NAME}'")
        exists = cursor.fetchone()
        if not exists:
            print(f"[2/4] Database '{DB_NAME}' does not exist. Creating database...")
            cursor.execute(f"CREATE DATABASE {DB_NAME} ENCODING 'UTF8'")
            print(f"      Database '{DB_NAME}' created successfully.")
        else:
            print(f"[2/4] Database '{DB_NAME}' already exists.")

        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[Warning] Could not connect to PostgreSQL server: {e}")
        print("          Ensure PostgreSQL service is running and credentials in .env are correct.")
        sys.exit(1)

def run_migrations_and_load():
    import subprocess
    print(f"[3/4] Running Django migrations on '{DB_NAME}'...")
    python_exe = sys.executable
    ret = subprocess.run([python_exe, "manage.py", "migrate"], cwd=BASE_DIR)
    if ret.returncode != 0:
        print("[Error] Migrations failed.")
        sys.exit(1)

    dump_file = BASE_DIR / "datadump.json"
    if dump_file.exists():
        print(f"[4/4] Importing fleet data from '{dump_file.name}' into PostgreSQL...")
        ret = subprocess.run([python_exe, "manage.py", "loaddata", "datadump.json"], cwd=BASE_DIR)
        if ret.returncode == 0:
            print("[Success] Data imported successfully into PostgreSQL!")
        else:
            print("[Warning] Could not load datadump.json. Seeding default data instead...")
            subprocess.run([python_exe, "manage.py", "seed_data"], cwd=BASE_DIR)
    else:
        print("[4/4] Seeding initial fleet data...")
        subprocess.run([python_exe, "manage.py", "seed_data"], cwd=BASE_DIR)

    print("\n" + "="*60)
    print(f"[Astol Fleet Management] PostgreSQL setup complete for database '{DB_NAME}'!")
    print("="*60 + "\n")

if __name__ == '__main__':
    create_database()
    run_migrations_and_load()
