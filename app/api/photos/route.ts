import { bucket, db, fail, ownerFor, serverError } from "@/lib/server";

export async function POST(request: Request) {
  const owner = ownerFor(request);
  if (!owner) return fail("Sign in to upload photos.", 401);
  try {
    const form = await request.formData();
    const documentId = String(form.get("documentId") || "");
    const file = form.get("file");
    if (!(file instanceof File) || !file.type.startsWith("image/")) return fail("Choose an image.");
    if (file.size > 10 * 1024 * 1024) return fail("Photos must be under 10 MB.");
    const exists = await db().prepare("SELECT id FROM documents WHERE id=? AND owner=?").bind(documentId,owner).first();
    if (!exists) return fail("Save the document before adding photos.");
    const id = crypto.randomUUID();
    const key = owner + "/" + documentId + "/" + id;
    await bucket().put(key, file.stream(), { httpMetadata: { contentType: file.type } });
    await db().prepare("INSERT INTO photos (id,owner,document_id,key,filename,mime,size,created_at) VALUES (?,?,?,?,?,?,?,?)")
      .bind(id,owner,documentId,key,file.name.slice(0,200),file.type,file.size,Date.now()).run();
    return Response.json({ id });
  } catch (error) { return serverError(error); }
}
export async function GET(request: Request) {
  const owner = ownerFor(request);
  if (!owner) return fail("Sign in to view photos.", 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("Photo id is required.");
  try {
    const row = await db().prepare("SELECT key,mime FROM photos WHERE id=? AND owner=?").bind(id,owner).first<{key:string;mime:string}>();
    if (!row) return fail("Photo not found.",404);
    const object = await bucket().get(row.key);
    if (!object) return fail("Photo not found.",404);
    return new Response(object.body, { headers: { "Content-Type": row.mime, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return serverError(error); }
}
export async function DELETE(request: Request) {
  const owner = ownerFor(request);
  if (!owner) return fail("Sign in to delete photos.",401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("Photo id is required.");
  try {
    const row = await db().prepare("SELECT key FROM photos WHERE id=? AND owner=?").bind(id,owner).first<{key:string}>();
    if (!row) return fail("Photo not found.",404);
    await bucket().delete(row.key);
    await db().prepare("DELETE FROM photos WHERE id=? AND owner=?").bind(id,owner).run();
    return Response.json({ ok:true });
  } catch (error) { return serverError(error); }
}

