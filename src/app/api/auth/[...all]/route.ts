import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/auth";
import { CLIENT_IP_HEADER, clientIp } from "@/server/auth/client-ip";

// Always overwritten, so a client can't pick the IP its rate limits are keyed on.
export const { GET, POST } = toNextJsHandler((request: Request) => {
  const headers = new Headers(request.headers);
  const ip = clientIp(request.headers);
  if (ip) headers.set(CLIENT_IP_HEADER, ip);
  else headers.delete(CLIENT_IP_HEADER);
  return getAuth().handler(new Request(request, { headers }));
});
