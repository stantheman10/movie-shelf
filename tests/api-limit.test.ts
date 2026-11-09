import { describe, expect, it } from "vitest";
import { createApiLimiter } from "../src/lib/api-limit";

const req = (ip: string) => new Request("http://x/", { headers: { "x-forwarded-for": ip } });
const make = () => createApiLimiter({ perIp: 2, global: 3, windowMs: 60_000, now: () => 0 });

describe("createApiLimiter", () => {
  it("ignores routes that do not call TMDB", () => {
    const limit = make();
    for (let i = 0; i < 10; i++) expect(limit(req("1.1.1.1"), "/api/library")).toBeNull();
  });

  it("returns 429 with Retry-After once an IP exceeds its limit", async () => {
    const limit = make();
    expect(limit(req("1.1.1.1"), "/api/search")).toBeNull();
    expect(limit(req("1.1.1.1"), "/api/movie/603")).toBeNull();
    const res = limit(req("1.1.1.1"), "/api/search");
    expect(res?.status).toBe(429);
    expect(Number(res?.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(await res?.json()).toEqual({ error: "Too many requests. Please wait a moment." });
  });

  it("does not let one IP's blocked requests hurt another", () => {
    const limit = make();
    limit(req("1.1.1.1"), "/api/search");
    limit(req("1.1.1.1"), "/api/search");
    expect(limit(req("2.2.2.2"), "/api/search")).toBeNull();
  });

  it("enforces the global cap across rotating IPs", () => {
    const limit = make();
    expect(limit(req("1.1.1.1"), "/api/search")).toBeNull();
    expect(limit(req("2.2.2.2"), "/api/search")).toBeNull();
    expect(limit(req("3.3.3.3"), "/api/search")).toBeNull();
    expect(limit(req("4.4.4.4"), "/api/search")?.status).toBe(429);
  });
});
