import "server-only";
import { DrizzleRepository } from "./drizzle/repository";
import { InMemoryRepository } from "./memory-repository";
import type { NoraRepository } from "./repository";

/**
 * Which repository the process talks to. No DATABASE_URL means the in memory
 * one, which is the state of the world until Neon is provisioned. Nothing
 * needs a flag or a code change to switch, only the variable.
 *
 * The instance hangs off globalThis rather than a module level variable.
 * Route handlers and server components are bundled into separate module
 * registries, so a module level cache gives them one repository each, and the
 * in memory one would then hold two different sets of data that drift apart.
 * That is invisible with a real database and load bearing without one.
 */

const CACHE_KEY = Symbol.for("nora.repository");

type RepositoryHolder = { [CACHE_KEY]?: NoraRepository | null };

function holder(): RepositoryHolder {
  return globalThis as unknown as RepositoryHolder;
}

export function getRepository(): NoraRepository {
  const existing = holder()[CACHE_KEY];
  if (existing) return existing;

  const databaseUrl = process.env.DATABASE_URL;
  const created = databaseUrl
    ? DrizzleRepository.fromUrl(databaseUrl)
    : new InMemoryRepository();
  holder()[CACHE_KEY] = created;
  return created;
}

/** Tests and the fixture harness swap the repository through this. */
export function setRepository(repository: NoraRepository | null): void {
  holder()[CACHE_KEY] = repository;
}

export function usingDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export type { NoraRepository };
