// ---- tiny helpers -------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const token = {
  get: () => localStorage.getItem("adminToken") || "",
  set: (v) => localStorage.setItem("adminToken", v),
};

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": token.get(),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    toast("No autorizado. Revisá el admin token.", true);
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Error ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

function toast(msg, isError = false) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.toggle("error", isError);
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}

function escapeHtml(s = "") {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// ---- navigation ---------------------------------------------------
$$(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".nav-item").forEach((b) => b.classList.remove("active"));
    $$(".view").forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    $(`#${btn.dataset.view}`).classList.add("active");
    onShow(btn.dataset.view);
  });
});

function onShow(view) {
  if (view === "dashboard") loadDashboard();
  if (view === "knowledge") loadKnowledge();
  if (view === "conversations") loadConversations();
  if (view === "settings") loadSettings();
}

// ---- token --------------------------------------------------------
$("#token").value = token.get();
$("#save-token").addEventListener("click", () => {
  token.set($("#token").value.trim());
  toast("Token guardado.");
  loadDashboard();
});

// ---- dashboard ----------------------------------------------------
const onOff = (b) => `<span class="badge ${b ? "on" : "off"}">${b ? "OK" : "—"}</span>`;

async function loadDashboard() {
  try {
    const s = await api("/status");
    $("#status-cards").innerHTML = `
      ${card("OpenAI", onOff(s.openai))}
      ${card("WhatsApp", onOff(s.whatsapp))}
      ${card("Twenty CRM", onOff(s.twenty))}
      ${card("Flows", onOff(s.flows))}
      ${card("Firma (signature)", onOff(s.signatureCheck))}
      ${card("Panel protegido", onOff(s.adminProtected))}
    `;
    $("#brain-summary").innerHTML = `
      ${card("Modelo", s.settings.model)}
      ${card("Conversaciones", String(s.conversations))}
      ${card("RAG top K", String(s.settings.knowledgeTopK))}
      ${card("Memoria (turnos)", String(s.settings.memoryMaxTurns))}
    `;
  } catch (e) {
    $("#status-cards").innerHTML = `<p class="muted">No se pudo cargar el estado: ${e.message}</p>`;
  }
}

function card(label, value) {
  return `<div class="card"><div class="label">${label}</div><div class="value">${value}</div></div>`;
}

// ---- playground ---------------------------------------------------
let chatHistory = [];

$("#chat-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("#chat-input");
  const message = input.value.trim();
  if (!message) return;
  input.value = "";
  addBubble("#chat", "user", message);

  const typing = addBubble("#chat", "assistant", "…");
  try {
    const { reply } = await api("/chat", {
      method: "POST",
      body: JSON.stringify({ message, history: chatHistory }),
    });
    typing.textContent = reply;
    chatHistory.push({ role: "user", content: message });
    chatHistory.push({ role: "assistant", content: reply });
  } catch (err) {
    typing.textContent = `⚠️ ${err.message}`;
  }
});

$("#chat-reset").addEventListener("click", () => {
  chatHistory = [];
  $("#chat").innerHTML = "";
});

function addBubble(container, role, text) {
  const el = document.createElement("div");
  el.className = `bubble ${role}`;
  el.textContent = text;
  const box = $(container);
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  return el;
}

// ---- knowledge ----------------------------------------------------
async function loadKnowledge() {
  const list = $("#kb-list");
  try {
    const files = await api("/knowledge");
    list.innerHTML = files.length
      ? files
          .map(
            (f) =>
              `<li data-name="${escapeHtml(f.name)}">${escapeHtml(f.name)}<div class="sub">${f.size} bytes</div></li>`
          )
          .join("")
      : `<li class="muted">Sin archivos todavía</li>`;
    $$("#kb-list li[data-name]").forEach((li) =>
      li.addEventListener("click", () => openKbFile(li.dataset.name))
    );
  } catch (e) {
    list.innerHTML = `<li class="muted">${e.message}</li>`;
  }
}

async function openKbFile(name) {
  const { content } = await api(`/knowledge/${encodeURIComponent(name)}`);
  $("#kb-name").value = name;
  $("#kb-content").value = content;
}

$("#kb-new").addEventListener("click", () => {
  $("#kb-name").value = "";
  $("#kb-content").value = "";
  $("#kb-name").focus();
});

$("#kb-save").addEventListener("click", async () => {
  const name = $("#kb-name").value.trim();
  if (!name) return toast("Poné un nombre de archivo.", true);
  try {
    await api(`/knowledge/${encodeURIComponent(name)}`, {
      method: "PUT",
      body: JSON.stringify({ content: $("#kb-content").value }),
    });
    toast("Guardado y reindexado.");
    loadKnowledge();
  } catch (e) {
    toast(e.message, true);
  }
});

$("#kb-delete").addEventListener("click", async () => {
  const name = $("#kb-name").value.trim();
  if (!name) return;
  if (!confirm(`¿Eliminar ${name}?`)) return;
  try {
    await api(`/knowledge/${encodeURIComponent(name)}`, { method: "DELETE" });
    $("#kb-name").value = "";
    $("#kb-content").value = "";
    toast("Eliminado.");
    loadKnowledge();
  } catch (e) {
    toast(e.message, true);
  }
});

// ---- conversations ------------------------------------------------
async function loadConversations() {
  const list = $("#conv-list");
  try {
    const convs = await api("/conversations");
    list.innerHTML = convs.length
      ? convs
          .map(
            (c) =>
              `<li data-phone="${escapeHtml(c.phone)}">${escapeHtml(c.phone)}<div class="sub">${c.messages} msgs · ${escapeHtml(
                (c.lastMessage || "").slice(0, 40)
              )}</div></li>`
          )
          .join("")
      : `<li class="muted">Sin conversaciones todavía</li>`;
    $$("#conv-list li[data-phone]").forEach((li) =>
      li.addEventListener("click", () => openConversation(li.dataset.phone))
    );
  } catch (e) {
    list.innerHTML = `<li class="muted">${e.message}</li>`;
  }
}

async function openConversation(phone) {
  const history = await api(`/conversations/${encodeURIComponent(phone)}`);
  const box = $("#conv-history");
  box.innerHTML = "";
  history.forEach((m) => addBubble("#conv-history", m.role, m.content));
}

$("#conv-refresh").addEventListener("click", loadConversations);

// ---- settings -----------------------------------------------------
async function loadSettings() {
  const s = await api("/settings");
  const form = $("#settings-form");
  for (const [k, v] of Object.entries(s)) {
    if (form.elements[k]) form.elements[k].value = v;
  }
}

$("#settings-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  try {
    await api("/settings", { method: "POST", body: JSON.stringify(data) });
    toast("Ajustes guardados.");
  } catch (err) {
    toast(err.message, true);
  }
});

// ---- init ---------------------------------------------------------
loadDashboard();
