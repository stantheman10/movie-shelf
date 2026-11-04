import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";
import { env } from "./env";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret: env("BETTER_AUTH_SECRET"),
  baseURL: env("BETTER_AUTH_URL"),
  socialProviders: {
    google: {
      clientId: env("GOOGLE_CLIENT_ID"),
      clientSecret: env("GOOGLE_CLIENT_SECRET"),
    },
  },
});

export async function getUserId(request: Request): Promise<string | null> {
  const s = await auth.api.getSession({ headers: request.headers });
  return s?.user.id ?? null;
}
