import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  company: text("company").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  billingAddress: text("billing_address").notNull().default(""),
  siteAddress: text("site_address").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (t) => [index("idx_clients_owner_name").on(t.owner, t.name)]);

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  clientId: text("client_id"),
  kind: text("kind").notNull(),
  number: text("number").notNull(),
  title: text("title").notNull().default(""),
  status: text("status").notNull().default("draft"),
  issueDate: text("issue_date").notNull(),
  dueDate: text("due_date").notNull().default(""),
  province: text("province").notNull().default("ON"),
  taxRate: integer("tax_rate").notNull().default(13000),
  discountCents: integer("discount_cents").notNull().default(0),
  depositCents: integer("deposit_cents").notNull().default(0),
  notes: text("notes").notNull().default(""),
  terms: text("terms").notNull().default(""),
  itemsJson: text("items_json").notNull().default("[]"),
  clientSnapshotJson: text("client_snapshot_json").notNull().default("{}"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (t) => [index("idx_documents_owner_updated").on(t.owner, t.updatedAt), index("idx_documents_owner_client").on(t.owner, t.clientId)]);

export const settings = sqliteTable("settings", {
  owner: text("owner").primaryKey(),
  businessName: text("business_name").notNull().default("Grand Terra Group of Companies"),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  taxNumber: text("tax_number").notNull().default(""),
  paymentInstructions: text("payment_instructions").notNull().default(""),
  defaultTerms: text("default_terms").notNull().default(""),
  province: text("province").notNull().default("ON"),
});

export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  documentId: text("document_id").notNull(),
  key: text("key").notNull(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  createdAt: integer("created_at").notNull(),
}, (t) => [index("idx_photos_owner_document").on(t.owner, t.documentId)]);


