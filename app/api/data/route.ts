import { db, fail, ownerFor, serverError } from "@/lib/server";

const clientKeys = ["name", "company", "email", "phone", "billingAddress", "siteAddress", "notes"] as const;
const docKeys = ["clientId", "kind", "number", "title", "status", "issueDate", "dueDate", "province", "taxRate", "discountCents", "depositCents", "notes", "terms", "itemsJson", "clientSnapshotJson"] as const;
const settingKeys = ["businessName", "email", "phone", "address", "taxNumber", "paymentInstructions", "defaultTerms", "province"] as const;
type Payload = Record<string, unknown>;
const str = (v: unknown, max = 3000) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : 0;
const now = () => Date.now();
function pick<T extends readonly string[]>(value: Payload, keys: T) {
  return Object.fromEntries(keys.map(k => [k, value[k]]));
}
function clientRow(v: Payload) {
  return { name: str(v.name, 160), company: str(v.company, 160), email: str(v.email, 200), phone: str(v.phone, 80), billingAddress: str(v.billingAddress, 600), siteAddress: str(v.siteAddress, 600), notes: str(v.notes, 3000) };
}
function docRow(v: Payload) {
  const kind = v.kind === "invoice" ? "invoice" : "estimate";
  const statuses = kind === "invoice" ? ["draft", "sent", "partial", "paid", "overdue"] : ["draft", "sent", "accepted", "declined"];
  const status = statuses.includes(String(v.status)) ? String(v.status) : "draft";
  const items = Array.isArray(v.items) ? v.items.slice(0, 100).map((i: Payload) => ({
    id: str(i.id, 80) || crypto.randomUUID(), description: str(i.description, 500), quantity: Math.min(100000, Math.max(0, Number(i.quantity) || 0)),
    unit: str(i.unit, 30), unitPriceCents: num(i.unitPriceCents), taxable: i.taxable !== false
  })) : [];
  return {
    clientId: str(v.clientId, 80) || null, kind, number: str(v.number, 60), title: str(v.title, 200), status,
    issueDate: str(v.issueDate, 20), dueDate: str(v.dueDate, 20), province: str(v.province, 2).toUpperCase() || "ON",
    taxRate: Math.min(30000, num(v.taxRate)), discountCents: num(v.discountCents), depositCents: num(v.depositCents),
    notes: str(v.notes, 5000), terms: str(v.terms, 5000), itemsJson: JSON.stringify(items),
    clientSnapshotJson: JSON.stringify(v.clientSnapshot && typeof v.clientSnapshot === "object" ? v.clientSnapshot : {})
  };
}
function settingsRow(v: Payload) {
  return { businessName: str(v.businessName, 180), email: str(v.email, 200), phone: str(v.phone, 80),
    address: str(v.address, 600), taxNumber: str(v.taxNumber, 100), paymentInstructions: str(v.paymentInstructions, 1500),
    defaultTerms: str(v.defaultTerms, 1500), province: str(v.province, 2).toUpperCase() || "ON" };
}
const json = (data: unknown) => Response.json(data, { headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  const owner = ownerFor(request);
  if (!owner) return fail("Sign in to access your records.", 401);
  try {
    const database = db();
    const [clients, documents, photos, settings] = await Promise.all([
      database.prepare("SELECT * FROM clients WHERE owner = ? ORDER BY name COLLATE NOCASE").bind(owner).all(),
      database.prepare("SELECT * FROM documents WHERE owner = ? ORDER BY updated_at DESC").bind(owner).all(),
      database.prepare("SELECT id, document_id, filename, mime, size, created_at FROM photos WHERE owner = ? ORDER BY created_at DESC").bind(owner).all(),
      database.prepare("SELECT * FROM settings WHERE owner = ?").bind(owner).first()
    ]);
    return json({ clients: clients.results, documents: documents.results, photos: photos.results, settings });
  } catch (error) { return serverError(error); }
}
export async function POST(request: Request) {
  const owner = ownerFor(request);
  if (!owner) return fail("Sign in to save records.", 401);
  let body: Payload;
  try { body = await request.json() as Payload; } catch { return fail("Invalid request."); }
  const action = str(body.action, 50);
  const value = body.value && typeof body.value === "object" ? body.value as Payload : {};
  const id = str(body.id, 80);
  const database = db();
  try {
    if (action === "saveClient") {
      const c = clientRow(value);
      if (!c.name) return fail("Client name is required.");
      const clientId = id || crypto.randomUUID();
      const existing = id ? await database.prepare("SELECT id FROM clients WHERE id = ? AND owner = ?").bind(id, owner).first() : null;
      if (id && !existing) return fail("Client not found.", 404);
      if (existing) await database.prepare("UPDATE clients SET name=?, company=?, email=?, phone=?, billing_address=?, site_address=?, notes=?, updated_at=? WHERE id=? AND owner=?")
        .bind(c.name,c.company,c.email,c.phone,c.billingAddress,c.siteAddress,c.notes,now(),id,owner).run();
      else await database.prepare("INSERT INTO clients (id,owner,name,company,email,phone,billing_address,site_address,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .bind(clientId,owner,c.name,c.company,c.email,c.phone,c.billingAddress,c.siteAddress,c.notes,now(),now()).run();
      return json({ id: clientId });
    }
    if (action === "deleteClient") {
      if (!id) return fail("Client id is required.");
      await database.prepare("DELETE FROM clients WHERE id=? AND owner=?").bind(id,owner).run();
      return json({ ok: true });
    }
    if (action === "saveDocument") {
      const d = docRow(value);
      if (!d.number || !d.issueDate) return fail("Document number and issue date are required.");
      if (d.clientId) {
        const client = await database.prepare("SELECT id FROM clients WHERE id=? AND owner=?").bind(d.clientId,owner).first();
        if (!client) return fail("Select a saved client.");
      }
      const documentId = id || crypto.randomUUID();
      const existing = id ? await database.prepare("SELECT id FROM documents WHERE id=? AND owner=?").bind(id,owner).first() : null;
      if (id && !existing) return fail("Document not found.",404);
      if (existing) await database.prepare("UPDATE documents SET client_id=?,kind=?,number=?,title=?,status=?,issue_date=?,due_date=?,province=?,tax_rate=?,discount_cents=?,deposit_cents=?,notes=?,terms=?,items_json=?,client_snapshot_json=?,updated_at=? WHERE id=? AND owner=?")
        .bind(d.clientId,d.kind,d.number,d.title,d.status,d.issueDate,d.dueDate,d.province,d.taxRate,d.discountCents,d.depositCents,d.notes,d.terms,d.itemsJson,d.clientSnapshotJson,now(),id,owner).run();
      else await database.prepare("INSERT INTO documents (id,owner,client_id,kind,number,title,status,issue_date,due_date,province,tax_rate,discount_cents,deposit_cents,notes,terms,items_json,client_snapshot_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(documentId,owner,d.clientId,d.kind,d.number,d.title,d.status,d.issueDate,d.dueDate,d.province,d.taxRate,d.discountCents,d.depositCents,d.notes,d.terms,d.itemsJson,d.clientSnapshotJson,now(),now()).run();
      return json({ id: documentId });
    }
    if (action === "deleteDocument") {
      if (!id) return fail("Document id is required.");
      const photos = await database.prepare("SELECT key FROM photos WHERE document_id=? AND owner=?").bind(id,owner).all();
      const { bucket } = await import("@/lib/server");
      await Promise.all(photos.results.map(p => bucket().delete(String(p.key))));
      await database.prepare("DELETE FROM photos WHERE document_id=? AND owner=?").bind(id,owner).run();
      await database.prepare("DELETE FROM documents WHERE id=? AND owner=?").bind(id,owner).run();
      return json({ ok: true });
    }
    if (action === "saveSettings") {
      const s = settingsRow(value);
      await database.prepare("INSERT INTO settings (owner,business_name,email,phone,address,tax_number,payment_instructions,default_terms,province) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(owner) DO UPDATE SET business_name=excluded.business_name,email=excluded.email,phone=excluded.phone,address=excluded.address,tax_number=excluded.tax_number,payment_instructions=excluded.payment_instructions,default_terms=excluded.default_terms,province=excluded.province")
        .bind(owner,s.businessName,s.email,s.phone,s.address,s.taxNumber,s.paymentInstructions,s.defaultTerms,s.province).run();
      return json({ ok: true });
    }
    return fail("Unknown action.");
  } catch (error) { return serverError(error); }
}


