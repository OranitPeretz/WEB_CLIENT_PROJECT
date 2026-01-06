// ================= AUTH =================
const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
if (!currentUser) location.href = "../login/login.html";

const API_BASE = "http://localhost:3000/api";


// ================= USER CHIP =================
const userName = document.getElementById("userName");
const userAvatar = document.getElementById("userAvatar");
const logoutBtn = document.getElementById("logoutBtn");

function setTopBarUser(user) {
  userName.textContent = user.firstName + " " + user.lastName;

  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user.firstName + " " + user.lastName
  )}&background=1976d2&color=fff`;

  userAvatar.src = user.imageUrl || fallback;
  userAvatar.onerror = () => (userAvatar.src = fallback);
}

setTopBarUser(currentUser);

logoutBtn.onclick = () => {
  sessionStorage.removeItem("currentUser");
  location.href = "../login/login.html";
};


// ================= DOM =================
const playlistList = document.getElementById("playlistList");
const newPlaylistBtn = document.getElementById("newPlaylistBtn");

const contentBody = document.getElementById("contentBody");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const sortDirBtn = document.getElementById("sortDirBtn");

const deletePlaylistBtn = document.getElementById("deletePlaylistBtn");
const playPlaylistBtn = document.getElementById("playPlaylistBtn");

const prevBtn = document.getElementById("prevBtn");
const playPauseBtn = document.getElementById("playPauseBtn");
const nextBtn = document.getElementById("nextBtn");

const playerCard = document.getElementById("playerCard");


// ================= STATE =================
let playlists = [];
let activePlaylistId = null;

let currentPlaylist = null;
let filteredVideos = [];

let queue = [];
let currentIndex = -1;
let selectedIndex = -1;

let sortDirection = 1;
let player = null;
let isPlaying = false;


// ================= SERVER HELPERS =================
async function loadPlaylistsFromServer() {
  const res = await fetch(`${API_BASE}/playlists/${currentUser.username}`);

  if (!res.ok) {
    console.error("Failed to load playlists");
    playlists = [];
    return;
  }

  playlists = await res.json();
}

async function savePlaylistsToServer() {
  await fetch(`${API_BASE}/playlists/${currentUser.username}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(playlists)
  });
}

async function ensureDefaultPlaylist() {
  if (!playlists || playlists.length === 0) {
    playlists = [
      {
        id: "fav",
        name: "Favorites",
        videos: []
      }
    ];
    await savePlaylistsToServer();
  }
}


// ================= SIDEBAR =================
function renderSidebar() {
  playlistList.innerHTML = "";

  playlists.forEach((pl) => {
    const li = document.createElement("li");
    li.textContent = pl.name;
    li.className = pl.id === activePlaylistId ? "active" : "";
    li.onclick = () => selectPlaylist(pl.id);
    playlistList.appendChild(li);
  });
}

function selectPlaylist(id) {
  activePlaylistId = id;
  selectedIndex = -1;
  stopPlayback();
  renderSidebar();
  renderContent();
}


// ================= NEW PLAYLIST =================
newPlaylistBtn.onclick = async () => {
  const name = prompt("Playlist name:");
  if (!name) return;

  const newPl = { id: "pl_" + Date.now(), name, videos: [] };

  await fetch(`${API_BASE}/playlists/${currentUser.username}/addPlaylist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newPl)
  });

  await loadPlaylistsFromServer();
  activePlaylistId = newPl.id;
  renderSidebar();
  renderContent();
};


// ================= FILTER + SORT =================
function getFilteredVideos(pl) {
  let vids = [...(pl.videos || [])];
  const q = searchInput.value.toLowerCase().trim();

  if (q) vids = vids.filter((v) => v.title.toLowerCase().includes(q));

  if (sortSelect.value === "az") {
    vids.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    vids.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  if (sortDirection === -1) vids.reverse();
  return vids;
}


// ================= CONTENT =================
function renderContent() {
  currentPlaylist = playlists.find((p) => p.id === activePlaylistId);
  contentBody.innerHTML = "";

  if (!currentPlaylist) {
    contentBody.innerHTML = `<p class="placeholder">Select a playlist.</p>`;
    return;
  }

  filteredVideos = getFilteredVideos(currentPlaylist);

  if (!filteredVideos.length) {
    contentBody.innerHTML = `<p class="placeholder">No songs.</p>`;
    return;
  }

  filteredVideos.forEach((video, index) => {
    const card = document.createElement("div");
    card.className = "song-card";

    if (index === selectedIndex) card.classList.add("selected");
    if (queue[currentIndex]?.videoId === video.videoId) {
      card.classList.add("active");
    }

    card.innerHTML = `
      <img class="song-thumb" src="${video.thumbnail}" />
      <div>${video.title}</div>

      <select class="rating-select">
        <option value="0">☆</option>
        ${[1,2,3,4,5].map(
          (n) => `<option value="${n}" ${video.rating == n ? "selected" : ""}>
            ${"★".repeat(n)}
          </option>`
        ).join("")}
      </select>

      <button class="delete-song">🗑</button>
    `;

    // בחירת שיר
    card.onclick = () => {
      selectedIndex = index;
      renderContent();
    };

    // דירוג
    const ratingSelect = card.querySelector(".rating-select");
    ratingSelect.onmousedown = (e) => e.stopPropagation();
    ratingSelect.onclick = (e) => e.stopPropagation();
    ratingSelect.onchange = async (e) => {
      e.stopPropagation();
      video.rating = Number(e.target.value);
      await savePlaylistsToServer();
      if (sortSelect.value === "rating") renderContent();
    };

    // מחיקת שיר
    card.querySelector(".delete-song").onclick = async (e) => {
      e.stopPropagation();

      await fetch(`${API_BASE}/playlists/${currentUser.username}/deleteVideo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId: activePlaylistId,
          videoId: video.videoId
        })
      });

      await loadPlaylistsFromServer();
      stopPlayback();
      renderContent();
    };

    contentBody.appendChild(card);
  });
}


// ================= PLAYER =================
function playCurrent() {
  const video = queue[currentIndex];
  if (!video) return;

  if (!player) {
    player = new YT.Player("playerHost", {
      videoId: video.videoId,
      events: {
        onReady: (e) => e.target.playVideo(),
        onStateChange: onPlayerStateChange
      }
    });
  } else {
    player.loadVideoById(video.videoId);
  }
}

function onPlayerStateChange(e) {
  if (e.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    playPauseBtn.textContent = "⏸";
  }
  if (e.data === YT.PlayerState.PAUSED) {
    isPlaying = false;
    playPauseBtn.textContent = "▶";
  }
  if (e.data === YT.PlayerState.ENDED) {
    nextBtn.click();
  }
}

function stopPlayback() {
  if (player?.stopVideo) player.stopVideo();
  queue = [];
  currentIndex = -1;
  isPlaying = false;
  playerCard.classList.add("hidden");
  playPauseBtn.textContent = "▶";
}


// ================= EVENTS =================
searchInput.oninput = renderContent;
sortSelect.onchange = renderContent;

sortDirBtn.onclick = () => {
  sortDirection *= -1;
  sortDirBtn.textContent = sortDirection === 1 ? "⬇" : "⬆";
  renderContent();
};

playPlaylistBtn.onclick = () => {
  if (!currentPlaylist) return;

  queue = getFilteredVideos(currentPlaylist);
  currentIndex = selectedIndex >= 0 ? selectedIndex : 0;

  playerCard.classList.remove("hidden");
  playCurrent();
  renderContent();
};

prevBtn.onclick = () => {
  if (currentIndex > 0) {
    currentIndex--;
    playCurrent();
    renderContent();
  }
};

nextBtn.onclick = () => {
  if (currentIndex < queue.length - 1) {
    currentIndex++;
    playCurrent();
    renderContent();
  }
};

playPauseBtn.onclick = () => {
  if (!player) return;
  isPlaying ? player.pauseVideo() : player.playVideo();
};


// ================= DELETE PLAYLIST =================
deletePlaylistBtn.onclick = async () => {
  await fetch(`${API_BASE}/playlists/${currentUser.username}/deletePlaylist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playlistId: activePlaylistId })
  });

  await loadPlaylistsFromServer();
  activePlaylistId = playlists[0].id;
  renderSidebar();
  renderContent();
};


// ================= ADD VIDEO TO PLAYLIST =================
async function addVideoToPlaylist(video) {
  await fetch(`${API_BASE}/playlists/${currentUser.username}/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      playlistId: activePlaylistId,
      video
    })
  });

  await loadPlaylistsFromServer();
  renderContent();
}


// ================= INIT =================
(async function init() {
  await loadPlaylistsFromServer();
  await ensureDefaultPlaylist();

  activePlaylistId =
    new URLSearchParams(location.search).get("open") ||
    playlists[0]?.id ||
    null;

  renderSidebar();
  renderContent();

  const s = document.createElement("script");
  s.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(s);
})();
