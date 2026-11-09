export async function j(url, opts) {
  const r = await fetch(url, opts);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(body.error || "Request failed (" + r.status + ")"); e.status = r.status; throw e; }
  return body;
}
// Keep retrying transient failures (502 / 5xx / network) until success; stops if isStale() turns true.
// Other 4xx (including 429 rate limiting) fail immediately.
export async function jRetry(url, isStale, onWait) {
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
export const post = (url, data) => j(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
