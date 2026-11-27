// A small D1 stand-in over bun:sqlite, loaded with schema.sql.
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
export function d1() {
  const db = new Database(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.query(sql).get(...args) ?? null,
    all: async () => ({ results: db.query(sql).all(...args) }),
    run: async () => db.query(sql).run(...args),
    _run: () => db.query(sql).run(...args),
  });
  return { prepare: (sql) => stmt(sql), batch: async (list) => db.transaction(() => list.map((s) => s._run()))(), raw: db };
}
