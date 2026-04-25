-- Hausmeister schema. Single init.sql, no migrations framework.
-- Apply with: psql "$DATABASE_URL" -f backend/init.sql

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS scraps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle       TEXT NOT NULL,
  body         TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'text',  -- 'text' | 'voice'
  funny_score  INT,
  funny_reason TEXT,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  embedding    vector(768),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scraps_embedding_idx
  ON scraps USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

CREATE INDEX IF NOT EXISTS scraps_created_at_idx
  ON scraps (created_at DESC);

CREATE INDEX IF NOT EXISTS scraps_score_idx
  ON scraps (funny_score DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS hausregeln (
  n          INT PRIMARY KEY,
  rule       TEXT NOT NULL,
  derived_from UUID REFERENCES scraps(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
