import { beforeEach, describe, expect, it, vi } from "vitest";

const tmdb = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/tmdb", async (orig) => ({ ...(await orig<typeof import("../src/lib/tmdb")>()), tmdb }));

import { GET } from "../src/pages/api/search";

const call = (qs: string) => GET({ url: new URL("http://x/api/search?" + qs) } as never) as Promise<Response>;

beforeEach(() => { tmdb.mockReset(); });

describe("GET /api/search", () => {
  it("returns an empty page without calling TMDB for a blank query", async () => {
    const res = await call("q=%20");
    expect(await res.json()).toEqual({ results: [], page: 1, totalPages: 0 });
    expect(tmdb).not.toHaveBeenCalled();
  });

  it("keeps movies and shows, drops people, and normalises show fields", async () => {
    tmdb.mockResolvedValue({
      page: 1, total_pages: 3,
      results: [
        { media_type: "tv", id: 1396, name: "Breaking Bad", first_air_date: "2008-01-20", poster_path: "/p.jpg", overview: "o" },
        { media_type: "movie", id: 603, title: "The Matrix", release_date: "1999-03-30", poster_path: null, overview: "m" },
        { media_type: "person", id: 1, name: "Someone" },
      ],
    });
    const body = await (await call("q=breaking")).json();
    expect(body.totalPages).toBe(3);
    expect(body.results).toEqual([
      { id: 1396, mediaType: "tv", title: "Breaking Bad", release_date: "2008-01-20", poster_path: "/p.jpg", overview: "o" },
      { id: 603, mediaType: "movie", title: "The Matrix", release_date: "1999-03-30", poster_path: null, overview: "m" },
    ]);
  });

  it("clamps the page number and truncates long queries", async () => {
    tmdb.mockResolvedValue({ page: 500, total_pages: 9999, results: [] });
    const body = await (await call("q=" + "a".repeat(300) + "&page=99999")).json();
    const [, params] = tmdb.mock.calls[0];
    expect(params.page).toBe("500");
    expect(params.query).toHaveLength(100);
    expect(body.totalPages).toBe(500);
  });

  it("falls back to page 1 for a bad page value", async () => {
    tmdb.mockResolvedValue({ page: 1, total_pages: 1, results: [] });
    await call("q=x&page=abc");
    expect(tmdb.mock.calls[0][1].page).toBe("1");
  });

  it("returns 502 when TMDB fails", async () => {
    tmdb.mockImplementation(async () => { throw new Error("TMDB error 500"); });
    const res = await call("q=x");
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "TMDB error 500" });
  });
});
