// Supporting-document storage on Amazon S3.
// Bucket policy (see infra/template.yaml): private, versioned, SSE-KMS, TLS-only.
// Without PERMITPATH_DOCS_BUCKET the demo keeps bytes in process memory.

import { createHash } from "node:crypto";

const mem = new Map<string, { body: Uint8Array; contentType: string }>();

export function s3Enabled() {
  return Boolean(process.env.PERMITPATH_DOCS_BUCKET);
}

export function documentKey(orgId: string, applicationId: string, documentId: string, fileName: string) {
  const safe = fileName.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120);
  return `tenants/${orgId}/applications/${applicationId}/${documentId}/${safe}`;
}

export async function putDocument(key: string, body: Uint8Array, contentType: string): Promise<{ sha256: string; versionId?: string }> {
  const sha256 = createHash("sha256").update(body).digest("hex");
  if (!s3Enabled()) {
    mem.set(key, { body, contentType });
    return { sha256 };
  }
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({ region: process.env.AWS_REGION });
  const out = await s3.send(
    new PutObjectCommand({
      Bucket: process.env.PERMITPATH_DOCS_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ServerSideEncryption: "aws:kms",
      ChecksumSHA256: Buffer.from(sha256, "hex").toString("base64"),
      Metadata: { sha256 },
    }),
  );
  return { sha256, versionId: out.VersionId };
}

/** Short-lived download link. Never expose bucket objects publicly. */
export async function downloadUrl(key: string): Promise<string | undefined> {
  if (!s3Enabled()) return undefined; // demo: bytes stay in memory, no download link
  const [{ S3Client, GetObjectCommand }, { getSignedUrl }] = await Promise.all([
    import("@aws-sdk/client-s3"),
    import("@aws-sdk/s3-request-presigner"),
  ]);
  const s3 = new S3Client({ region: process.env.AWS_REGION });
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.PERMITPATH_DOCS_BUCKET, Key: key }), { expiresIn: 300 });
}
