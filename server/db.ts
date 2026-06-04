import { eq, like, or, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  InsertUser, users,
  categories, InsertCategory,
  procedures, InsertProcedure,
  procedureSteps, InsertProcedureStep,
  checklists, InsertChecklist,
  checklistItems, InsertChecklistItem,
  documents, InsertDocument,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ===== USER =====
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    const adminEmails = new Set(["shota.suetsugu@tx-inc.com"]);
    const normalizedEmail = user.email?.trim().toLowerCase();
    if (normalizedEmail && adminEmails.has(normalizedEmail)) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    else if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserRole(openId: string, role: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.openId, openId));
}

// ===== CATEGORIES =====
export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(asc(categories.sortOrder));
}

export async function getCategoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return result[0];
}

export async function createCategory(data: InsertCategory) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(categories).values(data);
  return { id: result[0].insertId };
}

export async function updateCategory(id: number, data: Partial<InsertCategory>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(categories).set(data).where(eq(categories.id, id));
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(categories).where(eq(categories.id, id));
}

// ===== PROCEDURES =====
export async function getProceduresByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(procedures).where(eq(procedures.categoryId, categoryId)).orderBy(asc(procedures.sortOrder));
}

export async function getAllProcedures() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(procedures).orderBy(asc(procedures.sortOrder));
}

export async function getProcedureById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(procedures).where(eq(procedures.id, id)).limit(1);
  return result[0];
}

export async function createProcedure(data: InsertProcedure) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(procedures).values(data);
  return { id: result[0].insertId };
}

export async function updateProcedure(id: number, data: Partial<InsertProcedure>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(procedures).set(data).where(eq(procedures.id, id));
}

export async function deleteProcedure(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(procedureSteps).where(eq(procedureSteps.procedureId, id));
  await db.delete(procedures).where(eq(procedures.id, id));
}

// ===== PROCEDURE STEPS =====
export async function getStepsByProcedure(procedureId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(procedureSteps).where(eq(procedureSteps.procedureId, procedureId)).orderBy(asc(procedureSteps.stepNumber));
}

export async function createProcedureStep(data: InsertProcedureStep) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(procedureSteps).values(data);
  return { id: result[0].insertId };
}

export async function updateProcedureStep(id: number, data: Partial<InsertProcedureStep>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(procedureSteps).set(data).where(eq(procedureSteps.id, id));
}

export async function deleteProcedureStep(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(procedureSteps).where(eq(procedureSteps.id, id));
}

// ===== CHECKLISTS =====
export async function getChecklistsByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(checklists).where(eq(checklists.categoryId, categoryId)).orderBy(asc(checklists.sortOrder));
}

export async function getAllChecklists() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(checklists).orderBy(asc(checklists.sortOrder));
}

export async function getChecklistById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(checklists).where(eq(checklists.id, id)).limit(1);
  return result[0];
}

export async function createChecklist(data: InsertChecklist) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(checklists).values(data);
  return { id: result[0].insertId };
}

export async function updateChecklist(id: number, data: Partial<InsertChecklist>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(checklists).set(data).where(eq(checklists.id, id));
}

export async function deleteChecklist(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(checklistItems).where(eq(checklistItems.checklistId, id));
  await db.delete(checklists).where(eq(checklists.id, id));
}

// ===== CHECKLIST ITEMS =====
export async function getItemsByChecklist(checklistId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(checklistItems).where(eq(checklistItems.checklistId, checklistId)).orderBy(asc(checklistItems.sortOrder));
}

export async function createChecklistItem(data: InsertChecklistItem) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(checklistItems).values(data);
  return { id: result[0].insertId };
}

export async function updateChecklistItem(id: number, data: Partial<InsertChecklistItem>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(checklistItems).set(data).where(eq(checklistItems.id, id));
}

export async function deleteChecklistItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(checklistItems).where(eq(checklistItems.id, id));
}

// ===== DOCUMENTS =====
export async function getDocumentsByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).where(eq(documents.categoryId, categoryId)).orderBy(desc(documents.createdAt));
}

export async function getAllDocuments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).orderBy(desc(documents.createdAt));
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result[0];
}

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(documents).values(data);
  return { id: result[0].insertId };
}

export async function updateDocument(id: number, data: Partial<InsertDocument>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(documents).set(data).where(eq(documents.id, id));
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(documents).where(eq(documents.id, id));
}

// ===== SEARCH =====
export async function searchAll(query: string) {
  const db = await getDb();
  if (!db) return { procedures: [], checklists: [], documents: [] };
  const searchPattern = `%${query}%`;

  const procedureResults = await db.select().from(procedures).where(
    or(like(procedures.title, searchPattern), like(procedures.description, searchPattern), like(procedures.content, searchPattern))
  );
  const checklistResults = await db.select().from(checklists).where(
    or(like(checklists.title, searchPattern), like(checklists.description, searchPattern))
  );
  const documentResults = await db.select().from(documents).where(
    or(like(documents.title, searchPattern), like(documents.description, searchPattern), like(documents.fileName, searchPattern))
  );

  return { procedures: procedureResults, checklists: checklistResults, documents: documentResults };
}
