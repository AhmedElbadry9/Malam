import os
import sys
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database.session import Base, get_db
import models
from main import app
from seed import seed_database, sync_member_departments

TEST_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_isolated.db"))
TEST_DB_URL = f"sqlite:///{TEST_DB_PATH}"

engine_test = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Initializes a pristine test database schema and seeds it once for the test session."""
    Base.metadata.drop_all(bind=engine_test)
    Base.metadata.create_all(bind=engine_test)

    # Seed test database
    db = TestingSessionLocal()
    try:
        seed_database(target_session=db)
        sync_member_departments(target_session=db)
    finally:
        db.close()

    yield

    # Teardown test database file
    Base.metadata.drop_all(bind=engine_test)
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

@pytest.fixture(scope="function")
def db_session():
    """Yields a db session connected to the seeded test database."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture(scope="function")
def client(db_session):
    """Provides a FastAPI TestClient wired to the test SQLite database."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
