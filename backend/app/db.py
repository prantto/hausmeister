"""Postgres + pgvector access. Single connection pool, raw SQL."""

import os
from contextlib import asynccontextmanager
from typing import Optional

import psycopg
from psycopg_pool import AsyncConnectionPool
from pgvector.psycopg import register_vector_async

_pool: Optional[AsyncConnectionPool] = None


async def _configure(conn: psycopg.AsyncConnection) -> None:
    await register_vector_async(conn)


async def init_pool() -> AsyncConnectionPool:
    global _pool
    if _pool is not None:
        return _pool
    dsn = os.environ["DATABASE_URL"]
    _pool = AsyncConnectionPool(dsn, min_size=1, max_size=10, configure=_configure, open=False)
    await _pool.open()
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def conn():
    if _pool is None:
        await init_pool()
    async with _pool.connection() as c:
        yield c
