"""Tavily news search. Optional — endpoint is disabled if TAVILY_API_KEY is unset."""

import os
from typing import Optional

import httpx


def enabled() -> bool:
    return bool(os.environ.get("TAVILY_API_KEY"))


async def search(query: str, max_results: int = 5) -> list[dict]:
    """Returns a list of {title, url, content} from Tavily."""
    api_key = os.environ.get("TAVILY_API_KEY")
    if not api_key:
        return []
    payload = {
        "api_key": api_key,
        "query": query,
        "search_depth": "basic",
        "topic": "news",
        "max_results": max_results,
        "include_answer": False,
    }
    async with httpx.AsyncClient(timeout=15.0) as cli:
        r = await cli.post("https://api.tavily.com/search", json=payload)
        r.raise_for_status()
        data = r.json()
    return [
        {"title": x.get("title", ""), "url": x.get("url", ""), "content": x.get("content", "")}
        for x in (data.get("results") or [])
    ]
