// Deterministic document validation. These checks only test facts PermitPath records
// (file type, linked requirement, recorded dates). They do not judge whether a document
// will be accepted by the authority.

import type { DocumentRecord, RequirementItem, ValidationCheck } from "../types.ts";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_BYTES = 50 * 1024 * 1024;

export function validateDocument(
  doc: DocumentRecord,
  item: RequirementItem | undefined,
  today: string,
): DocumentRecord["validation"] {
  const checks: ValidationCheck[] = [];

  checks.push(
    ALLOWED_MIME.has(doc.mimeType)
      ? { id: "file_type", label: "Supported file type", result: "pass" }
      : { id: "file_type", label: "Supported file type", result: "fail", detail: `${doc.mimeType} is not an accepted upload type.` },
  );

  checks.push(
    doc.sizeBytes <= MAX_BYTES
      ? { id: "size", label: "Within size limit", result: "pass" }
      : { id: "size", label: "Within size limit", result: "fail", detail: "File is larger than 50 MB." },
  );

  if (!item) {
    checks.push({ id: "linked", label: "Linked to a checklist requirement", result: "warn", detail: "Not linked to any requirement yet, so it does not count toward completeness." });
  } else {
    checks.push({ id: "linked", label: `Linked to ${item.code}`, result: "pass" });
    if (item.acceptedDocTypes.length > 0 && !item.acceptedDocTypes.includes(doc.docType)) {
      checks.push({
        id: "doc_type",
        label: "Document type matches requirement",
        result: "fail",
        detail: `${item.code} expects ${item.acceptedDocTypes.join(" or ")}; this file is tagged ${doc.docType}.`,
      });
    } else {
      checks.push({ id: "doc_type", label: "Document type matches requirement", result: "pass" });
    }
  }

  if (doc.expiresOn) {
    if (doc.expiresOn < today) {
      checks.push({
        id: "expiry",
        label: "Not expired",
        result: "fail",
        detail: `Recorded expiration date ${doc.expiresOn} is before today. ${item?.code ?? "The requirement"} asks for a current document.`,
      });
    } else {
      checks.push({ id: "expiry", label: "Not expired", result: "pass", detail: `Recorded expiration ${doc.expiresOn}.` });
    }
  }

  const state = checks.some((c) => c.result === "fail") ? "issues" : "passed";
  return { state, checks };
}
