import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// The fallback only keeps the build from crashing when the key is missing.
const url = process.env.DATABASE_URL ?? "postgresql://user:password@localhost/placeholder";

export const db = drizzle(neon(url), { schema });
