import { beforeEach, describe, expect, it, vi } from "vitest";

const tmdb = vi.hoisted(() => vi.fn());
const suggestTitles = vi.hoisted(() => vi.fn());
const getUserId = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/tmdb", async (orig) => ({ ...(await orig<typeof import("../src/lib/tmdb")>()), tmdb }));
vi.mock("../src/lib/llm", async (orig) => ({ ...(await orig<typeof import("../src/lib/llm")>()), suggestTitles }));
vi.mock("../src/lib/auth", () => ({ getUserId }));

import { parseSuggestions } from "../src/lib/llm";
import { matches, normTitle } from "../src/lib/smart-search";
import { GET } from "../src/pages/api/smart-search";

const call = (q: string) =>
  GET({ request: new Request("http://x/api/smart-search"), url: new URL("http://x/api/smart-search?q=" + encodeURIComponent(q)) } as never) as Promise<Response>;

beforeEach(() => { tmdb.mockReset(); suggestTitles.mockReset(); getUserId.mockReset(); getUserId.mockResolvedValue("u1"); });

describe("parseSuggestions", () => {
  it("handles think blocks and code fences", () => {
    const r = parseSuggestions('<think>hmm {x}</think>```json\n{"anchor":"Prisoners","suggestions":[{"title":"Zodiac","year":2007,"type":"movie","reason":"slow"}]}\n```');
    expect(r.anchor).toBe("Prisoners");
    expect(r.items).toEqual([{ title: "Zodiac", year: 2007, type: "movie", reason: "slow" }]);
  });
  it("drops malformed items and rejects bad output", () => {
    expect(parseSuggestions('{"suggestions":[{"title":"A"},{"title":"B","year":2000,"type":"tv"}]}').items).toHaveLength(1);
    expect(() => parseSuggestions("nope")).toThrow();
    expect(() => parseSuggestions('{"a":1}')).toThrow();
  });
});

describe("matches", () => {
  const s = { title: "The Prestige", year: 2006, type: "movie" as const, reason: "" };
  it("requires near-exact title and year within 1", () => {
    expect(normTitle("Amélie!")).toBe("amelie");
    expect(matches(s, { title: "Prestige", release_date: "2006-10-20" })).toBe(true);
    expect(matches(s, { title: "The Prestige", release_date: "2007-01-01" })).toBe(true);
    expect(matches(s, { title: "The Prestige", release_date: "2012-01-01" })).toBe(false);
    expect(matches(s, { title: "The Prestige 2", release_date: "2006-01-01" })).toBe(false);
  });
});

describe("GET /api/smart-search", () => {
  it("401s when signed out without calling the LLM", async () => {
    getUserId.mockResolvedValue(null);
    expect((await call("x")).status).toBe(401);
    expect(suggestTitles).not.toHaveBeenCalled();
  });

  it("resolves strictly, dedupes, drops the anchor, and caches", async () => {
    suggestTitles.mockResolvedValue({
      anchor: "Prisoners",
      items: [
        { title: "Zodiac", year: 2007, type: "movie", reason: "slow-burn" },
        { title: "Zodiac", year: 2007, type: "movie", reason: "dup" },
        { title: "Prisoners", year: 2013, type: "movie", reason: "anchor" },
        { title: "Fake Film", year: 2001, type: "movie", reason: "hallucinated" },
      ],
    });
    tmdb.mockImplementation(async (_p: string, { query }: any) => ({
      results: query === "Zodiac" ? [{ id: 1, title: "Zodiac", release_date: "2007-03-02", poster_path: "/z", overview: "o" }] : [],
    }));
    const body = await (await call("slow-burn thriller like Prisoners")).json();
    expect(body.results).toEqual([{ id: 1, mediaType: "movie", title: "Zodiac", release_date: "2007-03-02", poster_path: "/z", overview: "o", reason: "slow-burn" }]);
    await call("Slow-burn  thriller like prisoners");
    expect(suggestTitles).toHaveBeenCalledTimes(1);
  });

  it("falls back to normal search when the LLM fails", async () => {
    suggestTitles.mockRejectedValue(new Error("LLM error 429"));
    tmdb.mockResolvedValue({ results: [{ media_type: "movie", id: 5, title: "T", release_date: "2000-01-01", poster_path: null, overview: "" }] });
    const body = await (await call("unique fallback query")).json();
    expect(body.fallback).toBe(true);
    expect(body.results[0].id).toBe(5);
  });
});
