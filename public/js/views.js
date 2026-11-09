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
const row = (x) => `<div class="row" data-open="${x.id}" data-type="${x.mediaType || "movie"}">${poster(x.poster ?? x.poster_path)}<div><h3>${esc(x.title)}</h3><div class="mute">${x.mediaType == "tv" ? "TV · " : ""}${esc(x.year ?? (x.release_date || "").slice(0, 4))}</div>${x.overview ? `<p class="mute" style="margin:4px 0 0">${esc(x.overview.slice(0, 140))}${x.overview.length > 140 ? "…" : ""}</p>` : ""}${btns(x)}</div></div>`;

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
  return `<div class="detail"><div class="top">${poster(d.poster_path)}<div><h2>${esc(d.title)}</h2>
<div class="mute">${esc((d.release_date || "").slice(0, 4))}${d.mediaType == "tv" ? " · TV" + (d.number_of_seasons ? " · " + d.number_of_seasons + (d.number_of_seasons == 1 ? " season" : " seasons") : "") : ""}${d.runtime ? " · " + d.runtime + " min" : ""}${d.vote_average ? " · ★ " + d.vote_average.toFixed(1) : ""}</div>
<div class="chips">${(d.genres || []).map((g) => `<span class="chip">${esc(g.name)}</span>`).join("")}</div>${btns(d)}</div></div>
${d.tagline ? `<p class="mute"><i>${esc(d.tagline)}</i></p>` : ""}<p>${esc(d.overview)}</p>
${dir ? `<p><b>${d.mediaType == "tv" ? "Created by" : "Director"}:</b> ${esc(dir)}</p>` : ""}
${providersHTML(d.providers)}
<div class="cast">${cast.map((c) => `<div>${c.profile_path ? `<img src="${IMG}w185${c.profile_path}" alt="">` : `<div class="ph" style="border-radius:50%;width:76px;height:76px"></div>`}<b>${esc(c.name)}</b><br><span class="mute" style="font-size:12px">${esc(c.character)}</span></div>`).join("")}</div>
${tr ? `<p><a href="https://www.youtube.com/watch?v=${tr.key}" target="_blank" rel="noopener">Watch trailer</a></p>` : ""}
<button id="close">Close</button></div>`;
}
export function render() {
  const { tab, msg, detail, results, user, lib } = state;
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("active", b.dataset.t == tab));
  let h = msg ? `<p class="${/fail|couldn|error|too many/i.test(msg) ? "err" : "mute"}">${esc(msg)}</p>` : "";
  if (detail) h += detailHTML();
  if (tab == "search") {
    h += results.map(row).join("");
    if (state.page && state.page < state.totalPages)
      h += `<button class="more" id="more"${state.loadingMore ? " disabled" : ""}>${state.loadingMore ? "Loading…" : "Load more"}</button>`;
  } else if (!user) h += `<p class="mute">Sign in with Google to keep a watchlist and a watched list.</p>`;
  else {
    const items = Object.values(lib).filter((x) => x.status == tab);
    h += items.length ? items.map(row).join("") : `<p class="mute">Nothing here yet. Search for a movie or show and add it.</p>`;
  }
  $("#m").innerHTML = h;
}
