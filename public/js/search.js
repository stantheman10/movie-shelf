import { key } from "./util.js";
import { state } from "./state.js";
import { jRetry } from "./api.js";
import { render } from "./views.js";

export async function runSearch(q, { append = false } = {}) {
  const my = ++state.reqId;
  const smart = state.smart && !append;
  const page = append ? state.page + 1 : 1;
  if (append) state.loadingMore = true;
  else { state.tab = "search"; state.detail = null; state.msg = smart ? "Thinking…" : "Searching…"; state.query = q; state.loadingMore = false; }
  render();
  try {
    const r = await jRetry(
      smart ? `/api/smart-search?q=${encodeURIComponent(q)}` : `/api/search?q=${encodeURIComponent(q)}&page=${page}`,
      () => my !== state.reqId,
      (n) => { state.msg = "Still searching… (retry " + n + ")"; render(); },
    );
    if (!r) return; // superseded by a newer request
    if (append) {
      const seen = new Set(state.results.map(key));
      state.results = state.results.concat(r.results.filter((x) => !seen.has(key(x))));
    } else state.results = r.results;
    state.page = r.page; state.totalPages = r.totalPages;
    state.msg = r.fallback ? "Smart search is unavailable right now, showing normal results." : state.results.length ? "" : "No results found.";
  } catch (err) { state.msg = "Error: " + err.message; }
  state.loadingMore = false;
  render();
}
