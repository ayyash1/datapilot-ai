from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import tempfile

if os.getenv("DATABASE_URL"):
    DATABASE_URL = os.environ["DATABASE_URL"]
elif os.getenv("VERCEL"):
    DATABASE_URL = f"sqlite:///{os.path.join(tempfile.gettempdir(), 'datapilot.db').replace(os.sep, '/')}"
else:
    DATABASE_URL = "sqlite:///./datapilot.db"

# For SQLite, we need to disable same_thread check
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
