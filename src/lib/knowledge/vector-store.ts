/**
 * Persistent vector store behind KnowledgeProvider.
 * Default: local SQLite (better-sqlite3) under data/vectors.sqlite.
 * Optional: Postgres + pgvector when DATABASE_URL is set (postgres://…).
 */

import fs from "fs";
import path from "path";
import { cosineSimilarity, packFloat32, unpackFloat32 } from "./vector";

export type VectorKind = "wiki" | "source";

export interface VectorRecord {
  id: string;
  kind: VectorKind;
  slug: string;
  model: string;
  embedding: number[];
  contentHash: string;
}

export interface VectorHit {
  id: string;
  kind: VectorKind;
  slug: string;
  score: number;
}

export interface VectorStore {
  readonly backend: "sqlite" | "pgvector";
  upsert(records: VectorRecord[]): Promise<void>;
  query(
    embedding: number[],
    options?: { limit?: number; kind?: VectorKind },
  ): Promise<VectorHit[]>;
  getHashes(ids: string[]): Promise<Map<string, { contentHash: string; model: string }>>;
  deleteMissing(validIds: string[]): Promise<number>;
  count(): Promise<number>;
  close?(): Promise<void> | void;
}

function envFirst(...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return undefined;
}

function defaultSqlitePath(): string {
  return (
    envFirst("PRESENCE_VECTOR_DB", "PERSONA_VECTOR_DB") ||
    path.join(process.cwd(), "data", "vectors.sqlite")
  );
}

function wantsPgvector(): boolean {
  const explicit = envFirst("PRESENCE_VECTOR_STORE", "PERSONA_VECTOR_STORE")?.toLowerCase();
  if (explicit === "sqlite") return false;
  if (explicit === "pgvector" || explicit === "postgres") return true;
  const url = process.env.DATABASE_URL?.trim() ?? "";
  return /^postgres(ql)?:\/\//i.test(url);
}

/** Open the configured persistent store (SQLite default). */
export async function openVectorStore(): Promise<VectorStore> {
  if (wantsPgvector()) {
    try {
      return await openPgVectorStore();
    } catch (err) {
      console.warn(
        "pgvector unavailable — falling back to SQLite. Install `pg` and enable the vector extension.",
        err,
      );
    }
  }
  return openSqliteVectorStore();
}

export function openSqliteVectorStore(dbPath = defaultSqlitePath()): VectorStore {
  // Lazy require so edge/build analysis does not always load the native module
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3") as typeof import("better-sqlite3");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS embeddings (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      slug TEXT NOT NULL,
      model TEXT NOT NULL,
      dims INTEGER NOT NULL,
      vector BLOB NOT NULL,
      content_hash TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_embeddings_kind ON embeddings(kind);
  `);

  const upsertStmt = db.prepare(`
    INSERT INTO embeddings (id, kind, slug, model, dims, vector, content_hash, updated_at)
    VALUES (@id, @kind, @slug, @model, @dims, @vector, @content_hash, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      kind = excluded.kind,
      slug = excluded.slug,
      model = excluded.model,
      dims = excluded.dims,
      vector = excluded.vector,
      content_hash = excluded.content_hash,
      updated_at = excluded.updated_at
  `);

  return {
    backend: "sqlite",
    async upsert(records) {
      if (records.length === 0) return;
      const now = new Date().toISOString();
      const tx = db.transaction((rows: VectorRecord[]) => {
        for (const r of rows) {
          upsertStmt.run({
            id: r.id,
            kind: r.kind,
            slug: r.slug,
            model: r.model,
            dims: r.embedding.length,
            vector: packFloat32(r.embedding),
            content_hash: r.contentHash,
            updated_at: now,
          });
        }
      });
      tx(records);
    },
    async query(embedding, options = {}) {
      const limit = options.limit ?? 8;
      const kind = options.kind;
      const rows = kind
        ? (db
            .prepare(`SELECT id, kind, slug, vector FROM embeddings WHERE kind = ?`)
            .all(kind) as { id: string; kind: VectorKind; slug: string; vector: Buffer }[])
        : (db
            .prepare(`SELECT id, kind, slug, vector FROM embeddings`)
            .all() as { id: string; kind: VectorKind; slug: string; vector: Buffer }[]);

      return rows
        .map((row) => ({
          id: row.id,
          kind: row.kind,
          slug: row.slug,
          score: cosineSimilarity(embedding, unpackFloat32(row.vector)),
        }))
        .filter((h) => h.score > 0.2)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },
    async getHashes(ids) {
      const map = new Map<string, { contentHash: string; model: string }>();
      if (ids.length === 0) return map;
      const stmt = db.prepare(
        `SELECT id, content_hash, model FROM embeddings WHERE id = ?`,
      );
      for (const id of ids) {
        const row = stmt.get(id) as
          | { id: string; content_hash: string; model: string }
          | undefined;
        if (row) map.set(row.id, { contentHash: row.content_hash, model: row.model });
      }
      return map;
    },
    async deleteMissing(validIds) {
      const valid = new Set(validIds);
      const rows = db.prepare(`SELECT id FROM embeddings`).all() as { id: string }[];
      const stale = rows.map((r) => r.id).filter((id) => !valid.has(id));
      if (stale.length === 0) return 0;
      const del = db.prepare(`DELETE FROM embeddings WHERE id = ?`);
      const tx = db.transaction((ids: string[]) => {
        for (const id of ids) del.run(id);
      });
      tx(stale);
      return stale.length;
    },
    async count() {
      const row = db.prepare(`SELECT COUNT(*) AS n FROM embeddings`).get() as { n: number };
      return row.n;
    },
    close() {
      db.close();
    },
  };
}

async function openPgVectorStore(): Promise<VectorStore> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL required for pgvector");
  }

  // Optional dependency — only needed for Postgres path
  let pg: typeof import("pg");
  try {
    // webpackIgnore keeps Next from bundling optional `pg`
    pg = await import(/* webpackIgnore: true */ "pg");
  } catch {
    throw new Error(
      "Package `pg` is not installed. Run: npm install pg && enable CREATE EXTENSION vector",
    );
  }

  const pool = new pg.Pool({ connectionString: url });
  await pool.query(`CREATE EXTENSION IF NOT EXISTS vector`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS persona_embeddings (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      slug TEXT NOT NULL,
      model TEXT NOT NULL,
      dims INTEGER NOT NULL,
      embedding vector,
      content_hash TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_persona_embeddings_kind
    ON persona_embeddings(kind)
  `);

  return {
    backend: "pgvector",
    async upsert(records) {
      if (records.length === 0) return;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const r of records) {
          const literal = `[${r.embedding.join(",")}]`;
          await client.query(
            `INSERT INTO persona_embeddings (id, kind, slug, model, dims, embedding, content_hash, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6::vector, $7, NOW())
             ON CONFLICT (id) DO UPDATE SET
               kind = EXCLUDED.kind,
               slug = EXCLUDED.slug,
               model = EXCLUDED.model,
               dims = EXCLUDED.dims,
               embedding = EXCLUDED.embedding,
               content_hash = EXCLUDED.content_hash,
               updated_at = NOW()`,
            [r.id, r.kind, r.slug, r.model, r.embedding.length, literal, r.contentHash],
          );
        }
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
    async query(embedding, options = {}) {
      const limit = options.limit ?? 8;
      const literal = `[${embedding.join(",")}]`;
      const params: unknown[] = [literal, limit];
      let sql = `
        SELECT id, kind, slug, 1 - (embedding <=> $1::vector) AS score
        FROM persona_embeddings
        WHERE embedding IS NOT NULL
      `;
      if (options.kind) {
        params.splice(1, 0, options.kind);
        sql = `
          SELECT id, kind, slug, 1 - (embedding <=> $1::vector) AS score
          FROM persona_embeddings
          WHERE embedding IS NOT NULL AND kind = $2
          ORDER BY embedding <=> $1::vector
          LIMIT $3
        `;
        params[2] = limit;
      } else {
        sql += ` ORDER BY embedding <=> $1::vector LIMIT $2`;
      }
      const res = await pool.query(sql, params);
      return (res.rows as { id: string; kind: VectorKind; slug: string; score: number }[])
        .map((row) => ({
          id: row.id,
          kind: row.kind,
          slug: row.slug,
          score: Number(row.score),
        }))
        .filter((h) => h.score > 0.2);
    },
    async getHashes(ids) {
      const map = new Map<string, { contentHash: string; model: string }>();
      if (ids.length === 0) return map;
      const res = await pool.query(
        `SELECT id, content_hash, model FROM persona_embeddings WHERE id = ANY($1)`,
        [ids],
      );
      for (const row of res.rows as { id: string; content_hash: string; model: string }[]) {
        map.set(row.id, { contentHash: row.content_hash, model: row.model });
      }
      return map;
    },
    async deleteMissing(validIds) {
      const res = await pool.query(
        `DELETE FROM persona_embeddings WHERE NOT (id = ANY($1))`,
        [validIds],
      );
      return res.rowCount ?? 0;
    },
    async count() {
      const res = await pool.query(`SELECT COUNT(*)::int AS n FROM persona_embeddings`);
      return res.rows[0].n as number;
    },
    async close() {
      await pool.end();
    },
  };
}
