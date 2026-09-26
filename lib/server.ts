import { env } from "cloudflare:workers";

export function ownerFor(request: Request) {
  const owner = request.headers.get("oai-authenticated-user-id");
  if (owner) return owner;
  const host = new URL(request.url).hostname;
  if (host === "localhost" || host === "127.0.0.1") return "local-preview";
  return null;
}
export function db() {
  if (!env.DB) throw new Error("Database is unavailable");
  return env.DB;
}
export function bucket() {
  if (!env.BUCKET) throw new Error("Photo storage is unavailable");
  return env.BUCKET;
}
export function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
export function serverError(error: unknown) {
  console.error(error);
  return fail("The service is temporarily unavailable. Your changes have not been saved.", 503);
}

