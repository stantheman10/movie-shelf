import { describe, expect, it } from "vitest";
import { clientIp, createRateLimiter } from "../src/lib/rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit, then blocks with a retry hint", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 3, windowMs: 10_000, now: () => t });
    expect([rl("a"), rl("a"), rl("a")].every((r) => r.ok)).toBe(true);
    t = 4_000;
    const blocked = rl("a");
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBe(6);
  });

  it("recovers once the window has passed", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => t });
    expect(rl("a").ok).toBe(true);
    expect(rl("a").ok).toBe(false);
    t = 1_001;
    expect(rl("a").ok).toBe(true);
  });

  it("tracks keys independently", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => 0 });
    expect(rl("a").ok).toBe(true);
    expect(rl("b").ok).toBe(true);
    expect(rl("a").ok).toBe(false);
  });
});

describe("clientIp", () => {
  it("prefers cf-connecting-ip, then the first x-forwarded-for entry", () => {
    expect(clientIp(new Headers({ "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe("1.1.1.1");
    expect(clientIp(new Headers({ "x-forwarded-for": "2.2.2.2, 3.3.3.3" }))).toBe("2.2.2.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
