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
export async function POST(request: Request): Promise<Response> {
  if (usingDatabase()) {
    return new Response("Not available with a database configured", { status: 404 });
  }

  // ?setup=incomplete gives back a person nobody has chosen an answer policy
  // for, which is the state the setup flow exists to handle and the one the
  // ordinary fixtures cannot express, because they ship a decided person.
  const setup = new URL(request.url).searchParams.get("setup");
  setRepository(new InMemoryRepository(new Date(), { answerPolicy: setup !== "incomplete" }));
  return new Response(null, { status: 204 });
}
