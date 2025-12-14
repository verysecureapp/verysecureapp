const API = "http://localhost:8000";
let token = null;
let userEmail = null;

const qs = (id) => document.getElementById(id);

// Auth0 config: vul deze in
const AUTH0_DOMAIN = "your-tenant.eu.auth0.com";
const AUTH0_CLIENT_ID = "your_client_id";
const AUTH0_AUDIENCE = "api://otp-messenger";
const AUTH0_REDIRECT_URI = window.location.origin;

function isValidEmail(email) {
  // Basic sanity check; full existence check requires backend/IdP
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function setStatus(id, msg, isError = false) {
  const el = qs(id);
  el.textContent = msg;
  el.classList.toggle("error", isError);
}

function setAuthenticated(email, hasToken) {
  const appSections = qs("app-sections");
  const userPill = qs("user-pill");

  if (hasToken) {
    appSections.hidden = false;
    userPill.textContent = email;
  } else {
    appSections.hidden = true;
    userPill.textContent = "Niet ingelogd";
  }
}

async function register() {
  const email = qs("reg-email").value.trim();
  const password = qs("reg-pass").value;
  if (!isValidEmail(email) || password.length < 12) {
    setStatus("token-status", "Gebruik een geldig email en min. 12 tekens.", true);
    return;
  }
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (res.ok) {
    setStatus("token-status", "Geregistreerd. Log nu in.");
  } else {
    const t = await res.text();
    setStatus("token-status", `Registreren mislukt: ${t}`, true);
  }
}

async function login() {
  const email = qs("log-email").value.trim();
  const password = qs("log-pass").value;
  if (!isValidEmail(email) || !password) {
    setStatus("token-status", "Voer een geldig email en wachtwoord in.", true);
    return;
  }
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (res.ok) {
    const data = await res.json();
    token = data.access_token;
    userEmail = email;
    setAuthenticated(email, true);
    setStatus("token-status", "Ingelogd. Token ontvangen.");
  } else {
    const t = await res.text();
    setStatus("token-status", `Login mislukt: ${t}`, true);
  }
}

async function sendMessage() {
  if (!token) {
    setStatus("send-status", "Login eerst.", true);
    return;
  }
  const recipient_email = qs("msg-recipient").value.trim();
  const plaintext = qs("msg-body").value;
  const note = qs("msg-note").value;
  const res = await fetch(`${API}/messages/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ recipient_email, plaintext, note })
  });
  if (res.ok) {
    const data = await res.json();
    setStatus("send-status", `Verzonden. OTP key (hex): ${data.otp_key_hex}`);
  } else {
    const t = await res.text();
    setStatus("send-status", `Verzenden mislukt: ${t}`, true);
  }
}

function decrypt(cipherHex, keyHex) {
  const cipher = Uint8Array.from(cipherHex.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
  const key = Uint8Array.from(keyHex.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
  const plain = cipher.map((c, i) => c ^ key[i]);
  return new TextDecoder().decode(plain);
}

async function refreshInbox() {
  if (!token) {
    setStatus("token-status", "Login eerst.", true);
    return;
  }
  const res = await fetch(`${API}/messages/inbox`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) {
    const t = await res.text();
    setStatus("token-status", `Inbox mislukt: ${t}`, true);
    return;
  }
  const data = await res.json();
  const inbox = qs("inbox");
  inbox.innerHTML = "";
  if (!data.length) {
    inbox.innerHTML = `<p class="hint">Geen nieuwe berichten.</p>`;
    return;
  }
  data.forEach((msg) => {
    const card = document.createElement("div");
    card.className = "card";
    const plaintext = decrypt(msg.ciphertext_hex, msg.otp_key_hex);
    card.innerHTML = `
      <div><strong>Van:</strong> ${msg.sender_email}</div>
      <div><strong>Note:</strong> ${msg.note || ""}</div>
      <div class="small">Cipher: ${msg.ciphertext_hex}</div>
      <div class="small">OTP key (hex, single-use): ${msg.otp_key_hex}</div>
      <div><strong>Plaintext:</strong> ${plaintext}</div>
    `;
    inbox.appendChild(card);
  });
}

function scrollToAuth() {
  qs("auth").scrollIntoView({ behavior: "smooth" });
}

function oauthPlaceholder() {
  startAuth0Login().catch((err) => {
    console.error(err);
    setStatus("token-status", "OAuth login mislukt: " + err.message, true);
  });
}

setAuthenticated(null, false);
qs("btn-register").addEventListener("click", register);
qs("btn-login").addEventListener("click", login);
qs("btn-send").addEventListener("click", sendMessage);
qs("btn-refresh").addEventListener("click", refreshInbox);
qs("btn-scroll-auth").addEventListener("click", scrollToAuth);
qs("btn-scroll-auth-2").addEventListener("click", scrollToAuth);
qs("btn-oauth").addEventListener("click", oauthPlaceholder);

// --- Auth0 PKCE helpers ---
function createRandomString(length = 64) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let res = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  array.forEach((v) => (res += charset[v % charset.length]));
  return res;
}

async function sha256(buffer) {
  const data = new TextEncoder().encode(buffer);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

function base64UrlEncode(arrayBuffer) {
  let str = btoa(String.fromCharCode.apply(null, Array.from(arrayBuffer)));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function startAuth0Login() {
  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_AUDIENCE) {
    throw new Error("Auth0 configuratie ontbreekt");
  }
  const state = createRandomString(16);
  const codeVerifier = createRandomString(64);
  const codeChallenge = base64UrlEncode(await sha256(codeVerifier));

  sessionStorage.setItem("auth0_state", state);
  sessionStorage.setItem("auth0_verifier", codeVerifier);

  const authUrl = new URL(`https://${AUTH0_DOMAIN}/authorize`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", AUTH0_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", AUTH0_REDIRECT_URI);
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("audience", AUTH0_AUDIENCE);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  window.location = authUrl.toString();
}

async function handleAuth0Callback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (!code) return false;

  const storedState = sessionStorage.getItem("auth0_state");
  const codeVerifier = sessionStorage.getItem("auth0_verifier");
  if (!state || state !== storedState || !codeVerifier) {
    setStatus("token-status", "State/verifier ongeldig.", true);
    return true;
  }

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("client_id", AUTH0_CLIENT_ID);
  body.set("code", code);
  body.set("redirect_uri", AUTH0_REDIRECT_URI);
  body.set("code_verifier", codeVerifier);

  const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    setStatus("token-status", "Token uitwisseling mislukt.", true);
    return true;
  }
  const data = await res.json();
  token = data.access_token;

  // Haal email uit /userinfo
  const userinfo = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (userinfo.ok) {
    const profile = await userinfo.json();
    userEmail = profile.email || profile.name || "user";
    setAuthenticated(userEmail, true);
    setStatus("token-status", "Ingelogd via Auth0.");
  } else {
    setStatus("token-status", "Userinfo ophalen mislukt.", true);
  }

  // Cleanup URL
  window.history.replaceState({}, document.title, window.location.pathname);
  return true;
}

handleAuth0Callback();