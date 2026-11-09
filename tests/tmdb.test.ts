import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tmdb } from "../src/lib/tmdb";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

beforeEach(() => { process.env.TMDB_API_KEY = "test-key"; });
afterEach(() => vi.unstubAllGlobals());

describe("tmdb", () => {
  it("retries network errors and then succeeds", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(ok({ a: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(tmdb("/retry-case", {}, 0)).resolves.toEqual({ a: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry HTTP errors and maps 401 to a clear message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(tmdb("/bad-key-case", {}, 0)).rejects.toThrow("Invalid TMDB API key");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("serves repeated calls from cache and sends the API key upstream", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => ok({ n: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    await tmdb("/cache-case", { query: "x" }, 60);
    await tmdb("/cache-case", { query: "x" }, 60);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("api_key=test-key");
    await tmdb("/cache-case", { query: "y" }, 60);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
