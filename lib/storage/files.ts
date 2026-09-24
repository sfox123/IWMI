import "server-only";
import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ALLOWED_EXTENSIONS } from "@/lib/sectors";

/**
 * File layout (identical in S3 and on local disk):
 *
 *   {prefix}/{YYYY}/{MM}/{submissionId}/submission.json           ← full record, self-describing
 *   {prefix}/{YYYY}/{MM}/{submissionId}/{sectorId}/{itemId}/{timestamp}-{file}
 *   {prefix}/{YYYY}/{MM}/{submissionId}/other/{n}/{timestamp}-{file}
 */

export const MODE = (process.env.STORAGE_MODE ?? "local") as "local" | "aws";
const PREFIX = (process.env.S3_PREFIX ?? "data-requests").replace(/\/+$/, "");
const LOCAL_ROOT = path.join(process.cwd(), "data", "uploads");
export const MAX_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 500) * 1024 * 1024;

let _s3: S3Client | null = null;
// WHEN_REQUIRED: otherwise the SDK signs a CRC32 of the (empty) presign body into the URL and S3 rejects the browser's PUT.
const s3 = () => (_s3 ??= new S3Client({ region: process.env.AWS_REGION, requestChecksumCalculation: "WHEN_REQUIRED" }));
const bucket = () => {
  if (!process.env.S3_BUCKET) throw new Error("S3_BUCKET is not set");
  return process.env.S3_BUCKET;
};

const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120) || "file";

export function submissionFolder(submissionId: string, createdAt = new Date()) {
  const y = createdAt.getUTCFullYear();
  const m = String(createdAt.getUTCMonth() + 1).padStart(2, "0");
  return `${PREFIX}/${y}/${m}/${submissionId}`;
}

export function buildFileKey(opts: { submissionId: string; startedAt?: string; sectorId: string; itemId: string; fileName: string }) {
  const folder = submissionFolder(opts.submissionId, opts.startedAt ? new Date(opts.startedAt) : new Date());
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
  return `${folder}/${safe(opts.sectorId)}/${safe(opts.itemId)}/${stamp}-${safe(opts.fileName)}`;
}

export function checkFile(name: string, size: number) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) return `File type .${ext} is not allowed`;
  if (size > MAX_BYTES) return `File is larger than ${MAX_BYTES / 1024 / 1024} MB`;
  return null;
}

/** Keys must stay inside our prefix — blocks path traversal on local disk. */
export function assertKey(key: string) {
  if (!key.startsWith(PREFIX + "/") || key.includes("..") || key.includes("\\")) throw new Error("Invalid key");
}

/** Where the browser should PUT the file. S3: presigned URL (direct, no server hop). Local: our API. */
export async function getUploadTarget(key: string, contentType: string) {
  assertKey(key);
  if (MODE === "aws") {
    const url = await getSignedUrl(s3(), new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }), { expiresIn: 900 });
    return { url, headers: { "Content-Type": contentType } };
  }
  return { url: `/api/uploads/local?key=${encodeURIComponent(key)}`, headers: { "Content-Type": contentType } };
}

export async function writeLocal(key: string, body: ArrayBuffer | Buffer | string) {
  assertKey(key);
  const full = path.join(LOCAL_ROOT, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, typeof body === "string" ? body : Buffer.from(body as ArrayBuffer));
}

export async function putJson(key: string, data: unknown) {
  assertKey(key);
  const body = JSON.stringify(data, null, 2);
  if (MODE === "aws") {
    await s3().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: "application/json" }));
  } else {
    await writeLocal(key, body);
  }
}

/** Admin download: S3 → short-lived presigned GET; local → stream from disk. */
export async function getDownloadUrl(key: string, fileName: string) {
  assertKey(key);
  if (MODE === "aws") {
    return getSignedUrl(
      s3(),
      new GetObjectCommand({ Bucket: bucket(), Key: key, ResponseContentDisposition: `attachment; filename="${safe(fileName)}"` }),
      { expiresIn: 300 },
    );
  }
  return null;
}

export async function openLocal(key: string) {
  assertKey(key);
  const full = path.join(LOCAL_ROOT, key);
  const stat = await fs.stat(full);
  return { stream: createReadStream(full), size: stat.size };
}

/** Remove everything under a submission folder ({prefix}/{YYYY}/{MM}/{submissionId}/). */
export async function deleteFolder(folder: string) {
  const prefix = folder.replace(/\/+$/, "") + "/";
  assertKey(prefix);
  if (MODE === "aws") {
    let token: string | undefined;
    do {
      const r = await s3().send(new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefix, ContinuationToken: token }));
      const objects = (r.Contents ?? []).map((o) => ({ Key: o.Key! }));
      if (objects.length) await s3().send(new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: objects, Quiet: true } }));
      token = r.NextContinuationToken;
    } while (token);
  } else {
    await fs.rm(path.join(LOCAL_ROOT, prefix), { recursive: true, force: true });
  }
}
