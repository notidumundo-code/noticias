"use strict";

const LABELS = { argentina: "Argentina", region: "Región", mundo: "Mundo" };
const state = { cat: "economia", region: "argentina", hours: "24", data: null };
const $ = (s) => document.querySelector(s);

try {
  const saved = JSON.parse(localStorage.getItem("prefs") || "{}");
  Object.assign(state, { cat: saved.cat || state.cat, region: saved.region || state.region, hours: saved.hours || state.hours });
} catch { /* sin almacenamiento: valores por defecto */ }

function savePrefs() {
  try { localStorage.setItem("prefs", JSON.stringify({ cat: state.cat, region: state.region, hours: state.hours })); } catch {}
}

function timeAgo(iso) {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

function safeHref(u) {
  try { const x = new URL(u); return x.protocol === "https:" || x.protocol === "http:" ? x.href : null; } catch { return null; }
}

function render() {
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.cat === state.cat)));
  document.querySelectorAll(".regions button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.region === state.region)));
  $("#hours").value = state.hours;

  const list = $("#list");
  list.replaceChildren();
  if (!state.data) return;
  const stories = state.data.buckets?.[state.cat]?.[state.region] ?? [];
  if (stories.length === 0) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = `Todavía no hay noticias de ${LABELS[state.region]} en este período.`;
    list.append(p);
    return;
  }
  const tpl = $("#story-tpl");
  for (const s of stories) {
    const node = tpl.content.cloneNode(true);
    const a = node.querySelector(".headline");
    a.textContent = s.title;
    const href = safeHref(s.url);
    if (href) a.href = href;
    node.querySelector(".summary").textContent = s.summary || "";
    node.querySelector(".when").textContent = timeAgo(s.published_at);
    const src = node.querySelector(".sources");
    if (s.sources.length > 1) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = `${s.sources.length} medios`;
      src.append(badge, " ");
    }
    for (const o of s.sources.slice(0, 5)) {
      const link = document.createElement("a");
      link.textContent = o.name;
      const h = safeHref(o.url);
      if (h) { link.href = h; link.target = "_blank"; link.rel = "noopener noreferrer"; }
      src.append(link, " ");
    }
    list.append(node);
  }
}

function showLogin(show) {
  $("#login").hidden = !show;
  $("#list").hidden = show;
  document.querySelector(".tabs").hidden = show;
  document.querySelector(".regions").hidden = show;
  $("#refresh").hidden = show;
  $("#hours").hidden = show;
  $("#logout").hidden = show;
  if (show) $("#updated").textContent = "";
}

async function post(path, body) {
  return fetch(path, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  btn.disabled = true;
  $("#login-msg").textContent = "";
  const res = await post("/api/auth/login", { email: $("#email").value, password: $("#password").value }).catch(() => null);
  btn.disabled = false;
  if (res && res.ok) {
    $("#password").value = "";
    showLogin(false);
    load();
    return;
  }
  $("#login-msg").textContent =
    !res ? "Sin conexión. Probá de nuevo." : res.status === 429 ? "Demasiados intentos. Esperá un minuto." : "Email o contraseña incorrectos.";
});
$("#logout").addEventListener("click", async () => {
  const res = await post("/api/auth/logout", {}).catch(() => null);
  if (!res || !res.ok) {
    $("#updated").textContent = "No se pudo cerrar la sesión. Revisá la conexión y probá de nuevo.";
    return;
  }
  loadCtl?.abort();
  state.data = null;
  $("#list").replaceChildren();
  showLogin(true);
});

let loadCtl = null;
async function load() {
  const btn = $("#refresh");
  btn.classList.add("spin");
  loadCtl?.abort();
  const ctl = (loadCtl = new AbortController());
  try {
    const res = await fetch(`/api/news?hours=${state.hours}`, { credentials: "same-origin", signal: ctl.signal });
    if (res.status === 401) { showLogin(true); return; }
    if (res.status === 503) throw new Error("La app todavía no tiene configurado el inicio de sesión.");
    showLogin(false);
    if (!res.ok) throw new Error(String(res.status));
    state.data = await res.json();
    $("#updated").textContent = `Actualizado ${new Date(state.data.generated_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
  } catch (err) {
    if (ctl.signal.aborted) return;
    $("#updated").textContent = state.data ? "Sin conexión: mostrando lo último" : "Sin conexión";
    if (!state.data) {
      const p = document.createElement("p");
      p.className = "error";
      p.textContent = err instanceof Error && err.message.startsWith("La app")
        ? err.message
        : "No se pudieron cargar las noticias. Probá de nuevo en un rato.";
      $("#list").replaceChildren(p);
      return;
    }
  } finally {
    btn.classList.remove("spin");
  }
  render();
}

document.querySelector(".tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-cat]");
  if (b) { state.cat = b.dataset.cat; savePrefs(); render(); window.scrollTo({ top: 0 }); }
});
document.querySelector(".regions").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-region]");
  if (b) { state.region = b.dataset.region; savePrefs(); render(); window.scrollTo({ top: 0 }); }
});
$("#hours").addEventListener("change", (e) => { state.hours = e.target.value; savePrefs(); load(); });
$("#refresh").addEventListener("click", load);

// Refresca al volver a la app y cada 5 minutos mientras está abierta.
const loggedIn = () => $("#login").hidden;
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && loggedIn()) load(); });
setInterval(() => { if (document.visibilityState === "visible" && loggedIn()) load(); }, 5 * 60 * 1000);

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
render();
load();
