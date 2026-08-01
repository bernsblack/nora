import { setRepository, usingDatabase } from "@/data";
import { InMemoryRepository } from "@/data/memory-repository";

/**
 * Put the fixtures back. The in memory repository is shared by every request in
 * the process, so a browser test that adds a note or revokes a device changes
 * what the next test sees. This gives each test a clean room.
 *
 * It only exists while there is no database. Once DATABASE_URL is set this
 * route is gone, and browser tests will need a branch database per run instead,
 * which is what the Neon branch per PR is for.
 */
export async function POST(): Promise<Response> {
  if (usingDatabase()) {
    return new Response("Not available with a database configured", { status: 404 });
  }
  setRepository(new InMemoryRepository());
  return new Response(null, { status: 204 });
}
