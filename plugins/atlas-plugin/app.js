import { cliIconName, getVirtualRange, isCliSvgCandidate, isIconSetCandidate, normalizeListedIcons, parseStaticIconsetSource, validateIcon } from "./library-core.js";

const dictionaries = {
  de: {
    eyebrow: "ATLAS PLUGIN", title: "ATLAS Icon Bibliothek", intro: "Durchsuche Iconsets und kopiere Icons für Home Assistant.",
    language: "Sprache", iconSet: "Iconset", search: "Icons suchen", searchPlaceholder: "Name oder Stichwort", scanMode: "Scanbereich", normalSets: "Normale Iconsets", iconifySets: "Custom Icons – Iconify-Sets",
    haPath: "Quelle / Pfad", loadHa: "Aus Home Assistant laden", importFile: "Datei importieren",
    scanHa: "Iconsets in Home Assistant finden", scanning: "Suche nach Iconsets in /config/www …", scanningIconify: "Lade aktive Iconify-Sets aus Custom Icons …",
    scanDone: "{sets} Iconset(s) mit insgesamt {count} Icons gefunden. {files} JS-Dateien und {svgFiles} CLI-SVGs geprüft, {read} lesbar, {skipped} übersprungen{issue}.", iconifyScanDone: "{sets} aktive Iconify-Sets mit insgesamt {count} Icons aus Custom Icons geladen.", iconifyUnavailable: "Custom Icons ist in diesem Fenster nicht erreichbar. Öffne die Bibliothek über Home Assistant und prüfe, ob die Sets in Custom Icons aktiviert sind.", countLabel: "{count} Icons",
    loading: "Iconkatalog wird geladen …", loadedMdi: "{count} MDI-Icons geladen (Version {version}).",
    loadedSet: "{count} Icons aus {set} geladen.", copied: "{icon} kopiert.", copyFailed: "Kopieren nicht möglich: {icon}",
    imported: "Iconset {set} mit {count} Icons importiert.", loadFailed: "Iconset konnte nicht geladen werden: {message}",
    noIcons: "Keine Icons gefunden.", selectedSet: "AUSGEWÄHLTES ICONSET", fileTooLarge: "Die Datei ist größer als 64 MiB.",
    invalidFile: "Diese Datei enthält kein unterstütztes Iconset.", replaceSet: "Das Iconset {set} ist bereits vorhanden. Soll es ersetzt werden?",
    apiNote: "Home Assistant listet benutzerdefinierte Iconsets nicht automatisch. Sichtbar sind MDI, einlesbare Icon-Studio- und statische Community-Sets sowie Sets, die eine Iconliste bereitstellen.",
  },
  en: {
    eyebrow: "ATLAS PLUGIN", title: "ATLAS Icon Library", intro: "Browse icon sets and copy icons for Home Assistant.",
    language: "Language", iconSet: "Icon set", search: "Search icons", searchPlaceholder: "Name or keyword", scanMode: "Scan source", normalSets: "Standard icon sets", iconifySets: "Custom Icons – Iconify sets",
    haPath: "Source / path", loadHa: "Load from Home Assistant", importFile: "Import file",
    scanHa: "Find icon sets in Home Assistant", scanning: "Searching /config/www for icon sets…", scanningIconify: "Loading active Iconify sets from Custom Icons…",
    scanDone: "Found {sets} icon set(s) with {count} icons. Checked {files} JS files and {svgFiles} CLI SVGs, read {read}, skipped {skipped}{issue}.", iconifyScanDone: "Loaded {sets} active Iconify sets with {count} icons from Custom Icons.", iconifyUnavailable: "Custom Icons is not available in this window. Open the library through Home Assistant and check that the sets are enabled in Custom Icons.", countLabel: "{count} icons",
    loading: "Loading icon catalog…", loadedMdi: "Loaded {count} MDI icons (version {version}).",
    loadedSet: "Loaded {count} icons from {set}.", copied: "Copied {icon}.", copyFailed: "Could not copy {icon}.",
    imported: "Imported icon set {set} with {count} icons.", loadFailed: "Could not load icon set: {message}",
    noIcons: "No icons found.", selectedSet: "SELECTED ICON SET", fileTooLarge: "The file exceeds 64 MiB.",
    invalidFile: "This file does not contain a supported icon set.", replaceSet: "Icon set {set} already exists. Replace it?",
    apiNote: "Home Assistant does not automatically list custom icon sets. Available sets include MDI, importable Icon Studio and static community sets, plus sets that provide an icon list.",
  },
  fr: {
    eyebrow: "PLUGIN ATLAS", title: "Bibliothèque d’icônes ATLAS", intro: "Parcourez les jeux d’icônes et copiez des icônes pour Home Assistant.",
    language: "Langue", iconSet: "Jeu d’icônes", search: "Rechercher des icônes", searchPlaceholder: "Nom ou mot-clé", scanMode: "Source du scan", normalSets: "Jeux d’icônes standard", iconifySets: "Custom Icons – jeux Iconify",
    haPath: "Source / chemin", loadHa: "Charger depuis Home Assistant", importFile: "Importer un fichier",
    scanHa: "Rechercher des jeux dans Home Assistant", scanning: "Recherche de jeux d’icônes dans /config/www…", scanningIconify: "Chargement des jeux Iconify actifs depuis Custom Icons…",
    scanDone: "{sets} jeu(x) d’icônes trouvé(s), {count} icônes. {files} fichiers JS et {svgFiles} SVG CLI vérifiés, {read} lisibles, {skipped} ignorés{issue}.", iconifyScanDone: "{sets} jeux Iconify actifs chargés depuis Custom Icons, avec {count} icônes.", iconifyUnavailable: "Custom Icons n’est pas accessible dans cette fenêtre. Ouvrez la bibliothèque depuis Home Assistant et vérifiez que les jeux sont activés dans Custom Icons.", countLabel: "{count} icônes",
    loading: "Chargement du catalogue d’icônes…", loadedMdi: "{count} icônes MDI chargées (version {version}).",
    loadedSet: "{count} icônes chargées depuis {set}.", copied: "{icon} copié.", copyFailed: "Impossible de copier {icon}.",
    imported: "Jeu d’icônes {set} importé avec {count} icônes.", loadFailed: "Impossible de charger le jeu d’icônes : {message}",
    noIcons: "Aucune icône trouvée.", selectedSet: "JEU D’ICÔNES SÉLECTIONNÉ", fileTooLarge: "Le fichier dépasse 64 Mio.",
    invalidFile: "Ce fichier ne contient pas de jeu d’icônes compatible.", replaceSet: "Le jeu d’icônes {set} existe déjà. Le remplacer ?",
    apiNote: "Home Assistant ne fournit pas de liste automatique des jeux d’icônes personnalisés. Les jeux disponibles incluent MDI, les jeux Icon Studio et les jeux communautaires statiques importables, ainsi que ceux qui fournissent une liste d’icônes.",
  },
};

const $ = (selector) => document.querySelector(selector);
const select = $("#iconset-select");
const grid = $("#icon-grid");
const queryInput = $("#icon-search");
const notice = $("#notice");
const setTitle = $("#set-title");
const countNode = $("#icon-count");
const scanMode = $("#scan-mode");
const sourcePathInput = $("#ha-iconset-path");
const loadHaButton = $("#load-ha-iconset");
const languageButtons = [...document.querySelectorAll("[data-language]")];
const STORAGE_KEY = "atlas-icon-library-language";
const DB_NAME = "atlas-icon-library";
const DB_VERSION = 1;
const DB_STORE = "iconsets";
const MAX_IMPORT_BYTES = 64 * 1024 * 1024;
const ROW_HEIGHT = 95;
const OVERSCAN_ROWS = 2;
const renderedIconCache = new Map();
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
  return prefix.toLowerCase() === "mdi" ? "MDI" : prefix.split(/[-_]/).map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : "").join(" ");
}

function setOptionLabel(set) {
  const name = set.displayName || set.name || setLabel(set.prefix);
  return set.source === "iconify" ? `${name} (${set.prefix})` : name;
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

function getCustomIconAdapters() {
  for (const scope of [window, window.parent]) {
    try {
      if (scope.customIcons && typeof scope.customIcons === "object") return scope.customIcons;
    } catch { /* Ignore cross-origin parent access. */ }
  }
  return null;
}

async function getCustomIconSetInfo() {
  for (const scope of [window, window.parent]) {
    try {
      const root = scope.document?.querySelector("home-assistant") ?? scope.document?.querySelector("hc-main");
      const connection = root?.hass?.connection;
      if (!connection?.sendMessagePromise) continue;
      const result = await connection.sendMessagePromise({ type: "custom_icons/sets" });
      if (result && typeof result === "object") return result;
    } catch { /* Fall back to the adapters exposed by the integration. */ }
  }
  return {};
}

async function scanIconifySets() {
  setNotice("scanningIconify");
  const adapters = await getCustomIconAdapters();
  if (!adapters) throw new Error(t("iconifyUnavailable"));
  const metadata = await getCustomIconSetInfo();
  const excluded = new Set(["local", "mdi", "fapro", "far", "fas", "fab"]);
  const found = [];
  for (const [prefix, adapter] of Object.entries(adapters)) {
    if (excluded.has(prefix) || prefix.startsWith("fa6-") || typeof adapter?.getIconList !== "function" || typeof adapter?.getIcon !== "function") continue;
    try {
      const info = metadata[prefix];
      if (info && info.active === false) continue;
      if (info?.sample_icons?.length && !info.sample_icons.some((icon) => icon.renderer === "iconify")) continue;
      const listed = normalizeListedIcons(prefix, await adapter.getIconList(), () => null);
      if (!listed.length) continue;
      found.push({
        prefix,
        displayName: info?.name || setLabel(prefix),
        source: "iconify",
        sourcePath: "Custom Icons → Iconify",
        icons: listed.map(({ name, keywords }) => ({ name, keywords, source: "custom-icons" })),
      });
    } catch (error) {
      console.warn(`Could not load Iconify set ${prefix}.`, error);
    }
  }
  if (!found.length) throw new Error(t("iconifyUnavailable"));
  for (const set of found) iconSets.set(set.prefix, set);
  updateSetSelector();
  if (found.some((set) => set.prefix === "ant-design")) select.value = "ant-design";
  else if (found[0]) select.value = found[0].prefix;
  changeSelectedSet();
  const count = found.reduce((total, set) => total + set.icons.length, 0);
  setNotice("iconifyScanDone", { sets: found.length, count: count.toLocaleString(language) });
}

function updateSetSelector() {
  const previous = select.value || selectedSet;
  select.replaceChildren();
  const groups = [
    { label: t("normalSets"), sets: [...iconSets.values()].filter((set) => set.source !== "iconify") },
    { label: t("iconifySets"), sets: [...iconSets.values()].filter((set) => set.source === "iconify") },
  ];
  for (const group of groups) {
    if (!group.sets.length) continue;
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.label;
    group.sets.sort((a, b) => a.prefix.localeCompare(b.prefix));
    for (const set of group.sets) {
      const option = document.createElement("option");
      option.value = set.prefix;
      option.textContent = setOptionLabel(set);
      optgroup.append(option);
    }
    select.append(optgroup);
  }
  select.value = iconSets.has(previous) ? previous : "mdi";
  selectedSet = select.value;
  changeSelectedSet();
}

function changeSelectedSet() {
  selectedSet = select.value || "mdi";
  const set = iconSets.get(selectedSet);
  currentIcons = set?.icons ?? [];
  setTitle.textContent = setOptionLabel(set || { prefix: selectedSet });
  if (set?.source === "iconify") {
    sourcePathInput.value = `/config/custom_icons/iconify-icon-sets-master.zip → json/${selectedSet}.json`;
    loadHaButton.disabled = true;
    sourcePathInput.dataset.sourceDisplay = "true";
  } else if (selectedSet === "cli" && set?.sourcePath) {
    sourcePathInput.value = set.sourcePath;
    loadHaButton.disabled = true;
    sourcePathInput.dataset.sourceDisplay = "true";
  } else {
    sourcePathInput.value = set?.sourceFiles?.[0] || "/config/www/atlas-iconset.js";
    loadHaButton.disabled = false;
    delete sourcePathInput.dataset.sourceDisplay;
  }
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

function cacheRenderedIcon(key, source) {
  if (renderedIconCache.size >= 200) renderedIconCache.delete(renderedIconCache.keys().next().value);
  renderedIconCache.set(key, source);
}

function iconSvgSource(icon, definition = icon) {
  const viewBox = Array.isArray(definition.viewBox) ? definition.viewBox.join(" ") : definition.viewBox || icon.viewBox || "0 0 24 24";
  const content = definition.innerSVG || definition.body;
  if (typeof content === "string" && content.trim()) {
    return /^\s*<svg\b/i.test(content) ? content : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${content}</svg>`;
  }
  const path = typeof definition.path === "string" ? definition.path : icon.path;
  if (!path || !/^[MmZzLlHhVvCcSsQqTtAa0-9.,+\-\sEe]+$/.test(path)) return "";
  const secondPath = typeof definition.secondaryPath === "string" ? definition.secondaryPath : icon.secondaryPath;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="${path}"></path>${secondPath ? `<path d="${secondPath}" opacity=".4"></path>` : ""}</svg>`;
}

function setImageSource(image, source) {
  if (!source || source.length > 2 * 1024 * 1024) return;
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().replaceAll('"', "") || "#29cdbb";
  const colored = source.replace(/<svg\b([^>]*)>/i, (svg, attributes) => {
    const colorAttribute = /\scolor\s*=/.test(attributes) ? "" : ` color="${accent}"`;
    const fillAttribute = /\sfill\s*=/.test(attributes) ? "" : ` fill="${accent}"`;
    return `<svg${attributes}${colorAttribute}${fillAttribute}>`;
  });
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(colored)}`;
}

async function loadIconVisual(prefix, icon, image) {
  const cacheKey = icon.sourcePath ? icon.sourcePath : `${prefix}:${icon.name}`;
  if (renderedIconCache.has(cacheKey)) { setImageSource(image, renderedIconCache.get(cacheKey)); return; }
  try {
    let source = "";
    if (icon.sourcePath) {
      source = await fileStudioRead(icon.sourcePath);
    } else if (icon.source === "custom-icons") {
      const adapter = getCustomIconAdapters()?.[prefix];
      if (!adapter?.getIcon) return;
      source = iconSvgSource(icon, await adapter.getIcon(icon.name));
    } else {
      source = iconSvgSource(icon);
    }
    if (!source) return;
    cacheRenderedIcon(cacheKey, source);
    setImageSource(image, source);
  } catch (error) {
    console.warn(`Could not render icon ${prefix}:${icon.name}.`, error);
  }
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
    const image = document.createElement("img");
    image.alt = "";
    image.loading = "lazy";
    button.append(image);
    void loadIconVisual(selectedSet, icon, image);
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
  if (typeof result.content !== "string") throw new Error(result.error ?? "File Studio returned no file content.");
  return result.content;
}

async function fileStudioTree(path, depth = 8) {
  const url = new URL(createAppUrl("api/file-studio/tree"));
  url.searchParams.set("path", path);
  url.searchParams.set("depth", String(depth));
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.error) throw new Error(result.error ?? `HTTP ${response.status}`);
  if (result.exists === false) throw new Error(result.message ?? `${path} is not available.`);
  if (!result.tree || typeof result.tree !== "object") throw new Error("File Studio returned no directory tree.");
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
    const allFiles = flattenTree(tree);
    const allCandidates = allFiles.filter(isIconSetCandidate);
    const candidates = allCandidates.slice(0, 500);
    const svgFiles = allFiles.filter(isCliSvgCandidate).slice(0, 5000);
    const found = new Map();
    let readable = 0;
    let skippedCount = 0;
    const skipped = [];
    for (const file of candidates) {
      try {
        const source = await fileStudioRead(file.path);
        readable += 1;
        const parsed = parseStaticIconsetSource(source);
        // Candidate filenames/folders are only hints. Exclude unrelated JavaScript
        // files unless the parser actually extracted at least one usable icon.
        if (!Array.isArray(parsed.icons) || parsed.icons.length === 0) continue;
        let target = found.get(parsed.prefix);
        if (!target) {
          target = { prefix: parsed.prefix, icons: [], source: "home-assistant-scan", sourceFiles: [] };
          found.set(parsed.prefix, target);
        }
        target.icons.push(...parsed.icons);
        target.sourceFiles.push(file.path);
      } catch (error) {
        skippedCount += 1;
        if (skipped.length < 3) skipped.push(`${file.path}: ${error.message}`);
      }
    }
    for (const set of found.values()) {
      const names = new Set();
      set.icons = set.icons.filter((icon) => {
        if (names.has(icon.name)) return false;
        names.add(icon.name);
        return true;
      });
      if (set.icons.length === 0) continue;
      if (iconSets.has(set.prefix) && !window.confirm(t("replaceSet", { set: setLabel(set.prefix) }))) continue;
      set.source = "normal";
      set.sourceFiles = [...new Set(set.sourceFiles)];
      await storeIconSet(set);
      iconSets.set(set.prefix, set);
    }
    if (svgFiles.length) {
      const cliSet = { prefix: "cli", displayName: "Custom Local Icons", source: "normal", sourcePath: "/config/www/custom_local_icons/", icons: [] };
      for (const file of svgFiles) {
        try {
          const name = cliIconName(file.path);
          cliSet.icons.push({ name, sourcePath: file.path, keywords: [] });
        } catch (error) {
          skippedCount += 1;
          if (skipped.length < 3) skipped.push(`${file.path}: ${error.message}`);
        }
      }
      if (cliSet.icons.length) {
        cliSet.icons.sort((a, b) => a.name.localeCompare(b.name));
        if (!iconSets.has("cli") || window.confirm(t("replaceSet", { set: "CLI" }))) {
          await storeIconSet(cliSet);
          iconSets.set("cli", cliSet);
        }
      }
    }
    updateSetSelector();
    const iconCount = [...found.values()].reduce((sum, set) => sum + set.icons.length, 0);
    const totalCount = iconCount + (iconSets.get("cli")?.icons.length ?? 0);
    const issue = skipped.length ? ` — ${skipped[0]}` : "";
    setNotice("scanDone", {
      sets: found.size + (iconSets.has("cli") ? 1 : 0),
      count: totalCount.toLocaleString(language),
      files: candidates.length,
      svgFiles: svgFiles.length,
      read: readable,
      skipped: skippedCount,
      issue,
    });
  } catch (error) {
    setNotice("loadFailed", { message: error.message }, true);
  }
}

async function runSelectedScan() {
  if (scanMode.value === "iconify") return scanIconifySets();
  return scanHomeAssistantIconSets();
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
  const path = sourcePathInput.value.trim();
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
sourcePathInput.addEventListener("input", () => {
  if (sourcePathInput.dataset.sourceDisplay) {
    delete sourcePathInput.dataset.sourceDisplay;
    loadHaButton.disabled = false;
  }
});
queryInput.addEventListener("input", updateFilter);
grid.addEventListener("scroll", renderGrid, { passive: true });
$("#load-ha-iconset").addEventListener("click", () => { void readFromHomeAssistant(); });
$("#scan-ha-iconsets").addEventListener("click", () => { void runSelectedScan().catch((error) => setNotice("loadFailed", { message: error.message }, true)); });
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
        if (set?.prefix && Array.isArray(set.icons)) iconSets.set(set.prefix, { ...set, icons: set.icons.map((icon) => icon.sourcePath ? icon : ({ ...icon, ...validateIcon(icon) })) });
      } catch { /* Ignore invalid or outdated browser records. */ }
    }
    updateSetSelector();
    setNotice("loadedMdi", { count: mdi.icons.length.toLocaleString(language), version: mdi.version });
  } catch (error) {
    setNotice("loadFailed", { message: error.message }, true);
  }
})();
