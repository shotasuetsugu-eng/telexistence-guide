import { eq, like, or, desc, asc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser, users,
  categories, InsertCategory,
  procedures, InsertProcedure,
  procedureSteps, InsertProcedureStep,
  checklists, InsertChecklist,
  checklistItems, InsertChecklistItem,
  documents, mapStores, InsertDocument,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

type UpsertUser = Omit<InsertUser, "role"> & Partial<Pick<InsertUser, "role">>;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL!);
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ===== USER =====
export async function isAdminEmailAllowed(email?: string | null): Promise<boolean> {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  if (ENV.ownerEmail && normalizedEmail === ENV.ownerEmail) return true;
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  return result[0]?.role === "admin";
}

export async function upsertUser(user: UpsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId, role: user.role ?? "user" };
    const updateSet: Partial<InsertUser> = {};
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
  const isAllowedAdmin = await isAdminEmailAllowed(user.email);
  if (isAllowedAdmin) {
    values.role = "admin";
    updateSet.role = "admin";
  }
    else if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
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
  await ensureMapStoresTable(db);
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
  await ensureMapStoresTable(db);
  const result = await db.insert(categories).values(data).returning({ id: categories.id });
  return { id: result[0].id };
}

export async function updateCategory(id: number, data: Partial<InsertCategory>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await ensureMapStoresTable(db);
  await db.update(categories).set(data).where(eq(categories.id, id));
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await ensureMapStoresTable(db);
  await db.delete(categories).where(eq(categories.id, id));
}

// ===== PROCEDURES =====
export async function getProceduresByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  await ensureMapStoresTable(db);
  return db.select().from(procedures).where(eq(procedures.categoryId, categoryId)).orderBy(asc(procedures.sortOrder));
}

export async function getAllProcedures() {
  const db = await getDb();
  if (!db) return [];
  await ensureMapStoresTable(db);
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
  await ensureMapStoresTable(db);
  const result = await db.insert(procedures).values(data).returning({ id: procedures.id });
  return { id: result[0].id };
}

export async function updateProcedure(id: number, data: Partial<InsertProcedure>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await ensureMapStoresTable(db);
  await db.update(procedures).set(data).where(eq(procedures.id, id));
}

export async function deleteProcedure(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await ensureMapStoresTable(db);
  await db.delete(procedureSteps).where(eq(procedureSteps.procedureId, id));
  await db.delete(procedures).where(eq(procedures.id, id));
}

// ===== PROCEDURE STEPS =====
export async function getStepsByProcedure(procedureId: number) {
  const db = await getDb();
  if (!db) return [];
  await ensureMapStoresTable(db);
  return db.select().from(procedureSteps).where(eq(procedureSteps.procedureId, procedureId)).orderBy(asc(procedureSteps.stepNumber));
}

export async function createProcedureStep(data: InsertProcedureStep) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await ensureMapStoresTable(db);
  const result = await db.insert(procedureSteps).values(data).returning({ id: procedureSteps.id });
  return { id: result[0].id };
}

export async function updateProcedureStep(id: number, data: Partial<InsertProcedureStep>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await ensureMapStoresTable(db);
  await db.update(procedureSteps).set(data).where(eq(procedureSteps.id, id));
}

export async function deleteProcedureStep(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await ensureMapStoresTable(db);
  await db.delete(procedureSteps).where(eq(procedureSteps.id, id));
}

// ===== CHECKLISTS =====
export async function getChecklistsByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  await ensureMapStoresTable(db);
  return db.select().from(checklists).where(eq(checklists.categoryId, categoryId)).orderBy(asc(checklists.sortOrder));
}

export async function getAllChecklists() {
  const db = await getDb();
  if (!db) return [];
  await ensureMapStoresTable(db);
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
  await ensureMapStoresTable(db);
  const result = await db.insert(checklists).values(data).returning({ id: checklists.id });
  return { id: result[0].id };
}

export async function updateChecklist(id: number, data: Partial<InsertChecklist>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await ensureMapStoresTable(db);
  await db.update(checklists).set(data).where(eq(checklists.id, id));
}

export async function deleteChecklist(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await ensureMapStoresTable(db);
  await db.delete(checklistItems).where(eq(checklistItems.checklistId, id));
  await db.delete(checklists).where(eq(checklists.id, id));
}

// ===== CHECKLIST ITEMS =====
export async function getItemsByChecklist(checklistId: number) {
  const db = await getDb();
  if (!db) return [];
  await ensureMapStoresTable(db);
  return db.select().from(checklistItems).where(eq(checklistItems.checklistId, checklistId)).orderBy(asc(checklistItems.sortOrder));
}

export async function createChecklistItem(data: InsertChecklistItem) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await ensureMapStoresTable(db);
  const result = await db.insert(checklistItems).values(data).returning({ id: checklistItems.id });
  return { id: result[0].id };
}

export async function updateChecklistItem(id: number, data: Partial<InsertChecklistItem>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await ensureMapStoresTable(db);
  await db.update(checklistItems).set(data).where(eq(checklistItems.id, id));
}

export async function deleteChecklistItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await ensureMapStoresTable(db);
  await db.delete(checklistItems).where(eq(checklistItems.id, id));
}

// ===== DOCUMENTS =====
export async function getDocumentsByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  await ensureMapStoresTable(db);
  return db.select().from(documents).where(eq(documents.categoryId, categoryId)).orderBy(desc(documents.createdAt));
}

export async function getAllDocuments() {
  const db = await getDb();
  if (!db) return [];
  await ensureMapStoresTable(db);
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
  await ensureMapStoresTable(db);
  const result = await db.insert(documents).values(data).returning({ id: documents.id });
  return { id: result[0].id };
}

export async function updateDocument(id: number, data: Partial<InsertDocument>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await ensureMapStoresTable(db);
  await db.update(documents).set(data).where(eq(documents.id, id));
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await ensureMapStoresTable(db);
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




/** ===== MAP STORES ===== */
async function ensureMapStoresTable(db: any) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS map_stores (
      id SERIAL PRIMARY KEY,
      chain varchar(50) NOT NULL,
      name varchar(500) NOT NULL,
      address text NOT NULL,
      lat text NOT NULL,
      lng text NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );
  `);
}

export async function getMapStores() {
  const db = await getDb();
  if (!db) return [];
  await ensureMapStoresTable(db);
  return db.select().from(mapStores).orderBy(mapStores.id);
}

export async function createMapStore(data: {
  chain: string;
  name: string;
  address: string;
  lat: string;
  lng: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await ensureMapStoresTable(db);
  const result = await db.insert(mapStores).values(data).returning({ id: mapStores.id });
  return { id: result[0].id };
}

export async function deleteMapStore(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await ensureMapStoresTable(db);
  await db.delete(mapStores).where(eq(mapStores.id, id));
}

export async function updateMapStoreName(id: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await ensureMapStoresTable(db);

  await db
    .update(mapStores)
    .set({
      name,
      updatedAt: new Date(),
    })
    .where(eq(mapStores.id, id));
}

/** ===== MAP STORE API ROUTES ===== */
export function registerMapStoreApiRoutes(app: any) {
  app.get("/api/map-stores", async (_req: any, res: any) => {
    try {
      const stores = await getMapStores();
      res.json(stores);
    } catch (error: any) {
      res.status(500).json({ error: error.message ?? "Failed to get map stores" });
    }
  });

  app.post("/api/map-stores", async (req: any, res: any) => {
    try {
      const body = req.body ?? {};

      const data = {
        chain: String(body.chain ?? "7-Eleven"),
        name: String(body.name ?? "店舗名未設定"),
        address: String(body.address ?? body.mapsUrl ?? ""),
        lat: String(body.lat ?? body.location?.lat ?? "35.681236"),
        lng: String(body.lng ?? body.location?.lng ?? "139.767125"),
      };

      const result = await createMapStore(data);
      res.json(result);
    } catch (error: any) {
      console.error("Failed to create map store", error);
      res.status(500).json({ error: error.message ?? "Failed to create map store" });
    }
  });

  app.patch("/api/map-stores/:id/name", async (req: any, res: any) => {
    try {
      const name = String(req.body?.name ?? "").trim();

      if (!name) {
        res.status(400).json({ error: "name is required" });
        return;
      }

      await updateMapStoreName(Number(req.params.id), name);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message ?? "Failed to update map store name" });
    }
  });

  app.delete("/api/map-stores/:id", async (req: any, res: any) => {
    try {
      await deleteMapStore(Number(req.params.id));
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message ?? "Failed to delete map store" });
    }
  });

  app.get("/api/deploy-schedules", async (req: any, res: any) => {
    try {
      const db = await getDb();
      if (!db) {
        res.json([]);
        return;
      }
      await ensureDeploySchedulesTable(db);
      const month = String(req.query?.month ?? "");
      const whereMonth = /^\d{4}-\d{2}$/.test(month);
      const result = whereMonth
        ? await db.execute(sql`SELECT * FROM deploy_schedules WHERE to_char(deploy_date, 'YYYY-MM') = ${month} ORDER BY deploy_date ASC, id ASC`)
        : await db.execute(sql`SELECT * FROM deploy_schedules ORDER BY deploy_date ASC, id ASC`);
      res.json(normalizeDeployRows(result));
    } catch (error: any) {
      res.status(500).json({ error: error.message ?? "Failed to get deploy schedules" });
    }
  });

  app.post("/api/deploy-schedules", async (req: any, res: any) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await ensureDeploySchedulesTable(db);
      const body = req.body ?? {};
      const members = Array.isArray(body.members) ? body.members : [];
      const result = await db.execute(sql`
        INSERT INTO deploy_schedules (deploy_date, store_name, area, chain, work_type, description, members, start_time, memo)
        VALUES (${String(body.deployDate)}, ${String(body.storeName)}, ${String(body.area ?? "")}, ${String(body.chain ?? "")}, ${String(body.workType ?? "")}, ${String(body.description ?? "")}, ${JSON.stringify(members)}, ${body.startTime ? String(body.startTime) : null}, ${String(body.memo ?? "")})
        RETURNING id
      `);
      res.json({ id: getDeployRows(result)[0]?.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message ?? "Failed to create deploy schedule" });
    }
  });

  app.patch("/api/deploy-schedules/:id", async (req: any, res: any) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await ensureDeploySchedulesTable(db);
      const body = req.body ?? {};
      const members = Array.isArray(body.members) ? body.members : [];
      await db.execute(sql`
        UPDATE deploy_schedules SET
          deploy_date = ${String(body.deployDate)},
          store_name = ${String(body.storeName)},
          area = ${String(body.area ?? "")},
          chain = ${String(body.chain ?? "")},
          work_type = ${String(body.workType ?? "")},
          description = ${String(body.description ?? "")},
          members = ${JSON.stringify(members)},
          start_time = ${body.startTime ? String(body.startTime) : null},
          memo = ${String(body.memo ?? "")},
          updated_at = now()
        WHERE id = ${Number(req.params.id)}
      `);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message ?? "Failed to update deploy schedule" });
    }
  });

  app.patch("/api/deploy-schedules/:id/start", async (req: any, res: any) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await ensureDeploySchedulesTable(db);
      const startTime = String(req.body?.startTime ?? "").trim();
      await db.execute(sql`UPDATE deploy_schedules SET start_time = ${startTime}, updated_at = now() WHERE id = ${Number(req.params.id)}`);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message ?? "Failed to start deploy schedule" });
    }
  });

  app.patch("/api/deploy-schedules/:id/complete", async (req: any, res: any) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await ensureDeploySchedulesTable(db);
      await db.execute(sql`UPDATE deploy_schedules SET completed_at = now(), updated_at = now() WHERE id = ${Number(req.params.id)}`);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message ?? "Failed to complete deploy schedule" });
    }
  });

  app.delete("/api/deploy-schedules/:id", async (req: any, res: any) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await ensureDeploySchedulesTable(db);
      await db.execute(sql`DELETE FROM deploy_schedules WHERE id = ${Number(req.params.id)}`);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message ?? "Failed to delete deploy schedule" });
    }
  });

  app.get("/api/deploy-options", async (_req: any, res: any) => {
    try {
      const db = await getDb();
      if (!db) {
        res.json([]);
        return;
      }
      await ensureDeployOptionsTable(db);
      const result = await db.execute(sql`SELECT * FROM deploy_options ORDER BY field ASC, value ASC`);
      res.json(getDeployRows(result).map((row: any) => ({ id: row.id, field: row.field, value: row.value, imageUrl: row.image_url ?? "" })));
    } catch (error: any) {
      res.status(500).json({ error: error.message ?? "Failed to get deploy options" });
    }
  });

  app.post("/api/deploy-options", async (req: any, res: any) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await ensureDeployOptionsTable(db);
      const field = String(req.body?.field ?? "").trim();
      const value = String(req.body?.value ?? "").trim();
      const imageUrl = String(req.body?.imageUrl ?? "").trim();
      if (!field || !value) {
        res.status(400).json({ error: "field and value are required" });
        return;
      }
      const result = await db.execute(sql`
        INSERT INTO deploy_options (field, value, image_url)
        VALUES (${field}, ${value}, ${imageUrl})
        ON CONFLICT (field, value) DO UPDATE SET image_url = EXCLUDED.image_url, updated_at = now()
        RETURNING id
      `);
      res.json({ id: getDeployRows(result)[0]?.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message ?? "Failed to create deploy option" });
    }
  });

  app.delete("/api/deploy-options/:id", async (req: any, res: any) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await ensureDeployOptionsTable(db);
      await db.execute(sql`DELETE FROM deploy_options WHERE id = ${Number(req.params.id)}`);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message ?? "Failed to delete deploy option" });
    }
  });
}

async function ensureDeploySchedulesTable(db: any) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS deploy_schedules (
      id SERIAL PRIMARY KEY,
      deploy_date date NOT NULL,
      store_name text NOT NULL,
      area text DEFAULT '' NOT NULL,
      chain varchar(50) DEFAULT '' NOT NULL,
      work_type text DEFAULT '' NOT NULL,
      description text DEFAULT '' NOT NULL,
      members text DEFAULT '[]' NOT NULL,
      start_time varchar(20),
      completed_at timestamp,
      memo text DEFAULT '' NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );
  `);
}

async function ensureDeployOptionsTable(db: any) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS deploy_options (
      id SERIAL PRIMARY KEY,
      field varchar(50) NOT NULL,
      value text NOT NULL,
      image_url text DEFAULT '' NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      UNIQUE(field, value)
    );
  `);
  await db.execute(sql`ALTER TABLE deploy_options ADD COLUMN IF NOT EXISTS image_url text DEFAULT '' NOT NULL`);
}

function getDeployRows(result: any) {
  return Array.isArray(result) ? result : result?.rows ?? [];
}

function normalizeDeployRows(result: any) {
  return getDeployRows(result).map((row: any) => ({
    id: row.id,
    deployDate: row.deploy_date,
    storeName: row.store_name,
    area: row.area,
    chain: row.chain,
    workType: row.work_type,
    description: row.description,
    members: parseDeployMembers(row.members),
    startTime: row.start_time,
    completedAt: row.completed_at,
    memo: row.memo,
  }));
}

function parseDeployMembers(value: unknown) {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}









