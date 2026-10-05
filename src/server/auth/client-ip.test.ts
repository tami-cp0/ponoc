import { describe, expect, it } from "vitest";
import { clientIp } from "./client-ip";

const headers = (realIp: string | null, forwardedFor: string | null) => {
  const h = new Headers();
  if (realIp) h.set("x-real-ip", realIp);
  if (forwardedFor) h.set("x-forwarded-for", forwardedFor);
  return h;
};

describe("clientIp", () => {
  it("uses X-Real-IP when Railway's edge saw the client directly", () => {
    expect(clientIp(headers("154.72.120.53", "154.72.120.53, 152.233.56.193"))).toBe("154.72.120.53");
  });

  it("takes the address Fastly forwarded when X-Real-IP is a Fastly edge", () => {
    const chain = "6.6.6.6, 154.72.120.53, 151.101.1.1, 152.233.56.193";
    expect(clientIp(headers("151.101.1.1", chain))).toBe("154.72.120.53");
  });

  it("skips Fastly-to-Fastly hops", () => {
    const chain = "154.72.120.53, 151.101.2.2, 151.101.1.1, 152.233.56.193";
    expect(clientIp(headers("151.101.1.1", chain))).toBe("154.72.120.53");
  });

  it("gives up rather than guess when the chain doesn't explain a Fastly X-Real-IP", () => {
    expect(clientIp(headers("151.101.1.1", "154.72.120.53, 152.233.56.193"))).toBeNull();
    expect(clientIp(headers("151.101.1.1", "151.101.1.1"))).toBeNull();
  });

  it("returns null without a usable X-Real-IP", () => {
    expect(clientIp(headers(null, "154.72.120.53"))).toBeNull();
    expect(clientIp(headers("not-an-ip", null))).toBeNull();
  });
});
