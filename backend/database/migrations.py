from sqlalchemy import inspect, text
from database.session import engine

def run_migrations():
    """Safely apply database schema updates for both SQLite and PostgreSQL without wiping data."""
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
    except Exception as e:
        print(f"Migration inspection notice: {e}")
        return

    with engine.connect() as conn:
        try:
            # 1. task_stages table
            if "task_stages" in tables:
                task_cols = [c["name"] for c in inspector.get_columns("task_stages")]
                if "revision_notes" not in task_cols:
                    conn.execute(text("ALTER TABLE task_stages ADD COLUMN revision_notes TEXT"))
                if "head_instructions" not in task_cols:
                    conn.execute(text("ALTER TABLE task_stages ADD COLUMN head_instructions TEXT"))
                if "reviewer_id" not in task_cols:
                    conn.execute(text("ALTER TABLE task_stages ADD COLUMN reviewer_id INTEGER"))
                if "reviewed_at" not in task_cols:
                    conn.execute(text("ALTER TABLE task_stages ADD COLUMN reviewed_at TIMESTAMP"))
                conn.commit()

            # 2. clients table
            if "clients" in tables:
                client_cols = [c["name"] for c in inspector.get_columns("clients")]
                if "ticket_number" not in client_cols:
                    conn.execute(text("ALTER TABLE clients ADD COLUMN ticket_number VARCHAR"))
                if "store_id" not in client_cols:
                    conn.execute(text("ALTER TABLE clients ADD COLUMN store_id VARCHAR"))
                if "package_name" not in client_cols:
                    conn.execute(text("ALTER TABLE clients ADD COLUMN package_name VARCHAR"))
                if "website_url" not in client_cols:
                    conn.execute(text("ALTER TABLE clients ADD COLUMN website_url VARCHAR"))
                if "agency_email" not in client_cols:
                    conn.execute(text("ALTER TABLE clients ADD COLUMN agency_email VARCHAR"))
                if "phone" not in client_cols:
                    conn.execute(text("ALTER TABLE clients ADD COLUMN phone VARCHAR"))
                if "platform" not in client_cols:
                    conn.execute(text("ALTER TABLE clients ADD COLUMN platform VARCHAR"))
                if "brief_sheet" not in client_cols:
                    conn.execute(text("ALTER TABLE clients ADD COLUMN brief_sheet TEXT"))
                if "sheet_url" not in client_cols:
                    conn.execute(text("ALTER TABLE clients ADD COLUMN sheet_url VARCHAR"))
                conn.commit()

            # 3. departments table
            if "departments" in tables:
                dept_cols = [c["name"] for c in inspector.get_columns("departments")]
                if "roles" not in dept_cols:
                    conn.execute(text("ALTER TABLE departments ADD COLUMN roles TEXT DEFAULT '[]'"))
                if "services" not in dept_cols:
                    conn.execute(text("ALTER TABLE departments ADD COLUMN services TEXT DEFAULT '[]'"))
                conn.commit()

            # 4. team_members table
            if "team_members" in tables:
                member_cols = [c["name"] for c in inspector.get_columns("team_members")]
                if "is_active" not in member_cols:
                    conn.execute(text("ALTER TABLE team_members ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
                if "role_type" not in member_cols:
                    conn.execute(text("ALTER TABLE team_members ADD COLUMN role_type VARCHAR DEFAULT 'employee'"))
                conn.commit()

            # 5. audit_logs foreign key update for PostgreSQL (ON DELETE SET NULL)
            if "audit_logs" in tables:
                try:
                    conn.execute(text("""
                        DO $$
                        BEGIN
                            IF EXISTS (
                                SELECT 1 FROM information_schema.table_constraints 
                                WHERE constraint_name = 'audit_logs_stage_id_fkey'
                            ) THEN
                                ALTER TABLE audit_logs DROP CONSTRAINT audit_logs_stage_id_fkey;
                                ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_stage_id_fkey 
                                    FOREIGN KEY (stage_id) REFERENCES task_stages(id) ON DELETE SET NULL;
                            END IF;
                        END $$;
                    """))
                    conn.commit()
                except Exception as e:
                    # SQLite does not support this DDL syntax; safely ignore
                    pass

        except Exception as e:
            print(f"Migration execution notice: {e}")


