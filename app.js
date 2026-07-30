const STORAGE_KEY = "kahwet-al-aatik-ops-v1";

const MENU = [
  { id: "turkish", name: "Turkish Coffee", category: "Coffee", icon: "☕" },
  { id: "black", name: "Black Coffee", category: "Coffee", icon: "☕" },
  { id: "espresso", name: "Espresso", category: "Coffee", icon: "☕" },
  { id: "double-espresso", name: "Double Espresso", category: "Coffee", icon: "☕" },
  { id: "americano", name: "Americano", category: "Coffee", icon: "☕" },
  { id: "cappuccino", name: "Cappuccino", category: "Coffee", icon: "☕" },
  { id: "latte", name: "Café Latte", category: "Coffee", icon: "☕" },
  { id: "nescafe", name: "Nescafé", category: "Coffee", icon: "☕" },
  { id: "white", name: "White Coffee", category: "Coffee", icon: "☕" },
  { id: "pepsi", name: "Pepsi", category: "Pepsi", icon: "P" },
  { id: "diet-pepsi", name: "Diet Pepsi", category: "Pepsi", icon: "P" },
  { id: "pepsi-zero", name: "Pepsi Zero", category: "Pepsi", icon: "P" },
  { id: "7up", name: "7UP", category: "Pepsi", icon: "7" },
  { id: "diet-7up", name: "Diet 7UP", category: "Pepsi", icon: "7" },
  { id: "mirinda-orange", name: "Mirinda Orange", category: "Pepsi", icon: "M" },
  { id: "mirinda-apple", name: "Mirinda Apple", category: "Pepsi", icon: "M" },
  { id: "mountain-dew", name: "Mountain Dew", category: "Pepsi", icon: "D" },
  { id: "lipton-lemon", name: "Lipton Lemon", category: "Pepsi", icon: "L" },
  { id: "lipton-peach", name: "Lipton Peach", category: "Pepsi", icon: "L" },
  { id: "lipton-red", name: "Lipton Red Fruits", category: "Pepsi", icon: "L" },
  { id: "gatorade", name: "Gatorade", category: "Pepsi", icon: "G" },
  { id: "tropicana", name: "Tropicana", category: "Pepsi", icon: "T" },
  { id: "mr-juicy", name: "Mr. Juicy", category: "Pepsi", icon: "J" },
  { id: "amp", name: "AMP Energy", category: "Pepsi", icon: "A" },
  { id: "green-cola", name: "Green Cola", category: "Green", icon: "G" },
  { id: "green-cf", name: "Green Cola Caffeine Free", category: "Green", icon: "G" },
  { id: "green-lemon", name: "Green Lemon Lime", category: "Green", icon: "G" },
  { id: "green-orange", name: "Green Orangeade", category: "Green", icon: "G" },
  { id: "green-cherry", name: "Green Sour Cherry", category: "Green", icon: "G" },
  { id: "green-mojito", name: "Green Mojito", category: "Green", icon: "G" },
  { id: "green-grapefruit", name: "Green Pink Grapefruit", category: "Green", icon: "G" },
  { id: "rim-sparkling", name: "Rim Sparkling", category: "Rim", icon: "R" },
  { id: "rim-lemon", name: "Rim Lemon", category: "Rim", icon: "R" },
  { id: "rim-apple", name: "Rim Apple", category: "Rim", icon: "R" },
  { id: "rim-pineapple", name: "Rim Pineapple", category: "Rim", icon: "R" },
  { id: "rim-mango", name: "Rim Mango", category: "Rim", icon: "R" },
  { id: "rim-citrus", name: "Rim Citrus", category: "Rim", icon: "R" },
  { id: "water-250", name: "Water 250 ml", category: "Water", icon: "W" },
  { id: "shisha-double-apple", name: "Double Apple", category: "Shisha", icon: "ش" },
  { id: "shisha-mint", name: "Mint", category: "Shisha", icon: "ش" },
];

const CATEGORIES = ["Coffee", "Pepsi", "Green", "Rim", "Water", "Shisha"];

const state = {
  view: "order",
  report: "today",
  category: "Coffee",
  customer: "",
  personalLock: false,
  qty: {},
  saveStatus: "idle",
  orders: [],
  linkName: "",
  linkReady: "",
  linkCopied: false,
  month: monthKey(new Date()),
};

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function uid() {
  return `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.orders = raw ? JSON.parse(raw) : [];
  } catch {
    state.orders = [];
  }
}

function saveOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.orders));
}

function toast(msg) {
  const stack = document.getElementById("toastStack");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function selectedItems() {
  return Object.entries(state.qty)
    .filter(([, q]) => q > 0)
    .map(([id, quantity]) => {
      const p = MENU.find((m) => m.id === id);
      return { id, name: p.name, category: p.category, quantity };
    });
}

function itemCount() {
  return selectedItems().reduce((n, i) => n + i.quantity, 0);
}

function setQty(id, delta) {
  const next = Math.max(0, (state.qty[id] || 0) + delta);
  if (next === 0) delete state.qty[id];
  else state.qty[id] = next;
  renderOrderPanel();
}

function todayOrders() {
  const today = dayKey();
  return state.orders
    .filter((o) => dayKey(new Date(o.createdAt)) === today)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function monthOrders(key) {
  return state.orders.filter((o) => monthKey(new Date(o.createdAt)) === key);
}

function lastOrderFor(name) {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  return (
    state.orders
      .filter((o) => o.customer.trim().toLowerCase() === n)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null
  );
}

function aggregate(list) {
  const products = {};
  const customers = {};
  const categories = {};
  const days = {};
  let items = 0;

  for (const order of list) {
    const d = dayKey(new Date(order.createdAt));
    days[d] = days[d] || 0;
    customers[order.customer.trim()] = customers[order.customer.trim()] || 0;
    for (const it of order.items) {
      items += it.quantity;
      products[it.name] = (products[it.name] || 0) + it.quantity;
      categories[it.category] = (categories[it.category] || 0) + it.quantity;
      days[d] += it.quantity;
      customers[order.customer.trim()] += it.quantity;
    }
  }

  const rank = (obj) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

  return {
    items,
    customers: Object.keys(customers).filter(Boolean).length,
    products: rank(products),
    customerRanking: rank(customers),
    categories: rank(categories),
    days: rank(days),
  };
}

function personalUrl(name) {
  const url = new URL(window.location.href);
  url.searchParams.set("for", name.trim());
  return url.toString();
}

function parsePersonalFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const forName = params.get("for");
  if (forName && forName.trim()) {
    state.customer = forName.trim();
    state.personalLock = true;
  }
}

async function logOrder() {
  const name = state.customer.trim();
  const items = selectedItems();
  if (!name || items.length === 0 || state.saveStatus === "saving") return;

  state.saveStatus = "saving";
  renderOrderPanel();

  await new Promise((r) => setTimeout(r, 280));

  state.orders.unshift({
    id: uid(),
    customer: name,
    items,
    createdAt: new Date().toISOString(),
    status: "logged",
  });
  saveOrders();
  state.qty = {};
  state.saveStatus = "done";
  renderOrderPanel();
  toast(`Order logged for ${name}`);
  setTimeout(() => {
    state.saveStatus = "idle";
    renderOrderPanel();
  }, 3200);
}

function applyRepeat() {
  const last = lastOrderFor(state.customer);
  if (!last) return;
  state.qty = {};
  for (const it of last.items) state.qty[it.id] = it.quantity;
  if (last.items[0]) state.category = last.items[0].category;
  renderOrderPanel();
  toast("Last order loaded — adjust if needed");
}

function setOrderStatus(id, status) {
  const order = state.orders.find((o) => o.id === id);
  if (!order) return;
  order.status = status;
  saveOrders();
  renderOwner();
  toast(status === "verified" ? "Matched to till" : "Marked as issue");
}

function buildDailyCloseText() {
  const list = todayOrders();
  const agg = aggregate(list);
  const verified = list.filter((o) => o.status === "verified").length;
  const issues = list.filter((o) => o.status === "issue").length;
  const lines = [
    `KAHWET AL AATIK — DAILY CLOSE`,
    new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(new Date()),
    ``,
    `Orders logged: ${list.length}`,
    `Items taken: ${agg.items}`,
    `Loyal customers: ${agg.customers}`,
    `Verified vs till: ${verified}`,
    `Needs attention: ${issues}`,
    ``,
    `TOP PRODUCTS`,
    ...agg.products.map(([n, c], i) => `${i + 1}. ${n} — ${c}`),
    ``,
    `ENTRIES`,
    ...list.map((o) => {
      const t = new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const items = o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ");
      return `${t} · ${o.customer} · ${items} · ${o.status.toUpperCase()}`;
    }),
    ``,
    `Use this sheet to reconcile the café’s own records.`,
  ];
  return lines.join("\n");
}

function openDailyClose() {
  document.getElementById("closeSheet").textContent = buildDailyCloseText();
  document.getElementById("closeModal").classList.add("open");
}

function closeModal() {
  document.getElementById("closeModal").classList.remove("open");
}

async function copyDailyClose() {
  const text = document.getElementById("closeSheet").textContent;
  try {
    await navigator.clipboard.writeText(text);
    toast("Daily close copied");
  } catch {
    toast("Could not copy — select and copy manually");
  }
}

function switchView(view) {
  state.view = view;
  document.querySelectorAll(".view-nav button").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === view);
  });
  document.getElementById("orderView").classList.toggle("active", view === "order");
  document.getElementById("ownerView").classList.toggle("active", view === "owner");
  if (view === "owner") renderOwner();
}

function renderIntro() {
  const eyebrow = document.getElementById("orderEyebrow");
  const title = document.getElementById("orderTitle");
  if (state.personalLock && state.customer) {
    eyebrow.textContent = `MADE ESPECIALLY FOR ${state.customer.toUpperCase()}`;
    title.innerHTML = `Ahla, ${escapeHtml(state.customer)}.<br><em>This is for you.</em>`;
  } else {
    eyebrow.textContent = "YOUR DAILY ORDER · طلبك اليومي";
    title.innerHTML = `Ahla w sahla<br><em>at Al Aatik.</em>`;
  }
}

function renderOrderPanel() {
  renderIntro();

  const welcome = document.getElementById("personalWelcome");
  const nameField = document.getElementById("nameField");
  if (state.personalLock && state.customer) {
    welcome.style.display = "grid";
    nameField.style.display = "none";
    document.getElementById("personalInitial").textContent = state.customer.slice(0, 1).toUpperCase();
    document.getElementById("personalName").textContent = state.customer;
  } else {
    welcome.style.display = "none";
    nameField.style.display = "block";
    document.getElementById("customerInput").value = state.customer;
  }

  const last = lastOrderFor(state.customer);
  const hint = document.getElementById("repeatHint");
  if (last && !state.personalLock) {
    hint.classList.add("show");
    const summary = last.items.map((i) => `${i.quantity}× ${i.name}`).join(" · ");
    document.getElementById("repeatText").textContent = `Welcome back — last time: ${summary}`;
  } else if (last && state.personalLock) {
    hint.classList.add("show");
    const summary = last.items.map((i) => `${i.quantity}× ${i.name}`).join(" · ");
    document.getElementById("repeatText").textContent = `Your usual: ${summary}`;
  } else {
    hint.classList.remove("show");
  }

  const tabs = document.getElementById("categoryTabs");
  tabs.innerHTML = CATEGORIES.map(
    (c) =>
      `<button type="button" class="${c === state.category ? "active" : ""}" data-cat="${c}">${c}</button>`
  ).join("");

  const grid = document.getElementById("productGrid");
  grid.innerHTML = MENU.filter((p) => p.category === state.category)
    .map((p) => {
      const q = state.qty[p.id] || 0;
      return `
        <article class="product ${q ? "selected" : ""}">
          <div class="product-icon">${p.icon}</div>
          <div>
            <h3>${escapeHtml(p.name)}</h3>
            <p>${escapeHtml(p.category)}</p>
          </div>
          <div class="stepper">
            <button type="button" data-delta="-1" data-id="${p.id}" ${q ? "" : "disabled"} aria-label="Remove ${escapeHtml(p.name)}">−</button>
            <b>${q}</b>
            <button type="button" data-delta="1" data-id="${p.id}" aria-label="Add ${escapeHtml(p.name)}">+</button>
          </div>
        </article>`;
    })
    .join("");

  const count = itemCount();
  document.getElementById("itemCount").textContent = String(count);
  const btn = document.getElementById("logBtn");
  const canSave = state.customer.trim() && count > 0 && state.saveStatus !== "saving";
  btn.disabled = !canSave;
  btn.textContent =
    state.saveStatus === "saving" ? "Saving…" : "Log my order →";

  const success = document.getElementById("successMsg");
  if (state.saveStatus === "done") {
    success.style.display = "block";
    success.textContent = `✓ Thanks, ${state.customer.trim()}. Your order has been recorded for today’s café count.`;
  } else {
    success.style.display = "none";
  }
}

function renderOwner() {
  const list = todayOrders();
  const agg = aggregate(list);
  const verified = list.filter((o) => o.status === "verified").length;
  const issues = list.filter((o) => o.status === "issue").length;

  document.getElementById("statOrders").textContent = String(list.length);
  document.getElementById("statItems").textContent = String(agg.items);
  document.getElementById("statCustomers").textContent = String(agg.customers);
  document.getElementById("statVerified").textContent = String(verified);

  document.getElementById("recordsDate").textContent = new Intl.DateTimeFormat("en", {
    dateStyle: "full",
  }).format(new Date());

  const issueNote = document.getElementById("issueBanner");
  if (issues > 0) {
    issueNote.style.display = "block";
    issueNote.textContent = `${issues} entr${issues === 1 ? "y needs" : "ies need"} attention before you close the day.`;
  } else {
    issueNote.style.display = "none";
  }

  // Link maker
  const name = state.linkName.trim();
  if (name) {
    state.linkReady = personalUrl(name);
    document.getElementById("readyLink").style.display = "flex";
    document.getElementById("readyLinkUrl").textContent = state.linkReady;
    document.getElementById("whatsappLink").style.display = "inline-block";
    document.getElementById("whatsappLink").href = `https://wa.me/?text=${encodeURIComponent(
      `Hi ${name}, I made this personal order page for you at Kahwet Al Aatik: ${state.linkReady}`
    )}`;
  } else {
    state.linkReady = "";
    document.getElementById("readyLink").style.display = "none";
    document.getElementById("whatsappLink").style.display = "none";
  }
  document.getElementById("linkNameInput").value = state.linkName;

  document.querySelectorAll(".report-switch button").forEach((b) => {
    b.classList.toggle("active", b.dataset.report === state.report);
  });

  document.getElementById("todayReport").style.display = state.report === "today" ? "block" : "none";
  document.getElementById("monthlyReport").style.display = state.report === "monthly" ? "block" : "none";

  if (state.report === "today") {
    const box = document.getElementById("recordsList");
    if (list.length === 0) {
      box.innerHTML = `<div class="empty">No orders have been logged yet today. Share the customer page or a personal link to start the day’s honest count.</div>`;
    } else {
      box.innerHTML = list
        .map((o) => {
          const t = new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const items = o.items.map((i) => `${i.quantity}× ${i.name}`).join(" · ");
          const badge =
            o.status === "verified"
              ? `<span class="badge verified">Verified</span>`
              : o.status === "issue"
                ? `<span class="badge issue">Issue</span>`
                : `<span class="badge logged">Logged</span>`;
          return `
            <article class="record">
              <time>${t}</time>
              <div class="avatar">${escapeHtml(o.customer.slice(0, 1).toUpperCase())}</div>
              <div class="record-main">
                <h3>${escapeHtml(o.customer)}</h3>
                <p>${escapeHtml(items)}</p>
              </div>
              <div class="record-side">
                ${badge}
                <div class="record-actions">
                  <button type="button" class="verify" data-act="verify" data-id="${o.id}">Match till</button>
                  <button type="button" data-act="issue" data-id="${o.id}">Flag</button>
                </div>
              </div>
            </article>`;
        })
        .join("");
    }
  } else {
    renderMonthly();
  }
}

function renderMonthly() {
  document.getElementById("monthInput").value = state.month;
  const label = new Date(`${state.month}-02`).toLocaleDateString("en", {
    month: "long",
    year: "numeric",
  });
  document.getElementById("monthLabel").textContent = label;

  const list = monthOrders(state.month);
  const z = aggregate(list);

  document.getElementById("mStatOrders").textContent = String(list.length);
  document.getElementById("mStatItems").textContent = String(z.items);
  document.getElementById("mStatCustomers").textContent = String(z.customers);

  const grid = document.getElementById("analysisGrid");
  if (list.length === 0) {
    grid.innerHTML = `<div class="empty monthly-empty" style="grid-column:1/-1">No orders were recorded for this month yet.</div>`;
    return;
  }

  const daysFmt = z.days.map(([d, c]) => [
    new Date(`${d}T12:00:00`).toLocaleDateString("en", { day: "numeric", month: "short" }),
    c,
  ]);

  grid.innerHTML = [
    analysisCard("Most ordered products", "What your customers choose most", z.products),
    analysisCard("Top loyal customers", "Ranked by items recorded", z.customerRanking),
    analysisCard("Category mix", "Where monthly demand goes", z.categories),
    analysisCard("Busiest days", "Highest item volume", daysFmt),
  ].join("");
}

function analysisCard(title, subtitle, data) {
  const max = Math.max(...data.map((d) => d[1]), 1);
  const rows = data
    .map(
      ([name, count], i) => `
      <div class="bar-row">
        <span class="rank">${String(i + 1).padStart(2, "0")}</span>
        <div class="bar-main">
          <div><b>${escapeHtml(String(name))}</b><strong>${count}</strong></div>
          <span class="bar-track"><i style="width:${Math.max((count / max) * 100, 4)}%"></i></span>
        </div>
      </div>`
    )
    .join("");
  return `
    <article class="analysis-card">
      <div class="analysis-title">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      <div class="bar-list">${rows}</div>
    </article>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bindEvents() {
  document.querySelectorAll(".view-nav button").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  document.getElementById("brandBtn").addEventListener("click", () => switchView("order"));

  document.getElementById("customerInput").addEventListener("input", (e) => {
    state.customer = e.target.value;
    state.saveStatus = "idle";
    renderOrderPanel();
  });

  document.getElementById("clearPersonal").addEventListener("click", () => {
    state.personalLock = false;
    const url = new URL(window.location.href);
    url.searchParams.delete("for");
    window.history.replaceState({}, "", url);
    renderOrderPanel();
  });

  document.getElementById("repeatBtn").addEventListener("click", applyRepeat);

  document.getElementById("categoryTabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-cat]");
    if (!btn) return;
    state.category = btn.dataset.cat;
    renderOrderPanel();
  });

  document.getElementById("productGrid").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    setQty(btn.dataset.id, Number(btn.dataset.delta));
  });

  document.getElementById("logBtn").addEventListener("click", logOrder);

  document.getElementById("refreshBtn").addEventListener("click", () => {
    loadOrders();
    renderOwner();
    toast("Records refreshed");
  });

  document.getElementById("closeDayBtn").addEventListener("click", openDailyClose);
  document.getElementById("closeModalDismiss").addEventListener("click", closeModal);
  document.getElementById("copyCloseBtn").addEventListener("click", copyDailyClose);
  document.getElementById("closeModal").addEventListener("click", (e) => {
    if (e.target.id === "closeModal") closeModal();
  });

  document.getElementById("linkNameInput").addEventListener("input", (e) => {
    state.linkName = e.target.value;
    state.linkCopied = false;
    renderOwner();
  });

  document.getElementById("copyLinkBtn").addEventListener("click", async () => {
    if (!state.linkReady) return;
    try {
      await navigator.clipboard.writeText(state.linkReady);
      document.getElementById("copyLinkBtn").textContent = "✓ Copied";
      toast("Personal link copied");
      setTimeout(() => {
        document.getElementById("copyLinkBtn").textContent = "Copy link";
      }, 1800);
    } catch {
      toast("Could not copy link");
    }
  });

  document.querySelectorAll(".report-switch button").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.report = btn.dataset.report;
      renderOwner();
    });
  });

  document.getElementById("monthInput").addEventListener("change", (e) => {
    state.month = e.target.value;
    renderOwner();
  });

  document.getElementById("recordsList").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    setOrderStatus(btn.dataset.id, btn.dataset.act === "verify" ? "verified" : "issue");
  });
}

function init() {
  loadOrders();
  parsePersonalFromUrl();
  bindEvents();
  renderOrderPanel();
  if (state.view === "owner") renderOwner();
}

init();
