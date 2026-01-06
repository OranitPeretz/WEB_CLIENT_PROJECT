// ==================== ELEMENTS ====================
const form = document.getElementById("registerForm");
const msg = document.getElementById("formMessage");

const fields = {
  firstName: document.getElementById("firstName"),
  lastName: document.getElementById("lastName"),
  username: document.getElementById("username"),
  imageUrl: document.getElementById("imageUrl"),
  password: document.getElementById("password"),
  confirmPassword: document.getElementById("confirmPassword"),
};

const avatarPreview = document.getElementById("avatarPreview");

// Username live message
const userLiveMsg = document.getElementById("userLiveMsg");

// Password rule elements
const ruleLetter = document.getElementById("ruleLetter");
const ruleNumber = document.getElementById("ruleNumber");
const ruleSpecial = document.getElementById("ruleSpecial");

const iconLetter = ruleLetter.querySelector(".rule-icon");
const iconNumber = ruleNumber.querySelector(".rule-icon");
const iconSpecial = ruleSpecial.querySelector(".rule-icon");


// ==================== AVATAR PREVIEW ====================
function buildDefaultAvatarUrl(firstName, lastName, username) {
  const safeName =
    (firstName || lastName)
      ? `${firstName} ${lastName}`.trim()
      : (username || "User");

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    safeName
  )}&background=1976d2&color=fff`;
}

function setPreview(url, fallbackUrl) {
  avatarPreview.onerror = () => {
    avatarPreview.onerror = null;
    avatarPreview.src = fallbackUrl;
  };
  avatarPreview.src = url;
}

function refreshPreview() {
  const firstName = fields.firstName.value.trim();
  const lastName = fields.lastName.value.trim();
  const username = fields.username.value.trim();

  const fallback = buildDefaultAvatarUrl(firstName, lastName, username);
  const url = fields.imageUrl.value.trim() || fallback;

  setPreview(url, fallback);
}

["input", "change"].forEach(evt => {
  fields.firstName.addEventListener(evt, refreshPreview);
  fields.lastName.addEventListener(evt, refreshPreview);
  fields.username.addEventListener(evt, refreshPreview);
  fields.imageUrl.addEventListener(evt, refreshPreview);
});

refreshPreview();


// ==================== UI HELPERS ====================
function setMessage(text, isSuccess = false) {
  msg.textContent = text;
  msg.classList.toggle("success", isSuccess);
}

function clearInvalid() {
  Object.values(fields).forEach(el => el.classList.remove("invalid"));
}

function markInvalid(...els) {
  els.forEach(el => el.classList.add("invalid"));
}

function isEmpty(value) {
  return !value || value.trim().length === 0;
}


// ==================== LIVE USERNAME CHECK (SERVER) ====================
fields.username.addEventListener("input", async () => {
  const username = fields.username.value.trim();

  if (!username) {
    userLiveMsg.textContent = "";
    fields.username.classList.remove("invalid");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/auth/check-username?u=" + username);
    const data = await res.json();

    if (!data.available) {
      fields.username.classList.add("invalid");
      userLiveMsg.textContent = "❌ Username is already taken";
      userLiveMsg.classList.remove("good");
      userLiveMsg.classList.add("bad");
    } else {
      fields.username.classList.remove("invalid");
      userLiveMsg.textContent = "✔ Username available";
      userLiveMsg.classList.remove("bad");
      userLiveMsg.classList.add("good");
    }
  } catch (err) {
    console.error(err);
  }
});


// ==================== PASSWORD VALIDATION ====================
function updateRule(isValid, iconElem, ruleElem) {
  if (isValid) {
    iconElem.textContent = "✔";
    ruleElem.classList.add("valid");
  } else {
    iconElem.textContent = "⭕";
    ruleElem.classList.remove("valid");
  }
}

function validatePasswordLive(pwd) {
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

  updateRule(hasLetter, iconLetter, ruleLetter);
  updateRule(hasNumber, iconNumber, ruleNumber);
  updateRule(hasSpecial, iconSpecial, ruleSpecial);

  return hasLetter && hasNumber && hasSpecial;
}

fields.password.addEventListener("input", () => {
  validatePasswordLive(fields.password.value);
});


// ==================== FORM SUBMIT ====================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearInvalid();
  setMessage("");

  const firstName = fields.firstName.value.trim();
  const lastName = fields.lastName.value.trim();
  const username = fields.username.value.trim();
  const imageUrl = fields.imageUrl.value.trim();
  const password = fields.password.value;
  const confirmPassword = fields.confirmPassword.value;

  // CLIENT VALIDATIONS
  const missing = [];
  if (!firstName) missing.push(fields.firstName);
  if (!lastName) missing.push(fields.lastName);
  if (!username) missing.push(fields.username);
  if (!password) missing.push(fields.password);
  if (!confirmPassword) missing.push(fields.confirmPassword);

  if (missing.length > 0) {
    markInvalid(...missing);
    setMessage("All fields except image URL are required.");
    return;
  }

  if (!validatePasswordLive(password)) {
    markInvalid(fields.password);
    setMessage("Password does not meet all required rules.");
    return;
  }

  if (password !== confirmPassword) {
    markInvalid(fields.password, fields.confirmPassword);
    setMessage("Passwords do not match.");
    return;
  }

  // SEND TO SERVER
  try {
    const res = await fetch("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        firstName,
        lastName,
        imageUrl
      })
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Registration failed.");
      fields.username.classList.add("invalid");
      return;
    }

    // SUCCESS
    setMessage("Registration successful! Redirecting...", true);

    setTimeout(() => {
      window.location.href = "../login/login.html";
    }, 600);

  } catch (err) {
    console.error(err);
    setMessage("Server error. Please try again.");
  }
});
