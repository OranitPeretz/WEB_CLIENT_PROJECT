const express = require("express");
const fs = require("fs");
const path = require("path");     // ⬅⬅⬅ נוספה השורה שחסרה
const router = express.Router();

const USERS_FILE = path.join(__dirname, "..", "data", "users.json");

function loadUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// REGISTER
router.post("/register", (req, res) => {
  const { username, password, firstName, lastName, imageUrl } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: "Username exists" });
  }

  users.push({
    username,
    password,
    firstName,
    lastName,
    imageUrl,
    createdAt: new Date().toISOString()
  });

  saveUsers(users);

  res.json({ success: true });
});

// LOGIN
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  const users = loadUsers();
  const user = users.find(
    u => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json({ success: true, user });
});

// LOGOUT
router.post("/logout", (req, res) => {
  res.json({ success: true });
});

module.exports = router;
