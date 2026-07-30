from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
# Motor - conexiunea efectivă la database
engine = create_engine(settings.database_url)

# SessionLocal - "conversația" cu database-ul (o folosești când faci query-uri)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base - Clasa părinte pentru toate tabelele (Users, Courses, etc.)
Base = declarative_base()