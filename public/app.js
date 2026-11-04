const IMG = "https://image.tmdb.org/t/p/";
let reqId = 0, tab = "search", results = [], detail = null, msg = "", user = null, lib = {};
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function j(url, opts) {
  const r = await fetch(url, opts);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(body.error || "Request failed (" + r.status + ")"); e.status = r.status; throw e; }
  return body;
}
// Keep retrying transient failures (502 / network) until success; stops if isStale() turns true.
async function jRetry(url, isStale, onWait) {
  for (let n = 0; ; n++) {
    try { return await j(url); }
    catch (e) {
      if (e.status && e.status !== 502 && e.status < 500) throw e;
      if (isStale()) return null;
      onWait && onWait(n + 1);
      await new Promise((r) => setTimeout(r, Math.min(500 * 2 ** Math.min(n, 3), 4000)));
      if (isStale()) return null;
    }
  }
}
const post = (url, data) => j(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });

/* ---------- auth ---------- */
async function signIn() {
  try { const r = await post("/api/auth/sign-in/social", { provider: "google", callbackURL: "/" }); if (r.url) location.href = r.url; }
  catch (e) { msg = "Sign-in failed: " + e.message; render(); }
}
async function signOut() { await post("/api/auth/sign-out", {}).catch(() => {}); location.reload(); }
function renderAuth() {
  $("#auth").innerHTML = user
    ? `${user.image ? `<img src="${esc(user.image)}" alt="" referrerpolicy="no-referrer">` : ""}<button id="out">Sign out</button>`
    : `<button class="primary" id="in">Sign in with Google</button>`;
  const b = $("#in") || $("#out");
  b.onclick = user ? signOut : signIn;
}

/* ---------- library ---------- */
const norm = (m) => ({ id: m.id, title: m.title, year: m.year ?? (m.release_date || "").slice(0, 4), poster: m.poster ?? m.poster_path, overview: m.overview });
async function setStatus(m, s) {
  if (!user) { signIn(); return; }
  m = norm(m);
  const cur = lib[m.id];
  const prev = cur ? { ...cur } : null;
  try {
    if (cur && cur.status === s) { delete lib[m.id]; render(); await j("/api/library?id=" + m.id, { method: "DELETE" }); }
    else { lib[m.id] = { ...m, status: s }; render(); await post("/api/library", { movie: m, status: s }); }
  } catch (e) {
    if (prev) lib[m.id] = prev; else delete lib[m.id];
    msg = "Couldn't save: " + e.message; render();
  }
}
const btns = (m) => {
  const s = lib[m.id]?.status;
  return `<div class="btns">
<button class="${s == "watchlist" ? "on" : ""}" data-s="watchlist" data-id="${m.id}">${s == "watchlist" ? "✓ On watchlist" : "+ Watchlist"}</button>
<button class="${s == "watched" ? "on" : ""}" data-s="watched" data-id="${m.id}">${s == "watched" ? "✓ Watched" : "Mark watched"}</button></div>`;
};

/* ---------- views ---------- */
const poster = (p) => (p ? `<img src="${IMG}w342${p}" alt="" loading="lazy">` : `<div class="ph"></div>`);
const row = (x) => `<div class="row" data-open="${x.id}">${poster(x.poster ?? x.poster_path)}<div><h3>${esc(x.title)}</h3><div class="mute">${esc(x.year ?? (x.release_date || "").slice(0, 4))}</div>${x.overview ? `<p class="mute" style="margin:4px 0 0">${esc(x.overview.slice(0, 140))}${x.overview.length > 140 ? "…" : ""}</p>` : ""}${btns(x)}</div></div>`;

function providersHTML(p) {
  if (!p) return "";
  if (p.none) return `<div class="where"><p class="mute">No streaming info for ${esc(p.country)}.</p></div>`;
  const grp = (label, arr) => arr?.length ? `<p class="mute" style="margin:10px 0 4px">${label}</p><div class="prov">${arr.map((x) => `<img src="${IMG}w92${x.logo_path}" alt="${esc(x.provider_name)}" title="${esc(x.provider_name)}">`).join("")}</div>` : "";
  const any = p.flatrate.length || p.rent.length || p.buy.length;
  return `<div class="where"><h3 style="margin:12px 0 0">Where to watch (${esc(p.country)})</h3>
${any ? grp("Stream", p.flatrate) + grp("Rent", p.rent) + grp("Buy", p.buy) : `<p class="mute">Not available to stream, rent or buy in ${esc(p.country)}.</p>`}
${p.link ? `<p class="mute"><a href="${esc(p.link)}" target="_blank" rel="noopener">See all options</a> · Data from JustWatch via TMDB</p>` : ""}</div>`;
}
function detailHTML() {
  const d = detail, cast = (d.credits?.cast || []).slice(0, 12);
  const dir = (d.credits?.crew || []).filter((c) => c.job == "Director").map((c) => c.name).join(", ");
  const tr = (d.videos?.results || []).find((v) => v.site == "YouTube" && v.type == "Trailer");
  return `<div class="detail"><div class="top">${poster(d.poster_path)}<div><h2>${esc(d.title)}</h2>
<div class="mute">${esc((d.release_date || "").slice(0, 4))}${d.runtime ? " · " + d.runtime + " min" : ""}${d.vote_average ? " · ★ " + d.vote_average.toFixed(1) : ""}</div>
<div class="chips">${(d.genres || []).map((g) => `<span class="chip">${esc(g.name)}</span>`).join("")}</div>${btns(d)}</div></div>
${d.tagline ? `<p class="mute"><i>${esc(d.tagline)}</i></p>` : ""}<p>${esc(d.overview)}</p>
${dir ? `<p><b>Director:</b> ${esc(dir)}</p>` : ""}
${providersHTML(d.providers)}
<div class="cast">${cast.map((c) => `<div>${c.profile_path ? `<img src="${IMG}w185${c.profile_path}" alt="">` : `<div class="ph" style="border-radius:50%;width:76px;height:76px"></div>`}<b>${esc(c.name)}</b><br><span class="mute" style="font-size:12px">${esc(c.character)}</span></div>`).join("")}</div>
${tr ? `<p><a href="https://www.youtube.com/watch?v=${tr.key}" target="_blank" rel="noopener">Watch trailer</a></p>` : ""}
<button id="close">Close</button></div>`;
}
function render() {
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("active", b.dataset.t == tab));
  let h = msg ? `<p class="${/fail|couldn|error/i.test(msg) ? "err" : "mute"}">${esc(msg)}</p>` : "";
  if (detail) h += detailHTML();
  if (tab == "search") h += results.map(row).join("");
  else if (!user) h += `<p class="mute">Sign in with Google to keep a watchlist and a watched list.</p>`;
  else {
    const items = Object.values(lib).filter((x) => x.status == tab);
    h += items.length ? items.map(row).join("") : `<p class="mute">Nothing here yet. Search for a movie and add it.</p>`;
  }
  $("#m").innerHTML = h;
}
async function openMovie(id) {
  const my = ++reqId;
  try { const d = await jRetry("/api/movie/" + id, () => my !== reqId, (n) => { msg = "Still loading… (retry " + n + ")"; render(); }); if (d) { detail = d; msg = ""; } else return; }
  catch (e) { msg = "Error: " + e.message; }
  render(); window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- events ---------- */
$("#f").onsubmit = async (e) => {
  e.preventDefault();
  const q = $("#q").value.trim(); if (!q) return;
  tab = "search"; detail = null; msg = "Searching…"; render();
  const my = ++reqId;
  try {
    const r = await jRetry("/api/search?q=" + encodeURIComponent(q), () => my !== reqId, (n) => { msg = "Still searching… (retry " + n + ")"; render(); });
    if (!r) return;
    results = r; msg = results.length ? "" : "No movies found.";
  } catch (err) { msg = "Error: " + err.message; }
  render();
};
document.addEventListener("click", (e) => {
  const t = e.target.closest("nav button"); if (t) { tab = t.dataset.t; render(); return; }
  if (e.target.id == "close") { detail = null; render(); return; }
  const b = e.target.closest("[data-s]");
  if (b) {
    const id = +b.dataset.id;
    const m = (detail && detail.id == id ? detail : null) || results.find((x) => x.id == id) || lib[id];
    if (m) setStatus(m, b.dataset.s);
    return;
  }
  const r = e.target.closest("[data-open]"); if (r) openMovie(r.dataset.open);
});

(async function init() {
  try { user = (await j("/api/me")).user; } catch {}
  if (user) { try { (await j("/api/library")).forEach((x) => (lib[x.id] = x)); } catch {} }
  renderAuth(); render();
})();
