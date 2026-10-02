// Connects the ported design screens to live data. Each screen keeps its exact markup;
// these functions fill it in and attach behaviour. Idempotent: safe to re-run on every data change.
import type { NavigateFunction } from "react-router-dom";
import type { useAuth } from "../context/AuthContext";
import type { useLibrary } from "../context/LibraryContext";
import type { Song, SongLine } from "../types/song";
import { semitoneDiff, spell, transposeChord } from "../lib/transpose";

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
  if (backend && auth.signedIn) { nav("/dashboard", { replace: true }); return; }
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
    if (err) say(err); else nav("/dashboard");
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
  on(qa[0], "click", () => nav("/manage/library"), signal);
  on(qa[1], "click", () => nav("/create-setlist"), signal);
};



// ---------- shared chart helpers ----------
const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
/** Chord symbols placed at their character offsets (monospace), e.g. "G     D". */
const chordRow = (l: SongLine, f: (c: string) => string) =>
  l.chords.reduce((r, c) => r.padEnd(Math.max(c.charIndex, r ? r.length + 1 : 0)) + f(c.symbol), "");
const styleKey = (s?: string) => { const k = (s ?? "").toLowerCase(); return ["gospel", "praise", "hymn"].find((x) => k.includes(x)) ?? (/latin|cumbia/.test(k) ? "latin" : "contemporary"); };
const STYLE: Record<string, { label: string; cls: string; stripe: string; chip: string; text: string; bar: string }> = {
  contemporary: { label: "Contemporary", cls: "ctag-c", stripe: "stripe-contemporary", chip: "rgba(155,89,182,.12)", text: "#C084E0", bar: "var(--accent)" },
  gospel: { label: "Gospel", cls: "ctag-g", stripe: "stripe-gospel", chip: "rgba(160,129,94,.12)", text: "#C4A07A", bar: "var(--bronze)" },
  latin: { label: "Latin", cls: "ctag-l", stripe: "stripe-latin", chip: "rgba(230,126,34,.1)", text: "#E8944A", bar: "var(--amber)" },
  praise: { label: "Praise", cls: "ctag-p", stripe: "stripe-praise", chip: "rgba(26,188,156,.1)", text: "#4DD4B9", bar: "var(--aqua)" },
  hymn: { label: "Hymn", cls: "ctag-h", stripe: "stripe-hymn", chip: "rgba(192,192,192,.08)", text: "var(--silver)", bar: "var(--silver)" },
};
const usedIn = (lib: Deps["lib"], id: string) => lib.setlists.filter((l) => l.entries.some((e) => e.songId === id)).length;

// ---------- library ----------
const L = { page: 1, sort: "alpha", q: "", style: "", key: "", open: null as string | null };

const library: Wire = (root, { auth, lib, nav }, signal) => {
  const PER = 12;
  const f = (c: string) => c;
  const g = <T extends HTMLElement>(id: string) => q<T>(root, "#" + id)!;
  text(root, ".hero-eyebrow", `${auth.team?.name ?? "Hallowly"} · ${lib.songs.length} Songs`);
  if (auth.user) { const b = q(root, ".nav-actions .btn-ghost"); if (b) { b.textContent = "Dashboard"; b.setAttribute("href", "/dashboard"); } }
  const team = q(root, ".team-cta"); if (team) team.style.display = auth.signedIn ? "none" : "";
  root.querySelectorAll<HTMLElement>(".nav-actions .btn-primary, .add-song-btn, #song-modal .mf-btn.primary").forEach((b) => { b.style.display = auth.isLead ? "" : "none"; if (!b.classList.contains("mf-btn")) b.setAttribute("href", "/manage/library"); });

  // side panels
  const byStyle: Record<string, number> = {}, keys: Record<string, number> = {};
  lib.songs.forEach((s) => { const k = styleKey(s.style); byStyle[k] = (byStyle[k] ?? 0) + 1; keys[s.originalKey] = (keys[s.originalKey] ?? 0) + 1; });
  const total = Math.max(lib.songs.length, 1);
  repeat(root, ".style-row", Object.entries(byStyle).sort((a, b) => b[1] - a[1]), (el, [k, n]) => {
    text(el, ".style-name", STYLE[k].label); text(el, ".sbar-ct", String(n));
    const bar = q(el, ".sbar-fill"); if (bar) { bar.style.width = Math.round((n / total) * 100) + "%"; bar.style.background = STYLE[k].bar; }
  });
  repeat(root, ".key-pill", Object.entries(keys).sort((a, b) => b[1] - a[1]).slice(0, 10), (el, [k], ) => { el.textContent = k; el.classList.toggle("hot", (keys[k] ?? 0) >= 2); });
  repeat(root, ".rset-item", [...lib.setlists].reverse().slice(0, 5), (el, sl) => {
    text(el, ".rsi-date", date(sl.serviceDate).toLocaleDateString("en", { month: "short", day: "2-digit" }).toUpperCase());
    text(el, ".rsi-name", sl.serviceTitle); text(el, ".rsi-ct", String(sl.entries.length));
  });

  const render = () => {
    let rows = lib.songs.filter((s) => {
      const t = L.q.toLowerCase();
      return (!t || `${s.title} ${s.artist ?? ""} ${s.originalKey}`.toLowerCase().includes(t)) &&
        (!L.style || styleKey(s.style) === L.style) && (!L.key || s.originalKey === L.key.replace("♭", "b").replace("♯", "#"));
    });
    const cmp: Record<string, (a: Song, b: Song) => number> = {
      alpha: (a, b) => a.title.localeCompare(b.title), key: (a, b) => a.originalKey.localeCompare(b.originalKey),
      sets: (a, b) => usedIn(lib, b.id) - usedIn(lib, a.id),
    };
    rows = L.sort === "recent" ? [...rows].reverse() : [...rows].sort(cmp[L.sort]);
    const pages = Math.max(1, Math.ceil(rows.length / PER));
    L.page = Math.min(L.page, pages);
    g("visible-count").textContent = String(rows.length);
    g("card-grid").innerHTML = rows.length ? rows.slice((L.page - 1) * PER, L.page * PER).map((s) => {
      const m = STYLE[styleKey(s.style)], n = usedIn(lib, s.id);
      const dots = Array.from({ length: Math.min(n, 10) }, (_, i) => `<div class="use-dot${i < 5 ? " lit" : ""}"></div>`).join("");
      return `<div class="song-card" data-id="${s.id}" role="button" tabindex="0"><div class="card-stripe ${m.stripe}"></div><div class="card-glow"></div>
        <div class="card-body"><div class="card-key-badge">${esc(s.originalKey)}</div><div class="card-song-name">${esc(s.title)}</div><div class="card-artist">${esc(s.artist ?? "")}</div>
        <div class="card-tags"><span class="ctag ${m.cls}">${m.label}</span>${s.bpm ? `<span class="ctag ctag-bpm">${s.bpm} BPM</span>` : ""}</div>
        <div class="card-stats"><div class="cstat"><div class="cstat-val">${String(n).padStart(2, "0")}</div><div class="cstat-label">Sets used</div></div><div class="cstat"><div class="use-dots">${dots}</div><div class="cstat-label">Frequency</div></div></div></div>
        <div class="card-footer"><button class="cfoot-btn" data-act="open">♩ Chords</button><button class="cfoot-btn" data-act="set">+ Set List</button><button class="cfoot-btn primary-action" data-act="view">View →</button></div></div>`;
    }).join("") : `<div class="empty-state"><div class="es-icon">♩</div><div class="es-title">No songs found</div><div class="es-sub">Try adjusting your search or filters.</div></div>`;
    const btn = (n: number, label: string, cls = "", off = false) => `<button class="page-btn${cls}" data-page="${n}"${off ? ' disabled style="opacity:.3"' : ""}>${label}</button>`;
    g("pagination").innerHTML = pages < 2 ? "" : btn(L.page - 1, "‹", "", L.page === 1) +
      Array.from({ length: pages }, (_, i) => i + 1).filter((i) => i === 1 || i === pages || Math.abs(i - L.page) <= 1).map((i) => btn(i, String(i), i === L.page ? " active" : "")).join("") + btn(L.page + 1, "›", "", L.page === pages);

    const song = L.open ? lib.getSongById(L.open) : undefined;
    g("song-modal").classList.toggle("open", !!song);
    document.body.style.overflow = song ? "hidden" : "";
    if (song) {
      const m = STYLE[styleKey(song.style)], chip = (bg: string, c: string, t: string) => `<span class="mchip" style="background:${bg};color:${c};">${t}</span>`, dim = "rgba(192,192,192,.06)";
      g("modal-title").textContent = song.title; g("modal-artist").textContent = song.artist ?? "";
      g("modal-stripe").className = "modal-stripe " + m.stripe;
      g("modal-chips").innerHTML = chip("var(--accent-lo)", "var(--accent)", `Key of ${esc(song.originalKey)}`) + chip(m.chip, m.text, m.label) +
        (song.bpm ? chip(dim, "var(--muted2)", `${song.bpm} BPM`) : "") + chip(dim, "var(--muted2)", `Used in ${usedIn(lib, song.id)} sets`);
      g("modal-chords").innerHTML = song.loaded === false ? "Loading chart…" :
        (auth.signedIn ? song.sections : song.sections.slice(0, 1)).map((sec) => `<span class="cp-section">[${esc(sec.label ?? sec.kind)}]</span>\n` +
          sec.lines.map((l) => (l.chords.length ? chordRow(l, f) + "\n" : "") + esc(l.lyric)).join("\n")).join("\n\n");
      const full = q(root, '#song-modal a[href^="/song-detail"]'); full?.setAttribute("href", `/song/${song.id}`);
      lib.ensureChart(song.id);
    }
  };

  const search = g<HTMLInputElement>("search-input"), sort = g<HTMLSelectElement>("sort-select");
  search.value = L.q; sort.value = L.sort; g<HTMLSelectElement>("style-filter").value = L.style; g<HTMLSelectElement>("key-filter").value = L.key;
  const chipFor: Record<string, string> = { all: "alpha", used: "sets", recent: "recent" };
  const chips = () => root.querySelectorAll<HTMLElement>(".fchip").forEach((c) => c.classList.toggle("active", chipFor[c.id.replace("chip-", "")] === L.sort));
  const upd = (fn: () => void) => () => { fn(); L.page = 1; chips(); render(); };
  on(search, "input", upd(() => (L.q = search.value)), signal);
  on(sort, "change", upd(() => (L.sort = sort.value)), signal);
  on(g("style-filter"), "change", upd(() => (L.style = g<HTMLSelectElement>("style-filter").value)), signal);
  on(g("key-filter"), "change", upd(() => (L.key = g<HTMLSelectElement>("key-filter").value)), signal);
  root.querySelectorAll<HTMLElement>(".fchip").forEach((c) => on(c, "click", upd(() => { L.sort = chipFor[c.id.replace("chip-", "")]; sort.value = L.sort; }), signal));
  on(g("card-grid"), "click", (e) => {
    const t = e.target as HTMLElement, card = t.closest<HTMLElement>(".song-card"), act = t.closest<HTMLElement>("[data-act]")?.dataset.act;
    if (!card) return;
    if (act === "set") nav("/manage/setlists"); else if (act === "view") nav(`/song/${card.dataset.id}`); else { L.open = card.dataset.id!; render(); }
  }, signal);
  on(g("card-grid"), "keydown", (e) => { const k = e as KeyboardEvent, c = (k.target as HTMLElement).closest<HTMLElement>(".song-card"); if (k.key === "Enter" && c) { L.open = c.dataset.id!; render(); } }, signal);
  on(g("pagination"), "click", (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>("[data-page]"); if (b) { L.page = Number(b.dataset.page); render(); root.querySelector(".page-body")?.scrollIntoView({ behavior: "smooth" }); } }, signal);
  const close = () => { L.open = null; render(); };
  on(q(root, ".modal-close"), "click", close, signal);
  on(q(root, "#song-modal .mf-btn.ghost"), "click", close, signal);
  on(g("song-modal"), "click", (e) => { if (e.target === g("song-modal")) close(); }, signal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && L.open) close(); }, { signal });
  signal.addEventListener("abort", () => { document.body.style.overflow = ""; });
  chips(); render();
};

// ---------- song detail (/song/ID) ----------
const D = { id: "", shift: 0, size: 13 };

const songDetail: Wire = (root, { auth, lib, nav }, signal) => {
  const id = window.location.pathname.split("/")[2] ?? lib.songs[0]?.id;
  const song = id ? lib.getSongById(id) : undefined;
  if (!song) { text(root, ".hero-title", lib.songs.length ? "Song not found" : "Loading…"); return; }
  if (D.id !== song.id) { D.id = song.id; D.shift = 0; }
  lib.ensureChart(song.id);

  const paint = () => {
  const steps = (semitoneDiff(song.originalKey, song.originalKey) + D.shift + 120) % 12;
  const key = spell(song.originalKey, steps), show = (c: string) => transposeChord(c, steps, key.flat);
  text(root, ".hero-title", song.title); text(root, ".hero-artist", song.artist ?? "");
  text(root, ".hero-eyebrow", `${auth.team?.name ?? "Hallowly"} · Song Library`);
  text(root, ".hc-key", `Key of ${key.name}`); text(root, ".hc-style", STYLE[styleKey(song.style)].label);
  text(root, ".hc-bpm", song.bpm ? `${song.bpm} BPM` : "—"); q(root, ".hc-lang")?.remove();
  const hs = root.querySelectorAll<HTMLElement>(".hs-item");
  text(hs[0], ".hs-val", String(usedIn(lib, song.id))); text(hs[1], ".hs-val", song.originalKey); if (hs[2]) hs[2].style.display = "none";
  text(root, "#ct-key", key.name); text(root, "#ct-fs", String(D.size));
  const edit = q(root, "#btn-hero-edit"); if (edit) edit.style.display = auth.isLead ? "" : "none";

  const disp = q(root, "#chord-display")!;
  disp.style.fontSize = D.size + "px";
  const secs = auth.signedIn ? song.sections : song.sections.slice(0, 1);
  disp.innerHTML = song.loaded === false ? '<span class="cd-section">Loading chart…</span>' :
    secs.map((s) => `<span class="cd-section">[${esc(s.label ?? s.kind)}]</span>` + s.lines.map((l) =>
      (l.chords.length ? `<span class="cd-chords">${esc(chordRow(l, show))}</span>` : "") + (l.lyric ? `<span class="cd-lyrics">${esc(l.lyric)}</span>` : "")).join("") + '<span class="cd-blank"></span>').join("") +
    (auth.signedIn ? "" : '<span class="cd-section">// Sign in to view the full chord sheet</span>');

  };
  paint();

  const btns = root.querySelectorAll<HTMLElement>(".ct-btn"), actions = root.querySelectorAll<HTMLElement>(".hero-actions .btn");
  const bump = (fn: () => void) => () => { fn(); paint(); };
  on(btns[0], "click", bump(() => D.shift--), signal); on(btns[1], "click", bump(() => D.shift++), signal);
  on(btns[2], "click", bump(() => (D.size = Math.max(10, D.size - 1))), signal); on(btns[3], "click", bump(() => (D.size = Math.min(24, D.size + 1))), signal);
  on(actions[1], "click", () => window.print(), signal);
  on(actions[2], "click", () => nav("/manage/setlists"), signal);
  on(q(root, ".eb-link"), "click", () => nav("/library"), signal);
};

// ---------- setlists ----------
const SL = { id: "" };

const setlists: Wire = (root, { auth, lib, nav }, signal) => {
  const today = new Date().toISOString().slice(0, 10);
  const all = [...lib.setlists.filter((s) => s.serviceDate >= today), ...lib.setlists.filter((s) => s.serviceDate < today).reverse()];
  if (!all.some((s) => s.id === SL.id)) SL.id = all[0]?.id ?? "";
  const nameOf = (id: string) => lib.members.find((m) => m.id === id)?.name ?? "";
  const mon = (d: string) => date(d).toLocaleDateString("en", { month: "short", day: "numeric" }).toUpperCase();

  const paint = () => {
    const sl = all.find((s) => s.id === SL.id);
    repeat(root, ".set-item", all, (el, s) => {
      text(el, ".set-item-name", s.serviceTitle); text(el, ".set-item-date", mon(s.serviceDate));
      const m = el.querySelectorAll(".set-item-meta span");
      if (m[0]) m[0].textContent = `${s.entries.length} songs`;
      if (m[1]) m[1].textContent = (s.crew ?? []).map((c) => nameOf(c.memberId)).filter(Boolean).slice(0, 2).join(" · ") || "Unassigned";
      el.style.opacity = s.entries.length ? "" : ".55";
      const tag = q(el, ".set-tag"); if (tag) tag.textContent = s.entries.length ? (s.serviceDate < today ? "Past" : "Ready") : "Draft";
      el.classList.toggle("active", s.id === SL.id);
      on(el, "click", () => { SL.id = s.id; paint(); }, signal);
    });
    text(root, ".detail-set-name", sl ? `${sl.serviceTitle} — ${mon(sl.serviceDate)}` : "No set lists yet");
    const pill = q(root, ".status-pill"); if (pill) { pill.textContent = sl?.entries.length ? "Ready" : "Draft"; pill.className = "status-pill " + (sl?.entries.length ? "sp-ready" : "sp-draft"); }
    const v = root.querySelectorAll(".meta-chip-value");
    const styles = sl?.entries.map((e) => STYLE[styleKey(lib.getSongById(e.songId)?.style)].label) ?? [];
    const top = Object.entries(styles.reduce<Record<string, number>>((a, k) => ((a[k] = (a[k] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (sl) {
      if (v[0]) v[0].textContent = date(sl.serviceDate).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      if (v[1]) v[1].textContent = sl.note ?? "Worship service";
      if (v[2]) v[2].textContent = String(sl.entries.length).padStart(2, "0");
      if (v[3]) v[3].textContent = top ?? "—";
    }
    repeat(root, ".order-row", (sl?.entries ?? []).map((e, i) => ({ e, i })), (el, { e, i }) => {
      const song = lib.getSongById(e.songId); if (!song || !sl) return;
      text(el, ".order-num", String(i + 1).padStart(2, "0")); text(el, ".order-song-name", song.title); text(el, ".order-artist", song.artist ?? "");
      text(el, ".order-key", e.keyOverride ?? sl.listKey ?? song.originalKey); q(el, ".order-duration")?.remove();
      const b = el.querySelectorAll<HTMLElement>(".tiny-btn");
      on(b[0], "click", () => nav(`/setlists/${sl.id}/perform/${song.id}`), signal);
      if (auth.isLead) on(b[1], "click", () => { if (confirm(`Remove "${song.title}" from this set?`)) lib.removeSongFromSetlist(sl.id, song.id); }, signal);
      else if (b[1]) b[1].style.display = "none";
    });
    repeat(root, ".assigned-row", sl?.crew ?? [], (el, c) => {
      const n = nameOf(c.memberId); text(el, ".a-avatar", initials(n)); text(el, ".a-name", n); text(el, ".a-role", c.role);
    });
    root.querySelectorAll<HTMLElement>(".ds-card").forEach((c) => { if (/activity/i.test(q(c, ".ds-header")?.textContent ?? "")) c.style.display = "none"; });
    const act = root.querySelectorAll<HTMLElement>(".topbar-actions .btn-xs");
    on(act[0], "click", () => window.print(), signal);
    if (act[1]) act[1].style.display = "none";
    if (act[2]) { act[2].style.display = auth.isLead ? "" : "none"; on(act[2], "click", () => nav("/manage/setlists"), signal); }
  };
  paint();
};

// ---------- create set list ----------
const CS = { picked: [] as { id: string; key: string }[], style: "all", q: "", crew: new Set<string>(), empty: "" };

const createSetlist: Wire = (root, { auth, lib, nav, backend }, signal) => {
  const g = <T extends HTMLElement>(id: string) => q<T>(root, "#" + id)!;
  text(root, ".panel-eyebrow", `${auth.team?.name ?? "Hallowly"} · ${lib.songs.length} songs`);
  if (!CS.empty) CS.empty = g("order-list").innerHTML;
  q(root, ".order-footer")?.style.setProperty("display", "none");

  const picker = () => {
    const t = CS.q.toLowerCase();
    const rows = lib.songs.filter((s) => (CS.style === "all" || styleKey(s.style) === CS.style) && (!t || `${s.title} ${s.artist ?? ""}`.toLowerCase().includes(t)));
    g("picker-scroll").innerHTML = rows.map((s) => {
      const on = CS.picked.some((p) => p.id === s.id);
      return `<div class="picker-song${on ? " added" : ""}" data-id="${s.id}"><div class="style-dot" style="background:${STYLE[styleKey(s.style)].bar}"></div><div class="ps-info"><div class="ps-name">${esc(s.title)}</div><div class="ps-meta">${esc(s.artist ?? "")}</div></div><span class="ps-key">${esc(s.originalKey)}</span><div class="add-icon">${on ? "✓" : "+"}</div></div>`;
    }).join("");
  };
  const order = () => {
    const n = CS.picked.length;
    g("order-count").textContent = `${n} song${n === 1 ? "" : "s"} added`;
    g("order-list").innerHTML = n ? CS.picked.map((p, i) => {
      const s = lib.getSongById(p.id)!;
      return `<div class="order-item" draggable="true" data-i="${i}"><span class="drag-handle">⠿</span><span class="order-num">${String(i + 1).padStart(2, "0")}</span><div class="order-info"><div class="order-name">${esc(s.title)}</div><div class="order-artist">${esc(s.artist ?? "")}</div></div><div class="order-key-wrap"><button class="transpose-btn" data-k="-1">♭</button><span class="order-key">${esc(p.key)}</span><button class="transpose-btn" data-k="1">♯</button></div><button class="remove-btn" data-rm="1">×</button></div>`;
    }).join("") : CS.empty;
  };
  repeat(root, ".member-row", lib.members, (el, m) => {
    text(el, ".m-name", m.name); text(el, ".m-role", m.instrument); text(el, ".m-av", initials(m.name));
    const t = q(el, ".m-toggle"); t?.classList.toggle("on", CS.crew.has(m.id));
    on(el, "click", () => { if (CS.crew.has(m.id)) CS.crew.delete(m.id); else CS.crew.add(m.id); t?.classList.toggle("on", CS.crew.has(m.id)); }, signal);
  });

  on(g("picker-scroll"), "click", (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>(".picker-song")?.dataset.id; if (!id) return;
    CS.picked = CS.picked.some((p) => p.id === id) ? CS.picked.filter((p) => p.id !== id) : [...CS.picked, { id, key: lib.getSongById(id)!.originalKey }];
    picker(); order();
  }, signal);
  on(g("order-list"), "click", (e) => {
    const t = e.target as HTMLElement, i = Number(t.closest<HTMLElement>(".order-item")?.dataset.i);
    if (Number.isNaN(i)) return;
    if (t.dataset.rm) CS.picked.splice(i, 1);
    else if (t.dataset.k) { const k = Number(t.dataset.k); CS.picked[i].key = transposeChord(CS.picked[i].key, k, k < 0); }
    else return;
    picker(); order();
  }, signal);
  let from = -1;
  on(g("order-list"), "dragstart", (e) => { from = Number((e.target as HTMLElement).closest<HTMLElement>(".order-item")?.dataset.i); }, signal);
  on(g("order-list"), "dragover", (e) => e.preventDefault(), signal);
  on(g("order-list"), "drop", (e) => {
    const to = Number((e.target as HTMLElement).closest<HTMLElement>(".order-item")?.dataset.i);
    if (from < 0 || Number.isNaN(to)) return;
    CS.picked.splice(to, 0, CS.picked.splice(from, 1)[0]); from = -1; order();
  }, signal);
  on(q(root, ".search-input"), "input", (e) => { CS.q = (e.target as HTMLInputElement).value; picker(); }, signal);
  const styles = ["all", "contemporary", "gospel", "latin"];
  root.querySelectorAll<HTMLElement>(".fchip").forEach((c, i) => on(c, "click", () => { CS.style = styles[i]; root.querySelectorAll(".fchip").forEach((x) => x.classList.toggle("active", x === c)); picker(); }, signal));
  root.querySelectorAll<HTMLElement>(".echip").forEach((c) => on(c, "click", () => root.querySelectorAll(".echip").forEach((x) => x.classList.toggle("active", x === c)), signal));

  const save = () => {
    const title = q<HTMLInputElement>(root, '.details-section input[type="text"]')!.value.trim(), day = q<HTMLInputElement>(root, 'input[type="date"]')!.value;
    if (backend && !auth.signedIn) return nav("/login");
    if (backend && !auth.isLead) return alert("Only worship leads can create set lists.");
    if (!title || !day) return alert("Add a title and a date first.");
    lib.addSetlist({
      serviceTitle: title, serviceDate: day, note: q(root, ".echip.active")?.textContent ?? undefined,
      entries: CS.picked.map((p) => ({ songId: p.id, keyOverride: p.key !== lib.getSongById(p.id)?.originalKey ? p.key : undefined })),
      crew: [...CS.crew].map((id) => ({ memberId: id, role: lib.members.find((m) => m.id === id)?.instrument ?? "" })),
    });
    CS.picked = []; CS.crew = new Set(); nav("/setlists");
  };
  root.querySelectorAll(".topbar-right .btn").forEach((b) => on(b, "click", save, signal));
  picker(); order();
};

// ---------- team ----------
const team: Wire = (root, { auth, lib, nav }, signal) => {
  text(root, ".topbar-sub", `${auth.team?.name ?? "Hallowly"} · ${lib.members.length} members`);
  const cards = root.querySelectorAll<HTMLElement>(".stat-strip .stat-card");
  text(cards[0], ".sc-value", String(lib.members.length)); text(cards[0], ".sc-sub", "On the team");
  [1, 2].forEach((i) => { if (cards[i]) cards[i].style.display = "none"; });
  text(cards[3], ".sc-value", auth.isLead ? "Lead" : "Member");
  root.querySelectorAll<HTMLElement>(".topbar-right .btn, .card-action").forEach((b) => (b.style.display = "none"));
  repeat(root, ".member-table tbody tr", lib.members, (el, m) => {
    text(el, ".m-avatar", initials(m.name)); text(el, ".m-name", m.name); text(el, ".m-email", m.instrument);
    const rb = q(el, ".role-badge"); if (rb) { rb.textContent = m.instrument; rb.className = "role-badge " + (m.instrument === "Lead" ? "rb-lead" : "rb-vocalist"); }
    text(el, ".status-text", "Active"); text(el, ".joined-date", "—");
    const ra = q(el, ".row-actions");
    if (ra) { ra.innerHTML = auth.isLead ? '<button class="row-btn edit">Manage</button>' : ""; on(q(ra, "button"), "click", () => nav("/manage/team"), signal); }
  });
};

export const wire: Record<string, Wire> = { "create-setlist": createSetlist, team, login, dashboard, library, "song-detail": songDetail, setlists };
