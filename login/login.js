const form = document.getElementById("loginForm");
const msg = document.getElementById("formMessage");

const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");

function getUsers() {
  return JSON.parse(localStorage.getItem("users")) || [];
}

function setMessage(text, isSuccess = false) {
  msg.textContent = text;
  msg.classList.toggle("success", isSuccess);
}

function clearInvalid() {
  usernameEl.classList.remove("invalid");
  passwordEl.classList.remove("invalid");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  clearInvalid();
  setMessage("");

  const username = usernameEl.value.trim();
  const password = passwordEl.value;

  // Required fields
  if (!username || !password) {
    if (!username) usernameEl.classList.add("invalid");
    if (!password) passwordEl.classList.add("invalid");
    setMessage("Please enter username and password.");
    return;
  }

  // Find user in localStorage.users
  const users = getUsers();
  const user = users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );

  if (!user) {
    usernameEl.classList.add("invalid");
    setMessage("User not found. Please register first.");
    return;
  }

  if (user.password !== password) {
    passwordEl.classList.add("invalid");
    setMessage("Incorrect password. Try again.");
    return;
  }

  // Success: save currentUser in sessionStorage and redirect
  const currentUser = {
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl
  };

  sessionStorage.setItem("currentUser", JSON.stringify(currentUser));
  setMessage("Login successful! Redirecting...", true);

  setTimeout(() => {
    window.location.href = "/search/search.html";
  }, 500);
});
