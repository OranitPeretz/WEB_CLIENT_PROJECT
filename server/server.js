const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

// Allow JSON and Form-Data
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- ROUTES ---
const authRoutes = require("./routes/auth");
const playlistRoutes = require("./routes/playlists");

app.use("/api/auth", authRoutes);
app.use("/api/playlists", playlistRoutes);

// --- STATIC FILES ---
// Serves index/, login/, playlists/, search/, register/ folders
app.use(express.static(path.join(__dirname, "..")));

// --- START SERVER ---
app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
