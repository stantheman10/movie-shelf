import { $, esc } from "./util.js";
import { state } from "./state.js";
import { post } from "./api.js";
import { render } from "./views.js";

export async function signIn() {
  try { const r = await post("/api/auth/sign-in/social", { provider: "google", callbackURL: "/" }); if (r.url) location.href = r.url; }
  catch (e) { state.msg = "Sign-in failed: " + e.message; render(); }
}
export async function signOut() { await post("/api/auth/sign-out", {}).catch(() => {}); location.reload(); }
export function renderAuth() {
  const { user } = state;
  $("#auth").innerHTML = user
    ? `${user.image ? `<img src="${esc(user.image)}" alt="" referrerpolicy="no-referrer">` : ""}<button id="out">Sign out</button>`
    : `<button class="primary" id="in">Sign in with Google</button>`;
  const b = $("#in") || $("#out");
  b.onclick = user ? signOut : signIn;
}
