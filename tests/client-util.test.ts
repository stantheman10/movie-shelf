import { describe, expect, it } from "vitest";
// @ts-expect-error plain browser ES module without types
import { esc, key, norm } from "../public/js/util.js";

describe("client util", () => {
  it("escapes HTML-significant characters", () => {
    expect(esc(`<img src="x">&`)).toBe("&lt;img src=&quot;x&quot;&gt;&amp;");
    expect(esc(null)).toBe("");
  });

  it("keys movies and shows separately even when TMDB ids collide", () => {
    expect(key({ id: 1 })).toBe("movie:1");
    expect(key({ id: 1, mediaType: "tv" })).toBe("tv:1");
  });

  it("normalises search results and library rows to the same shape", () => {
    expect(norm({ id: 5, mediaType: "tv", title: "T", release_date: "2008-01-20", poster_path: "/p" }))
      .toMatchObject({ id: 5, mediaType: "tv", year: "2008", poster: "/p" });
    expect(norm({ id: 5, title: "T", year: "1999", poster: "/q" }))
      .toMatchObject({ mediaType: "movie", year: "1999", poster: "/q" });
  });
});
