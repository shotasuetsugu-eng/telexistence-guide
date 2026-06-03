import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { storagePut } from "./storage";
import { makeRequest, GeocodingResult, PlacesSearchResult } from "./_core/map";
import { ENV } from "./_core/env";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ===== CATEGORIES =====
  categories: router({
    list: publicProcedure.query(async () => {
      return db.getAllCategories();
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getCategoryById(input.id);
    }),
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      icon: z.string().optional(),
      sortOrder: z.number().optional(),
    })).mutation(async ({ input }) => {
      return db.createCategory({ name: input.name, description: input.description ?? null, icon: input.icon ?? null, sortOrder: input.sortOrder ?? 0 });
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      sortOrder: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateCategory(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteCategory(input.id);
      return { success: true };
    }),
  }),

  // ===== PROCEDURES =====
  procedures: router({
    list: publicProcedure.input(z.object({ categoryId: z.number().optional() }).optional()).query(async ({ input }) => {
      if (input?.categoryId) return db.getProceduresByCategory(input.categoryId);
      return db.getAllProcedures();
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const procedure = await db.getProcedureById(input.id);
      if (!procedure) throw new TRPCError({ code: "NOT_FOUND" });
      const steps = await db.getStepsByProcedure(input.id);
      return { ...procedure, steps };
    }),
    create: adminProcedure.input(z.object({
      categoryId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      content: z.string().optional(),
      sortOrder: z.number().optional(),
    })).mutation(async ({ input }) => {
      return db.createProcedure({
        categoryId: input.categoryId,
        title: input.title,
        description: input.description ?? null,
        content: input.content ?? null,
        sortOrder: input.sortOrder ?? 0,
      });
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      categoryId: z.number().optional(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      content: z.string().optional(),
      sortOrder: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateProcedure(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteProcedure(input.id);
      return { success: true };
    }),
  }),

  // ===== PROCEDURE STEPS =====
  procedureSteps: router({
    list: publicProcedure.input(z.object({ procedureId: z.number() })).query(async ({ input }) => {
      return db.getStepsByProcedure(input.procedureId);
    }),
    create: adminProcedure.input(z.object({
      procedureId: z.number(),
      stepNumber: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createProcedureStep({
        procedureId: input.procedureId,
        stepNumber: input.stepNumber,
        title: input.title,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
      });
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      stepNumber: z.number().optional(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateProcedureStep(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteProcedureStep(input.id);
      return { success: true };
    }),
  }),

  // ===== CHECKLISTS =====
  checklists: router({
    list: publicProcedure.input(z.object({ categoryId: z.number().optional() }).optional()).query(async ({ input }) => {
      if (input?.categoryId) return db.getChecklistsByCategory(input.categoryId);
      return db.getAllChecklists();
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const checklist = await db.getChecklistById(input.id);
      if (!checklist) throw new TRPCError({ code: "NOT_FOUND" });
      const items = await db.getItemsByChecklist(input.id);
      return { ...checklist, items };
    }),
    create: adminProcedure.input(z.object({
      categoryId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      sortOrder: z.number().optional(),
    })).mutation(async ({ input }) => {
      return db.createChecklist({
        categoryId: input.categoryId,
        title: input.title,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
      });
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      categoryId: z.number().optional(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      sortOrder: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateChecklist(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteChecklist(input.id);
      return { success: true };
    }),
  }),

  // ===== CHECKLIST ITEMS =====
  checklistItems: router({
    list: publicProcedure.input(z.object({ checklistId: z.number() })).query(async ({ input }) => {
      return db.getItemsByChecklist(input.checklistId);
    }),
    create: adminProcedure.input(z.object({
      checklistId: z.number(),
      content: z.string().min(1),
      sortOrder: z.number().optional(),
    })).mutation(async ({ input }) => {
      return db.createChecklistItem({
        checklistId: input.checklistId,
        content: input.content,
        sortOrder: input.sortOrder ?? 0,
      });
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      content: z.string().min(1).optional(),
      sortOrder: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateChecklistItem(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteChecklistItem(input.id);
      return { success: true };
    }),
  }),

  // ===== DOCUMENTS =====
  documents: router({
    list: publicProcedure.input(z.object({ categoryId: z.number().optional() }).optional()).query(async ({ input }) => {
      if (input?.categoryId) return db.getDocumentsByCategory(input.categoryId);
      return db.getAllDocuments();
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const doc = await db.getDocumentById(input.id);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
      return doc;
    }),
    upload: adminProcedure.input(z.object({
      categoryId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      fileName: z.string().min(1),
      fileData: z.string(), // base64 encoded
      mimeType: z.string().optional(),
      fileSize: z.number().optional(),
    })).mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileData, "base64");
      const fileKey = `documents/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType || "application/octet-stream");
      return db.createDocument({
        categoryId: input.categoryId,
        title: input.title,
        description: input.description ?? null,
        fileName: input.fileName,
        fileKey,
        fileUrl: url,
        mimeType: input.mimeType ?? null,
        fileSize: input.fileSize ?? buffer.length,
      });
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      categoryId: z.number().optional(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateDocument(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteDocument(input.id);
      return { success: true };
    }),
  }),

  // ===== SEARCH =====
  search: router({
    query: publicProcedure.input(z.object({ q: z.string().min(1) })).query(async ({ input }) => {
      return db.searchAll(input.q);
    }),
  }),

  // ===== GOOGLE MAPS =====
  maps: router({
    geocode: publicProcedure
      .input(z.object({ address: z.string().min(1) }))
      .query(async ({ input }) => {
        try {
          const result = await makeRequest<GeocodingResult>("/maps/api/geocode/json", {
            address: input.address,
            language: "ja",
          });
          if (result.status !== "OK" || result.results.length === 0) {
            return { results: [], status: result.status };
          }
          return result;
        } catch (e) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: String(e) });
        }
      }),
    searchPlaces: publicProcedure
      .input(z.object({ query: z.string().min(1), location: z.string().optional() }))
      .query(async ({ input }) => {
        try {
          const params: Record<string, unknown> = {
            query: input.query,
            language: "ja",
          };
          if (input.location) params.location = input.location;
          const result = await makeRequest<PlacesSearchResult>("/maps/api/place/textsearch/json", params);
          return result;
        } catch (e) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: String(e) });
        }
      }),
  }),

  // ===== GOOGLE DRIVE =====
  drive: router({
    listFiles: publicProcedure
      .input(z.object({ folderId: z.string().optional() }))
      .query(async ({ input }) => {
        const apiKey = ENV.googleDriveApiKey;
        const defaultFolderId = ENV.googleDriveFolderId;
        const targetFolderId = input.folderId || defaultFolderId;

        if (!apiKey) {
          return { files: [], configured: false, message: "GOOGLE_DRIVE_API_KEYが未設定です" };
        }
        if (!targetFolderId) {
          return { files: [], configured: false, message: "GOOGLE_DRIVE_FOLDER_IDが未設定です" };
        }

        try {
          const url = new URL("https://www.googleapis.com/drive/v3/files");
          url.searchParams.set("key", apiKey);
          url.searchParams.set("q", `'${targetFolderId}' in parents and trashed = false`);
          url.searchParams.set("fields", "files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,iconLink,thumbnailLink)");
          url.searchParams.set("orderBy", "modifiedTime desc");
          url.searchParams.set("pageSize", "100");

          const res = await fetch(url.toString());
          if (!res.ok) {
            const err = await res.text();
            throw new Error(`Google Drive API error: ${err}`);
          }
          const data = await res.json() as { files: DriveFile[] };
          return { files: data.files || [], configured: true, message: "" };
        } catch (e) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: String(e) });
        }
      }),
    getFolderInfo: publicProcedure
      .input(z.object({ folderId: z.string().optional() }))
      .query(async ({ input }) => {
        const apiKey = ENV.googleDriveApiKey;
        const defaultFolderId = ENV.googleDriveFolderId;
        const targetFolderId = input.folderId || defaultFolderId;

        if (!apiKey || !targetFolderId) {
          return { name: "Google Drive", configured: false };
        }
        try {
          const url = new URL(`https://www.googleapis.com/drive/v3/files/${targetFolderId}`);
          url.searchParams.set("key", apiKey);
          url.searchParams.set("fields", "id,name,mimeType");
          const res = await fetch(url.toString());
          if (!res.ok) return { name: "Google Drive", configured: true };
          const data = await res.json() as { id: string; name: string; mimeType: string };
          return { name: data.name, configured: true };
        } catch {
          return { name: "Google Drive", configured: false };
        }
      }),
  }),

  // ===== SLACK =====
  slack: router({
    search: publicProcedure
      .input(z.object({ query: z.string().min(1), count: z.number().optional() }))
      .query(async ({ input }) => {
        const token = ENV.slackBotToken;
        if (!token) {
          return { messages: [], configured: false, message: "SLACK_BOT_TOKENが未設定です" };
        }
        try {
          const url = new URL("https://slack.com/api/search.messages");
          url.searchParams.set("query", input.query);
          url.searchParams.set("count", String(input.count ?? 20));
          url.searchParams.set("highlight", "false");

          const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          });
          if (!res.ok) throw new Error(`Slack API HTTP error: ${res.status}`);
          const data = await res.json() as SlackSearchResponse;
          if (!data.ok) throw new Error(`Slack API error: ${data.error}`);

          const messages = (data.messages?.matches ?? []).map((m) => ({
            ts: m.ts,
            text: m.text,
            username: m.username,
            channel: m.channel?.name ?? "",
            channelId: m.channel?.id ?? "",
            permalink: m.permalink,
            userId: m.user,
          }));
          return { messages, configured: true, message: "" };
        } catch (e) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: String(e) });
        }
      }),
    listChannels: publicProcedure.query(async () => {
      const token = ENV.slackBotToken;
      if (!token) {
        return { channels: [], configured: false };
      }
      try {
        const res = await fetch("https://slack.com/api/conversations.list?limit=200&exclude_archived=true", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json() as { ok: boolean; channels?: Array<{ id: string; name: string; num_members?: number }>; error?: string };
        if (!data.ok) return { channels: [], configured: true };
        return {
          channels: (data.channels ?? []).map((c) => ({ id: c.id, name: c.name, memberCount: c.num_members ?? 0 })),
          configured: true,
        };
      } catch {
        return { channels: [], configured: false };
      }
    }),
  }),
});

// ===== DRIVE TYPE HELPERS =====
type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
};

type SlackSearchResponse = {
  ok: boolean;
  error?: string;
  messages?: {
    matches: Array<{
      ts: string;
      text: string;
      username: string;
      user: string;
      channel: { id: string; name: string };
      permalink: string;
    }>;
    total: number;
  };
};

export type AppRouter = typeof appRouter;
