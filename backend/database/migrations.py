from database.session import engine

def run_migrations():
    """Safely apply database schema updates for SQLite without wiping existing data."""
    if engine.dialect.name != "sqlite":
        return

    with engine.connect() as conn:
        try:
            res = conn.exec_driver_sql("PRAGMA table_info(task_stages)").fetchall()
            existing_cols = [r[1] for r in res]
            if existing_cols:
                if "revision_notes" not in existing_cols:
                    conn.exec_driver_sql("ALTER TABLE task_stages ADD COLUMN revision_notes TEXT")
                if "reviewer_id" not in existing_cols:
                    conn.exec_driver_sql("ALTER TABLE task_stages ADD COLUMN reviewer_id INTEGER REFERENCES team_members(id)")
                if "reviewed_at" not in existing_cols:
                    conn.exec_driver_sql("ALTER TABLE task_stages ADD COLUMN reviewed_at DATETIME")
                conn.commit()

            res_clients = conn.exec_driver_sql("PRAGMA table_info(clients)").fetchall()
            existing_client_cols = [r[1] for r in res_clients]
            if existing_client_cols:
                if "ticket_number" not in existing_client_cols:
                    conn.exec_driver_sql("ALTER TABLE clients ADD COLUMN ticket_number TEXT")
                if "store_id" not in existing_client_cols:
                    conn.exec_driver_sql("ALTER TABLE clients ADD COLUMN store_id TEXT")
                if "package_name" not in existing_client_cols:
                    conn.exec_driver_sql("ALTER TABLE clients ADD COLUMN package_name TEXT")
                conn.commit()

            res_depts = conn.exec_driver_sql("PRAGMA table_info(departments)").fetchall()
            existing_dept_cols = [r[1] for r in res_depts]
            if existing_dept_cols:
                if "roles" not in existing_dept_cols:
                    conn.exec_driver_sql("ALTER TABLE departments ADD COLUMN roles TEXT DEFAULT '[]'")
                conn.commit()
        except Exception as e:
            print(f"Migration notice: {e}")

