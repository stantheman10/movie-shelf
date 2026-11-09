import { describe, expect, it, vi } from "vitest";
import { TtlCache } from "../src/lib/cache";

describe("TtlCache", () => {
  it("expires entries after the ttl", () => {
    let t = 0;
    const c = new TtlCache<string>(10, () => t);
    c.set("k", "v", 1000);
    expect(c.get("k")).toBe("v");
    t = 1000;
    expect(c.get("k")).toBeUndefined();
  });

  it("evicts the oldest entry beyond the size cap", () => {
    const c = new TtlCache<number>(2, () => 0);
    c.set("a", 1, 1000); c.set("b", 2, 1000); c.set("c", 3, 1000);
    expect(c.get("a")).toBeUndefined();
    expect(c.get("b")).toBe(2);
    expect(c.get("c")).toBe(3);
  });

  it("runs a concurrent load once and serves later calls from cache", async () => {
    const c = new TtlCache<string>();
    const load = vi.fn(async () => "x");
    const [a, b] = await Promise.all([c.wrap("k", 1000, load), c.wrap("k", 1000, load)]);
    await c.wrap("k", 1000, load);
    expect([a, b]).toEqual(["x", "x"]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures", async () => {
    const c = new TtlCache<string>();
    const load = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("ok");
    await expect(c.wrap("k", 1000, load)).rejects.toThrow("boom");
    await expect(c.wrap("k", 1000, load)).resolves.toBe("ok");
  });
});
