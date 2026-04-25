from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ScrapIn(BaseModel):
    handle: str = Field(min_length=1, max_length=64)
    body: str = Field(min_length=1, max_length=240)
    kind: str = Field(default="text", pattern="^(text|voice)$")


class ScrapOut(BaseModel):
    id: UUID
    handle: str
    body: str
    kind: str
    funny_score: Optional[int] = None
    funny_reason: Optional[str] = None
    tags: list[str] = []
    created_at: datetime
    accepted: bool = True
    safety_reason: Optional[str] = None


class AskIn(BaseModel):
    handle: str = Field(min_length=1, max_length=64)
    question: str = Field(min_length=1, max_length=500)


class CitedScrap(BaseModel):
    id: UUID
    handle: str
    body: str
    score: float


class AskOut(BaseModel):
    answer: str
    cited: list[CitedScrap]


class AdminScrap(BaseModel):
    id: UUID
    handle: str
    body: str
    kind: str
    funny_score: Optional[int] = None
    tags: list[str] = []
    created_at: datetime


class WallScrap(BaseModel):
    id: UUID
    handle: str
    body: str
    funny_score: int
    created_at: datetime


class WallFeed(BaseModel):
    scraps: list[WallScrap]
    counts: dict[str, int]


class TagesberichtSection(BaseModel):
    h: str
    body: str


class NewsHit(BaseModel):
    title: str
    url: str


class AskNewsOut(BaseModel):
    answer: str
    cited: list[CitedScrap]
    news: list[NewsHit]


class TagesberichtOut(BaseModel):
    nr: int
    date: str
    intro: str
    sections: list[TagesberichtSection]
    cited: list[str] = []
    counts: dict[str, int] = {}
    generated_at: datetime
