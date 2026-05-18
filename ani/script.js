const API_URL = "/api/animes";
const STORAGE_KEY = "anime-vault-library-v1";
const VIEW_NAMES = {
  overview: "Inicio",
  library: "Biblioteca",
  editor: "Añadir anime",
  detail: "Ficha",
};

const form = document.querySelector("#animeForm");
const animeList = document.querySelector("#animeList");
const recentList = document.querySelector("#recentList");
const emptyState = document.querySelector("#emptyState");
const libraryEmptyTitle = document.querySelector("#libraryEmptyTitle");
const libraryEmptyText = document.querySelector("#libraryEmptyText");
const detailEmpty = document.querySelector("#detailEmpty");
const detailCard = document.querySelector("#detailCard");
const searchInput = document.querySelector("#searchInput");
const filterSelect = document.querySelector("#filterSelect");
const clearFormBtn = document.querySelector("#clearFormBtn");
const openEditorBtn = document.querySelector("#openEditorBtn");
const libraryAddBtn = document.querySelector("#libraryAddBtn");
const libraryDetailBtn = document.querySelector("#libraryDetailBtn");
const sidebarDetailBtn = document.querySelector("#sidebarDetailBtn");
const submitBtn = document.querySelector("#submitBtn");

const stats = {
  animeCount: document.querySelector("#animeCount"),
  watchingCount: document.querySelector("#watchingCount"),
  completedCount: document.querySelector("#completedCount"),
  episodesCount: document.querySelector("#episodesCount"),
};

const fields = {
  id: document.querySelector("#animeId"),
  title: document.querySelector("#title"),
  imageUrl: document.querySelector("#imageUrl"),
  season: document.querySelector("#season"),
  episode: document.querySelector("#episode"),
  totalEpisodes: document.querySelector("#totalEpisodes"),
  rating: document.querySelector("#rating"),
  status: document.querySelector("#status"),
  platform: document.querySelector("#platform"),
  notes: document.querySelector("#notes"),
};

const sidebarCurrent = {
  title: document.querySelector("#sidebarCurrentTitle"),
  meta: document.querySelector("#sidebarCurrentMeta"),
};

const preview = {
  image: document.querySelector("#imagePreview"),
  status: document.querySelector("#previewStatus"),
  title: document.querySelector("#previewTitle"),
  summary: document.querySelector("#previewSummary"),
  platform: document.querySelector("#previewPlatform"),
};

const detail = {
  image: document.querySelector("#detailImage"),
  status: document.querySelector("#detailStatus"),
  title: document.querySelector("#detailTitle"),
  subtitle: document.querySelector("#detailSubtitle"),
  season: document.querySelector("#detailSeason"),
  episode: document.querySelector("#detailEpisode"),
  rating: document.querySelector("#detailRating"),
  platform: document.querySelector("#detailPlatform"),
  progress: document.querySelector("#detailProgress"),
  progressFill: document.querySelector("#detailProgressFill"),
  notes: document.querySelector("#detailNotes"),
  editBtn: document.querySelector("#detailEditBtn"),
  libraryBtn: document.querySelector("#detailLibraryBtn"),
  deleteBtn: document.querySelector("#detailDeleteBtn"),
};

const views = [...document.querySelectorAll("[data-view]")];
const navLinks = [...document.querySelectorAll(".nav-link")];
const quickActions = [...document.querySelectorAll("[data-jump]")];

let animeLibrary = [];
let currentView = "overview";
let selectedAnimeId = "";
let editingId = "";
let backendMode = "api";

function formatCount(value) {
  return Number(value || 0).toLocaleString("es-ES");
}

function sanitizeText(value) {
  return String(value ?? "").trim();
}

function sanitizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildFallbackCover(title) {
  const safeTitle = escapeXml(title || "Anime Vault");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" role="img" aria-label="${safeTitle}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ff4fd8" />
          <stop offset="50%" stop-color="#4de1ff" />
          <stop offset="100%" stop-color="#ffd166" />
        </linearGradient>
      </defs>
      <rect width="800" height="1000" fill="#0b1120" />
      <rect x="54" y="54" width="692" height="892" rx="42" fill="url(#g)" opacity="0.16" />
      <circle cx="610" cy="220" r="130" fill="url(#g)" opacity="0.18" />
      <circle cx="200" cy="770" r="150" fill="url(#g)" opacity="0.1" />
      <text x="72" y="170" fill="#edf3ff" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="800">Anime Vault</text>
      <text x="72" y="250" fill="#9eabc7" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="700">Sin portada</text>
      <text x="72" y="860" fill="#edf3ff" font-family="Segoe UI, Arial, sans-serif" font-size="40" font-weight="800">${safeTitle}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getCoverSource(imageUrl, title) {
  const value = sanitizeText(imageUrl);
  return value || buildFallbackCover(title);
}

function bindImage(img, imageUrl, title) {
  const fallback = buildFallbackCover(title);
  img.dataset.fallbackUsed = "0";
  img.alt = `Portada de ${title || "anime"}`;
  img.onerror = () => {
    if (img.dataset.fallbackUsed === "1") return;
    img.dataset.fallbackUsed = "1";
    img.src = fallback;
  };
  img.src = getCoverSource(imageUrl, title);
}

function statusLabel(status) {
  return (
    {
      viendo: "Viendo",
      pausado: "Pausado",
      completado: "Completado",
      pendiente: "Pendiente",
    }[status] || "Viendo"
  );
}

function statusTone(status) {
  return (
    {
      viendo: { text: "#4de1ff", bg: "rgba(77, 225, 255, 0.14)" },
      pausado: { text: "#ffb74d", bg: "rgba(255, 183, 77, 0.14)" },
      completado: { text: "#28d38a", bg: "rgba(40, 211, 138, 0.14)" },
      pendiente: { text: "#9eabc7", bg: "rgba(158, 171, 199, 0.14)" },
    }[status] || { text: "#9eabc7", bg: "rgba(158, 171, 199, 0.14)" }
  );
}

function progressValue(anime) {
  if (!anime.totalEpisodes) {
    return anime.status === "completado" ? 100 : Math.min(anime.episode || 0, 100);
  }

  return Math.max(0, Math.min(100, Math.round((anime.episode / anime.totalEpisodes) * 100)));
}

function normalizeAnime(anime) {
  return {
    id: sanitizeText(anime.id),
    title: sanitizeText(anime.title),
    imageUrl: sanitizeText(anime.imageUrl),
    season: Math.max(1, sanitizeNumber(anime.season, 1)),
    episode: Math.max(0, sanitizeNumber(anime.episode, 0)),
    totalEpisodes: Math.max(0, sanitizeNumber(anime.totalEpisodes, 0)),
    rating: Math.max(0, Math.min(10, sanitizeNumber(anime.rating, 0))),
    status: ["viendo", "pausado", "completado", "pendiente"].includes(anime.status)
      ? anime.status
      : "viendo",
    platform: sanitizeText(anime.platform),
    notes: sanitizeText(anime.notes),
    createdAt: anime.createdAt || Date.now(),
    updatedAt: anime.updatedAt || Date.now(),
  };
}

function buildFormPayload() {
  return normalizeAnime({
    id: fields.id.value,
    title: fields.title.value,
    imageUrl: fields.imageUrl.value,
    season: fields.season.value,
    episode: fields.episode.value,
    totalEpisodes: fields.totalEpisodes.value,
    rating: fields.rating.value,
    status: fields.status.value,
    platform: fields.platform.value,
    notes: fields.notes.value,
  });
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || `HTTP ${response.status}`);
  }

  return payload;
}

function readLocalLibrary() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeAnime) : [];
  } catch {
    return [];
  }
}

function writeLocalLibrary(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items, null, 2));
}

function saveAnimeLocally(payload, id = "") {
  const now = Date.now();
  const item = normalizeAnime({
    ...payload,
    id: id || globalThis.crypto?.randomUUID?.() || `${now}-${Math.random().toString(16).slice(2)}`,
    createdAt: now,
    updatedAt: now,
  });

  const next = [item, ...animeLibrary.filter((anime) => anime.id !== item.id)];
  animeLibrary = next;
  writeLocalLibrary(next);
  selectedAnimeId = item.id;
  return item;
}

function updateAnimeLocally(id, payload) {
  const index = animeLibrary.findIndex((anime) => anime.id === id);
  if (index === -1) {
    throw new Error("Anime not found");
  }

  const item = normalizeAnime({
    ...animeLibrary[index],
    ...payload,
    id,
    updatedAt: Date.now(),
  });
  const next = [...animeLibrary];
  next[index] = item;
  animeLibrary = next;
  writeLocalLibrary(next);
  selectedAnimeId = item.id;
  return item;
}

function deleteAnimeLocally(id) {
  const next = animeLibrary.filter((anime) => anime.id !== id);
  animeLibrary = next;
  writeLocalLibrary(next);
}

function clearAnimeLocally() {
  animeLibrary = [];
  selectedAnimeId = "";
  writeLocalLibrary([]);
}

function getAnimeById(id) {
  return animeLibrary.find((item) => item.id === id) || null;
}

function getSortedAnime() {
  return [...animeLibrary].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function ensureSelection() {
  if (!animeLibrary.length) {
    selectedAnimeId = "";
    return;
  }

  if (!selectedAnimeId || !getAnimeById(selectedAnimeId)) {
    selectedAnimeId = getSortedAnime()[0]?.id || animeLibrary[0].id;
  }
}

function setDocumentTitle() {
  document.title = `Anime Vault | ${VIEW_NAMES[currentView]}`;
}

function setActiveNav(view) {
  navLinks.forEach((link) => {
    const active = link.dataset.route === view;
    link.classList.toggle("active", active);
    if (active) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function getRouteFromHash() {
  const hash = location.hash.replace(/^#/, "");
  if (!hash) return { view: "overview", id: "" };

  const [rawView, ...rest] = hash.split("/");
  const view = VIEW_NAMES[rawView] ? rawView : "overview";
  const id = view === "detail" ? decodeURIComponent(rest.join("/")) : "";
  return { view, id };
}

function navigate(view, id = "") {
  const target = view === "detail" && id ? `#detail/${encodeURIComponent(id)}` : `#${view}`;
  if (location.hash === target) {
    renderApp();
    return;
  }
  location.hash = target;
}

function showView(view) {
  currentView = view;
  views.forEach((section) => {
    section.hidden = section.dataset.view !== view;
  });
  setActiveNav(view);
  setDocumentTitle();
}

function setStatusPill(node, status) {
  const tone = statusTone(status);
  node.textContent = statusLabel(status);
  node.style.color = tone.text;
  node.style.background = tone.bg;
  node.style.borderColor = tone.text;
}

function updateStats() {
  const total = animeLibrary.length;
  const watching = animeLibrary.filter((anime) => anime.status === "viendo").length;
  const completed = animeLibrary.filter((anime) => anime.status === "completado").length;
  const episodes = animeLibrary.reduce((sum, anime) => sum + sanitizeNumber(anime.episode), 0);

  stats.animeCount.textContent = formatCount(total);
  stats.watchingCount.textContent = formatCount(watching);
  stats.completedCount.textContent = formatCount(completed);
  stats.episodesCount.textContent = formatCount(episodes);
}

function clearForm() {
  editingId = "";
  form.reset();
  fields.season.value = 1;
  fields.episode.value = 0;
  fields.totalEpisodes.value = 0;
  fields.rating.value = 0;
  fields.status.value = "viendo";
  fields.title.focus();
  submitBtn.textContent = "Guardar";
  renderEditorPreview();
}

function fillForm(anime) {
  editingId = anime.id;
  fields.id.value = anime.id;
  fields.title.value = anime.title;
  fields.imageUrl.value = anime.imageUrl || "";
  fields.season.value = anime.season;
  fields.episode.value = anime.episode;
  fields.totalEpisodes.value = anime.totalEpisodes;
  fields.rating.value = anime.rating;
  fields.status.value = anime.status;
  fields.platform.value = anime.platform;
  fields.notes.value = anime.notes;
  submitBtn.textContent = "Actualizar anime";
  fields.title.focus();
  renderEditorPreview();
}

function startNewAnime() {
  clearForm();
  navigate("editor");
}

function renderOverview() {
  const items = getSortedAnime().slice(0, 4);
  recentList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state show";
    empty.innerHTML = `
      <div class="empty-icon">+</div>
      <h3>Sin actividad aun</h3>
      <p>Cuando crees o edites animes, apareceran aqui como accesos rapidos.</p>
    `;
    recentList.appendChild(empty);
    return;
  }

  const template = document.querySelector("#recentItemTemplate");
  items.forEach((anime) => {
    const fragment = template.content.cloneNode(true);
    const button = fragment.querySelector(".recent-item");
    const cover = fragment.querySelector(".recent-cover");
    const title = fragment.querySelector(".recent-title");
    const meta = fragment.querySelector(".recent-meta");

    bindImage(cover, anime.imageUrl, anime.title);
    title.textContent = anime.title;
    meta.textContent = `${statusLabel(anime.status)} - Temporada ${anime.season} - Episodio ${anime.episode}`;
    button.addEventListener("click", () => navigate("detail", anime.id));

    recentList.appendChild(fragment);
  });
}

function renderEditorPreview() {
  const payload = buildFormPayload();
  bindImage(preview.image, payload.imageUrl, payload.title || "Anime nuevo");
  setStatusPill(preview.status, payload.status);
  preview.title.textContent = payload.title || "Anime nuevo";
  preview.summary.textContent = `Temporada ${payload.season} - Episodio ${payload.episode}`;
  preview.platform.textContent = payload.platform || "Aún sin plataforma";
}

function renderSidebarSelection() {
  const anime = getAnimeById(selectedAnimeId) || getSortedAnime()[0] || null;

  if (!anime) {
    sidebarCurrent.title.textContent = "Sin anime";
    sidebarCurrent.meta.textContent = "Abre una ficha para verla aquí.";
    sidebarDetailBtn.disabled = true;
    return;
  }

  selectedAnimeId = anime.id;
  sidebarCurrent.title.textContent = anime.title;
  sidebarCurrent.meta.textContent = `${statusLabel(anime.status)} - Temporada ${anime.season} - Episodio ${anime.episode}`;
  sidebarDetailBtn.disabled = false;
}

function renderLibrary() {
  const query = searchInput.value.trim().toLowerCase();
  const filter = filterSelect.value;
  const visible = getSortedAnime()
    .filter((anime) => (filter === "all" ? true : anime.status === filter))
    .filter((anime) => {
      if (!query) return true;
      return (
        anime.title.toLowerCase().includes(query) ||
        anime.platform.toLowerCase().includes(query) ||
        anime.notes.toLowerCase().includes(query)
      );
    });

  animeList.innerHTML = "";
  emptyState.classList.toggle("show", visible.length === 0);

  if (visible.length === 0) {
    if (animeLibrary.length === 0) {
      libraryEmptyTitle.textContent = "Todavía no tienes animes guardados";
      libraryEmptyText.textContent = "Añade el primero para empezar tu lista personal.";
    } else {
      libraryEmptyTitle.textContent = "No hay resultados";
      libraryEmptyText.textContent = "Prueba con otro nombre o quita el filtro para ver más opciones.";
    }
  } else {
    libraryEmptyTitle.textContent = "Todavía no tienes animes guardados";
    libraryEmptyText.textContent = "Añade el primero para empezar tu lista personal.";
  }

  const template = document.querySelector("#animeCardTemplate");

  visible.forEach((anime) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".anime-card");
    const cover = fragment.querySelector(".card-cover");
    const status = fragment.querySelector(".status-pill");
    const title = fragment.querySelector(".anime-title");
    const notes = fragment.querySelector(".anime-notes");
    const seasonChip = fragment.querySelector(".season-chip");
    const episodeChip = fragment.querySelector(".episode-chip");
    const ratingChip = fragment.querySelector(".rating-chip");
    const platformChip = fragment.querySelector(".platform-chip");
    const progressValueText = fragment.querySelector(".progress-value");
    const progressFill = fragment.querySelector(".progress-fill");
    const viewBtn = fragment.querySelector(".view-btn");
    const editBtn = fragment.querySelector(".edit-btn");
    const deleteBtn = fragment.querySelector(".delete-btn");

    bindImage(cover, anime.imageUrl, anime.title);
    setStatusPill(status, anime.status);
    title.textContent = anime.title;
    notes.textContent = anime.notes || "Sin notas añadidas.";
    seasonChip.textContent = `Temporada ${anime.season}`;
    episodeChip.textContent = `Episodio ${anime.episode}`;
    ratingChip.textContent = anime.rating ? `Valoración ${anime.rating}/10` : "Sin valoración";
    platformChip.textContent = anime.platform || "Aún sin plataforma";

    const progress = progressValue(anime);
    progressFill.style.width = `${progress}%`;
    progressValueText.textContent = anime.totalEpisodes
      ? `${progress}% (${anime.episode}/${anime.totalEpisodes})`
      : `${progress}%`;

    card.classList.toggle("is-selected", anime.id === selectedAnimeId);

    viewBtn.addEventListener("click", () => navigate("detail", anime.id));
    editBtn.addEventListener("click", () => {
      fillForm(anime);
      selectedAnimeId = anime.id;
      navigate("editor");
    });
    deleteBtn.addEventListener("click", () => removeAnime(anime.id));

    animeList.appendChild(fragment);
  });
}

function renderDetail() {
  const anime = getAnimeById(selectedAnimeId) || getSortedAnime()[0] || null;

  if (!anime) {
    detailEmpty.hidden = false;
    detailCard.hidden = true;
    detail.deleteBtn.disabled = true;
    detail.editBtn.disabled = true;
    return;
  }

  selectedAnimeId = anime.id;
  detailEmpty.hidden = true;
  detailCard.hidden = false;
  detail.deleteBtn.disabled = false;
  detail.editBtn.disabled = false;

  bindImage(detail.image, anime.imageUrl, anime.title);
  setStatusPill(detail.status, anime.status);
  detail.title.textContent = anime.title;
  detail.subtitle.textContent = `Temporada ${anime.season} - Episodio ${anime.episode}`;
  detail.season.textContent = `Temporada ${anime.season}`;
  detail.episode.textContent = `Episodio ${anime.episode}`;
  detail.rating.textContent = anime.rating ? `Valoración ${anime.rating}/10` : "Sin valoración";
  detail.platform.textContent = anime.platform || "Aún sin plataforma";

  const progress = progressValue(anime);
  detail.progress.textContent = anime.totalEpisodes
    ? `${progress}% (${anime.episode}/${anime.totalEpisodes})`
    : `${progress}%`;
  detail.progressFill.style.width = `${progress}%`;
  detail.notes.textContent = anime.notes || "Sin notas añadidas.";
}

async function loadAnimeLibrary() {
  try {
    const payload = await requestJson(API_URL);
    backendMode = "api";
    animeLibrary = Array.isArray(payload?.items) ? payload.items.map(normalizeAnime) : [];
  } catch {
    backendMode = "local";
    animeLibrary = readLocalLibrary();
  }
  ensureSelection();
  renderApp();
}

function renderApp() {
  updateStats();
  renderSidebarSelection();
  renderOverview();
  renderLibrary();
  renderEditorPreview();
  renderDetail();
  setDocumentTitle();
}

async function createAnime(payload) {
  if (backendMode === "api") {
    try {
      const response = await requestJson(API_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const saved = normalizeAnime(response.item);
      selectedAnimeId = saved.id;
      await loadAnimeLibrary();
      navigate("detail", saved.id);
      return;
    } catch {
      backendMode = "local";
    }
  }

  const saved = saveAnimeLocally(payload);
  ensureSelection();
  renderApp();
  navigate("detail", saved.id);
}

async function updateAnime(id, payload) {
  if (backendMode === "api") {
    try {
      const response = await requestJson(`${API_URL}/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const saved = normalizeAnime(response.item);
      selectedAnimeId = saved.id;
      await loadAnimeLibrary();
      navigate("detail", saved.id);
      return;
    } catch {
      backendMode = "local";
    }
  }

  const saved = updateAnimeLocally(id, payload);
  ensureSelection();
  renderApp();
  navigate("detail", saved.id);
}

async function removeAnime(id) {
  const anime = getAnimeById(id);
  if (!anime) return;

  const confirmed = confirm(`¿Quieres borrar "${anime.title}" de tu lista?`);
  if (!confirmed) return;

  if (backendMode === "api") {
    try {
      await requestJson(`${API_URL}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch {
      backendMode = "local";
    }
  }

  if (selectedAnimeId === id) {
    selectedAnimeId = "";
  }

  if (editingId === id) {
    clearForm();
  }

  if (backendMode === "local") {
    deleteAnimeLocally(id);
    renderApp();
    return;
  }

  await loadAnimeLibrary();
  if (currentView !== "detail") {
    renderApp();
  }
}

async function resetAnimeLibrary() {
  const confirmed = confirm("¿Quieres borrar toda tu lista de animes?");
  if (!confirmed) return;

  if (backendMode === "api") {
    try {
      await requestJson(API_URL, { method: "DELETE" });
      animeLibrary = [];
      selectedAnimeId = "";
      clearForm();
      renderApp();
      return;
    } catch {
      backendMode = "local";
    }
  }

  clearAnimeLocally();
  clearForm();
  renderApp();
}

function openDetailForSelected() {
  if (!selectedAnimeId && animeLibrary.length) {
    selectedAnimeId = getSortedAnime()[0].id;
  }
  navigate("detail", selectedAnimeId);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = buildFormPayload();
  try {
    if (editingId) {
      await updateAnime(editingId, payload);
    } else {
      await createAnime(payload);
    }

    clearForm();
  } catch (error) {
    alert(error instanceof Error ? error.message : "No se pudo guardar.");
  }
});

clearFormBtn.addEventListener("click", () => {
  clearForm();
  navigate("editor");
});

openEditorBtn.addEventListener("click", () => {
  selectedAnimeId = selectedAnimeId || getSortedAnime()[0]?.id || "";
  startNewAnime();
});

libraryAddBtn.addEventListener("click", () => {
  selectedAnimeId = selectedAnimeId || getSortedAnime()[0]?.id || "";
  startNewAnime();
});

libraryDetailBtn.addEventListener("click", () => openDetailForSelected());

sidebarDetailBtn.addEventListener("click", () => openDetailForSelected());

searchInput.addEventListener("input", renderLibrary);
filterSelect.addEventListener("change", renderLibrary);

[
  fields.title,
  fields.imageUrl,
  fields.season,
  fields.episode,
  fields.totalEpisodes,
  fields.rating,
  fields.status,
  fields.platform,
  fields.notes,
].forEach((field) => {
  field.addEventListener("input", renderEditorPreview);
  field.addEventListener("change", renderEditorPreview);
});

fields.title.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
  }
});

detail.editBtn.addEventListener("click", () => {
  const anime = getAnimeById(selectedAnimeId);
  if (!anime) return;
  fillForm(anime);
  navigate("editor");
});

detail.libraryBtn.addEventListener("click", () => navigate("library"));
detail.deleteBtn.addEventListener("click", () => {
  const anime = getAnimeById(selectedAnimeId);
  if (!anime) return;
  removeAnime(anime.id).catch((error) => {
    alert(error instanceof Error ? error.message : "No se pudo borrar el anime.");
  });
});

quickActions.forEach((button) => {
  button.addEventListener("click", () => {
    navigate("library");
  });
});

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const view = link.dataset.route || "overview";
    navigate(view);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && currentView === "editor" && editingId) {
    clearForm();
  }
});

window.addEventListener("hashchange", () => {
  const route = getRouteFromHash();
  currentView = route.view;
  if (route.id) {
    selectedAnimeId = route.id;
  }
  if (currentView === "detail" && !selectedAnimeId && animeLibrary.length) {
    selectedAnimeId = getSortedAnime()[0].id;
  }
  showView(currentView);
  renderApp();
});

const style = document.createElement("style");
style.textContent = `
  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);

async function init() {
  const route = getRouteFromHash();
  currentView = route.view;
  if (route.id) {
    selectedAnimeId = route.id;
  }
  showView(currentView);
  await loadAnimeLibrary();
  if (!location.hash) {
    navigate("overview");
  }
}

init().catch((error) => {
  console.error(error);
  animeLibrary = [];
  selectedAnimeId = "";
  renderApp();
  alert("No se pudo cargar tu lista.");
});
