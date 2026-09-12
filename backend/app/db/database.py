import logging
from urllib.parse import urlparse, quote_plus
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()


def normalize_db_url(db_url: str) -> str:
    """Safely handle passwords containing special characters like '@' or '#' in URLs."""
    if not db_url or db_url.startswith("sqlite"):
        return db_url
    
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    if "://" in db_url:
        scheme, rest = db_url.split("://", 1)
        if "@" in rest:
            user_pass, host_db = rest.rsplit("@", 1)
            if ":" in user_pass:
                user, password = user_pass.split(":", 1)
                if "%" not in password:
                    encoded_password = quote_plus(password)
                else:
                    encoded_password = password
                return f"{scheme}://{user}:{encoded_password}@{host_db}"
    return db_url


def ensure_postgres_db_exists(db_url: str):
    """Attempt to create database on PostgreSQL server if it does not exist."""
    try:
        import psycopg2
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

        clean_url = normalize_db_url(db_url)
        parsed = urlparse(clean_url)
        db_name = parsed.path.lstrip("/")
        if not db_name or db_name == "postgres":
            return

        from urllib.parse import unquote
        pwd = unquote(parsed.password or "") if parsed.password else ""

        conn = psycopg2.connect(
            dbname="postgres",
            user=parsed.username or "postgres",
            password=pwd,
            host=parsed.hostname or "localhost",
            port=parsed.port or 5432
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s", (db_name,))
        exists = cursor.fetchone()
        if not exists:
            cursor.execute(f'CREATE DATABASE "{db_name}"')
            logger.info(f"Database '{db_name}' successfully created in PostgreSQL.")
        cursor.close()
        conn.close()
    except Exception as e:
        logger.debug(f"Auto-create PostgreSQL database notice: {e}")


def get_engine():
    raw_url = settings.DATABASE_URL
    db_url = normalize_db_url(raw_url)

    connect_args = {}
    if db_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        logger.info("Using SQLite database engine.")
        return create_engine(db_url, connect_args=connect_args)

    # PostgreSQL handling
    try:
        ensure_postgres_db_exists(db_url)
        engine = create_engine(db_url, pool_pre_ping=True)
        # Test connection
        with engine.connect():
            pass
        logger.info(f"Connected successfully to PostgreSQL database ({db_url.split('@')[-1] if '@' in db_url else db_url}).")
        return engine
    except Exception as e:
        logger.warning(
            f"Could not connect to PostgreSQL at {db_url}: {e}.\n"
            "Falling back to local SQLite database so the application continues running."
        )
        sqlite_url = "sqlite:///./civicpulse.db"
        return create_engine(sqlite_url, connect_args={"check_same_thread": False})


engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
