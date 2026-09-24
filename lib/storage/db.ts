import "server-only";
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import type { Submission, SubmissionStatus, FileRef } from "@/lib/types";
import { MODE } from "./files";

/**
 * Submission records.
 *   local (default) → SQLite database at ./data/portal.db (three tables: submissions, datasets, files)
 *   aws             → DynamoDB, one item per submission (for the later S3 migration)
 */

// ───────────────────────── SQLite (local) ─────────────────────────
const DB_PATH = process.env.SQLITE_PATH ?? path.join(process.cwd(), "data", "portal.db");

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS submissions (
  id               TEXT PRIMARY KEY,
  submitted_at     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'new',
  admin_notes      TEXT NOT NULL DEFAULT '',
  name             TEXT NOT NULL,
  designation      TEXT NOT NULL DEFAULT '',
  affiliation      TEXT NOT NULL,
  country          TEXT NOT NULL DEFAULT '',
  email            TEXT NOT NULL,
  phone            TEXT NOT NULL DEFAULT '',
  sectors          TEXT NOT NULL,             -- JSON array of sector ids
  subsectors       TEXT NOT NULL DEFAULT '{}',-- JSON { sectorId: [groupId] }
  access           TEXT NOT NULL DEFAULT '',
  approver         TEXT NOT NULL DEFAULT '',
  portal           TEXT NOT NULL DEFAULT '',
  progress_done    TEXT NOT NULL DEFAULT '',
  progress_next    TEXT NOT NULL DEFAULT '',
  progress_support TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS datasets (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id   TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  sector_id       TEXT NOT NULL,
  item_id         TEXT,                        -- catalogue item id; NULL for "other" datasets
  is_other        INTEGER NOT NULL DEFAULT 0,
  name            TEXT NOT NULL DEFAULT '',    -- only for "other" datasets
  description     TEXT NOT NULL DEFAULT '',
  levels          TEXT NOT NULL DEFAULT '[]',  -- JSON
  frequency       TEXT NOT NULL DEFAULT '',
  year_from       TEXT NOT NULL DEFAULT '',
  year_to         TEXT NOT NULL DEFAULT '',
  formats         TEXT NOT NULL DEFAULT '[]',  -- JSON (catalogue items) or free text (other)
  global_coverage INTEGER NOT NULL DEFAULT 0,
  countries       TEXT NOT NULL DEFAULT '[]',  -- JSON ISO codes
  area            TEXT NOT NULL DEFAULT '',    -- free-text area; for "other" rows this holds coverage
  resolution      TEXT NOT NULL DEFAULT '',
  link            TEXT NOT NULL DEFAULT '',
  notes           TEXT NOT NULL DEFAULT '',
  position        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_datasets_submission ON datasets(submission_id);
CREATE INDEX IF NOT EXISTS idx_datasets_sector ON datasets(sector_id, item_id);

CREATE TABLE IF NOT EXISTS files (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  dataset_id    INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  storage_key   TEXT NOT NULL UNIQUE,          -- path under data/uploads (later: S3 key)
  original_name TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  content_type  TEXT NOT NULL DEFAULT '',
  uploaded_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_files_dataset ON files(dataset_id);
`;

type G = typeof globalThis & { __portalDb?: Database.Database };
function sqlite() {
  const g = globalThis as G; // reuse one connection across hot reloads
  if (!g.__portalDb) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    g.__portalDb = new Database(DB_PATH);
    g.__portalDb.exec(SCHEMA);
  }
  return g.__portalDb;
}

type SubRow = Record<string, string>;
type DsRow = Record<string, string | number | null>;
type FileRow = { dataset_id: number; storage_key: string; original_name: string; size_bytes: number; content_type: string; uploaded_at: string };

function sqliteSave(s: Submission) {
  const db = sqlite();
  db.transaction(() => {
    db.prepare(`INSERT INTO submissions (id, submitted_at, status, admin_notes, name, designation, affiliation, country, email, phone, sectors, subsectors, access, approver, portal, progress_done, progress_next, progress_support)
      VALUES (@id, @submitted_at, @status, @admin_notes, @name, @designation, @affiliation, @country, @email, @phone, @sectors, @subsectors, @access, @approver, @portal, @progress_done, @progress_next, @progress_support)`).run({
      id: s.id, submitted_at: s.submittedAt, status: s.status, admin_notes: s.adminNotes ?? "",
      ...s.contact, sectors: JSON.stringify(s.sectors), subsectors: JSON.stringify(s.subsectors ?? {}),
      access: s.sharing.access, approver: s.sharing.approver, portal: s.sharing.portal,
      progress_done: s.progress.done, progress_next: s.progress.next3Months, progress_support: s.progress.support,
    });
    const insDs = db.prepare(`INSERT INTO datasets (submission_id, sector_id, item_id, is_other, name, description, levels, frequency, year_from, year_to, formats, global_coverage, countries, area, resolution, link, notes, position)
      VALUES (@submission_id, @sector_id, @item_id, @is_other, @name, @description, @levels, @frequency, @year_from, @year_to, @formats, @global_coverage, @countries, @area, @resolution, @link, @notes, @position)`);
    const insFile = db.prepare(`INSERT INTO files (submission_id, dataset_id, storage_key, original_name, size_bytes, content_type, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const addFiles = (dsId: number | bigint, files: FileRef[]) => files.forEach((f) => insFile.run(s.id, dsId, f.key, f.name, f.size, f.type ?? "", f.uploadedAt));

    s.items.forEach((i, pos) => {
      const r = insDs.run({
        submission_id: s.id, sector_id: i.sectorId, item_id: i.itemId, is_other: 0, name: "", description: "",
        levels: JSON.stringify(i.levels), frequency: i.frequency, year_from: i.yearFrom, year_to: i.yearTo, formats: JSON.stringify(i.formats),
        global_coverage: i.globalCoverage ? 1 : 0, countries: JSON.stringify(i.countries), area: i.area, resolution: i.resolution, link: i.link, notes: i.notes, position: pos,
      });
      addFiles(r.lastInsertRowid, i.files);
    });
    s.others.forEach((o, pos) => {
      const r = insDs.run({
        submission_id: s.id, sector_id: o.sectorId || "other", item_id: null, is_other: 1, name: o.name, description: o.description,
        levels: "[]", frequency: "", year_from: o.years, year_to: "", formats: o.format, global_coverage: 0, countries: "[]",
        area: o.coverage, resolution: "", link: "", notes: "", position: pos,
      });
      addFiles(r.lastInsertRowid, o.files);
    });
  })();
}

function hydrate(row: SubRow, dsRows: DsRow[], fileRows: FileRow[]): Submission {
  const filesFor = (id: number) => fileRows.filter((f) => f.dataset_id === id).map((f) => ({ key: f.storage_key, name: f.original_name, size: f.size_bytes, type: f.content_type, uploadedAt: f.uploaded_at }));
  const mine = dsRows.filter((d) => d.submission_id === row.id).sort((a, b) => Number(a.position) - Number(b.position));
  return {
    id: row.id, submittedAt: row.submitted_at, status: row.status as SubmissionStatus, adminNotes: row.admin_notes,
    contact: { name: row.name, designation: row.designation, affiliation: row.affiliation, country: row.country, email: row.email, phone: row.phone },
    sectors: JSON.parse(row.sectors), subsectors: JSON.parse(row.subsectors),
    items: mine.filter((d) => !d.is_other).map((d) => ({
      itemId: String(d.item_id), sectorId: String(d.sector_id), levels: JSON.parse(String(d.levels)), frequency: String(d.frequency),
      yearFrom: String(d.year_from), yearTo: String(d.year_to), formats: JSON.parse(String(d.formats)), globalCoverage: !!d.global_coverage,
      countries: JSON.parse(String(d.countries)), area: String(d.area), resolution: String(d.resolution), link: String(d.link), notes: String(d.notes),
      files: filesFor(Number(d.id)),
    })),
    others: mine.filter((d) => d.is_other).map((d) => ({
      name: String(d.name), description: String(d.description), sectorId: d.sector_id === "other" ? "" : String(d.sector_id),
      coverage: String(d.area), years: String(d.year_from), format: String(d.formats), files: filesFor(Number(d.id)),
    })),
    sharing: { access: row.access, approver: row.approver, portal: row.portal },
    progress: { done: row.progress_done, next3Months: row.progress_next, support: row.progress_support },
  };
}

function sqliteGet(id: string) {
  const db = sqlite();
  const row = db.prepare("SELECT * FROM submissions WHERE id = ?").get(id) as SubRow | undefined;
  if (!row) return null;
  const ds = db.prepare("SELECT * FROM datasets WHERE submission_id = ?").all(id) as DsRow[];
  const files = db.prepare("SELECT * FROM files WHERE submission_id = ?").all(id) as FileRow[];
  return hydrate(row, ds, files);
}

function sqliteList() {
  const db = sqlite();
  const rows = db.prepare("SELECT * FROM submissions ORDER BY submitted_at DESC").all() as SubRow[];
  const ds = db.prepare("SELECT * FROM datasets").all() as DsRow[];
  const files = db.prepare("SELECT * FROM files").all() as FileRow[];
  return rows.map((r) => hydrate(r, ds, files));
}

// ───────────────────────── DynamoDB (aws, later) ─────────────────────────
let _ddb: DynamoDBDocumentClient | null = null;
const ddb = () => (_ddb ??= DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }), { marshallOptions: { removeUndefinedValues: true } }));
const table = () => {
  if (!process.env.DYNAMODB_TABLE) throw new Error("DYNAMODB_TABLE is not set");
  return process.env.DYNAMODB_TABLE;
};

// ───────────────────────── Public API ─────────────────────────
const validId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export async function saveSubmission(sub: Submission) {
  if (MODE === "aws") return void (await ddb().send(new PutCommand({ TableName: table(), Item: sub })));
  sqliteSave(sub);
}

export async function getSubmission(id: string): Promise<Submission | null> {
  if (!validId(id)) return null;
  if (MODE === "aws") return ((await ddb().send(new GetCommand({ TableName: table(), Key: { id } }))).Item as Submission) ?? null;
  return sqliteGet(id);
}

export async function listSubmissions(): Promise<Submission[]> {
  if (MODE !== "aws") return sqliteList();
  let all: Submission[] = [];
  let start: Record<string, unknown> | undefined;
  do {
    const r = await ddb().send(new ScanCommand({ TableName: table(), ExclusiveStartKey: start }));
    all = all.concat((r.Items ?? []) as Submission[]);
    start = r.LastEvaluatedKey;
  } while (start);
  return all.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function updateSubmissionMeta(id: string, patch: { status?: SubmissionStatus; adminNotes?: string }) {
  const current = await getSubmission(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  if (MODE === "aws") {
    await ddb().send(new UpdateCommand({
      TableName: table(), Key: { id },
      UpdateExpression: "SET #s = :s, adminNotes = :n",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":s": next.status, ":n": next.adminNotes ?? "" },
    }));
  } else {
    sqlite().prepare("UPDATE submissions SET status = ?, admin_notes = ? WHERE id = ?").run(next.status, next.adminNotes ?? "", id);
  }
  return next;
}

export async function deleteSubmission(id: string) {
  if (!validId(id)) return;
  if (MODE === "aws") return void (await ddb().send(new DeleteCommand({ TableName: table(), Key: { id } })));
  sqlite().prepare("DELETE FROM submissions WHERE id = ?").run(id); // datasets/files rows cascade
}
