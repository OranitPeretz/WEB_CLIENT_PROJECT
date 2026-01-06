const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Folder: server/data/playlists/
const DATA_DIR = path.join(__dirname, "..", "data", "playlists");

// Make sure folder exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getUserFile(username) {
    return path.join(DATA_DIR, `playlists_${username}.json`);
}

function loadPlaylists(username) {
    const file = getUserFile(username);

    if (!fs.existsSync(file)) {
        const defaultPL = [
            { id: "fav", name: "Favorites", videos: [] }
        ];
        fs.writeFileSync(file, JSON.stringify(defaultPL, null, 2));
        return defaultPL;
    }

    return JSON.parse(fs.readFileSync(file, "utf8"));
}

function savePlaylists(username, playlists) {
    const file = getUserFile(username);
    fs.writeFileSync(file, JSON.stringify(playlists, null, 2));
}

/* ======================================================
   ➤ 1) ADD PLAYLIST  (must appear BEFORE the general route)
====================================================== */
router.post("/:username/addPlaylist", (req, res) => {
    const { username } = req.params;
    const { id, name } = req.body;

    const playlists = loadPlaylists(username);

    playlists.push({ id, name, videos: [] });
    savePlaylists(username, playlists);

    res.json({ success: true });
});

/* ======================================================
   ➤ 2) ADD VIDEO
====================================================== */
router.post("/:username/add", (req, res) => {
    const { username } = req.params;
    const { playlistId, video } = req.body;

    const playlists = loadPlaylists(username);
    const pl = playlists.find(p => p.id === playlistId);

    if (!pl) return res.status(404).json({ error: "Playlist not found" });

    pl.videos.push(video);

    savePlaylists(username, playlists);
    res.json({ success: true });
});

/* ======================================================
   ➤ 3) DELETE VIDEO
====================================================== */
router.post("/:username/deleteVideo", (req, res) => {
    const { username } = req.params;
    const { playlistId, videoId } = req.body;

    const playlists = loadPlaylists(username);
    const pl = playlists.find(p => p.id === playlistId);

    if (!pl) return res.status(404).json({ error: "Playlist not found" });

    pl.videos = pl.videos.filter(v => v.videoId !== videoId);

    savePlaylists(username, playlists);
    res.json({ success: true });
});

/* ======================================================
   ➤ 4) DELETE PLAYLIST
====================================================== */
router.post("/:username/deletePlaylist", (req, res) => {
    const { username } = req.params;
    const { playlistId } = req.body;

    let playlists = loadPlaylists(username);

    playlists = playlists.filter(p => p.id !== playlistId);

    if (playlists.length === 0) {
        playlists = [{ id: "fav", name: "Favorites", videos: [] }];
    }

    savePlaylists(username, playlists);
    res.json({ success: true });
});

/* ======================================================
   ➤ 5) SAVE ALL PLAYLISTS  (POST /:username)
====================================================== */
router.post("/:username", (req, res) => {
    const { username } = req.params;
    const playlists = req.body;

    savePlaylists(username, playlists);

    res.json({ success: true });
});

/* ======================================================
   ➤ 6) GET ALL PLAYLISTS  (GET /:username)
   MUST BE LAST, otherwise it catches everything.
====================================================== */
router.get("/:username", (req, res) => {
    const username = req.params.username;
    const playlists = loadPlaylists(username);
    res.json(playlists);
});

module.exports = router;
