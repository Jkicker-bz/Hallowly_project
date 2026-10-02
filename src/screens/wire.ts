// Connects the ported design screens to live data. Each screen keeps its exact markup;
// these functions fill it in and attach behaviour. Idempotent: safe to re-run on every data change.
import type { NavigateFunction } from "react-router-dom";
import type { useAuth } from "../context/AuthContext";
import type { useLibrary } from "../context/LibraryContext";

export interface Deps {
  auth: ReturnType<typeof useAuth>;
  lib: ReturnType<typeof useLibrary>;
  nav: NavigateFunction;
  /** true when a Supabase backend is configured */
  backend: boolean;
}
type Wire = (root: HTMLElement, d: Deps, signal: AbortSignal) => void;

const q = <T extends HTMLElement = HTMLElement>(r: ParentNode, s: string) => r.querySelector<T>(s);
const text = (r: ParentNode, s: string, t: string) => { const e = q(r, s); if (e) e.textContent = t; };
const on = (el: Element | null, ev: string, fn: (e: Event) => void, signal: AbortSignal) => el?.addEventListener(ev, fn, { signal });
const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const date = (d: string) => new Date(d + "T00:00:00");

/** Replaces the rows matching `sel` with one clone of the first row per item. */
function repeat<T>(root: ParentNode, sel: string, rows: T[], fill: (el: HTMLElement, row: T) => void) {
  const tpl = q(root, `${sel}[data-tpl]`) ?? q(root, sel);
  if (!tpl) return;
  if (!tpl.dataset.tpl) { tpl.dataset.tpl = "1"; tpl.style.display = "none"; }
  root.querySelectorAll(`${sel}:not([data-tpl])`).forEach((e) => e.remove());
  rows.forEach((r) => {
    const el = tpl.cloneNode(true) as HTMLElement;
    el.removeAttribute("data-tpl"); el.style.display = "";
    fill(el, r);
    tpl.parentElement!.appendChild(el);
  });
}

const login: Wire = (root, { auth, nav, backend }, signal) => {
  if (backend && auth.signedIn) { nav("/ui/dashboard", { replace: true }); return; }
  const show = (join: boolean) => {
    q(root, "#view-login")?.classList.toggle("visible", !join);
    q(root, "#view-register")?.classList.toggle("visible", join);
    q(root, "#tab-login")?.classList.toggle("active", !join);
    q(root, "#tab-register")?.classList.toggle("active", join);
  };
  on(q(root, "#tab-login"), "click", () => show(false), signal);
  on(q(root, "#tab-register"), "click", () => show(true), signal);
  on(q(root, "#view-login .form-footer-links button"), "click", () => show(true), signal);
  on(q(root, ".pw-toggle"), "click", () => { const i = q<HTMLInputElement>(root, "#l-pw"); if (i) i.type = i.type === "password" ? "text" : "password"; }, signal);

  const btn = q<HTMLButtonElement>(root, "#view-login .btn-submit")!;
  let msg = q(root, "#login-msg");
  if (!msg) { msg = document.createElement("p"); msg.id = "login-msg"; msg.setAttribute("role", "alert"); btn.after(msg); }
  const say = (t: string, ok = false) => { msg!.className = "field-hint " + (ok ? "ok" : "err"); msg!.textContent = t; };
  const email = () => q<HTMLInputElement>(root, "#l-email")!.value.trim();

  const submit = async () => {
    const pw = q<HTMLInputElement>(root, "#l-pw")!.value;
    if (!email() || !pw) return say("Enter your email and password.");
    btn.disabled = true;
    const err = await auth.signInWithPassword(email(), pw);
    btn.disabled = false;
    if (err) say(err); else nav("/ui/dashboard");
  };
  on(btn, "click", submit, signal);
  root.querySelectorAll("#l-email, #l-pw").forEach((i) => on(i, "keydown", (e) => { if ((e as KeyboardEvent).key === "Enter") submit(); }, signal));
  on(q(root, '#view-login .form-footer-links a[href="#"]'), "click", async (e) => {
    e.preventDefault();
    if (!email()) return say("Enter your email first, then tap Forgot password.");
    const err = await auth.resetPassword(email());
    say(err ?? "Check your email for a link to set a new password.", !err);
  }, signal);

  const reg = q(root, "#view-register");
  if (reg && !q(root, "#join-note")) {
    const p = document.createElement("p");
    p.id = "join-note"; p.className = "form-sub";
    p.textContent = "Joining a church opens soon. For now, ask your worship lead to add your email, then use Sign In.";
    reg.prepend(p);
  }
};

const dashboard: Wire = (root, { auth, lib, nav }, signal) => {
  const { user, isLead } = auth;
  if (user) { text(root, ".user-avatar", initials(user.name)); text(root, ".user-name", user.name); text(root, ".user-role", isLead ? "Worship Lead" : "Team Member"); }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = lib.setlists.filter((s) => s.serviceDate >= today);
  const next = upcoming[0];
  const days = next ? Math.round((date(next.serviceDate).getTime() - date(today).getTime()) / 864e5) : 0;
  text(root, ".topbar-sub", new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) +
    (next ? ` · ${days === 0 ? "Service today" : `Next service in ${days} ${days === 1 ? "day" : "days"}`}` : " · No service planned"));

  const cards = root.querySelectorAll<HTMLElement>(".stat-card");
  const stat = (i: number, v: string, d: string) => { if (cards[i]) { text(cards[i], ".stat-value", v); text(cards[i], ".stat-delta", d); } };
  stat(0, String(lib.songs.length), "in your library");
  stat(1, String(lib.setlists.length), `${upcoming.length} upcoming`);
  stat(2, String(lib.members.length), "on the team");
  stat(3, next ? `${date(next.serviceDate).toLocaleDateString("en", { month: "short" }).toUpperCase()} ${date(next.serviceDate).getDate()}` : "—",
    next ? `${date(next.serviceDate).toLocaleDateString("en", { weekday: "long" })} · ${next.entries.length} songs` : "Nothing planned");

  const keyOf = (sl: (typeof lib.setlists)[number]) => [...new Set(sl.entries.map((e) => e.keyOverride ?? sl.listKey ?? lib.getSongById(e.songId)?.originalKey).filter(Boolean))];
  repeat(root, ".setlist-item", upcoming.slice(0, 4), (el, sl) => {
    const d = date(sl.serviceDate);
    text(el, ".setlist-date-day", String(d.getDate()).padStart(2, "0"));
    text(el, ".setlist-date-mon", d.toLocaleDateString("en", { month: "short" }).toUpperCase());
    text(el, ".setlist-name", sl.serviceTitle);
    const keys = keyOf(sl), crew = (sl.crew ?? []).map((c) => lib.members.find((m) => m.id === c.memberId)?.name).filter(Boolean);
    const spans = el.querySelectorAll(".setlist-meta span");
    if (spans[0]) spans[0].textContent = `${sl.entries.length} songs`;
    if (spans[1]) spans[1].textContent = keys.length ? `Key of ${keys.join(" / ")}` : "No keys yet";
    if (spans[2]) spans[2].textContent = crew.slice(0, 2).join(" · ") || "Crew TBD";
    q(el, ".setlist-tag")?.remove();
    el.style.cursor = "pointer";
    on(el, "click", () => nav(sl.entries[0] ? `/setlists/${sl.id}/perform/${sl.entries[0].songId}` : "/setlists"), signal);
  });

  repeat(root, ".song-table tbody tr", lib.songs.slice(-5).reverse(), (el, s) => {
    text(el, ".song-title-cell", s.title);
    const cells = el.querySelectorAll("td");
    if (cells[1]) cells[1].textContent = s.artist ?? "—";
    text(el, ".song-key-cell", s.originalKey);
    text(el, ".song-style-cell", s.style ?? "—");
    if (cells[4]) cells[4].textContent = String(lib.setlists.filter((l) => l.entries.some((e) => e.songId === s.id)).length);
  });

  const actions = root.querySelectorAll(".card-action");
  on(actions[0], "click", () => nav("/setlists"), signal);
  on(actions[1], "click", () => nav("/library"), signal);
  const qa = root.querySelectorAll(".qa-btn");
  on(qa[0], "click", () => nav("/library"), signal);
  on(qa[1], "click", () => nav("/setlists"), signal);
};

export const wire: Record<string, Wire> = { login, dashboard };
