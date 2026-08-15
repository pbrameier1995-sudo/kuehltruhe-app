// ============================================================
// Kühltruhe Inventar – App-Logik
// Nutzt Firebase Firestore für Echtzeit-Synchronisation
// zwischen allen Geräten, die denselben Haushalts-Code benutzen.
// ============================================================

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ---- DOM-Elemente ----
const setupScreen = document.getElementById("setup-screen");
const appScreen = document.getElementById("app-screen");
const householdInput = document.getElementById("household-input");
const householdSubmit = document.getElementById("household-submit");
const setupError = document.getElementById("setup-error");
const householdLabel = document.getElementById("household-label");
const statusBar = document.getElementById("status-bar");
const addForm = document.getElementById("add-form");
const itemNameInput = document.getElementById("item-name");
const itemQtyInput = document.getElementById("item-qty");
const searchInput = document.getElementById("search-input");
const itemList = document.getElementById("item-list");
const emptyState = document.getElementById("empty-state");
const settingsBtn = document.getElementById("settings-btn");
const settingsOverlay = document.getElementById("settings-overlay");
const currentCodeLabel = document.getElementById("current-code");
const newHouseholdInput = document.getElementById("new-household-input");
const switchHouseholdBtn = document.getElementById("switch-household-btn");
const closeSettingsBtn = document.getElementById("close-settings-btn");

const STORAGE_KEY = "kuehltruhe.haushaltscode";

let app, db;
let unsubscribe = null;
let allItems = [];

// ---- Firebase initialisieren ----
function initFirebase() {
  if (
    !firebaseConfig ||
    !firebaseConfig.apiKey ||
    firebaseConfig.apiKey.includes("TRAGE_HIER")
  ) {
    setupError.textContent =
      "Firebase ist noch nicht eingerichtet. Bitte firebase-config.js ausfüllen (siehe README.md).";
    statusBar.textContent = "Nicht konfiguriert";
    statusBar.className = "status-bar error";
    return false;
  }
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  return true;
}

// ---- Haushalts-Code normalisieren ----
function normalizeCode(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "");
}

function getSavedCode() {
  return localStorage.getItem(STORAGE_KEY);
}

function saveCode(code) {
  localStorage.setItem(STORAGE_KEY, code);
}

// ---- Bildschirme umschalten ----
function showSetupScreen() {
  setupScreen.classList.remove("hidden");
  appScreen.classList.add("hidden");
  householdInput.focus();
}

function showAppScreen(code) {
  setupScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
  householdLabel.textContent = "Haushalt: " + code;
  currentCodeLabel.textContent = code;
  connectToHousehold(code);
}

// ---- Firestore: Verbindung zu einem Haushalt ----
function connectToHousehold(code) {
  if (!db) return;
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  statusBar.textContent = "Verbinde…";
  statusBar.className = "status-bar";

  const itemsRef = collection(db, "haushalte", code, "artikel");
  const q = query(itemsRef, orderBy("name"));

  unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      allItems = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      statusBar.textContent = "Verbunden · " + allItems.length + " Artikel";
      statusBar.className = "status-bar connected";
      renderList();
    },
    (err) => {
      console.error(err);
      statusBar.textContent = "Verbindungsfehler: " + err.message;
      statusBar.className = "status-bar error";
    }
  );
}

// ---- Liste rendern ----
function renderList() {
  const filterText = searchInput.value.trim().toLowerCase();
  const filtered = filterText
    ? allItems.filter((it) => it.name.toLowerCase().includes(filterText))
    : allItems;

  itemList.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    emptyState.textContent = filterText
      ? "Keine Artikel gefunden."
      : "Die Truhe ist noch leer. Füge oben den ersten Artikel hinzu.";
  } else {
    emptyState.classList.add("hidden");
  }

  for (const item of filtered) {
    const li = document.createElement("li");
    li.className = "item-row";

    const info = document.createElement("div");
    info.className = "item-info";
    const nameEl = document.createElement("span");
    nameEl.className = "item-name";
    nameEl.textContent = item.name;
    info.appendChild(nameEl);
    info.appendChild(metaLine(item));

    const controls = document.createElement("div");
    controls.className = "item-controls";

    const minusBtn = document.createElement("button");
    minusBtn.className = "qty-btn";
    minusBtn.textContent = "–";
    minusBtn.setAttribute("aria-label", "Menge verringern");
    minusBtn.addEventListener("click", () => changeQty(item, -1));

    const qtyVal = document.createElement("span");
    qtyVal.className = "qty-value";
    qtyVal.textContent = item.menge;

    const plusBtn = document.createElement("button");
    plusBtn.className = "qty-btn";
    plusBtn.textContent = "+";
    plusBtn.setAttribute("aria-label", "Menge erhöhen");
    plusBtn.addEventListener("click", () => changeQty(item, 1));

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "🗑";
    delBtn.setAttribute("aria-label", "Artikel löschen");
    delBtn.addEventListener("click", () => removeItem(item));

    controls.append(minusBtn, qtyVal, plusBtn, delBtn);
    li.append(info, controls);
    itemList.appendChild(li);
  }
}

function metaLine(item) {
  const meta = document.createElement("span");
  meta.className = "item-meta";
  meta.textContent = item.menge === 1 ? "1 Stück" : item.menge + " Stück";
  return meta;
}

// ---- Aktionen ----
async function addItem(name, qty) {
  const code = getSavedCode();
  if (!code || !db) return;
  const itemsRef = collection(db, "haushalte", code, "artikel");

  // Falls der Artikel (gleicher Name, klein geschrieben) schon existiert,
  // Menge erhöhen statt Duplikat anzulegen.
  const existing = allItems.find(
    (it) => it.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    await changeQty(existing, qty);
    return;
  }

  await addDoc(itemsRef, {
    name: name,
    menge: qty,
    erstelltAm: serverTimestamp(),
    aktualisiertAm: serverTimestamp(),
  });
}

async function changeQty(item, delta) {
  const code = getSavedCode();
  if (!code || !db) return;
  const newQty = item.menge + delta;
  const ref = doc(db, "haushalte", code, "artikel", item.id);
  if (newQty <= 0) {
    await deleteDoc(ref);
  } else {
    await updateDoc(ref, { menge: newQty, aktualisiertAm: serverTimestamp() });
  }
}

async function removeItem(item) {
  const code = getSavedCode();
  if (!code || !db) return;
  const ref = doc(db, "haushalte", code, "artikel", item.id);
  await deleteDoc(ref);
}

// ---- Event-Listener ----
householdSubmit.addEventListener("click", () => {
  const code = normalizeCode(householdInput.value);
  if (!code) {
    setupError.textContent = "Bitte gib einen Haushalts-Code ein.";
    return;
  }
  setupError.textContent = "";
  saveCode(code);
  showAppScreen(code);
});

householdInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") householdSubmit.click();
});

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = itemNameInput.value.trim();
  const qty = Math.max(1, parseInt(itemQtyInput.value, 10) || 1);
  if (!name) return;
  await addItem(name, qty);
  itemNameInput.value = "";
  itemQtyInput.value = "1";
  itemNameInput.focus();
});

searchInput.addEventListener("input", renderList);

settingsBtn.addEventListener("click", () => {
  newHouseholdInput.value = "";
  settingsOverlay.classList.remove("hidden");
});

closeSettingsBtn.addEventListener("click", () => {
  settingsOverlay.classList.add("hidden");
});

switchHouseholdBtn.addEventListener("click", () => {
  const code = normalizeCode(newHouseholdInput.value);
  if (!code) return;
  saveCode(code);
  settingsOverlay.classList.add("hidden");
  showAppScreen(code);
});

// ---- Start ----
function start() {
  const ok = initFirebase();
  if (!ok) {
    showSetupScreen();
    return;
  }
  const saved = getSavedCode();
  if (saved) {
    showAppScreen(saved);
  } else {
    showSetupScreen();
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

start();
