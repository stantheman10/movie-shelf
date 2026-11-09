import { key, norm } from "./util.js";
import { state } from "./state.js";
import { j, post } from "./api.js";
import { render } from "./views.js";
import { signIn } from "./auth.js";

export async function setStatus(m, s) {
  if (!state.user) { signIn(); return; }
  const { lib } = state;
  m = norm(m);
  const k = key(m), cur = lib[k];
  const prev = cur ? { ...cur } : null;
  try {
    if (cur && cur.status === s) { delete lib[k]; render(); await j("/api/library?id=" + m.id + "&type=" + m.mediaType, { method: "DELETE" }); }
    else { lib[k] = { ...m, status: s }; render(); await post("/api/library", { movie: m, status: s }); }
  } catch (e) {
    if (prev) lib[k] = prev; else delete lib[k];
    state.msg = "Couldn't save: " + e.message; render();
  }
}
