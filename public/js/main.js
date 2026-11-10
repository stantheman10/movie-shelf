import { $, key } from "./util.js";
import { state } from "./state.js";
import { j, jRetry } from "./api.js";
import { render } from "./views.js";
import { renderAuth } from "./auth.js";
import { setStatus } from "./library.js";
import { runSearch } from "./search.js";
import { justDragged } from "./sheet.js";

async function openMovie(id, type = "movie") {
  const my = ++state.reqId;
  state.loadingMore = false;
  try {
    const d = await jRetry("/api/movie/" + id + "?type=" + type, () => my !== state.reqId, (n) => { state.msg = "Still loading… (retry " + n + ")"; render(); });
    if (!d) return;
    state.detail = d; state.msg = "";
  } catch (e) { state.msg = "Error: " + e.message; }
  render();
}

/* ---------- events ---------- */
let timer;
$("#f").onsubmit = (e) => {
  e.preventDefault();
  clearTimeout(timer);
  const q = $("#q").value.trim();
  if (q) runSearch(q);
};
const SMART_OFF = $("#smart-hint").textContent;
$("#smart").onchange = (e) => {
  if (e.target.checked && !state.user) {
    e.target.checked = false; state.msg = "Sign in with Google to use Smart search."; render(); return;
  }
  state.smart = e.target.checked;
  $("#q").placeholder = state.smart ? "Describe what you want to watch" : "Search a movie or TV show";
  $("#smart-hint").textContent = state.smart ? "On: describe the mood, plot or movies you like, then press Search." : SMART_OFF;
};
// Search as you type, once the user pauses.
$("#q").addEventListener("input", () => {
  clearTimeout(timer);
  const q = $("#q").value.trim();
  if (!q && state.query) { // emptied the box: back to the home screen
    state.reqId++; state.query = ""; state.results = []; state.page = 0; state.totalPages = 0; state.msg = ""; state.loadingMore = false; render(); return;
  }
  if (state.smart || q.length < 2 || q === state.query) return; // smart search runs on submit only (shared quota)
  timer = setTimeout(() => runSearch(q), 450);
});
document.addEventListener("keydown", (e) => { if (e.key == "Escape" && state.detail) { state.detail = null; render(); } });
document.addEventListener("click", (e) => {
  const t = e.target.closest("nav button"); if (t) { state.tab = t.dataset.t; render(); return; }
  if (e.target.id == "modal") { if (!justDragged()) { state.detail = null; render(); } return; } // tap outside the sheet
  if (e.target.id == "more") { if (!state.loadingMore) runSearch(state.query, { append: true }); return; }
  const b = e.target.closest("[data-s]");
  if (b) {
    const id = +b.dataset.id, k = (b.dataset.type || "movie") + ":" + id;
    const pool = [...state.results, ...(state.trending?.movies || []), ...(state.trending?.tv || [])];
    const m = (state.detail && key(state.detail) == k ? state.detail : null) || pool.find((x) => key(x) == k) || state.lib[k];
    if (m) setStatus(m, b.dataset.s);
    return;
  }
  const r = e.target.closest("[data-open]"); if (r) openMovie(r.dataset.open, r.dataset.type);
});

async function loadTrending() {
  let tries = 0; // jRetry loops on 5xx; give up after a few attempts so a TMDB outage doesn't retry forever
  try { state.trending = await jRetry("/api/trending", () => ++tries > 12); }
  catch { state.trending = null; }
  if (!state.trending) state.trendingFailed = true;
  render();
}

(async function init() {
  loadTrending();
  try { state.user = (await j("/api/me")).user; } catch {}
  document.body.classList.toggle("signed-in", !!state.user);
  if (state.user) { try { (await j("/api/library")).forEach((x) => (state.lib[key(x)] = x)); } catch {} }
  renderAuth(); render();
})();
