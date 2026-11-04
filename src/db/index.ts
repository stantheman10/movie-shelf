import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { env } from "../lib/env";

export const db = drizzle(neon(env("DATABASE_URL")), { schema });
