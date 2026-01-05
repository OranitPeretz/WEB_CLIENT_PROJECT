// ================= AUTH =================
const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
if (!currentUser) location.href = "../login/login.html";

const playlistKey = `playlists_${currentUser.username}`;


// ================= USER CHIP =================
const userName = document.getElementById("userName");
const userAvatar = document.getElementById("userAvatar");
const logoutBtn = document.getElementById("logoutBtn");

function setUserChip(user) {
  userName.textContent = `${user.firstName} ${user.lastName}`;
  userAvatar.src = user.imageUrl || "https://via.placeholder.com/80";
}

setUserChip(currentUser);

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
let playlists = JSON.parse(localStorage.getItem(playlistKey)) || [];
let activePlaylistId = null;

let currentPlaylist = null;
let filteredVideos = [];

let queue = [];
let currentIndex = -1;
let selectedIndex = -1;

let sortDirection = 1;

let player = null;
let isPlaying = false;


// ================= UTILS =================
function save() {
  localStorage.setItem(playlistKey, JSON.stringify(playlists));
}

// Ensures at least Favorites playlist always exists
function ensureDefaultPlaylist() {
  if (!playlists || playlists.length === 0) {
    playlists = [{
      id: "fav",
      name: "Favorites",
      videos: []
    }];
    save();
  }
}

// read ?open=playlistId
function getQueryPlaylistId() {
  return new URLSearchParams(location.search).get("open");
}


// ================= SIDEBAR =================
function renderSidebar() {
  playlistList.innerHTML = "";

  playlists.forEach(pl => {
    const li = document.createElement("li");
    li.textContent = pl.name;
    li.className = pl.id === activePlaylistId ? "active" : "";
    li.onclick = () => selectPlaylist(pl.id);
    playlistList.appendChild(li);
  });
}

function selectPlaylist(id) {
  activePlaylistId = id;
  stopPlayback();
  selectedIndex = -1;
  renderSidebar();
  renderContent();
}


// ================= NEW PLAYLIST =================
newPlaylistBtn.onclick = () => {
  const name = prompt("Enter playlist name:");
  if (!name || !name.trim()) return;

  const newPl = {
    id: "pl_" + Date.now(),
    name: name.trim(),
    videos: []
  };

  playlists.push(newPl);
  save();

  activePlaylistId = newPl.id;

  renderSidebar();
  renderContent();
};


// ================= FILTER + SORT =================
function getFilteredVideos(pl) {
  let vids = [...(pl.videos || [])];
  const q = searchInput.value.toLowerCase().trim();

  if (q) vids = vids.filter(v => v.title.toLowerCase().includes(q));

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
  currentPlaylist = playlists.find(p => p.id === activePlaylistId);
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
        ${[1,2,3,4,5].map(n =>
          `<option value="${n}" ${video.rating == n ? "selected" : ""}>${"★".repeat(n)}</option>`
        ).join("")}
      </select>

      <button class="delete-song">🗑</button>
    `;

    card.onclick = () => {
      selectedIndex = index;
      renderContent();
    };

    const ratingSelect = card.querySelector(".rating-select");
    ratingSelect.onmousedown = e => e.stopPropagation();
    ratingSelect.onclick = e => e.stopPropagation();
    ratingSelect.onchange = e => {
      e.stopPropagation();
      video.rating = Number(e.target.value);
      save();
      if (sortSelect.value === "rating") renderContent();
    };

    card.querySelector(".delete-song").onclick = e => {
      e.stopPropagation();
      currentPlaylist.videos = currentPlaylist.videos.filter(v => v !== video);
      save();
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
        onReady: e => e.target.playVideo(),
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
deletePlaylistBtn.onclick = () => {
  if (!activePlaylistId) return;

  const pl = playlists.find(p => p.id === activePlaylistId);
  if (!pl) return;

  if (!confirm(`Are you sure you want to delete playlist "${pl.name}"?`)) {
    return;
  }

  playlists = playlists.filter(p => p.id !== activePlaylistId);
  save();

  ensureDefaultPlaylist();   // <— PROTECTIVE FIX

  activePlaylistId = playlists[0].id;

  stopPlayback();
  renderSidebar();
  renderContent();
};


// ================= INIT =================
ensureDefaultPlaylist();

activePlaylistId = getQueryPlaylistId() || playlists[0]?.id || null;

renderSidebar();
renderContent();

(function loadYT() {
  const s = document.createElement("script");
  s.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(s);
})();
