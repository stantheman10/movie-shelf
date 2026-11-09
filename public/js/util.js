export const IMG = "https://image.tmdb.org/t/p/";
export const $ = (s) => document.querySelector(s);
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// TMDB ids overlap between movies and shows, so every item is identified by type + id.
export const key = (m) => (m.mediaType || "movie") + ":" + m.id;
export const norm = (m) => ({ id: m.id, mediaType: m.mediaType || "movie", title: m.title, year: m.year ?? (m.release_date || "").slice(0, 4), poster: m.poster ?? m.poster_path, overview: m.overview });
