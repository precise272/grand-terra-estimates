import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), name: text("name").notNull(),
  company: text("company").notNull().default(""), email: text("email").notNull().default(""), phone: text("phone").notNull().default(""),
  billingAddress: text("billing_address").notNull().default(""), siteAddress: text("site_address").notNull().default(""),
  notes: text("notes").notNull().default(""), createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
}, t => [index("idx_clients_owner_name").on(t.owner,t.name)]);

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), clientId: text("client_id"), kind: text("kind").notNull(),
  number: text("number").notNull(), title: text("title").notNull().default(""), status: text("status").notNull().default("draft"),
  issueDate: text("issue_date").notNull(), dueDate: text("due_date").notNull().default(""), province: text("province").notNull().default("ON"),
  taxRate: integer("tax_rate").notNull().default(13000), discountCents: integer("discount_cents").notNull().default(0),
  depositCents: integer("deposit_cents").notNull().default(0), notes: text("notes").notNull().default(""), terms: text("terms").notNull().default(""),
  itemsJson: text("items_json").notNull().default("[]"), clientSnapshotJson: text("client_snapshot_json").notNull().default("{}"),
  createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
}, t => [index("idx_documents_owner_updated").on(t.owner,t.updatedAt),index("idx_documents_owner_client").on(t.owner,t.clientId)]);

export const settings = sqliteTable("settings", {
  owner: text("owner").primaryKey(), businessName: text("business_name").notNull().default("Grand Terra Group of Companies"),
  email: text("email").notNull().default(""), phone: text("phone").notNull().default(""), address: text("address").notNull().default(""),
  taxNumber: text("tax_number").notNull().default(""), paymentInstructions: text("payment_instructions").notNull().default(""),
  defaultTerms: text("default_terms").notNull().default(""), province: text("province").notNull().default("ON"),
  logoKey: text("logo_key").notNull().default(""), accentColor: text("accent_color").notNull().default("#183f8f"),
  secondaryColor: text("secondary_color").notNull().default("#d8b36a"), documentStyle: text("document_style").notNull().default("classic"),
  footerText: text("footer_text").notNull().default(""), estimatePrefix: text("estimate_prefix").notNull().default("EST"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"), emailSubject: text("email_subject").notNull().default(""),
  emailMessage: text("email_message").notNull().default(""), preferencesJson: text("preferences_json").notNull().default("{}"), letterheadJson: text("letterhead_json").notNull().default("{}"),
});

export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), documentId: text("document_id").notNull(),
  key: text("key").notNull(), filename: text("filename").notNull(), mime: text("mime").notNull(),
  size: integer("size").notNull(), createdAt: integer("created_at").notNull(),
}, t => [index("idx_photos_owner_document").on(t.owner,t.documentId)]);

export const userProfiles = sqliteTable("user_profiles", {
  owner: text("owner").primaryKey(), displayName: text("display_name").notNull().default(""),
  jobTitle: text("job_title").notNull().default(""), phone: text("phone").notNull().default(""),
  signature: text("signature").notNull().default(""), updatedAt: integer("updated_at").notNull(),
});

export const catalogEntries = sqliteTable("catalog_entries", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), kind: text("kind").notNull(), name: text("name").notNull(),
  description: text("description").notNull().default(""), unit: text("unit").notNull().default("each"),
  unitPriceCents: integer("unit_price_cents").notNull().default(0),
  taxable: integer("taxable", { mode: "boolean" }).notNull().default(true),
  itemsJson: text("items_json").notNull().default("[]"),
  createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
}, t => [index("idx_catalog_owner_kind_name").on(t.owner,t.kind,t.name)]);


export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(), email: text("email").notNull().unique(), name: text("name").notNull(),
  passwordHash: text("password_hash"), googleSub: text("google_sub").unique(), emailVerified: integer("email_verified", {mode:"boolean"}).notNull().default(false),
  createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
});
export const authSessions = sqliteTable("auth_sessions", {
  tokenHash: text("token_hash").primaryKey(), accountId: text("account_id").notNull(),
  expiresAt: integer("expires_at").notNull(), createdAt: integer("created_at").notNull(), lastSeenAt: integer("last_seen_at").notNull(),
}, t => [index("idx_auth_sessions_account").on(t.accountId),index("idx_auth_sessions_expiry").on(t.expiresAt)]);
export const authAttempts = sqliteTable("auth_attempts", {
  key: text("key").primaryKey(), count: integer("count").notNull(), windowStart: integer("window_start").notNull(), lockedUntil: integer("locked_until").notNull(),
});
