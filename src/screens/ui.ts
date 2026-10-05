// Toasts and dialogs in the Hallowly design language (replaces browser alert/confirm/prompt).
const host = () => {
  let h = document.getElementById("hw-ui");
  if (!h) { h = document.createElement("div"); h.id = "hw-ui"; document.body.appendChild(h); }
  return h;
};

export function toast(msg: string, kind: "info" | "ok" | "error" = "info") {
  const t = document.createElement("div");
  t.className = `hw-toast ${kind}`;
  t.setAttribute("role", kind === "error" ? "alert" : "status");
  t.textContent = msg;
  host().appendChild(t);
  setTimeout(() => t.classList.add("out"), 3600);
  setTimeout(() => t.remove(), 4000);
}

function dialog(msg: string, o: { ok: string; danger?: boolean; input?: { type: string; placeholder: string } }) {
  return new Promise<{ ok: boolean; value: string }>((resolve) => {
    const bg = document.createElement("div");
    bg.className = "hw-dialog-bg";
    bg.innerHTML = `<div class="hw-dialog" role="dialog" aria-modal="true"><p></p>${o.input ? `<input type="${o.input.type}" placeholder="${o.input.placeholder}" autocomplete="new-password">` : ""}<div class="hw-dialog-actions"><button data-x="0">Cancel</button><button data-x="1" class="${o.danger ? "danger" : "primary"}">${o.ok}</button></div></div>`;
    bg.querySelector("p")!.textContent = msg;
    const done = (ok: boolean) => { const value = bg.querySelector("input")?.value ?? ""; bg.remove(); document.removeEventListener("keydown", key); resolve({ ok, value }); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") done(false); else if (e.key === "Enter") done(true); };
    bg.addEventListener("click", (e) => { const x = (e.target as HTMLElement).dataset.x; if (e.target === bg || x === "0") done(false); else if (x === "1") done(true); });
    document.addEventListener("keydown", key);
    host().appendChild(bg);
    (bg.querySelector("input") ?? bg.querySelector<HTMLElement>(".primary, .danger"))?.focus();
  });
}

export const confirmDialog = (msg: string, ok = "Confirm", danger = false) => dialog(msg, { ok, danger }).then((r) => r.ok);
export const promptDialog = (msg: string, input: { type: string; placeholder: string }, ok = "Save") => dialog(msg, { ok, input }).then((r) => (r.ok ? r.value : null));
