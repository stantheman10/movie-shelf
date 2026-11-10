import { beforeEach, describe, expect, it, vi } from "vitest";

const tmdb = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/tmdb", async (orig) => ({ ...(await orig<typeof import("../src/lib/tmdb")>()), tmdb }));

import { GET } from "../src/pages/api/trending";

beforeEach(() => { tmdb.mockReset(); });

describe("GET /api/trending", () => {
  it("returns movies and shows, tagging media type that TMDB omits on these endpoints", async () => {
    tmdb.mockImplementation(async (path: string) =>
      path.includes("/movie/")
        ? { results: [{ id: 1, title: "A Movie", release_date: "2026-01-01", poster_path: "/m.jpg", overview: "o" }] }
        : { results: [{ id: 2, name: "A Show", first_air_date: "2025-05-05", poster_path: "/s.jpg", overview: "p" }] });
    const body = await (await GET({} as never) as Response).json();
    expect(body.movies).toEqual([{ id: 1, mediaType: "movie", title: "A Movie", release_date: "2026-01-01", poster_path: "/m.jpg", overview: "o" }]);
    expect(body.tv).toEqual([{ id: 2, mediaType: "tv", title: "A Show", release_date: "2025-05-05", poster_path: "/s.jpg", overview: "p" }]);
  });

  it("caches for an hour and returns 502 when TMDB fails", async () => {
    tmdb.mockImplementation(async () => { throw new Error("TMDB error 500"); });
    const res = await GET({} as never) as Response;
    expect(res.status).toBe(502);
    tmdb.mockResolvedValue({ results: [] });
    await GET({} as never);
    expect(tmdb.mock.calls.at(-1)?.[2]).toBe(3600);
  });
});
