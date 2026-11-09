import { $, key } from "./util.js";
import { state } from "./state.js";
import { j, jRetry } from "./api.js";
import { render } from "./views.js";
import { renderAuth } from "./auth.js";
import { setStatus } from "./library.js";
import { runSearch } from "./search.js";

async function openMovie(id, type = "movie") {
  const my = ++state.reqId;
  state.loadingMore = false;
  try {
    const d = await jRetry("/api/movie/" + id + "?type=" + type, () => my !== state.reqId, (n) => { state.msg = "Still loading… (retry " + n + ")"; render(); });
    if (!d) return;
    state.detail = d; state.msg = "";
  } catch (e) { state.msg = "Error: " + e.message; }
  render(); window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- events ---------- */
let timer;
$("#f").onsubmit = (e) => {
  e.preventDefault();
  clearTimeout(timer);
  const q = $("#q").value.trim();
  if (q) runSearch(q);
};
// Search as you type, once the user pauses.
$("#q").addEventListener("input", () => {
  clearTimeout(timer);
  const q = $("#q").value.trim();
  if (q.length < 2 || q === state.query) return;
  timer = setTimeout(() => runSearch(q), 450);
});
document.addEventListener("click", (e) => {
  const t = e.target.closest("nav button"); if (t) { state.tab = t.dataset.t; render(); return; }
  if (e.target.id == "close") { state.detail = null; render(); return; }
  if (e.target.id == "more") { if (!state.loadingMore) runSearch(state.query, { append: true }); return; }
  const b = e.target.closest("[data-s]");
  if (b) {
    const id = +b.dataset.id, k = (b.dataset.type || "movie") + ":" + id;
    const m = (state.detail && key(state.detail) == k ? state.detail : null) || state.results.find((x) => key(x) == k) || state.lib[k];
    if (m) setStatus(m, b.dataset.s);
    return;
  }
  const r = e.target.closest("[data-open]"); if (r) openMovie(r.dataset.open, r.dataset.type);
});

(async function init() {
  try { state.user = (await j("/api/me")).user; } catch {}
  if (state.user) { try { (await j("/api/library")).forEach((x) => (state.lib[key(x)] = x)); } catch {} }
  renderAuth(); render();
})();
