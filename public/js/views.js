import { IMG, $, esc, key } from "./util.js";
import { state } from "./state.js";

const btns = (m) => {
  const s = state.lib[key(m)]?.status;
  const t = m.mediaType || "movie";
  return `<div class="btns">
<button class="${s == "watchlist" ? "on" : ""}" data-s="watchlist" data-id="${m.id}" data-type="${t}">${s == "watchlist" ? "✓ On watchlist" : "+ Watchlist"}</button>
<button class="${s == "watched" ? "on" : ""}" data-s="watched" data-id="${m.id}" data-type="${t}">${s == "watched" ? "✓ Watched" : "Mark watched"}</button></div>`;
};
const poster = (p) => (p ? `<img src="${IMG}w342${p}" alt="" loading="lazy">` : `<div class="ph"></div>`);
// Lucide-style icons (24px grid, stroke follows currentColor).
const ICONS = {
  watchlist: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`,
  watched: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
};
// Tile markup carries no library state (that is applied by syncTileStatus), so toggling a status never rebuilds the grid.
const tile = (x, fresh, d) => {
  const t = esc(x.title), type = x.mediaType || "movie";
  const act = (s) => `<button type="button" class="tile-act ${s}" data-s="${s}" data-id="${x.id}" data-type="${type}" aria-pressed="false">${ICONS[s]}</button>`;
  return `<div class="tile${fresh ? " fresh" : ""}"${fresh ? ` style="--d:${d}ms"` : ""}><button type="button" class="tile-open" data-open="${x.id}" data-type="${type}" aria-label="${t}">${poster(x.poster ?? x.poster_path)}<span class="tile-title">${t}</span></button><div class="tile-actions">${act("watchlist")}${act("watched")}</div></div>`;
};
const ACT_LABEL = { watchlist: ["Add to watchlist", "Remove from watchlist"], watched: ["Mark as watched", "Remove from watched"] };
function syncTileStatus() {
  document.querySelectorAll("#m .tile-act").forEach((b) => {
    const on = state.lib[(b.dataset.type || "movie") + ":" + b.dataset.id]?.status === b.dataset.s;
    const label = ACT_LABEL[b.dataset.s][on ? 1 : 0];
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
    b.setAttribute("aria-label", label);
    b.title = label;
  });
}
// Only tiles that are new to the screen animate in (whole view on tab/query change, just the appended ones on "Load more"); re-renders from status toggles stay still.
let lastSig = "", lastCount = 0, lastMain = "";
function grid(items, sig) {
  const same = sig === lastSig, start = same ? lastCount : 0;
  lastSig = sig; lastCount = items.length;
  return `<div class="grid">${items.map((x, i) => tile(x, i >= start, Math.min(i - start, 14) * 45)).join("")}</div>`;
}

// Titled sections of tiles (home screen). Re-renders with the same sig stay still; a new view animates in.
function sections(list, sig) {
  const fresh = sig !== lastSig; lastSig = sig; lastCount = 0;
  return list.map((s) => `<h2 class="sect">${esc(s.title)}</h2><div class="grid">${s.items.map((x, i) => tile(x, fresh, Math.min(i, 14) * 45)).join("")}</div>`).join("");
}
function homeHTML() {
  const t = state.trending;
  if (!t) return state.trendingFailed ? "" : `<p class="mute">Loading trending…</p>`;
  return sections([{ title: "Trending movies", items: t.movies }, { title: "Trending TV shows", items: t.tv }], "home");
}

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
  const d = state.detail, cast = (d.credits?.cast || []).slice(0, 12);
  const dir = d.mediaType == "tv"
    ? (d.created_by || []).map((c) => c.name).join(", ")
    : (d.credits?.crew || []).filter((c) => c.job == "Director").map((c) => c.name).join(", ");
  const tr = (d.videos?.results || []).find((v) => v.site == "YouTube" && v.type == "Trailer");
  return `<div class="modal" id="modal"><div class="detail" role="dialog" aria-modal="true" aria-label="${esc(d.title)}" tabindex="-1"><div class="grabber" aria-hidden="true"></div><div class="top">${poster(d.poster_path)}<div><h2>${esc(d.title)}</h2>
<div class="mute">${esc((d.release_date || "").slice(0, 4))}${d.mediaType == "tv" ? " · TV" + (d.number_of_seasons ? " · " + d.number_of_seasons + (d.number_of_seasons == 1 ? " season" : " seasons") : "") : ""}${d.runtime ? " · " + d.runtime + " min" : ""}${d.vote_average ? " · ★ " + d.vote_average.toFixed(1) : ""}</div>
<div class="chips">${(d.genres || []).map((g) => `<span class="chip">${esc(g.name)}</span>`).join("")}</div>${btns(d)}</div></div>
${d.tagline ? `<p class="mute"><i>${esc(d.tagline)}</i></p>` : ""}<p>${esc(d.overview)}</p>
${dir ? `<p><b>${d.mediaType == "tv" ? "Created by" : "Director"}:</b> ${esc(dir)}</p>` : ""}
${providersHTML(d.providers)}
<div class="cast">${cast.map((c) => `<div>${c.profile_path ? `<img src="${IMG}w185${c.profile_path}" alt="">` : `<div class="ph" style="border-radius:50%;width:76px;height:76px"></div>`}<b>${esc(c.name)}</b><br><span class="mute" style="font-size:12px">${esc(c.character)}</span></div>`).join("")}</div>
${tr ? `<p><a href="https://www.youtube.com/watch?v=${tr.key}" target="_blank" rel="noopener">Watch trailer</a></p>` : ""}</div></div>`;
}
export function render() {
  const { tab, msg, detail, results, user, lib } = state;
  const btnsEls = [...document.querySelectorAll("nav button")];
  btnsEls.forEach((b) => b.classList.toggle("active", b.dataset.t == tab));
  document.querySelector("nav").style.setProperty("--i", Math.max(0, btnsEls.findIndex((b) => b.dataset.t == tab)));
  let h = msg ? `<p class="${/fail|couldn|error|too many/i.test(msg) ? "err" : "mute"}">${esc(msg)}</p>` : "";
  if (tab == "search" && !state.query) {
    h += homeHTML();
  } else if (tab == "search") {
    h += grid(results, "search|" + state.query);
    if (state.page && state.page < state.totalPages)
      h += `<button class="more" id="more"${state.loadingMore ? " disabled" : ""}>${state.loadingMore ? "Loading…" : "Load more"}</button>`;
  } else if (!user) h += `<p class="mute">Sign in with Google to keep a watchlist and a watched list.</p>`;
  else {
    const items = Object.values(lib).filter((x) => x.status == tab);
    h += items.length ? grid(items, tab) : `<p class="mute">Nothing here yet. Search for a movie or show and add it.</p>`;
  }
  // The modal lives in its own container, and the page is only rebuilt when it actually changed, so opening
  // a title doesn't tear down and re-decode every poster behind it (that stalled the open animation).
  const sig = h.replace(/ fresh"/g, '"').replace(/ style="--d:\d+ms"/g, ""); // entrance-animation markup alone doesn't make the page "changed"
  if (sig !== lastMain) { $("#m").innerHTML = h; lastMain = sig; }
  syncTileStatus();
  const ov = $("#overlay");
  const old = ov.querySelector(".detail");
  const keep = old ? old.scrollTop : 0;
  ov.innerHTML = detail ? detailHTML() : "";
  document.body.classList.toggle("modal-open", !!detail);
  const nu = ov.querySelector(".detail");
  if (nu) { nu.scrollTop = keep; if (!old) { document.getElementById("modal").classList.add("enter"); nu.focus({ preventScroll: true }); } }
}
