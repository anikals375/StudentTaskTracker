
import os
import re

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession
)
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase

# Load environment variables from backend/.env
load_dotenv(
    os.path.join(os.path.dirname(__file__), "../../.env")
)

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

if not all([DB_USER, DB_PASSWORD, DB_NAME]):
    raise RuntimeError("Database configuration is incomplete.")

# Validate the database name before using it in SQL.
if not re.fullmatch(r"[A-Za-z0-9_]+", DB_NAME):
    raise RuntimeError("Invalid database name.")

# Connect to MySQL server without selecting a database.
server_url = URL.create(
    "mysql+asyncmy",
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT
)

async def create_database():
    server_engine = create_async_engine(server_url)

    try:
        async with server_engine.begin() as connection:
            await connection.execute(
                text(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}`")
            )
    finally:
        await server_engine.dispose()


# Connect to the Task Service database.
database_url = URL.create(
    "mysql+asyncmy",
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME
)

engine = create_async_engine(
    database_url,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with SessionLocal() as session:
        yield session
