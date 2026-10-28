import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { account } from "./account";
import { liveSession } from "./live-session";
import { notification } from "./notification";
import { purchase } from "./purchase";
import { session } from "./session";
import { user } from "./user";
import { verification } from "./verification";

export { account, liveSession, notification, purchase, session, user, verification };

export const schema = { account, liveSession, notification, purchase, session, user, verification };

// The pool connects lazily, on the first query, so importing this during
// `next build` needs no database. server.ts checks DATABASE_URL at startup.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });

export function closeDb(): Promise<void> {
  return pool.end();
}
