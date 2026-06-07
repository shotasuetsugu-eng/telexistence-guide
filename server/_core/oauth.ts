import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/app-auth", (_req: Request, res: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const baseUrl = process.env.OAUTH_SERVER_URL || "http://localhost:3000";

    if (!clientId) {
      res.status(500).send("GOOGLE_CLIENT_ID is missing");
      return;
    }

    const redirectUri = `${baseUrl}/api/oauth/callback`;
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", "drive");

    res.redirect(url.toString());
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");

    if (!code) {
      res.status(400).json({ error: "code is required" });
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const baseUrl = process.env.OAUTH_SERVER_URL || "http://localhost:3000";

    if (!clientId || !clientSecret) {
      res.status(500).json({ error: "Google OAuth env is missing" });
      return;
    }

    try {
      const redirectUri = `${baseUrl}/api/oauth/callback`;
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json() as { access_token?: string; error?: string };

      if (!tokenData.access_token) {
        res.status(401).json({ error: "Failed to get access token", tokenData });
        return;
      }

      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const userInfo = await userRes.json() as {
        id?: string;
        email?: string;
        name?: string;
      };

      if (!userInfo.id || !userInfo.email) {
        res.status(401).json({ error: "Failed to get Google user info" });
        return;
      }

      if (!userInfo.email.endsWith("@tx-inc.com")) {
        res.status(403).send("@tx-inc.com のアカウントのみ利用できます");
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: "DB not available" });
        return;
      }

      await db.insert(users)
        .values({
          openId: userInfo.id,
          name: userInfo.name || userInfo.email,
          email: userInfo.email,
          loginMethod: "google",
          role: "user",
          lastSignedIn: new Date(),
        })
        .onConflictDoUpdate({
          target: users.openId,
          set: {
            name: userInfo.name || userInfo.email,
            email: userInfo.email,
            loginMethod: "google",
            lastSignedIn: new Date(),
          },
        });

      const sessionToken = await sdk.createSessionToken(userInfo.id, {
        name: userInfo.name || userInfo.email,
        expiresInMs: ONE_YEAR_MS,
      });

      console.log("[OAuth] Login success:", userInfo.email);

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, "/drive");
    } catch (error) {
      console.error("[OAuth] Google callback failed", error);
      res.status(500).json({ error: "Google OAuth callback failed" });
    }
  });
}
