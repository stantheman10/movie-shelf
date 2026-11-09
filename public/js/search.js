import { key } from "./util.js";
import { state } from "./state.js";
import { jRetry } from "./api.js";
import { render } from "./views.js";

export async function runSearch(q, { append = false } = {}) {
  const my = ++state.reqId;
  const page = append ? state.page + 1 : 1;
  if (append) state.loadingMore = true;
  else { state.tab = "search"; state.detail = null; state.msg = "Searching…"; state.query = q; state.loadingMore = false; }
  render();
  try {
    const r = await jRetry(
      `/api/search?q=${encodeURIComponent(q)}&page=${page}`,
      () => my !== state.reqId,
      (n) => { state.msg = "Still searching… (retry " + n + ")"; render(); },
    );
    if (!r) return; // superseded by a newer request
    if (append) {
      const seen = new Set(state.results.map(key));
      state.results = state.results.concat(r.results.filter((x) => !seen.has(key(x))));
    } else state.results = r.results;
    state.page = r.page; state.totalPages = r.totalPages;
    state.msg = state.results.length ? "" : "No results found.";
  } catch (err) { state.msg = "Error: " + err.message; }
  state.loadingMore = false;
  render();
}
