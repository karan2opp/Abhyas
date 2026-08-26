import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const organisations = pgTable("organisations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  contactEmail: text("contact_email"),
  phone: text("phone"),
  address: text("address"),
  logoUrl: text("logo_url"),
  logoPublicId: text("logo_public_id"),
  // Invitation code a teacher or student enters to join this organisation.
  // Generated on demand by the manager and regenerable.
  joinCode: text("join_code").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Organisation = typeof organisations.$inferSelect;
export type NewOrganisation = typeof organisations.$inferInsert;
