import { env } from "cloudflare:workers";

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


