/** TMDB list item (search / trending) -> the shape the UI uses. `fallbackType` is for endpoints that omit media_type. */
export function toResult(m: any, fallbackType?: "movie" | "tv") {
  return {
    id: m.id, mediaType: m.media_type ?? fallbackType, title: m.title ?? m.name,
    release_date: m.release_date ?? m.first_air_date,
    poster_path: m.poster_path, overview: m.overview,
  };
}
