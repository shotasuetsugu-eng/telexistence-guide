import { integer, pgEnum, pgTable, serial, text, timestamp, varchar, boolean } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: text().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Categories - 設置業務の工程カテゴリ
 */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 64 }),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Procedures - 手順書
 */
export const procedures = pgTable("procedures", {
  id: serial("id").primaryKey(),
  categoryId: integer("categoryId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  content: text("content"), // Markdown/JSON content for steps
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Procedure = typeof procedures.$inferSelect;
export type InsertProcedure = typeof procedures.$inferInsert;

/**
 * Procedure Steps - 手順書の各ステップ
 */
export const procedureSteps = pgTable("procedure_steps", {
  id: serial("id").primaryKey(),
  procedureId: integer("procedureId").notNull(),
  stepNumber: integer("stepNumber").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ProcedureStep = typeof procedureSteps.$inferSelect;
export type InsertProcedureStep = typeof procedureSteps.$inferInsert;

/**
 * Checklists - チェックリスト
 */
export const checklists = pgTable("checklists", {
  id: serial("id").primaryKey(),
  categoryId: integer("categoryId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Checklist = typeof checklists.$inferSelect;
export type InsertChecklist = typeof checklists.$inferInsert;

/**
 * Checklist Items - チェック項目
 */
export const checklistItems = pgTable("checklist_items", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklistId").notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = typeof checklistItems.$inferInsert;

/**
 * Documents - 資料（PDF・画像など）
 */
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  categoryId: integer("categoryId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  fileKey: varchar("fileKey", { length: 1000 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  mimeType: varchar("mimeType", { length: 128 }),
  fileSize: integer("fileSize"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
