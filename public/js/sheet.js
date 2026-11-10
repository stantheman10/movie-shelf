import { state } from "./state.js";
import { render } from "./views.js";

// Swipe down on the detail sheet to close it (touch). Only starts when the sheet is scrolled to the top,
// so normal scrolling through a long description still works.
const DISTANCE = 110;   // px dragged to dismiss
const FLICK = 0.6;      // px/ms, a quick short flick also dismisses
const BACKDROP = 0.6;   // matches .modal background alpha in styles.css
const ms = () => (matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200);

let drag = null, lastDrag = 0;
/** True right after a drag, so the click the browser may synthesise on release isn't treated as a backdrop tap. */
export const justDragged = () => Date.now() - lastDrag < 400;

const paint = (d, dy) => {
  d.sheet.style.transform = `translateY(${dy}px)`;
  d.modal.style.backgroundColor = `rgba(0,0,0,${BACKDROP * Math.max(0, 1 - dy / (innerHeight * 0.6))})`;
};

document.addEventListener("touchstart", (e) => {
  const sheet = e.target.closest("#overlay .detail");
  if (!sheet || e.touches.length !== 1) { drag = null; return; }
  const t = e.touches[0];
  drag = { sheet, modal: sheet.parentElement, x: t.clientX, y: t.clientY, atTop: sheet.scrollTop <= 0, active: false, dy: 0, t0: e.timeStamp };
}, { passive: true });

document.addEventListener("touchmove", (e) => {
  if (!drag) return;
  const t = e.touches[0], dx = t.clientX - drag.x, dy = t.clientY - drag.y;
  if (!drag.active) {
    if (!drag.atTop || dy < 6 || Math.abs(dy) < Math.abs(dx)) return; // not a downward swipe from the top
    drag.active = true;
    drag.modal.classList.remove("enter"); // its finished open animation would otherwise pin the transform
    drag.sheet.style.transition = "none"; drag.modal.style.transition = "none";
  }
  if (e.cancelable) e.preventDefault();
  drag.dy = Math.max(0, dy);
  paint(drag, drag.dy);
}, { passive: false });

function end(e) {
  const d = drag; drag = null;
  if (!d || !d.active) return;
  lastDrag = Date.now();
  const fast = d.dy > 40 && d.dy / Math.max(1, e.timeStamp - d.t0) > FLICK;
  const t = ms();
  d.sheet.style.transition = `transform ${t}ms ease-out`;
  d.modal.style.transition = `background-color ${t}ms ease-out`;
  if (d.dy > DISTANCE || fast) {
    paint(d, innerHeight);
    setTimeout(() => { state.detail = null; render(); }, t);
  } else {
    d.sheet.style.transform = ""; d.modal.style.backgroundColor = "";
    setTimeout(() => { d.sheet.style.transition = ""; d.modal.style.transition = ""; }, t);
  }
}
document.addEventListener("touchend", end);
document.addEventListener("touchcancel", end);
