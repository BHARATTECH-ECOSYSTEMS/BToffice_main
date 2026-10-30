const authView = document.querySelector("#auth-view");
const dashboardView = document.querySelector("#dashboard-view");

const state = {
  user: null,
  today: null,
  history: [],
};

function formatTime(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function updateFeedback(element, message, variant = "") {
  element.className = `feedback${variant ? ` ${variant}` : ""}`;
  element.textContent = message ?? "";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    credentials: "same-origin",
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data;
}

function renderLogin() {
  authView.innerHTML = `
    <div>
      <h2>Sign in</h2>
      <p class="panel-subtitle">Login is required before an employee can register a shift.</p>
    </div>
    <form id="login-form" class="form-grid">
      <div class="field">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" autocomplete="username" value="admin@company.com" required />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" value="admin123" required />
      </div>
      <div class="button-row">
        <button class="button-primary" type="submit">Login</button>
      </div>
      <p id="login-feedback" class="feedback"></p>
    </form>
  `;

  const form = document.querySelector("#login-form");
  const feedback = document.querySelector("#login-feedback");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    updateFeedback(feedback, "Signing in...");

    try {
      const payload = {
        email: formData.get("email"),
        password: formData.get("password"),
      };
      const result = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      state.user = result.user;
      updateFeedback(feedback, "Login successful.", "success");
      await refreshDashboard();
    } catch (error) {
      updateFeedback(feedback, error.message, "error");
    }
  });
}

function renderDashboard() {
  authView.classList.add("hidden");
  dashboardView.classList.remove("hidden");

  const today = state.today ?? {
    date: new Date().toISOString().slice(0, 10),
    punchedInAt: null,
    punchedOutAt: null,
    status: "not-started",
    totalHours: 0,
  };

  dashboardView.innerHTML = `
    <div class="dashboard-header">
      <div>
        <p class="eyebrow">Logged in as</p>
        <h2>${state.user.name}</h2>
        <p>${state.user.email}</p>
      </div>
      <div class="button-row">
        <button id="punch-in-button" class="button-primary" ${today.punchedInAt ? "disabled" : ""}>Punch In</button>
        <button id="punch-out-button" class="button-secondary" ${!today.punchedInAt || today.punchedOutAt ? "disabled" : ""}>Punch Out</button>
        <button id="logout-button" class="button-secondary">Logout</button>
      </div>
    </div>

    <div class="dashboard-layout">
      <div class="status-grid">
        <article class="metric-card">
          <p class="metric-label">Status</p>
          <p class="metric-value status-${today.status}">${today.status.replace("-", " ")}</p>
        </article>
        <article class="metric-card">
          <p class="metric-label">Punch In</p>
          <p class="metric-value">${formatTime(today.punchedInAt)}</p>
        </article>
        <article class="metric-card">
          <p class="metric-label">Punch Out</p>
          <p class="metric-value">${formatTime(today.punchedOutAt)}</p>
        </article>
      </div>

      <article class="metric-card">
        <p class="metric-label">Hours Logged Today</p>
        <p class="metric-value">${today.totalHours.toFixed(2)} hrs</p>
      </article>

      <article class="history-card">
        <h2>Attendance history</h2>
        <p class="muted">Recent shift records for this account.</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Punch In</th>
              <th>Punch Out</th>
              <th>Status</th>
              <th>Hours</th>
            </tr>
          </thead>
          <tbody>
            ${state.history.map((entry) => `
              <tr>
                <td>${formatDate(`${entry.date}T00:00:00`)}</td>
                <td>${formatTime(entry.punchInAt)}</td>
                <td>${formatTime(entry.punchOutAt)}</td>
                <td>${entry.status.replace("-", " ")}</td>
                <td>${entry.totalHours.toFixed(2)}</td>
              </tr>
            `).join("") || `
              <tr>
                <td colspan="5">No attendance records yet.</td>
              </tr>
            `}
          </tbody>
        </table>
      </article>

      <p id="dashboard-feedback" class="feedback"></p>
    </div>
  `;

  const dashboardFeedback = document.querySelector("#dashboard-feedback");
  const punchInButton = document.querySelector("#punch-in-button");
  const punchOutButton = document.querySelector("#punch-out-button");
  const logoutButton = document.querySelector("#logout-button");

  punchInButton.addEventListener("click", async () => {
    updateFeedback(dashboardFeedback, "Registering punch in...");
    try {
      await api("/api/attendance/punch-in", {
        method: "POST",
        body: JSON.stringify({}),
      });
      updateFeedback(dashboardFeedback, "Punch in recorded.", "success");
      await refreshDashboard();
    } catch (error) {
      updateFeedback(dashboardFeedback, error.message, "error");
    }
  });

  punchOutButton.addEventListener("click", async () => {
    updateFeedback(dashboardFeedback, "Registering punch out...");
    try {
      await api("/api/attendance/punch-out", {
        method: "POST",
        body: JSON.stringify({}),
      });
      updateFeedback(dashboardFeedback, "Punch out recorded.", "success");
      await refreshDashboard();
    } catch (error) {
      updateFeedback(dashboardFeedback, error.message, "error");
    }
  });

  logoutButton.addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
    state.user = null;
    state.today = null;
    state.history = [];
    dashboardView.classList.add("hidden");
    authView.classList.remove("hidden");
    renderLogin();
  });
}

async function refreshDashboard() {
  const [todayResponse, historyResponse] = await Promise.all([
    api("/api/attendance/today"),
    api("/api/attendance/history"),
  ]);

  state.user = todayResponse.user;
  state.today = todayResponse.today;
  state.history = historyResponse.history;
  renderDashboard();
}

async function boot() {
  renderLogin();
  const session = await api("/api/auth/session");
  if (session.user) {
    state.user = session.user;
    await refreshDashboard();
  }
}

boot().catch((error) => {
  authView.innerHTML = `
    <h2>App failed to load</h2>
    <p class="feedback error">${error.message}</p>
  `;
});
