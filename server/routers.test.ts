import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  getAllCategories: vi.fn().mockResolvedValue([
    { id: 1, name: "基礎工事", description: "基礎工事関連", icon: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getCategoryById: vi.fn().mockResolvedValue({ id: 1, name: "基礎工事", description: "基礎工事関連", icon: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() }),
  createCategory: vi.fn().mockResolvedValue({ id: 2 }),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
  getAllProcedures: vi.fn().mockResolvedValue([
    { id: 1, categoryId: 1, title: "設置手順A", description: "テスト", content: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getProceduresByCategory: vi.fn().mockResolvedValue([]),
  getProcedureById: vi.fn().mockResolvedValue({ id: 1, categoryId: 1, title: "設置手順A", description: "テスト", content: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() }),
  getStepsByProcedure: vi.fn().mockResolvedValue([]),
  createProcedure: vi.fn().mockResolvedValue({ id: 2 }),
  deleteProcedure: vi.fn().mockResolvedValue(undefined),
  getAllChecklists: vi.fn().mockResolvedValue([]),
  getChecklistsByCategory: vi.fn().mockResolvedValue([]),
  getChecklistById: vi.fn().mockResolvedValue({ id: 1, categoryId: 1, title: "チェックリストA", description: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() }),
  getItemsByChecklist: vi.fn().mockResolvedValue([]),
  createChecklist: vi.fn().mockResolvedValue({ id: 1 }),
  deleteChecklist: vi.fn().mockResolvedValue(undefined),
  createChecklistItem: vi.fn().mockResolvedValue({ id: 1 }),
  getAllDocuments: vi.fn().mockResolvedValue([]),
  getDocumentsByCategory: vi.fn().mockResolvedValue([]),
  getDocumentById: vi.fn().mockResolvedValue({ id: 1, categoryId: 1, title: "資料A", description: null, fileName: "test.pdf", fileKey: "k", fileUrl: "/url", mimeType: "application/pdf", fileSize: 1024, createdAt: new Date(), updatedAt: new Date() }),
  createDocument: vi.fn().mockResolvedValue({ id: 1 }),
  deleteDocument: vi.fn().mockResolvedValue(undefined),
  updateCategory: vi.fn().mockResolvedValue(undefined),
  updateProcedure: vi.fn().mockResolvedValue(undefined),
  updateProcedureStep: vi.fn().mockResolvedValue(undefined),
  createProcedureStep: vi.fn().mockResolvedValue({ id: 1 }),
  deleteProcedureStep: vi.fn().mockResolvedValue(undefined),
  updateChecklist: vi.fn().mockResolvedValue(undefined),
  updateChecklistItem: vi.fn().mockResolvedValue(undefined),
  deleteChecklistItem: vi.fn().mockResolvedValue(undefined),
  updateDocument: vi.fn().mockResolvedValue(undefined),
  searchAll: vi.fn().mockResolvedValue({ procedures: [], checklists: [], documents: [] }),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "documents/test.pdf", url: "/manus-storage/test.pdf" }),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "normal-user",
      email: "user@example.com",
      name: "User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("categories router", () => {
  it("lists categories publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.categories.list();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("基礎工事");
  });

  it("allows admin to create category", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.categories.create({ name: "電気工事", description: "電気関連" });
    expect(result).toHaveProperty("id");
  });

  it("denies non-admin from creating category", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.categories.create({ name: "test" })).rejects.toThrow();
  });

  it("denies unauthenticated from creating category", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.categories.create({ name: "test" })).rejects.toThrow();
  });
});

describe("procedures router", () => {
  it("lists procedures publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.procedures.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("gets procedure by id publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.procedures.getById({ id: 1 });
    expect(result.title).toBe("設置手順A");
    expect(result).toHaveProperty("steps");
  });

  it("allows admin to create procedure", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.procedures.create({ categoryId: 1, title: "新手順" });
    expect(result).toHaveProperty("id");
  });

  it("denies non-admin from creating procedure", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.procedures.create({ categoryId: 1, title: "test" })).rejects.toThrow();
  });
});

describe("checklists router", () => {
  it("lists checklists publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.checklists.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to create checklist", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.checklists.create({ categoryId: 1, title: "新チェックリスト" });
    expect(result).toHaveProperty("id");
  });

  it("denies non-admin from deleting checklist", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.checklists.delete({ id: 1 })).rejects.toThrow();
  });
});

describe("documents router", () => {
  it("lists documents publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.documents.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to upload document", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.documents.upload({
      categoryId: 1,
      title: "テスト資料",
      fileName: "test.pdf",
      fileData: Buffer.from("test content").toString("base64"),
      mimeType: "application/pdf",
      fileSize: 12,
    });
    expect(result).toHaveProperty("id");
  });

  it("denies non-admin from uploading", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.documents.upload({
      categoryId: 1,
      title: "test",
      fileName: "test.pdf",
      fileData: "dGVzdA==",
    })).rejects.toThrow();
  });
});

describe("search router", () => {
  it("searches publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.search.query({ q: "設置" });
    expect(result).toHaveProperty("procedures");
    expect(result).toHaveProperty("checklists");
    expect(result).toHaveProperty("documents");
  });
});
