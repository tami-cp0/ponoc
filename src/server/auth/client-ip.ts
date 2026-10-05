import { BlockList, isIP } from "node:net";

// Set on every auth request from clientIp(); rate limits are keyed on it.
export const CLIENT_IP_HEADER = "x-ponoc-client-ip";

// https://api.fastly.com/public-ip-list
const FASTLY_RANGES = [
  "23.235.32.0/20", "43.249.72.0/22", "103.244.50.0/24", "103.245.222.0/23", "103.245.224.0/24",
  "104.156.80.0/20", "140.248.64.0/18", "140.248.128.0/17", "146.75.0.0/17", "151.101.0.0/16",
  "157.52.64.0/18", "167.82.0.0/17", "167.82.128.0/20", "167.82.160.0/20", "167.82.224.0/20",
  "172.111.64.0/18", "185.31.16.0/22", "199.27.72.0/21", "199.232.0.0/16",
  "2a04:4e40::/32", "2a04:4e42::/32",
];

const fastly = new BlockList();
for (const range of FASTLY_RANGES) {
  const [network, prefix] = range.split("/");
  fastly.addSubnet(network, Number(prefix), isIP(network) === 6 ? "ipv6" : "ipv4");
}

function isFastly(ip: string): boolean {
  return fastly.check(ip, isIP(ip) === 6 ? "ipv6" : "ipv4");
}

// Railway's edge sets X-Real-IP to whoever connected to it, and clients can't
// override it. Usually that's the client. When Railway routes through Fastly it's
// a Fastly edge instead, and the client is the X-Forwarded-For entry just before
// it: Fastly added that one, and anything a client forges sits further left.
export function clientIp(headers: Headers): string | null {
  const realIp = headers.get("x-real-ip")?.trim() ?? "";
  if (!isIP(realIp)) return null;
  if (!isFastly(realIp)) return realIp;

  const chain = (headers.get("x-forwarded-for") ?? "").split(",").map((ip) => ip.trim());
  let at = chain.lastIndexOf(realIp);
  while (at > 0 && isFastly(chain[at])) at--;
  const ip = chain[at];
  return at >= 0 && isIP(ip) && !isFastly(ip) ? ip : null;
}
