-- founder.flisk.si. Apply with: bunx wrangler@4 d1 execute founder --remote --file schema.sql (ask first).
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, login TEXT NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL UNIQUE, one_liner TEXT NOT NULL DEFAULT '',
  north_star TEXT NOT NULL DEFAULT '', vision TEXT NOT NULL DEFAULT '', idea TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'paused', created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS businesses_user ON businesses(user_id);
-- A released name is held 30 days so nobody can take over its links or mail.
CREATE TABLE IF NOT EXISTS name_holds (name TEXT PRIMARY KEY, until INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS caps (business_id TEXT NOT NULL, kind TEXT NOT NULL, monthly_usd REAL NOT NULL, PRIMARY KEY (business_id, kind));
CREATE TABLE IF NOT EXISTS work_items (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
  spend_kind TEXT NOT NULL DEFAULT 'llm', cost_usd REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'proposed',
  hash TEXT NOT NULL, created INTEGER NOT NULL, decided INTEGER,
  source TEXT NOT NULL DEFAULT 'owner', result TEXT NOT NULL DEFAULT '', verified TEXT NOT NULL DEFAULT '', finished INTEGER);
CREATE INDEX IF NOT EXISTS work_business ON work_items(business_id, created);
CREATE TABLE IF NOT EXISTS meter (business_id TEXT NOT NULL, kind TEXT NOT NULL, cost_usd REAL NOT NULL, note TEXT NOT NULL DEFAULT '', at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS meter_business ON meter(business_id, at);
CREATE TABLE IF NOT EXISTS audit (business_id TEXT NOT NULL, user_id TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS audit_business ON audit(business_id, at);
-- The landing page draft, as data (never model-written HTML): the page is rendered from it with every field escaped.
CREATE TABLE IF NOT EXISTS drafts (business_id TEXT PRIMARY KEY, data TEXT NOT NULL, offline INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS messages (business_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS messages_business ON messages(business_id, at);
