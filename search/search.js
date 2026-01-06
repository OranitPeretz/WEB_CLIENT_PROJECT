// ========= CONFIG =========
const YOUTUBE_API_KEY = "AIzaSyD2AOjcCs2xKzDH2MSZ5QMJC92MIWVwiOE";
const API_BASE = "http://localhost:3000/api";

// ========= AUTH =========
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

const videoBackdrop = document.getElementById("videoBackdrop");
const videoFrame = document.getElementById("videoFrame");
const videoTitleEl = document.getElementById("videoTitle");
const videoCloseBtn = document.getElementById("videoCloseBtn");

const modalBackdrop = document.getElementById("modalBackdrop");
const modalSubtitle = document.getElementById("modalSubtitle");
const playlistSelect = document.getElementById("playlistSelect");
const cancelBtn = document.getElementById("cancelBtn");
const saveBtn = document.getElementById("saveBtn");

const addedPopup = document.getElementById("addedPopup");
const popupText = document.getElementById("popupText");
const popupGoBtn = document.getElementById("popupGoBtn");
const popupCloseBtn = document.getElementById("popupCloseBtn");

// ========= USER TOP BAR =========
setTopBarUser(currentUser);

function setTopBarUser(user) {
    welcomeMsg.textContent = `Welcome, ${user.username}!`;
    userName.textContent = user.firstName + " " + user.lastName;

    const fallback =
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName + " " + user.lastName)}&background=1976d2&color=fff`;

    userAvatar.src = user.imageUrl || fallback;
    userAvatar.onerror = () => userAvatar.src = fallback;
}

// ========= UTIL =========
function escapeHtml(str) {
    return (str || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
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

    if (hours > 0)
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// ========= SERVER FUNCTIONS =========

async function loadPlaylists() {
    const res = await fetch(`${API_BASE}/playlists/${currentUser.username}`);
    return await res.json();
}

async function addVideoToPlaylist(playlistId, video) {
    await fetch(`${API_BASE}/playlists/${currentUser.username}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, video })
    });
}

async function createPlaylist(name) {
    const newPl = {
        id: "pl_" + Date.now(),
        name,
        videos: []
    };

    await fetch(`${API_BASE}/playlists/${currentUser.username}/addPlaylist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPl)
    });

    return newPl;
}

// ========= VIDEO MODAL =========

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

// ========= ADD TO PLAYLIST MODAL =========

let selectedVideo = null;
let pendingNewPlaylist = null;

async function openModalForVideo(video) {
    selectedVideo = video;
    pendingNewPlaylist = null;

    modalSubtitle.textContent = `Add: ${video.title}`;

    const playlists = await loadPlaylists();

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

    playlistSelect.innerHTML =
        `<option selected value="${tmpId}">${escapeHtml(pendingNewPlaylist)} (new)</option>`;
};

saveBtn.onclick = async () => {
    if (!selectedVideo) return;

    let playlistId = playlistSelect.value;

    if (playlistId.startsWith("tmp_")) {
        const newPL = await createPlaylist(pendingNewPlaylist);
        playlistId = newPL.id;
    }

    await addVideoToPlaylist(playlistId, selectedVideo);

    modalBackdrop.classList.remove("show");

    showAddedPopup(selectedVideo.title, pendingNewPlaylist || "Playlist", playlistId);
};

// ========= ADDED POPUP =========
function showAddedPopup(title, playlistName, playlistId) {
    popupText.textContent =
        `"${title}" was added to playlist "${playlistName}"`;

    addedPopup.classList.add("show");

    popupGoBtn.onclick = () =>
        location.href = `../playlists/playlists.html?open=${playlistId}`;

    popupCloseBtn.onclick = () =>
        addedPopup.classList.remove("show");
}

// ========= SEARCH SYSTEM =========

let currentQuery = "";
let nextPageToken = null;
let lastVideos = [];

// === STATE SAVE ===
function saveSearchState() {
    localStorage.setItem("searchQuery", currentQuery);
    localStorage.setItem("searchResults", JSON.stringify(lastVideos));
    localStorage.setItem("searchNextPageToken", nextPageToken || "");
    localStorage.setItem("searchScroll", window.scrollY);
}

// === STATE LOAD ===
function loadSearchState() {
    const q = localStorage.getItem("searchQuery");
    const res = localStorage.getItem("searchResults");
    const token = localStorage.getItem("searchNextPageToken");

    if (!q || !res) return false;

    currentQuery = q;
    nextPageToken = token || null;
    lastVideos = JSON.parse(res);
    queryInput.value = q;

    renderResults(lastVideos);

    setTimeout(() => {
        const scrollY = Number(localStorage.getItem("searchScroll") || 0);
        window.scrollTo(0, scrollY);
    }, 80);

    loadMoreBtn.style.display = nextPageToken ? "block" : "none";
    return true;
}

// ========= YOUTUBE API =========
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

// ========= RENDER RESULTS =========
async function renderResults(videos) {
    const playlists = await loadPlaylists();
    const allVideoIds = new Set();

    playlists.forEach(pl =>
        pl.videos.forEach(v => allVideoIds.add(v.videoId))
    );

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
                            ${allVideoIds.has(v.videoId) ? "disabled" : ""}>
                        ${allVideoIds.has(v.videoId) ? "Added ✓" : "Add to Playlist"}
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

// ========= SEARCH FLOW =========
async function runSearch(query) {
    currentQuery = query.trim();
    if (!currentQuery) return;

    const data = await searchYouTube(currentQuery);
    lastVideos = data.videos;
    nextPageToken = data.nextPageToken;

    await renderResults(lastVideos);
    loadMoreBtn.style.display = nextPageToken ? "block" : "none";

    saveSearchState();
}

async function loadMore() {
    if (!nextPageToken) return;

    const data = await searchYouTube(currentQuery, nextPageToken);
    lastVideos.push(...data.videos);
    nextPageToken = data.nextPageToken;

    await renderResults(lastVideos);
    loadMoreBtn.style.display = nextPageToken ? "block" : "none";

    saveSearchState();
}

loadMoreBtn.onclick = loadMore;

searchForm.onsubmit = e => {
    e.preventDefault();
    runSearch(queryInput.value);
};

// ========= SCROLL SAVE =========
window.addEventListener("scroll", () => {
    localStorage.setItem("searchScroll", window.scrollY);
});

// ========= INIT =========
if (!loadSearchState()) {
    // No saved state
    resultsEl.innerHTML = "";
}

logoutBtn.onclick = () => {
    sessionStorage.removeItem("currentUser");
    localStorage.removeItem("searchQuery");
    localStorage.removeItem("searchResults");
    localStorage.removeItem("searchNextPageToken");
    localStorage.removeItem("searchScroll");
    location.href = "../login/login.html";
};
