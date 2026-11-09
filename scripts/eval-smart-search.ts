// Dev-only: run golden queries against the real NVIDIA + TMDB APIs and print resolved titles.
// Usage: npx tsx --env-file=.env scripts/eval-smart-search.ts
import { smartSearch } from "../src/lib/smart-search";

const ALL = [
  "a slow-burn thriller like Prisoners", "cozy 90s rom-com", "mind-bending sci-fi under 2 hours",
  "gritty crime TV series like Breaking Bad", "feel-good animated movie for adults", "psychological horror with an unreliable narrator",
  "heist movies with a clever twist", "korean thrillers like Oldboy", "slow european arthouse about grief",
  "space survival movie like The Martian", "dark comedy about family dysfunction", "true-story courtroom dramas",
  "anime series with great world-building", "movies like Inception but less confusing", "tense one-location thrillers",
];

const QUERIES = process.env.EVAL_N ? ALL.slice(0, Number(process.env.EVAL_N)) : ALL; // EVAL_N=3 runs just the first 3
// One LLM call per query (free tier is ~40 req/min), paced to stay under the limit.
let ok = 0;
for (const q of QUERIES) {
  try {
    const r = await smartSearch(q);
    ok++;
    console.log(`\n${q}\n  ${r.length} resolved: ${r.map((x) => `${x.title} (${(x.release_date ?? "").slice(0, 4)})`).join(", ")}`);
  } catch (e: any) { console.log(`\n${q}\n  FAILED (would fall back): ${e.message}`); }
  await new Promise((r) => setTimeout(r, 2000));
}
console.log(`\n${ok}/${QUERIES.length} queries produced results. Eyeball the lists above for quality.`);
