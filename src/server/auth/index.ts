import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { magicLink } from "better-auth/plugins";
import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "../db";
import { CLIENT_IP_HEADER } from "./client-ip";
import { Cooldown } from "./cooldown";
import { sendMagicLinkEmail } from "./email";
import { MAGIC_LINK_MINUTES } from "./magic-link-email";
import { env } from "../env";
import { notify } from "../notify";
import { grantTrial } from "../usage/credits";

const DAY = 60 * 60 * 24;

// One sign-in email per address per minute, whoever asks for it.
const magicLinkCooldown = new Cooldown(60_000);

function createAuth() {
  return betterAuth({
    baseURL: env.siteUrl,
    secret: env.authSecret,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    session: {
      expiresIn: 7 * DAY,
      updateAge: DAY,
    },
    // Errors that can't be traced to a sign-in attempt (e.g. a duplicated Google
    // callback whose state was already used) land on /login, which sends anyone
    // already signed in on to /app.
    onAPIError: { errorURL: "/login" },
    // Rate limits are keyed by client IP, which the auth route works out (see client-ip.ts).
    advanced: {
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },
    socialProviders: {
      google: {
        clientId: env.googleClientId,
        clientSecret: env.googleClientSecret,
      },
    },
    plugins: [
      magicLink({
        expiresIn: MAGIC_LINK_MINUTES * 60,
        sendMagicLink: ({ email, url }) => {
          const wait = magicLinkCooldown.take(email.trim().toLowerCase());
          if (wait > 0) {
            throw new APIError("TOO_MANY_REQUESTS", {
              message: `We just sent a link to ${email}. You can request another in ${wait}s.`,
            });
          }
          return sendMagicLinkEmail(email, url);
        },
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          after: async (created) => {
            await notify(created.id, "signed_up", "Created an account");
            await grantTrial(created.id);
          },
        },
      },
      session: {
        create: {
          // One sign-in per user: a new session signs out every other device.
          after: async (created, ctx) => {
            await db
              .delete(schema.session)
              .where(and(eq(schema.session.userId, created.userId), ne(schema.session.id, created.id)));
            const method = ctx?.path.includes("magic-link") ? "a magic link" : "Google";
            await notify(created.userId, "signed_in", `Signed in with ${method}`);
          },
        },
        delete: {
          // Sessions are also deleted when they expire; only count real sign-outs.
          after: async (deleted, ctx) => {
            if (ctx?.path === "/sign-out") await notify(deleted.userId, "signed_out", "Signed out");
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

let auth: Auth | null = null;

// Created on first use so that importing this module (e.g. during `next build`)
// doesn't require secrets or a database.
export function getAuth(): Auth {
  if (!auth) auth = createAuth();
  return auth;
}

export interface SignedInUser {
  id: string;
  name: string;
  email: string;
}

export async function getUser(headers: Headers): Promise<SignedInUser | null> {
  const result = await getAuth().api.getSession({ headers });
  if (!result) return null;
  const { id, name, email } = result.user;
  // Magic-link sign-ups have no name.
  return { id, email, name: name || email.split("@")[0] };
}
