import { getVirtualRange, isIconSetCandidate, normalizeListedIcons, parseStaticIconsetSource, validateIcon } from "./library-core.js";

const dictionaries = {
  de: {
    eyebrow: "ATLAS PLUGIN", title: "ATLAS Icon Bibliothek", intro: "Durchsuche Iconsets und kopiere Icons für Home Assistant.",
    language: "Sprache", iconSet: "Iconset", search: "Icons suchen", searchPlaceholder: "Name oder Stichwort",
    haPath: "Home-Assistant-Datei", loadHa: "Aus Home Assistant laden", importFile: "Datei importieren",
    scanHa: "Iconsets in Home Assistant finden", scanning: "Suche nach Iconsets in /config/www …",
    scanDone: "{sets} Iconset(s) mit insgesamt {count} Icons gefunden.", countLabel: "{count} Icons",
    loading: "Iconkatalog wird geladen …", loadedMdi: "{count} MDI-Icons geladen (Version {version}).",
    loadedSet: "{count} Icons aus {set} geladen.", copied: "{icon} kopiert.", copyFailed: "Kopieren nicht möglich: {icon}",
    imported: "Iconset {set} mit {count} Icons importiert.", loadFailed: "Iconset konnte nicht geladen werden: {message}",
    noIcons: "Keine Icons gefunden.", selectedSet: "AUSGEWÄHLTES ICONSET", fileTooLarge: "Die Datei ist größer als 64 MiB.",
    invalidFile: "Diese Datei enthält kein unterstütztes Iconset.", replaceSet: "Das Iconset {set} ist bereits vorhanden. Soll es ersetzt werden?",
    apiNote: "Home Assistant listet benutzerdefinierte Iconsets nicht automatisch. Sichtbar sind MDI, einlesbare Icon Studio-Sets und Sets, die eine Iconliste bereitstellen.",
  },
  en: {
    eyebrow: "ATLAS PLUGIN", title: "ATLAS Icon Library", intro: "Browse icon sets and copy icons for Home Assistant.",
    language: "Language", iconSet: "Icon set", search: "Search icons", searchPlaceholder: "Name or keyword",
    haPath: "Home Assistant file", loadHa: "Load from Home Assistant", importFile: "Import file",
    scanHa: "Find icon sets in Home Assistant", scanning: "Searching /config/www for icon sets…",
    scanDone: "Found {sets} icon set(s) with {count} icons in total.", countLabel: "{count} icons",
    loading: "Loading icon catalog…", loadedMdi: "Loaded {count} MDI icons (version {version}).",
    loadedSet: "Loaded {count} icons from {set}.", copied: "Copied {icon}.", copyFailed: "Could not copy {icon}.",
    imported: "Imported icon set {set} with {count} icons.", loadFailed: "Could not load icon set: {message}",
    noIcons: "No icons found.", selectedSet: "SELECTED ICON SET", fileTooLarge: "The file exceeds 64 MiB.",
    invalidFile: "This file does not contain a supported icon set.", replaceSet: "Icon set {set} already exists. Replace it?",
    apiNote: "Home Assistant does not automatically list custom icon sets. Available sets include MDI, importable Icon Studio sets and sets that provide an icon list.",
  },
  fr: {
    eyebrow: "PLUGIN ATLAS", title: "Bibliothèque d’icônes ATLAS", intro: "Parcourez les jeux d’icônes et copiez des icônes pour Home Assistant.",
    language: "Langue", iconSet: "Jeu d’icônes", search: "Rechercher des icônes", searchPlaceholder: "Nom ou mot-clé",
    haPath: "Fichier Home Assistant", loadHa: "Charger depuis Home Assistant", importFile: "Importer un fichier",
    scanHa: "Rechercher des jeux dans Home Assistant", scanning: "Recherche de jeux d’icônes dans /config/www…",
    scanDone: "{sets} jeu(x) d’icônes trouvé(s), {count} icônes au total.", countLabel: "{count} icônes",
    loading: "Chargement du catalogue d’icônes…", loadedMdi: "{count} icônes MDI chargées (version {version}).",
    loadedSet: "{count} icônes chargées depuis {set}.", copied: "{icon} copié.", copyFailed: "Impossible de copier {icon}.",
    imported: "Jeu d’icônes {set} importé avec {count} icônes.", loadFailed: "Impossible de charger le jeu d’icônes : {message}",
    noIcons: "Aucune icône trouvée.", selectedSet: "JEU D’ICÔNES SÉLECTIONNÉ", fileTooLarge: "Le fichier dépasse 64 Mio.",
    invalidFile: "Ce fichier ne contient pas de jeu d’icônes compatible.", replaceSet: "Le jeu d’icônes {set} existe déjà. Le remplacer ?",
    apiNote: "Home Assistant ne fournit pas de liste automatique des jeux d’icônes personnalisés. Les jeux disponibles sont MDI, les jeux Icon Studio importables et ceux qui fournissent une liste d’icônes.",
  },
};

const $ = (selector) => document.querySelector(selector);
const select = $("#iconset-select");
const grid = $("#icon-grid");
const queryInput = $("#icon-search");
const notice = $("#notice");
const setTitle = $("#set-title");
const countNode = $("#icon-count");
const languageButtons = [...document.querySelectorAll("[data-language]")];
const STORAGE_KEY = "atlas-icon-library-language";
const DB_NAME = "atlas-icon-library";
const DB_VERSION = 1;
const DB_STORE = "iconsets";
const MAX_IMPORT_BYTES = 64 * 1024 * 1024;
const ROW_HEIGHT = 95;
const OVERSCAN_ROWS = 2;
let language = "de";
let iconSets = new Map();
let currentIcons = [];
let filteredIcons = [];
let columns = 1;
let selectedSet = "mdi";

function t(key, values = {}) {
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), dictionaries[language][key] ?? key);
}

function setNotice(key, values = {}, error = false) {
  notice.textContent = t(key, values);
  notice.classList.toggle("error", error);
}

function setLanguage(next) {
  language = dictionaries[next] ? next : "de";
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (dictionaries[language][key]) element.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAria));
  });
  languageButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.language === language)));
}

function setLabel(prefix) {
  return prefix.toLowerCase() === "mdi" ? "MDI" : prefix.toUpperCase();
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE, { keyPath: "prefix" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storedIconSets() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

async function storeIconSet(set) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(DB_STORE, "readwrite").objectStore(DB_STORE).put(set);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function loadMdiSet() {
  const response = await fetch("mdi-icons.json", { cache: "force-cache" });
  if (!response.ok) throw new Error(`MDI catalog request failed (${response.status}).`);
  const data = await response.json();
  return {
    prefix: "mdi",
    version: data.version,
    icons: data.icons.map((icon) => ({ name: icon.name, path: icon.path, viewBox: "0 0 24 24", keywords: [...(icon.aliases ?? []), ...(icon.tags ?? [])] })),
  };
}

async function loadLegacyIconSets() {
  const legacy = window.customIcons;
  if (!legacy || typeof legacy !== "object") return [];
  const found = [];
  for (const [prefix, adapter] of Object.entries(legacy)) {
    if (typeof adapter?.getIconList !== "function" || typeof adapter?.getIcon !== "function") continue;
    try {
      const listed = normalizeListedIcons(prefix, await adapter.getIconList(), (name) => adapter.getIcon(name));
      const icons = [];
      for (const item of listed) {
        const definition = validateIcon(await item.getIcon());
        icons.push({ name: item.name, ...definition, keywords: item.keywords });
      }
      if (icons.length) found.push({ prefix, icons });
    } catch (error) {
      console.warn(`Could not enumerate custom icon set ${prefix}.`, error);
    }
  }
  return found;
}

function updateSetSelector() {
  const previous = select.value || selectedSet;
  select.replaceChildren();
  for (const prefix of ["mdi", ...[...iconSets.keys()].filter((key) => key !== "mdi").sort((a, b) => a.localeCompare(b))]) {
    const option = document.createElement("option");
    option.value = prefix;
    option.textContent = setLabel(prefix);
    select.append(option);
  }
  select.value = iconSets.has(previous) ? previous : "mdi";
  selectedSet = select.value;
  changeSelectedSet();
}

function changeSelectedSet() {
  selectedSet = select.value || "mdi";
  const set = iconSets.get(selectedSet);
  currentIcons = set?.icons ?? [];
  setTitle.textContent = setLabel(selectedSet);
  queryInput.value = "";
  grid.scrollTop = 0;
  updateFilter();
}

function updateFilter() {
  const query = queryInput.value.trim().toLowerCase();
  filteredIcons = currentIcons.filter((icon) => `${icon.name} ${icon.keywords?.join(" ") ?? ""} ${selectedSet}:${icon.name}`.toLowerCase().includes(query));
  countNode.textContent = t("countLabel", { count: filteredIcons.length.toLocaleString(language) });
  grid.scrollTop = 0;
  renderGrid();
}

function makeSvg(icon) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", icon.viewBox || "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", icon.path);
  svg.append(path);
  return svg;
}

function renderGrid() {
  columns = Math.max(1, Math.min(20, Math.floor((grid.clientWidth || 100) / 91)));
  grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
  const totalRows = Math.ceil(filteredIcons.length / columns);
  const range = getVirtualRange(totalRows, grid.scrollTop, grid.clientHeight || 600, ROW_HEIGHT, OVERSCAN_ROWS);
  const startIndex = range.start * columns;
  const endIndex = Math.min(filteredIcons.length, range.end * columns);
  grid.replaceChildren();
  if (range.top) addSpacer(range.top);
  for (let index = startIndex; index < endIndex; index += 1) {
    const icon = filteredIcons[index];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-tile";
    button.setAttribute("role", "listitem");
    button.title = `${selectedSet}:${icon.name}`;
    button.setAttribute("aria-label", `${selectedSet}:${icon.name} — ${language === "fr" ? "copier" : language === "en" ? "copy" : "kopieren"}`);
    button.append(makeSvg(icon));
    const label = document.createElement("span");
    label.textContent = icon.name;
    button.append(label);
    button.addEventListener("click", () => copyIcon(icon));
    grid.append(button);
  }
  if (range.bottom) addSpacer(range.bottom);
  if (!filteredIcons.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = t("noIcons");
    grid.append(empty);
  }
}

function addSpacer(height) {
  const spacer = document.createElement("div");
  spacer.className = "grid-spacer";
  spacer.setAttribute("aria-hidden", "true");
  spacer.style.height = `${height}px`;
  grid.append(spacer);
}

async function copyIcon(icon) {
  const value = `${selectedSet}:${icon.name}`;
  try {
    await navigator.clipboard.writeText(value);
    setNotice("copied", { icon: value });
  } catch {
    setNotice("copyFailed", { icon: value }, true);
  }
}

function createAppUrl(path) {
  const baseUrl = new URL(location.href);
  baseUrl.search = "";
  baseUrl.hash = "";
  baseUrl.pathname = baseUrl.pathname.replace(/\/plugin-assets\/icon-library\/.*$/, "/");
  if (!baseUrl.pathname.endsWith("/")) baseUrl.pathname += "/";
  return new URL(String(path ?? "").replace(/^\/+/, ""), baseUrl).toString();
}

async function fileStudioRead(path) {
  const url = new URL(createAppUrl("api/file-studio/file"));
  url.searchParams.set("path", path);
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
  return result.content;
}

async function fileStudioTree(path, depth = 8) {
  const url = new URL(createAppUrl("api/file-studio/tree"));
  url.searchParams.set("path", path);
  url.searchParams.set("depth", String(depth));
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.error) throw new Error(result.error ?? `HTTP ${response.status}`);
  return result.tree;
}

function flattenTree(node, output = []) {
  if (node?.type === "file") output.push(node);
  for (const child of node?.children ?? []) flattenTree(child, output);
  return output;
}

async function scanHomeAssistantIconSets() {
  setNotice("scanning");
  try {
    const tree = await fileStudioTree("/config/www");
    const candidates = flattenTree(tree).filter(isIconSetCandidate).slice(0, 500);
    const found = new Map();
    for (const file of candidates) {
      try {
        const parsed = parseStaticIconsetSource(await fileStudioRead(file.path));
        let target = found.get(parsed.prefix);
        if (!target) {
          target = { prefix: parsed.prefix, icons: [], source: "home-assistant-scan", sourceFiles: [] };
          found.set(parsed.prefix, target);
        }
        target.icons.push(...parsed.icons);
        target.sourceFiles.push(file.path);
      } catch { /* Only accept static, supported icon-set code; skip unrelated JavaScript safely. */ }
    }
    for (const set of found.values()) {
      const names = new Set();
      set.icons = set.icons.filter((icon) => {
        if (names.has(icon.name)) return false;
        names.add(icon.name);
        return true;
      });
      if (iconSets.has(set.prefix) && !window.confirm(t("replaceSet", { set: setLabel(set.prefix) }))) continue;
      await storeIconSet(set);
      iconSets.set(set.prefix, set);
    }
    updateSetSelector();
    const iconCount = [...found.values()].reduce((sum, set) => sum + set.icons.length, 0);
    setNotice("scanDone", { sets: found.size, count: iconCount.toLocaleString(language) });
  } catch (error) {
    setNotice("loadFailed", { message: error.message }, true);
  }
}

async function importSource(source, { persist = true } = {}) {
  const imported = parseStaticIconsetSource(source);
  const existing = iconSets.has(imported.prefix);
  if (existing && !window.confirm(t("replaceSet", { set: setLabel(imported.prefix) }))) return;
  const set = { ...imported, source: "icon-studio" };
  if (persist) await storeIconSet(set);
  iconSets.set(set.prefix, set);
  updateSetSelector();
  select.value = set.prefix;
  changeSelectedSet();
  setNotice("imported", { set: setLabel(set.prefix), count: set.icons.length });
}

async function readFromHomeAssistant() {
  const path = $("#ha-iconset-path").value.trim();
  if (!path.startsWith("/config/www/") || path.includes("..")) {
    setNotice("loadFailed", { message: "The file must be inside /config/www." }, true);
    return;
  }
  try {
    await importSource(await fileStudioRead(path));
  } catch (error) {
    setNotice("loadFailed", { message: error.message }, true);
  }
}

languageButtons.forEach((button) => button.addEventListener("click", () => {
  language = button.dataset.language;
  try { localStorage.setItem(STORAGE_KEY, language); } catch { /* language is still applied for this page */ }
  setLanguage(language);
  updateFilter();
}));
select.addEventListener("change", changeSelectedSet);
queryInput.addEventListener("input", updateFilter);
grid.addEventListener("scroll", renderGrid, { passive: true });
$("#load-ha-iconset").addEventListener("click", () => { void readFromHomeAssistant(); });
$("#scan-ha-iconsets").addEventListener("click", () => { void scanHomeAssistantIconSets(); });
$("#import-iconset").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (file.size > MAX_IMPORT_BYTES) { setNotice("fileTooLarge", {}, true); return; }
  void file.text().then((source) => importSource(source)).catch((error) => {
    setNotice(error instanceof TypeError ? "invalidFile" : "loadFailed", { message: error.message }, true);
  });
});
new ResizeObserver(renderGrid).observe(grid);

const savedLanguage = (() => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } })();
setLanguage(dictionaries[savedLanguage] ? savedLanguage : "de");
void (async () => {
  try {
    setNotice("loading");
    const mdi = await loadMdiSet();
    iconSets.set(mdi.prefix, mdi);
    const savedSets = await storedIconSets().catch(() => []);
    for (const set of savedSets) {
      try {
        if (set?.prefix && Array.isArray(set.icons)) iconSets.set(set.prefix, { ...set, icons: set.icons.map((icon) => ({ ...icon, ...validateIcon(icon) })) });
      } catch { /* Ignore invalid or outdated browser records. */ }
    }
    for (const set of await loadLegacyIconSets()) {
      if (!iconSets.has(set.prefix)) iconSets.set(set.prefix, set);
    }
    updateSetSelector();
    setNotice("loadedMdi", { count: mdi.icons.length.toLocaleString(language), version: mdi.version });
  } catch (error) {
    setNotice("loadFailed", { message: error.message }, true);
  }
})();
