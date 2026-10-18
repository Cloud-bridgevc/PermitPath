import { MemoryRepository } from "./memory.ts";
import type { Repository } from "./repository.ts";

const g = globalThis as unknown as { __permitpathRepo?: Repository };

/** Lambdas receive a Secrets Manager ARN instead of a plaintext connection string. */
async function resolveDatabaseUrl(): Promise<string | undefined> {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!process.env.DATABASE_SECRET_ARN) return undefined;
  const { SecretsManagerClient, GetSecretValueCommand } = await import("@aws-sdk/client-secrets-manager");
  const out = await new SecretsManagerClient({}).send(new GetSecretValueCommand({ SecretId: process.env.DATABASE_SECRET_ARN }));
  const raw = out.SecretString ?? "";
  process.env.DATABASE_URL = raw.startsWith("{") ? (JSON.parse(raw) as { DATABASE_URL: string }).DATABASE_URL : raw;
  return process.env.DATABASE_URL;
}

export async function getRepo(): Promise<Repository> {
  if (g.__permitpathRepo) return g.__permitpathRepo;
  if (await resolveDatabaseUrl()) {
    const [{ Pool }, { PostgresRepository }] = await Promise.all([import("pg"), import("./postgres.ts")]);
    g.__permitpathRepo = new PostgresRepository(new Pool({ connectionString: process.env.DATABASE_URL, max: 5 }));
  } else {
    g.__permitpathRepo = new MemoryRepository();
  }
  return g.__permitpathRepo;
}

export function isDemoData(): boolean {
  return !process.env.DATABASE_URL && !process.env.DATABASE_SECRET_ARN;
}

export type { Repository } from "./repository.ts";
