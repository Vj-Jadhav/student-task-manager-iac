/**
 * Student Task Manager - Client Application Logic
 * Communicates with the Serverless Cloudflare Worker REST API & Workers KV
 */

(() => {
  // DOM References
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");

  const metricTotal = document.getElementById("metric-total");
  const metricPending = document.getElementById("metric-pending");
  const metricProgress = document.getElementById("metric-progress");
  const metricCompleted = document.getElementById("metric-completed");

  const alertBanner = document.getElementById("alert-banner");
  const alertIcon = document.getElementById("alert-icon");
  const alertMessage = document.getElementById("alert-message");
  const btnCloseAlert = document.getElementById("btn-close-alert");

  const taskForm = document.getElementById("task-form");
  const formHeading = document.getElementById("form-heading");
  const taskIdInput = document.getElementById("task-id");
  const taskTitleInput = document.getElementById("task-title");
  const taskPriorityInput = document.getElementById("task-priority");
  const taskStatusInput = document.getElementById("task-status");
  const btnSubmitTask = document.getElementById("btn-submit-task");
  const btnSubmitLabel = document.getElementById("btn-submit-label");
  const btnSpinner = document.getElementById("btn-spinner");
  const btnCancelEdit = document.getElementById("btn-cancel-edit");

  const searchInput = document.getElementById("search-input");
  const filterStatus = document.getElementById("filter-status");
  const filterPriority = document.getElementById("filter-priority");
  const btnRefreshTasks = document.getElementById("btn-refresh-tasks");

  const loadingState = document.getElementById("loading-state");
  const tasksContainer = document.getElementById("tasks-container");
  const taskCountPill = document.getElementById("task-count-pill");
  const emptyState = document.getElementById("empty-state");
  const toastContainer = document.getElementById("toast-container");

  // Application State
  let tasks = [];
  let isApiOnline = false;

  // Resolve API Base URL:
  // When served by the worker, window.location.origin is the worker itself, so relative "/api" works out-of-the-box.
  // If running locally via file:// or localhost, it allows fallback to localStorage configuration.
  const isLocalStatic = window.location.protocol === "file:" || 
                        window.location.hostname === "localhost" || 
                        window.location.hostname === "127.0.0.1";
  
  let apiBase = isLocalStatic ? (localStorage.getItem("stm_custom_api_url") || "") : "";

  // --------------------------------------------------------------------------
  // Notifications: Toast and Banner Alerts
  // --------------------------------------------------------------------------
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icon = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function showAlert(message, type = "info") {
    alertBanner.className = `alert-banner alert-${type}`;
    alertIcon.textContent = type === "success" ? "✅" : type === "error" ? "⚠️" : "ℹ️";
    alertMessage.textContent = message;
    alertBanner.style.display = "flex";
  }

  function hideAlert() {
    alertBanner.style.display = "none";
  }

  btnCloseAlert?.addEventListener("click", hideAlert);

  // --------------------------------------------------------------------------
  // Connectivity & Health Check
  // --------------------------------------------------------------------------
  async function checkHealth() {
    updateConnectionBadge("connecting", "Connecting to Edge...");
    try {
      const endpoint = `${apiBase}/api/health`;
      const res = await fetch(endpoint, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (res.ok) {
        const data = await res.json();
        isApiOnline = true;
        updateConnectionBadge("online", `Edge Active (${data.environment || "dev"})`);
      } else {
        isApiOnline = false;
        updateConnectionBadge("offline", `API Error (${res.status})`);
      }
    } catch (err) {
      isApiOnline = false;
      updateConnectionBadge("offline", "Edge Offline / Local");
    }
  }

  function updateConnectionBadge(state, text) {
    statusDot.className = `status-dot ${state}`;
    statusText.textContent = text;
  }

  // --------------------------------------------------------------------------
  // REST API Operations (Cloudflare Workers KV)
  // --------------------------------------------------------------------------
  async function fetchTasks() {
    loadingState.style.display = "flex";
    tasksContainer.style.display = "none";
    emptyState.style.display = "none";

    try {
      const endpoint = `${apiBase}/api/tasks`;
      const res = await fetch(endpoint, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (!res.ok) {
        throw new Error(`Failed to load tasks (HTTP ${res.status})`);
      }

      const data = await res.json();
      // Supports array format or { tasks: [...] } format
      tasks = Array.isArray(data) ? data : (data.tasks || []);
      renderTasks();
      updateMetrics();
      hideAlert();
    } catch (err) {
      console.error("fetchTasks error:", err);
      showAlert(`Could not connect to Cloudflare Worker API: ${err.message}`, "error");
      renderTasks();
      updateMetrics();
    } finally {
      loadingState.style.display = "none";
      tasksContainer.style.display = "flex";
    }
  }

  async function createTask(payload) {
    setSubmitting(true, "Adding Task...");
    try {
      const endpoint = `${apiBase}/api/tasks`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || result.error || `HTTP ${res.status}`);
      }

      showToast("Task created successfully in Cloudflare Workers KV!", "success");
      resetForm();
      await fetchTasks();
    } catch (err) {
      showAlert(`Create Task Failed: ${err.message}`, "error");
      showToast(err.message, "error");
    } finally {
      setSubmitting(false, "Add Task");
    }
  }

  async function updateTask(id, payload) {
    setSubmitting(true, "Updating Task...");
    try {
      const endpoint = `${apiBase}/api/tasks/${encodeURIComponent(id)}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || result.error || `HTTP ${res.status}`);
      }

      showToast("Task updated successfully!", "success");
      resetForm();
      await fetchTasks();
    } catch (err) {
      showAlert(`Update Task Failed: ${err.message}`, "error");
      showToast(err.message, "error");
    } finally {
      setSubmitting(false, "Add Task");
    }
  }

  async function updateTaskStatusInline(task, newStatus) {
    try {
      const endpoint = `${apiBase}/api/tasks/${encodeURIComponent(task.id)}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Status update failed (${res.status})`);
      }

      showToast(`Task status updated to '${newStatus}'`, "success");
      task.status = newStatus;
      renderTasks();
      updateMetrics();
    } catch (err) {
      showToast(`Update Failed: ${err.message}`, "error");
      await fetchTasks();
    }
  }

  async function deleteTask(id, title) {
    if (!confirm(`Are you sure you want to delete task "${title}"?`)) {
      return;
    }

    try {
      const endpoint = `${apiBase}/api/tasks/${encodeURIComponent(id)}`;
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Accept": "application/json" }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Delete failed with status ${res.status}`);
      }

      showToast("Task deleted from Cloudflare KV", "info");
      tasks = tasks.filter(t => t.id !== id);
      renderTasks();
      updateMetrics();
    } catch (err) {
      showAlert(`Delete Failed: ${err.message}`, "error");
      showToast(err.message, "error");
    }
  }

  // --------------------------------------------------------------------------
  // Form State & Helpers
  // --------------------------------------------------------------------------
  function setSubmitting(isSubmitting, label) {
    btnSubmitTask.disabled = isSubmitting;
    btnSubmitLabel.textContent = label;
    btnSpinner.style.display = isSubmitting ? "inline-block" : "none";
  }

  function startEditTask(task) {
    taskIdInput.value = task.id;
    taskTitleInput.value = task.title;
    taskPriorityInput.value = task.priority;
    taskStatusInput.value = task.status;

    formHeading.textContent = "Edit Student Task";
    btnSubmitLabel.textContent = "Update Task";
    btnCancelEdit.style.display = "inline-block";

    taskTitleInput.focus();
    taskForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetForm() {
    taskIdInput.value = "";
    taskForm.reset();
    formHeading.textContent = "Create Student Task";
    btnSubmitLabel.textContent = "Add Task";
    btnCancelEdit.style.display = "none";
  }

  btnCancelEdit?.addEventListener("click", resetForm);

  // --------------------------------------------------------------------------
  // Rendering & UI State
  // --------------------------------------------------------------------------
  function renderTasks() {
    const query = searchInput.value.trim().toLowerCase();
    const statusVal = filterStatus.value;
    const priorityVal = filterPriority.value;

    const filtered = tasks.filter(task => {
      const matchesSearch = !query || 
        (task.title && task.title.toLowerCase().includes(query)) ||
        (task.id && task.id.toLowerCase().includes(query));

      const matchesStatus = statusVal === "ALL" || task.status === statusVal;
      const matchesPriority = priorityVal === "ALL" || task.priority === priorityVal;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    taskCountPill.textContent = `${filtered.length} of ${tasks.length} tasks`;

    if (filtered.length === 0) {
      tasksContainer.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";
    tasksContainer.innerHTML = filtered.map(t => createTaskCardHtml(t)).join("");

    // Attach Event Listeners to Dynamically Created Cards
    filtered.forEach(task => {
      const card = document.getElementById(`task-card-${task.id}`);
      if (!card) return;

      // Status inline select
      const statusSelect = card.querySelector(".status-select-inline");
      statusSelect?.addEventListener("change", (e) => {
        updateTaskStatusInline(task, e.target.value);
      });

      // Edit Button
      const btnEdit = card.querySelector(".btn-edit");
      btnEdit?.addEventListener("click", () => startEditTask(task));

      // Delete Button
      const btnDelete = card.querySelector(".btn-delete");
      btnDelete?.addEventListener("click", () => deleteTask(task.id, task.title));

      // Copy ID Badge
      const idBadge = card.querySelector(".task-id-badge");
      idBadge?.addEventListener("click", () => {
        navigator.clipboard.writeText(task.id).then(() => {
          showToast(`Copied Task ID: ${task.id}`, "info");
        });
      });
    });
  }

  function createTaskCardHtml(task) {
    const formattedDate = formatDateTime(task.createdAt);

    return `
      <article class="task-card status-${escapeHtml(task.status)}" id="task-card-${escapeHtml(task.id)}">
        <div class="task-card-header">
          <div class="task-meta-left">
            <span class="task-id-badge" title="Click to copy Task ID">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              ${escapeHtml(task.id)}
            </span>
            <span class="priority-pill priority-${escapeHtml(task.priority)}">
              ${escapeHtml(task.priority)}
            </span>
          </div>

          <!-- Inline Status Selector -->
          <div class="task-status-control">
            <select class="status-select-inline" aria-label="Change status for ${escapeHtml(task.title)}">
              <option value="Pending" ${task.status === "Pending" ? "selected" : ""}>⏳ Pending</option>
              <option value="In Progress" ${task.status === "In Progress" ? "selected" : ""}>🚀 In Progress</option>
              <option value="Completed" ${task.status === "Completed" ? "selected" : ""}>✅ Completed</option>
            </select>
          </div>
        </div>

        <h3 class="task-title">${escapeHtml(task.title)}</h3>

        <div class="task-card-footer">
          <div class="task-creation-date">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Created: ${escapeHtml(formattedDate)}</span>
          </div>

          <div class="task-card-actions">
            <button type="button" class="btn-icon btn-edit" title="Edit Task" aria-label="Edit Task">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button type="button" class="btn-icon btn-delete" title="Delete Task" aria-label="Delete Task">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function updateMetrics() {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === "Pending").length;
    const progress = tasks.filter(t => t.status === "In Progress").length;
    const completed = tasks.filter(t => t.status === "Completed").length;

    metricTotal.textContent = total;
    metricPending.textContent = pending;
    metricProgress.textContent = progress;
    metricCompleted.textContent = completed;
  }

  function formatDateTime(isoString) {
    if (!isoString) return "N/A";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoString;
    }
  }

  function escapeHtml(str) {
    if (str === undefined || str === null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------
  taskForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = taskTitleInput.value.trim();
    const priority = taskPriorityInput.value;
    const status = taskStatusInput.value;

    if (!title) {
      showAlert("Task title is required.", "error");
      taskTitleInput.focus();
      return;
    }

    const payload = { title, priority, status };
    const editingId = taskIdInput.value;

    if (editingId) {
      updateTask(editingId, payload);
    } else {
      createTask(payload);
    }
  });

  searchInput.addEventListener("input", renderTasks);
  filterStatus.addEventListener("change", renderTasks);
  filterPriority.addEventListener("change", renderTasks);

  btnRefreshTasks.addEventListener("click", () => {
    showToast("Refreshing tasks from Edge...", "info");
    checkHealth();
    fetchTasks();
  });

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------
  checkHealth();
  fetchTasks();
})();
