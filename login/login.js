// ==================== ELEMENTS ====================
const form = document.getElementById("loginForm");
const msg = document.getElementById("formMessage");

const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");


// ==================== UI HELPERS ====================
function setMessage(text, isSuccess = false) {
  msg.textContent = text;
  msg.classList.toggle("success", isSuccess);
}

function clearInvalid() {
  usernameEl.classList.remove("invalid");
  passwordEl.classList.remove("invalid");
}


// ==================== FORM SUBMIT ====================
form.addEventListener("submit", async (e) => {
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

  // ==================== CALL SERVER API ====================
  try {
    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      // Server rejected login
      setMessage(data.error || "Login failed.");
      
      if (data.error?.includes("not found")) {
        usernameEl.classList.add("invalid");
      }

      if (data.error?.includes("Incorrect")) {
        passwordEl.classList.add("invalid");
      }

      return;
    }

    // ==================== SUCCESS ====================
    setMessage("Login successful! Redirecting...", true);

    // Save logged user in session storage
    sessionStorage.setItem("currentUser", JSON.stringify(data.user));

    // Redirect to search page
    setTimeout(() => {
      window.location.href = "../search/search.html";
    }, 800);

  } catch (err) {
    console.error(err);
    setMessage("Server error – unable to connect.");
  }
});
