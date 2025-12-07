import { login, fetchMe, clearToken as apiClearToken, setToken } from "./api.js";

export async function initAuth() {
  const loginView = document.getElementById("login-view");
  const appShell = document.getElementById("app-shell");
  const loginForm = document.getElementById("login-form");
  const loginMsg = document.getElementById("login-message");
  const userInfo = document.getElementById("user-info");
  const logoutBtn = document.getElementById("logout-btn");
  const navUsers = document.getElementById("nav-users");

  function showLogin() {
    loginView.classList.remove("hidden");
    appShell.classList.add("hidden");
    loginMsg.textContent = "";
  }

  function showApp(user) {
    loginView.classList.add("hidden");
    appShell.classList.remove("hidden");
    userInfo.textContent = `${user.email} (${user.role})`;
    if (user.role === "admin") {
      navUsers.classList.remove("hidden");
    } else {
      navUsers.classList.add("hidden");
    }
  }

  // Check token actual
  try {
    const me = await fetchMe();
    showApp(me.user);
  } catch {
    showLogin();
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginMsg.textContent = "";
    const email = document.getElementById("login-email").value.trim();
    const pass = document.getElementById("login-password").value.trim();
    if (!email || !pass) {
      loginMsg.textContent = "Completá email y contraseña.";
      return;
    }
    try {
      const data = await login(email, pass);
      setToken(data.token);
      const me = await fetchMe();
      showApp(me.user);
    } catch (err) {
      loginMsg.textContent = err.message || "Error al iniciar sesión.";
    }
  });

  logoutBtn.addEventListener("click", () => {
    apiClearToken();
    showLogin();
  });
}
