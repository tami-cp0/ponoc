import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/auth";

// TEMPORARY: shows how Railway forwards the client IP, to set trustedProxies. Remove after.
const IP_HEADERS = ["x-forwarded-for", "x-real-ip", "fastly-client-ip", "true-client-ip", "x-railway-edge"];

function logIpHeaders(request: Request): void {
  const seen = IP_HEADERS.map((name) => `${name}=${request.headers.get(name) ?? "-"}`).join(" | ");
  console.log(`[ip] ${new URL(request.url).pathname} ${seen}`);
}

export const { GET, POST } = toNextJsHandler((request: Request) => {
  logIpHeaders(request);
  return getAuth().handler(request);
});
