// ========= Config =========
const YOUTUBE_API_KEY = "AIzaSyD2AOjcCs2xKzDH2MSZ5QMJC92MIWVwiOE";

// ========= AUTH (Moved to top – FIXED) =========
function getCurrentUser() {
  const raw = sessionStorage.getItem("currentUser");
  return raw ? JSON.parse(raw) : null;
}

function requireLogin() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "../login/login.html";
    return null;
  }
  return user;
}

const currentUser = requireLogin();

// ========= DOM =========
const welcomeMsg = document.getElementById("welcomeMsg");
const userName = document.getElementById("userName");
const userAvatar = document.getElementById("userAvatar");

const searchForm = document.getElementById("searchForm");
const queryInput = document.getElementById("queryInput");
const resultsEl = document.getElementById("results");
const loadMoreBtn = document.getElementById("loadMoreBtn");

const logoutBtn = document.getElementById("logoutBtn");

// Video modal
const videoBackdrop = document.getElementById("videoBackdrop");
const videoFrame = document.getElementById("videoFrame");
const videoTitleEl = document.getElementById("videoTitle");
const videoCloseBtn = document.getElementById("videoCloseBtn");

// Toast
const toastEl = document.getElementById("toast");

// Favorites modal
const modalBackdrop = document.getElementById("modalBackdrop");
const modalSubtitle = document.getElementById("modalSubtitle");
const playlistSelect = document.getElementById("playlistSelect");
const cancelBtn = document.getElementById("cancelBtn");
const saveBtn = document.getElementById("saveBtn");

// Added-popup
const addedPopup = document.getElementById("addedPopup");
const popupText = document.getElementById("popupText");
const popupGoBtn = document.getElementById("popupGoBtn");
const popupCloseBtn = document.getElementById("popupCloseBtn");

// ========= Top Bar =========
function setTopBarUser(user) {
  welcomeMsg.textContent = `Welcome, ${user.username}!`;
  userName.textContent = user.firstName + " " + user.lastName;

  const fallback =
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName + " " + user.lastName)}&background=1976d2&color=fff`;

  userAvatar.src = user.imageUrl || fallback;
  userAvatar.onerror = () => userAvatar.src = fallback;
}

setTopBarUser(currentUser);

// ========= Utilities =========
function escapeHtml(str) {
  return (str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 1600);
}

function formatViews(n) {
  const num = Number(n || 0);
  if (num >= 1e9) return (num / 1e9).toFixed(1) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
  return num;
}

function parseDuration(iso) {
  if (!iso || typeof iso !== "string") return "";

  let hours = 0, minutes = 0, seconds = 0;

  const h = iso.match(/(\d+)H/);
  const m = iso.match(/(\d+)M/);
  const s = iso.match(/(\d+)S/);

  if (h) hours = Number(h[1]);
  if (m) minutes = Number(m[1]);
  if (s) seconds = Number(s[1]);

  // Format: H:MM:SS or MM:SS if no hours
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// ========= Playlists System =========
function playlistsKey(username) {
  return `playlists_${username}`;
}

function getUserPlaylists(username) {
  let stored = JSON.parse(localStorage.getItem(playlistsKey(username)));
  if (!stored) {
    stored = [{ id: "fav", name: "Favorites", videos: [] }];
    saveUserPlaylists(username, stored);
  }
  return stored;
}

function saveUserPlaylists(username, playlists) {
  localStorage.setItem(playlistsKey(username), JSON.stringify(playlists));
}

function getAllSavedVideoIds(username) {
  const pl = getUserPlaylists(username);
  const set = new Set();
  pl.forEach(p => p.videos.forEach(v => set.add(v.videoId)));
  return set;
}

// ========= Video Modal =========
function openVideoModal(videoId, title) {
  videoTitleEl.textContent = title;
  videoFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  videoBackdrop.classList.add("show");
}

function closeVideoModal() {
  videoFrame.src = "";
  videoBackdrop.classList.remove("show");
}

videoCloseBtn.onclick = closeVideoModal;
videoBackdrop.onclick = e => {
  if (e.target === videoBackdrop) closeVideoModal();
};

// ========= Add-to-Playlist Modal =========
let selectedVideo = null;
let pendingNewPlaylist = null;

function openModalForVideo(video) {
  selectedVideo = video;
  pendingNewPlaylist = null;

  modalSubtitle.textContent = `Add: ${video.title}`;

  const playlists = getUserPlaylists(currentUser.username);

  playlistSelect.innerHTML =
    playlists.map(pl => `<option value="${pl.id}">${escapeHtml(pl.name)}</option>`).join("") +
    `<option value="__new__">+ Create new playlist…</option>`;

  modalBackdrop.classList.add("show");
}

playlistSelect.onchange = () => {
  if (playlistSelect.value !== "__new__") return;

  const name = prompt("Playlist name:");
  if (!name?.trim()) {
    playlistSelect.value = "";
    return;
  }

  pendingNewPlaylist = name.trim();

  const tmpId = "tmp_" + Date.now();
  const playlists = getUserPlaylists(currentUser.username);

  playlistSelect.innerHTML =
    `<option selected value="${tmpId}">${escapeHtml(pendingNewPlaylist)} (new)</option>` +
    playlists.map(pl => `<option value="${pl.id}">${pl.name}</option>`).join("");
};

cancelBtn.onclick = () => modalBackdrop.classList.remove("show");

// ========= Popup =========
function showAddedPopup(title, playlistName, playlistId) {
  popupText.textContent =
    `"${title}" was added to playlist "${playlistName}"`;

  addedPopup.classList.add("show");

  popupGoBtn.onclick = () =>
    location.href = `../playlists/playlists.html?open=${playlistId}`;

  popupCloseBtn.onclick = () =>
    addedPopup.classList.remove("show");
}

// ========= SAVE BUTTON =========
saveBtn.onclick = () => {
  if (!selectedVideo) return;

  let playlists = getUserPlaylists(currentUser.username);
  let playlistId = playlistSelect.value;

  // Create playlist if needed
  if (playlistId.startsWith("tmp_")) {
    const realId = "pl_" + Date.now();
    playlists.push({
      id: realId,
      name: pendingNewPlaylist,
      videos: []
    });
    saveUserPlaylists(currentUser.username, playlists);
    playlistId = realId;
  }

  const playlist = playlists.find(p => p.id === playlistId);
  if (!playlist) return;

  // Add the video
  if (!playlist.videos.some(v => v.videoId === selectedVideo.videoId)) {
    playlist.videos.push(selectedVideo);
    saveUserPlaylists(currentUser.username, playlists);
  }

  modalBackdrop.classList.remove("show");

  // Update button state without re-render breaking events
  const btn = document.querySelector(`button[data-id="${selectedVideo.videoId}"][data-action="fav"]`);
  if (btn) {
    btn.textContent = "Added ✓";
    btn.disabled = true;
  }

  showAddedPopup(selectedVideo.title, playlist.name, playlist.id);
};

// ========= YOUTUBE API =========
let currentQuery = "";
let nextPageToken = null;
let lastVideos = [];

async function searchYouTube(query, pageToken = "") {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "12");
  url.searchParams.set("q", query);
  url.searchParams.set("key", YOUTUBE_API_KEY);
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const res = await fetch(url);
  const data = await res.json();

  const base = (data.items || [])
    .map(item => ({
      videoId: item.id?.videoId,
      title: item.snippet?.title,
      channelTitle: item.snippet?.channelTitle,
      thumbnail: item.snippet?.thumbnails?.medium?.url,
      publishedAt: item.snippet?.publishedAt
    }))
    .filter(v => v.videoId);

  // Fetch stats
  const ids = base.map(v => v.videoId).join(",");
  if (ids) {
    const details = new URL("https://www.googleapis.com/youtube/v3/videos");
    details.searchParams.set("part", "statistics,contentDetails");
    details.searchParams.set("id", ids);
    details.searchParams.set("key", YOUTUBE_API_KEY);

    const dRes = await fetch(details);
    const dData = await dRes.json();

    const map = new Map();
    dData.items?.forEach(item => map.set(item.id, item));

    base.forEach(v => {
      const d = map.get(v.videoId);
      v.viewCount = d?.statistics?.viewCount || 0;
      v.duration = d?.contentDetails?.duration || "";
    });
  }

  return {
    videos: base,
    nextPageToken: data.nextPageToken || null
  };
}

// ========= Render =========
function renderResults(videos) {
  const savedIds = getAllSavedVideoIds(currentUser.username);

  resultsEl.innerHTML = videos.map(v => `
    <article class="video-card">
      <img class="thumb" src="${v.thumbnail}">
      <div class="details">
        <h3>${escapeHtml(v.title)}</h3>
        <div class="meta">
          <span>📺 ${escapeHtml(v.channelTitle)}</span>
          <span>👁 ${formatViews(v.viewCount)}</span>
          <span>⏱ ${parseDuration(v.duration)}</span>
        </div>
        <div class="actions">
          <button class="btn-fav"
                  data-id="${v.videoId}"
                  data-action="fav"
                  ${savedIds.has(v.videoId) ? "disabled" : ""}>
            ${savedIds.has(v.videoId) ? "Added ✓" : "Add to Playlist"}
          </button>
          <button class="btn-open" data-id="${v.videoId}" data-action="open">Play</button>
        </div>
      </div>
    </article>
  `).join("");

  resultsEl.querySelectorAll("button").forEach(btn => {
    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "open") {
      btn.onclick = () => {
        const video = videos.find(v => v.videoId === id);
        openVideoModal(video.videoId, video.title);
      };
    }

    if (action === "fav") {
      btn.onclick = () => {
        const video = videos.find(v => v.videoId === id);
        openModalForVideo(video);
      };
    }
  });
}

// ========= State Save =========
function saveSearchState() {
  localStorage.setItem("searchQuery", currentQuery);
  localStorage.setItem("searchResults", JSON.stringify(lastVideos));
  localStorage.setItem("searchNextPageToken", nextPageToken || "");
}

async function runSearch(query) {
  currentQuery = query.trim();
  if (!currentQuery) return;

  const data = await searchYouTube(currentQuery);
  lastVideos = data.videos;
  nextPageToken = data.nextPageToken;

  renderResults(lastVideos);
  loadMoreBtn.style.display = nextPageToken ? "block" : "none";

  saveSearchState();
}

async function loadMore() {
  if (!nextPageToken) return;

  const data = await searchYouTube(currentQuery, nextPageToken);
  lastVideos.push(...data.videos);
  nextPageToken = data.nextPageToken;

  renderResults(lastVideos);
  loadMoreBtn.style.display = nextPageToken ? "block" : "none";

  saveSearchState();
}

loadMoreBtn.onclick = loadMore;

// ========= Scroll Position =========
window.addEventListener("scroll", () => {
  localStorage.setItem("searchScroll", window.scrollY);
});

// ========= INIT =========
const savedQuery = localStorage.getItem("searchQuery");
const savedResults = localStorage.getItem("searchResults");
const savedToken = localStorage.getItem("searchNextPageToken");

if (savedQuery && savedResults) {
  currentQuery = savedQuery;
  queryInput.value = savedQuery;

  lastVideos = JSON.parse(savedResults);
  nextPageToken = savedToken || null;

  renderResults(lastVideos);

  window.scrollTo(0, Number(localStorage.getItem("searchScroll") || 0));
  loadMoreBtn.style.display = nextPageToken ? "block" : "none";
}

searchForm.onsubmit = e => {
  e.preventDefault();
  runSearch(queryInput.value);
};

logoutBtn.onclick = () => {
  sessionStorage.removeItem("currentUser");
  localStorage.removeItem("searchQuery");
  localStorage.removeItem("searchResults");
  localStorage.removeItem("searchScroll");
  location.href = "../login/login.html";
};
