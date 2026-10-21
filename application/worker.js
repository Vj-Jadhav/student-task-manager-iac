/**
 * Serverless Student Task Management Application
 * Runtime: Cloudflare Workers (ES Module syntax)
 * Storage: Cloudflare Workers KV (bound as env.TASKS_KV)
 *
 * Features:
 *   - Serves Static Web Frontend (HTML, CSS, JS) directly from edge memory
 *   - RESTful Task Management API (/api/tasks, /api/tasks/:id, /api/health)
 *   - KV persistence, input validation, and HTTP status codes
 */

// Embedded Static Frontend Assets (Single-Worker Fullstack Deployment)
const HTML_CONTENT = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Student Task Manager | Serverless & Terraform</title>\n  <meta name=\"description\" content=\"Serverless Student Task Management Application deployed on Cloudflare Workers and Workers KV using Terraform IaC.\">\n  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n  <link href=\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap\" rel=\"stylesheet\">\n  <link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body>\n  <!-- Ambient Background Glows -->\n  <div class=\"bg-glow bg-glow-1\"></div>\n  <div class=\"bg-glow bg-glow-2\"></div>\n\n  <div class=\"app-container\">\n    <!-- Header -->\n    <header class=\"app-header\">\n      <div class=\"header-left\">\n        <div class=\"logo-icon\">\n          <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\">\n            <path d=\"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5\"/>\n          </svg>\n        </div>\n        <div>\n          <h1 id=\"app-title\">Student Task Manager</h1>\n          <div class=\"header-subtitle\">\n            <span class=\"badge badge-tech\">Cloudflare Workers</span>\n            <span class=\"badge badge-tech\">Workers KV</span>\n            <span class=\"badge badge-tech\">Terraform IaC</span>\n          </div>\n        </div>\n      </div>\n      <div class=\"header-right\">\n        <div class=\"api-status-badge\" id=\"api-status-badge\" title=\"Edge API Connectivity\">\n          <span class=\"status-dot\" id=\"status-dot\"></span>\n          <span id=\"status-text\">Checking API...</span>\n        </div>\n      </div>\n    </header>\n\n    <!-- Metrics Overview -->\n    <section class=\"metrics-grid\" id=\"metrics-section\" aria-label=\"Task Statistics\">\n      <div class=\"metric-card\">\n        <div class=\"metric-header\">\n          <span class=\"metric-label\">Total Tasks</span>\n          <span class=\"metric-icon\">📋</span>\n        </div>\n        <div class=\"metric-value\" id=\"metric-total\">0</div>\n      </div>\n      <div class=\"metric-card\">\n        <div class=\"metric-header\">\n          <span class=\"metric-label\">Pending</span>\n          <span class=\"metric-icon\">⏳</span>\n        </div>\n        <div class=\"metric-value metric-pending\" id=\"metric-pending\">0</div>\n      </div>\n      <div class=\"metric-card\">\n        <div class=\"metric-header\">\n          <span class=\"metric-label\">In Progress</span>\n          <span class=\"metric-icon\">⚡</span>\n        </div>\n        <div class=\"metric-value metric-progress\" id=\"metric-progress\">0</div>\n      </div>\n      <div class=\"metric-card\">\n        <div class=\"metric-header\">\n          <span class=\"metric-label\">Completed</span>\n          <span class=\"metric-icon\">✅</span>\n        </div>\n        <div class=\"metric-value metric-completed\" id=\"metric-completed\">0</div>\n      </div>\n    </section>\n\n    <!-- Notification / Alert Banner -->\n    <div class=\"alert-banner\" id=\"alert-banner\" style=\"display: none;\" role=\"alert\">\n      <span class=\"alert-icon\" id=\"alert-icon\">ℹ️</span>\n      <span class=\"alert-message\" id=\"alert-message\"></span>\n      <button type=\"button\" class=\"btn-close-alert\" id=\"btn-close-alert\" aria-label=\"Close notification\">&times;</button>\n    </div>\n\n    <!-- Main Workspace Layout -->\n    <main class=\"main-layout\">\n      <!-- Task Creation / Update Form Card -->\n      <section class=\"card form-card\" id=\"task-form-section\">\n        <div class=\"card-header\">\n          <h2 id=\"form-heading\">Create Student Task</h2>\n          <button type=\"button\" class=\"btn-text\" id=\"btn-cancel-edit\" style=\"display: none;\">Cancel Edit</button>\n        </div>\n\n        <form id=\"task-form\" autocomplete=\"off\">\n          <input type=\"hidden\" id=\"task-id\">\n\n          <!-- Task Title -->\n          <div class=\"form-group\">\n            <label for=\"task-title\">Task Title <span class=\"required\">*</span></label>\n            <input \n              type=\"text\" \n              id=\"task-title\" \n              class=\"form-control\" \n              placeholder=\"e.g., Complete Terraform Infrastructure Lab\" \n              required \n              maxlength=\"150\"\n            />\n          </div>\n\n          <!-- Priority & Status Row -->\n          <div class=\"form-row\">\n            <div class=\"form-group\">\n              <label for=\"task-priority\">Priority <span class=\"required\">*</span></label>\n              <select id=\"task-priority\" class=\"form-control\" required>\n                <option value=\"High\">🔥 High</option>\n                <option value=\"Medium\" selected>⚡ Medium</option>\n                <option value=\"Low\">🌱 Low</option>\n              </select>\n            </div>\n\n            <div class=\"form-group\">\n              <label for=\"task-status\">Status <span class=\"required\">*</span></label>\n              <select id=\"task-status\" class=\"form-control\" required>\n                <option value=\"Pending\" selected>⏳ Pending</option>\n                <option value=\"In Progress\">🚀 In Progress</option>\n                <option value=\"Completed\">✅ Completed</option>\n              </select>\n            </div>\n          </div>\n\n          <!-- Actions -->\n          <div class=\"form-actions\">\n            <button type=\"submit\" class=\"btn btn-primary btn-block\" id=\"btn-submit-task\">\n              <span class=\"spinner\" id=\"btn-spinner\" style=\"display: none;\"></span>\n              <span id=\"btn-submit-label\">Add Task</span>\n            </button>\n          </div>\n        </form>\n      </section>\n\n      <!-- Task Inventory List Card -->\n      <section class=\"card tasks-card\" id=\"tasks-list-section\">\n        <div class=\"card-header task-list-header\">\n          <div class=\"header-with-count\">\n            <h2>Task Inventory</h2>\n            <span class=\"task-count-pill\" id=\"task-count-pill\">0 tasks</span>\n          </div>\n          <button type=\"button\" class=\"btn btn-outline btn-sm\" id=\"btn-refresh-tasks\" title=\"Reload tasks from Workers KV\">\n            <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\">\n              <polyline points=\"23 4 23 10 17 10\"></polyline>\n              <path d=\"M20.49 15a9 9 0 1 1-2.12-9.36L23 10\"></path>\n            </svg>\n            <span>Refresh</span>\n          </button>\n        </div>\n\n        <!-- Filter & Search Toolbar -->\n        <div class=\"toolbar\" id=\"tasks-toolbar\">\n          <div class=\"search-box\">\n            <svg class=\"search-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\">\n              <circle cx=\"11\" cy=\"11\" r=\"8\"></circle>\n              <line x1=\"21\" y1=\"21\" x2=\"16.65\" y2=\"16.65\"></line>\n            </svg>\n            <input \n              type=\"text\" \n              id=\"search-input\" \n              class=\"form-control search-input\" \n              placeholder=\"Search by title or Task ID...\"\n              aria-label=\"Search Tasks\"\n            />\n          </div>\n\n          <div class=\"filters-row\">\n            <select id=\"filter-status\" class=\"form-control filter-select\" aria-label=\"Filter by Status\">\n              <option value=\"ALL\">All Statuses</option>\n              <option value=\"Pending\">Pending</option>\n              <option value=\"In Progress\">In Progress</option>\n              <option value=\"Completed\">Completed</option>\n            </select>\n\n            <select id=\"filter-priority\" class=\"form-control filter-select\" aria-label=\"Filter by Priority\">\n              <option value=\"ALL\">All Priorities</option>\n              <option value=\"High\">High</option>\n              <option value=\"Medium\">Medium</option>\n              <option value=\"Low\">Low</option>\n            </select>\n          </div>\n        </div>\n\n        <!-- Loading State Indicator -->\n        <div class=\"loading-state\" id=\"loading-state\" style=\"display: none;\">\n          <div class=\"spinner-large\"></div>\n          <p>Fetching tasks from Cloudflare Workers KV...</p>\n        </div>\n\n        <!-- Task Items Container -->\n        <div class=\"tasks-container\" id=\"tasks-container\">\n          <!-- Dynamically populated by script.js -->\n        </div>\n\n        <!-- Empty State -->\n        <div class=\"empty-state\" id=\"empty-state\" style=\"display: none;\">\n          <div class=\"empty-icon\">📝</div>\n          <h3>No Student Tasks Found</h3>\n          <p id=\"empty-state-msg\">No tasks match your active filters. Add a task using the form on the left!</p>\n        </div>\n      </section>\n    </main>\n\n    <!-- Footer -->\n    <footer class=\"app-footer\">\n      <p>Automated Deployment of a Serverless Student Task Management Application Using Terraform</p>\n      <div class=\"footer-meta\">\n        <span>Cloudflare Workers Edge API</span> &bull; \n        <span>Workers KV Storage (TASKS_KV)</span> &bull; \n        <span>HashiCorp Terraform</span>\n      </div>\n    </footer>\n  </div>\n\n  <!-- Toast Notification Container -->\n  <div class=\"toast-container\" id=\"toast-container\" aria-live=\"polite\"></div>\n\n  <script src=\"script.js\"></script>\n</body>\n</html>\n";
const CSS_CONTENT = "/* ==============================================================================\n   Student Task Manager - Modern Design System (Vanilla CSS)\n   Edge Serverless Theme: Dark Mode / Glassmorphism / Vibrant Accents\n   ============================================================================== */\n\n:root {\n  --font-main: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n  --font-mono: 'JetBrains Mono', monospace;\n\n  /* Color Palette */\n  --bg-base: #090d16;\n  --bg-card: rgba(18, 24, 39, 0.75);\n  --bg-card-hover: rgba(26, 34, 54, 0.85);\n  --bg-input: rgba(12, 17, 29, 0.9);\n\n  --border-subtle: rgba(255, 255, 255, 0.08);\n  --border-hover: rgba(255, 255, 255, 0.16);\n  --border-focus: #6366f1;\n\n  --text-main: #f8fafc;\n  --text-muted: #94a3b8;\n  --text-dim: #64748b;\n\n  /* Accents & States */\n  --primary: #6366f1;\n  --primary-glow: rgba(99, 102, 241, 0.35);\n  --primary-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);\n\n  --rose: #f43f5e;\n  --rose-bg: rgba(244, 63, 94, 0.12);\n  --rose-border: rgba(244, 63, 94, 0.3);\n\n  --amber: #f59e0b;\n  --amber-bg: rgba(245, 158, 11, 0.12);\n  --amber-border: rgba(245, 158, 11, 0.3);\n\n  --emerald: #10b981;\n  --emerald-bg: rgba(16, 185, 129, 0.12);\n  --emerald-border: rgba(16, 185, 129, 0.3);\n\n  --cyan: #06b6d4;\n  --cyan-bg: rgba(6, 182, 212, 0.12);\n  --cyan-border: rgba(6, 182, 212, 0.3);\n\n  /* Radius & Shadows */\n  --radius-sm: 8px;\n  --radius-md: 12px;\n  --radius-lg: 16px;\n  --radius-full: 9999px;\n\n  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.35);\n  --shadow-md: 0 10px 30px -5px rgba(0, 0, 0, 0.5);\n  --shadow-glow: 0 0 25px rgba(99, 102, 241, 0.25);\n\n  --transition-fast: 0.15s ease;\n  --transition-normal: 0.25s ease;\n}\n\n* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\nbody {\n  font-family: var(--font-main);\n  background-color: var(--bg-base);\n  color: var(--text-main);\n  min-height: 100vh;\n  position: relative;\n  overflow-x: hidden;\n  line-height: 1.5;\n  -webkit-font-smoothing: antialiased;\n}\n\n/* Atmospheric Ambient Background */\n.bg-glow {\n  position: fixed;\n  border-radius: 50%;\n  filter: blur(130px);\n  pointer-events: none;\n  z-index: 0;\n  opacity: 0.45;\n}\n.bg-glow-1 {\n  width: 520px;\n  height: 520px;\n  background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%);\n  top: -160px;\n  left: 8%;\n}\n.bg-glow-2 {\n  width: 480px;\n  height: 480px;\n  background: radial-gradient(circle, rgba(139, 92, 246, 0.22) 0%, transparent 70%);\n  bottom: 4%;\n  right: 6%;\n}\n\n/* App Container */\n.app-container {\n  max-width: 1220px;\n  margin: 0 auto;\n  padding: 2rem 1.5rem;\n  position: relative;\n  z-index: 1;\n  display: flex;\n  flex-direction: column;\n  gap: 1.75rem;\n}\n\n/* Header */\n.app-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 1.25rem;\n  padding-bottom: 1.25rem;\n  border-bottom: 1px solid var(--border-subtle);\n}\n\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n\n.logo-icon {\n  width: 48px;\n  height: 48px;\n  border-radius: var(--radius-md);\n  background: var(--primary-gradient);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: #fff;\n  box-shadow: 0 0 20px var(--primary-glow);\n}\n\nh1 {\n  font-size: 1.75rem;\n  font-weight: 800;\n  letter-spacing: -0.025em;\n  background: linear-gradient(135deg, #ffffff 40%, #cbd5e1 100%);\n  -webkit-background-clip: text;\n  -webkit-text-fill-color: transparent;\n}\n\n.header-subtitle {\n  display: flex;\n  gap: 0.5rem;\n  margin-top: 0.35rem;\n  flex-wrap: wrap;\n}\n\n.badge {\n  display: inline-flex;\n  align-items: center;\n  padding: 0.2rem 0.6rem;\n  border-radius: var(--radius-full);\n  font-size: 0.75rem;\n  font-weight: 600;\n}\n\n.badge-tech {\n  background: rgba(255, 255, 255, 0.05);\n  border: 1px solid var(--border-subtle);\n  color: var(--text-muted);\n}\n\n.api-status-badge {\n  display: flex;\n  align-items: center;\n  gap: 0.55rem;\n  padding: 0.45rem 0.9rem;\n  background: rgba(255, 255, 255, 0.04);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-full);\n  font-size: 0.85rem;\n  font-weight: 600;\n  color: var(--text-muted);\n}\n\n.status-dot {\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n  background-color: var(--text-dim);\n  transition: var(--transition-fast);\n}\n\n.status-dot.online {\n  background-color: var(--emerald);\n  box-shadow: 0 0 10px var(--emerald);\n}\n\n.status-dot.offline {\n  background-color: var(--rose);\n  box-shadow: 0 0 10px var(--rose);\n}\n\n.status-dot.connecting {\n  background-color: var(--amber);\n  box-shadow: 0 0 10px var(--amber);\n  animation: pulse 1s infinite alternate;\n}\n\n@keyframes pulse {\n  from { opacity: 0.4; }\n  to { opacity: 1; }\n}\n\n/* Alert Banner */\n.alert-banner {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.85rem 1.25rem;\n  border-radius: var(--radius-md);\n  font-size: 0.9rem;\n  font-weight: 500;\n  animation: slideDown 0.25s ease-out;\n}\n\n.alert-banner.alert-success {\n  background: var(--emerald-bg);\n  border: 1px solid var(--emerald-border);\n  color: #a7f3d0;\n}\n\n.alert-banner.alert-error {\n  background: var(--rose-bg);\n  border: 1px solid var(--rose-border);\n  color: #fecdd3;\n}\n\n.alert-banner.alert-info {\n  background: rgba(99, 102, 241, 0.12);\n  border: 1px solid rgba(99, 102, 241, 0.3);\n  color: #c7d2fe;\n}\n\n.alert-message {\n  flex: 1;\n}\n\n.btn-close-alert {\n  background: transparent;\n  border: none;\n  color: inherit;\n  font-size: 1.3rem;\n  cursor: pointer;\n  line-height: 1;\n  opacity: 0.7;\n}\n\n.btn-close-alert:hover {\n  opacity: 1;\n}\n\n@keyframes slideDown {\n  from {\n    opacity: 0;\n    transform: translateY(-8px);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n\n/* Metrics Section */\n.metrics-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));\n  gap: 1rem;\n}\n\n.metric-card {\n  background: var(--bg-card);\n  backdrop-filter: blur(14px);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-md);\n  padding: 1.25rem 1.5rem;\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n  box-shadow: var(--shadow-sm);\n  transition: transform var(--transition-fast), border-color var(--transition-fast);\n}\n\n.metric-card:hover {\n  transform: translateY(-2px);\n  border-color: var(--border-hover);\n}\n\n.metric-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n\n.metric-label {\n  font-size: 0.8rem;\n  font-weight: 600;\n  color: var(--text-muted);\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n}\n\n.metric-value {\n  font-size: 2.15rem;\n  font-weight: 800;\n  letter-spacing: -0.02em;\n  color: #fff;\n}\n\n.metric-pending { color: var(--amber); }\n.metric-progress { color: #818cf8; }\n.metric-completed { color: var(--emerald); }\n\n/* Main Workspace Layout */\n.main-layout {\n  display: grid;\n  grid-template-columns: 370px 1fr;\n  gap: 1.5rem;\n  align-items: start;\n}\n\n@media (max-width: 960px) {\n  .main-layout {\n    grid-template-columns: 1fr;\n  }\n}\n\n/* Cards */\n.card {\n  background: var(--bg-card);\n  backdrop-filter: blur(16px);\n  -webkit-backdrop-filter: blur(16px);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-lg);\n  padding: 1.5rem;\n  box-shadow: var(--shadow-md);\n}\n\n.card-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1.25rem;\n}\n\n.card-header h2 {\n  font-size: 1.15rem;\n  font-weight: 700;\n}\n\n/* Form Styles */\n.form-group {\n  margin-bottom: 1rem;\n}\n\n.form-row {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 0.75rem;\n}\n\nlabel {\n  display: block;\n  font-size: 0.82rem;\n  font-weight: 600;\n  color: var(--text-muted);\n  margin-bottom: 0.35rem;\n}\n\n.required {\n  color: var(--rose);\n}\n\n.form-control {\n  width: 100%;\n  background-color: var(--bg-input);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-sm);\n  color: var(--text-main);\n  font-family: var(--font-main);\n  font-size: 0.9rem;\n  padding: 0.65rem 0.85rem;\n  outline: none;\n  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);\n}\n\n.form-control:focus {\n  border-color: var(--border-focus);\n  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);\n}\n\n/* Buttons */\n.btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.65rem 1.1rem;\n  border-radius: var(--radius-sm);\n  font-size: 0.85rem;\n  font-weight: 600;\n  cursor: pointer;\n  border: none;\n  outline: none;\n  transition: all var(--transition-fast);\n  white-space: nowrap;\n}\n\n.btn-sm {\n  padding: 0.35rem 0.75rem;\n  font-size: 0.78rem;\n}\n\n.btn-primary {\n  background: var(--primary-gradient);\n  color: #fff;\n  box-shadow: 0 2px 10px var(--primary-glow);\n}\n\n.btn-primary:hover:not(:disabled) {\n  filter: brightness(1.1);\n  box-shadow: 0 4px 16px var(--primary-glow);\n  transform: translateY(-1px);\n}\n\n.btn-primary:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n\n.btn-outline {\n  background: transparent;\n  border: 1px solid var(--border-subtle);\n  color: var(--text-muted);\n}\n\n.btn-outline:hover {\n  color: #fff;\n  border-color: var(--border-hover);\n  background: rgba(255, 255, 255, 0.04);\n}\n\n.btn-text {\n  background: transparent;\n  border: none;\n  color: var(--primary);\n  font-size: 0.85rem;\n  font-weight: 600;\n  cursor: pointer;\n}\n\n.btn-text:hover {\n  text-decoration: underline;\n}\n\n.btn-block {\n  width: 100%;\n}\n\n/* Toolbar & Filters */\n.header-with-count {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n}\n\n.task-count-pill {\n  font-size: 0.75rem;\n  padding: 0.2rem 0.65rem;\n  border-radius: var(--radius-full);\n  background: rgba(255, 255, 255, 0.06);\n  color: var(--text-muted);\n  font-weight: 600;\n}\n\n.toolbar {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n  margin-bottom: 1.25rem;\n}\n\n.search-box {\n  position: relative;\n  width: 100%;\n}\n\n.search-icon {\n  position: absolute;\n  left: 0.85rem;\n  top: 50%;\n  transform: translateY(-50%);\n  color: var(--text-dim);\n}\n\n.search-input {\n  padding-left: 2.3rem;\n}\n\n.filters-row {\n  display: flex;\n  gap: 0.5rem;\n  flex-wrap: wrap;\n}\n\n.filter-select {\n  flex: 1;\n  min-width: 130px;\n}\n\n/* Task Cards */\n.tasks-container {\n  display: flex;\n  flex-direction: column;\n  gap: 0.85rem;\n}\n\n.task-card {\n  background: rgba(13, 17, 28, 0.7);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-md);\n  padding: 1.15rem;\n  display: flex;\n  flex-direction: column;\n  gap: 0.85rem;\n  transition: all var(--transition-fast);\n}\n\n.task-card:hover {\n  border-color: rgba(99, 102, 241, 0.35);\n  background: rgba(18, 24, 38, 0.8);\n  transform: translateY(-1px);\n}\n\n.task-card.status-Completed {\n  opacity: 0.8;\n  border-left: 3px solid var(--emerald);\n}\n\n.task-card.status-Completed .task-title {\n  text-decoration: line-through;\n  color: var(--text-muted);\n}\n\n.task-card-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n}\n\n.task-meta-left {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  flex-wrap: wrap;\n}\n\n.task-id-badge {\n  font-family: var(--font-mono);\n  font-size: 0.72rem;\n  color: var(--cyan);\n  background: var(--cyan-bg);\n  border: 1px solid var(--cyan-border);\n  padding: 0.15rem 0.5rem;\n  border-radius: var(--radius-sm);\n  display: inline-flex;\n  align-items: center;\n  gap: 0.3rem;\n  cursor: pointer;\n  transition: var(--transition-fast);\n}\n\n.task-id-badge:hover {\n  background: rgba(6, 182, 212, 0.2);\n}\n\n.priority-pill {\n  font-size: 0.72rem;\n  font-weight: 700;\n  padding: 0.15rem 0.55rem;\n  border-radius: var(--radius-sm);\n}\n\n.priority-High {\n  color: var(--rose);\n  background: var(--rose-bg);\n  border: 1px solid var(--rose-border);\n}\n\n.priority-Medium {\n  color: var(--amber);\n  background: var(--amber-bg);\n  border: 1px solid var(--amber-border);\n}\n\n.priority-Low {\n  color: var(--emerald);\n  background: var(--emerald-bg);\n  border: 1px solid var(--emerald-border);\n}\n\n.task-title {\n  font-size: 1.05rem;\n  font-weight: 700;\n  color: var(--text-main);\n  line-height: 1.35;\n  word-break: break-word;\n}\n\n.task-card-footer {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 0.65rem;\n  padding-top: 0.75rem;\n  border-top: 1px solid rgba(255, 255, 255, 0.05);\n}\n\n.task-creation-date {\n  font-size: 0.78rem;\n  color: var(--text-dim);\n  display: flex;\n  align-items: center;\n  gap: 0.35rem;\n}\n\n.task-card-actions {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n\n/* Inline Status Dropdown */\n.status-select-inline {\n  background-color: var(--bg-input);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-sm);\n  color: var(--text-muted);\n  font-size: 0.78rem;\n  font-weight: 600;\n  padding: 0.25rem 0.55rem;\n  outline: none;\n  cursor: pointer;\n  transition: var(--transition-fast);\n}\n\n.status-select-inline:hover {\n  border-color: var(--border-hover);\n  color: var(--text-main);\n}\n\n.btn-icon {\n  background: transparent;\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-sm);\n  color: var(--text-muted);\n  width: 30px;\n  height: 30px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  transition: var(--transition-fast);\n}\n\n.btn-icon:hover {\n  color: #fff;\n  border-color: rgba(255, 255, 255, 0.25);\n  background: rgba(255, 255, 255, 0.05);\n}\n\n.btn-icon.btn-delete:hover {\n  color: var(--rose);\n  border-color: var(--rose);\n  background: var(--rose-bg);\n}\n\n/* Spinners & Loading */\n.loading-state {\n  text-align: center;\n  padding: 3rem 1.5rem;\n  color: var(--text-muted);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 1rem;\n}\n\n.spinner-large {\n  width: 36px;\n  height: 36px;\n  border: 3px solid rgba(99, 102, 241, 0.2);\n  border-top-color: var(--primary);\n  border-radius: 50%;\n  animation: spin 0.75s linear infinite;\n}\n\n.spinner {\n  width: 14px;\n  height: 14px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: #fff;\n  border-radius: 50%;\n  display: inline-block;\n  animation: spin 0.75s linear infinite;\n}\n\n@keyframes spin {\n  to { transform: rotate(360deg); }\n}\n\n/* Empty State */\n.empty-state {\n  text-align: center;\n  padding: 3.5rem 1.5rem;\n  color: var(--text-dim);\n}\n\n.empty-icon {\n  font-size: 2.5rem;\n  margin-bottom: 0.75rem;\n}\n\n.empty-state h3 {\n  font-size: 1.1rem;\n  color: var(--text-muted);\n  margin-bottom: 0.35rem;\n}\n\n.empty-state p {\n  font-size: 0.85rem;\n  max-width: 420px;\n  margin: 0 auto;\n}\n\n/* Footer */\n.app-footer {\n  text-align: center;\n  padding-top: 2rem;\n  border-top: 1px solid var(--border-subtle);\n  color: var(--text-dim);\n  font-size: 0.85rem;\n}\n\n.footer-meta {\n  margin-top: 0.4rem;\n  font-size: 0.78rem;\n}\n\n/* Toast Notifications */\n.toast-container {\n  position: fixed;\n  bottom: 1.5rem;\n  right: 1.5rem;\n  display: flex;\n  flex-direction: column;\n  gap: 0.6rem;\n  z-index: 9999;\n}\n\n.toast {\n  padding: 0.8rem 1.2rem;\n  border-radius: var(--radius-sm);\n  font-size: 0.85rem;\n  font-weight: 500;\n  color: #fff;\n  background: #1e293b;\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  box-shadow: var(--shadow-md);\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  animation: slideIn 0.25s ease-out;\n  max-width: 380px;\n}\n\n.toast.toast-success { border-left: 4px solid var(--emerald); }\n.toast.toast-error { border-left: 4px solid var(--rose); }\n.toast.toast-info { border-left: 4px solid var(--primary); }\n\n@keyframes slideIn {\n  from {\n    transform: translateX(100%);\n    opacity: 0;\n  }\n  to {\n    transform: translateX(0);\n    opacity: 1;\n  }\n}\n";
const JS_CONTENT = "/**\n * Student Task Manager - Client Application Logic\n * Communicates with the Serverless Cloudflare Worker REST API & Workers KV\n */\n\n(() => {\n  // DOM References\n  const statusDot = document.getElementById(\"status-dot\");\n  const statusText = document.getElementById(\"status-text\");\n\n  const metricTotal = document.getElementById(\"metric-total\");\n  const metricPending = document.getElementById(\"metric-pending\");\n  const metricProgress = document.getElementById(\"metric-progress\");\n  const metricCompleted = document.getElementById(\"metric-completed\");\n\n  const alertBanner = document.getElementById(\"alert-banner\");\n  const alertIcon = document.getElementById(\"alert-icon\");\n  const alertMessage = document.getElementById(\"alert-message\");\n  const btnCloseAlert = document.getElementById(\"btn-close-alert\");\n\n  const taskForm = document.getElementById(\"task-form\");\n  const formHeading = document.getElementById(\"form-heading\");\n  const taskIdInput = document.getElementById(\"task-id\");\n  const taskTitleInput = document.getElementById(\"task-title\");\n  const taskPriorityInput = document.getElementById(\"task-priority\");\n  const taskStatusInput = document.getElementById(\"task-status\");\n  const btnSubmitTask = document.getElementById(\"btn-submit-task\");\n  const btnSubmitLabel = document.getElementById(\"btn-submit-label\");\n  const btnSpinner = document.getElementById(\"btn-spinner\");\n  const btnCancelEdit = document.getElementById(\"btn-cancel-edit\");\n\n  const searchInput = document.getElementById(\"search-input\");\n  const filterStatus = document.getElementById(\"filter-status\");\n  const filterPriority = document.getElementById(\"filter-priority\");\n  const btnRefreshTasks = document.getElementById(\"btn-refresh-tasks\");\n\n  const loadingState = document.getElementById(\"loading-state\");\n  const tasksContainer = document.getElementById(\"tasks-container\");\n  const taskCountPill = document.getElementById(\"task-count-pill\");\n  const emptyState = document.getElementById(\"empty-state\");\n  const toastContainer = document.getElementById(\"toast-container\");\n\n  // Application State\n  let tasks = [];\n  let isApiOnline = false;\n\n  // Resolve API Base URL:\n  // When served by the worker, window.location.origin is the worker itself, so relative \"/api\" works out-of-the-box.\n  // If running locally via file:// or localhost, it allows fallback to localStorage configuration.\n  const isLocalStatic = window.location.protocol === \"file:\" || \n                        window.location.hostname === \"localhost\" || \n                        window.location.hostname === \"127.0.0.1\";\n  \n  let apiBase = isLocalStatic ? (localStorage.getItem(\"stm_custom_api_url\") || \"\") : \"\";\n\n  // --------------------------------------------------------------------------\n  // Notifications: Toast and Banner Alerts\n  // --------------------------------------------------------------------------\n  function showToast(message, type = \"info\") {\n    const toast = document.createElement(\"div\");\n    toast.className = `toast toast-${type}`;\n    const icon = type === \"success\" ? \"✅\" : type === \"error\" ? \"❌\" : \"ℹ️\";\n    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;\n    toastContainer.appendChild(toast);\n\n    setTimeout(() => {\n      toast.style.opacity = \"0\";\n      toast.style.transform = \"translateX(100%)\";\n      toast.style.transition = \"all 0.3s ease\";\n      setTimeout(() => toast.remove(), 300);\n    }, 4000);\n  }\n\n  function showAlert(message, type = \"info\") {\n    alertBanner.className = `alert-banner alert-${type}`;\n    alertIcon.textContent = type === \"success\" ? \"✅\" : type === \"error\" ? \"⚠️\" : \"ℹ️\";\n    alertMessage.textContent = message;\n    alertBanner.style.display = \"flex\";\n  }\n\n  function hideAlert() {\n    alertBanner.style.display = \"none\";\n  }\n\n  btnCloseAlert?.addEventListener(\"click\", hideAlert);\n\n  // --------------------------------------------------------------------------\n  // Connectivity & Health Check\n  // --------------------------------------------------------------------------\n  async function checkHealth() {\n    updateConnectionBadge(\"connecting\", \"Connecting to Edge...\");\n    try {\n      const endpoint = `${apiBase}/api/health`;\n      const res = await fetch(endpoint, {\n        method: \"GET\",\n        headers: { \"Accept\": \"application/json\" }\n      });\n\n      if (res.ok) {\n        const data = await res.json();\n        isApiOnline = true;\n        updateConnectionBadge(\"online\", `Edge Active (${data.environment || \"dev\"})`);\n      } else {\n        isApiOnline = false;\n        updateConnectionBadge(\"offline\", `API Error (${res.status})`);\n      }\n    } catch (err) {\n      isApiOnline = false;\n      updateConnectionBadge(\"offline\", \"Edge Offline / Local\");\n    }\n  }\n\n  function updateConnectionBadge(state, text) {\n    statusDot.className = `status-dot ${state}`;\n    statusText.textContent = text;\n  }\n\n  // --------------------------------------------------------------------------\n  // REST API Operations (Cloudflare Workers KV)\n  // --------------------------------------------------------------------------\n  async function fetchTasks() {\n    loadingState.style.display = \"flex\";\n    tasksContainer.style.display = \"none\";\n    emptyState.style.display = \"none\";\n\n    try {\n      const endpoint = `${apiBase}/api/tasks`;\n      const res = await fetch(endpoint, {\n        method: \"GET\",\n        headers: { \"Accept\": \"application/json\" }\n      });\n\n      if (!res.ok) {\n        throw new Error(`Failed to load tasks (HTTP ${res.status})`);\n      }\n\n      const data = await res.json();\n      // Supports array format or { tasks: [...] } format\n      tasks = Array.isArray(data) ? data : (data.tasks || []);\n      renderTasks();\n      updateMetrics();\n      hideAlert();\n    } catch (err) {\n      console.error(\"fetchTasks error:\", err);\n      showAlert(`Could not connect to Cloudflare Worker API: ${err.message}`, \"error\");\n      renderTasks();\n      updateMetrics();\n    } finally {\n      loadingState.style.display = \"none\";\n      tasksContainer.style.display = \"flex\";\n    }\n  }\n\n  async function createTask(payload) {\n    setSubmitting(true, \"Adding Task...\");\n    try {\n      const endpoint = `${apiBase}/api/tasks`;\n      const res = await fetch(endpoint, {\n        method: \"POST\",\n        headers: {\n          \"Content-Type\": \"application/json\",\n          \"Accept\": \"application/json\"\n        },\n        body: JSON.stringify(payload)\n      });\n\n      const result = await res.json();\n\n      if (!res.ok) {\n        throw new Error(result.message || result.error || `HTTP ${res.status}`);\n      }\n\n      showToast(\"Task created successfully in Cloudflare Workers KV!\", \"success\");\n      resetForm();\n      await fetchTasks();\n    } catch (err) {\n      showAlert(`Create Task Failed: ${err.message}`, \"error\");\n      showToast(err.message, \"error\");\n    } finally {\n      setSubmitting(false, \"Add Task\");\n    }\n  }\n\n  async function updateTask(id, payload) {\n    setSubmitting(true, \"Updating Task...\");\n    try {\n      const endpoint = `${apiBase}/api/tasks/${encodeURIComponent(id)}`;\n      const res = await fetch(endpoint, {\n        method: \"PUT\",\n        headers: {\n          \"Content-Type\": \"application/json\",\n          \"Accept\": \"application/json\"\n        },\n        body: JSON.stringify(payload)\n      });\n\n      const result = await res.json();\n\n      if (!res.ok) {\n        throw new Error(result.message || result.error || `HTTP ${res.status}`);\n      }\n\n      showToast(\"Task updated successfully!\", \"success\");\n      resetForm();\n      await fetchTasks();\n    } catch (err) {\n      showAlert(`Update Task Failed: ${err.message}`, \"error\");\n      showToast(err.message, \"error\");\n    } finally {\n      setSubmitting(false, \"Add Task\");\n    }\n  }\n\n  async function updateTaskStatusInline(task, newStatus) {\n    try {\n      const endpoint = `${apiBase}/api/tasks/${encodeURIComponent(task.id)}`;\n      const res = await fetch(endpoint, {\n        method: \"PUT\",\n        headers: {\n          \"Content-Type\": \"application/json\",\n          \"Accept\": \"application/json\"\n        },\n        body: JSON.stringify({ status: newStatus })\n      });\n\n      if (!res.ok) {\n        const errData = await res.json().catch(() => ({}));\n        throw new Error(errData.message || `Status update failed (${res.status})`);\n      }\n\n      showToast(`Task status updated to '${newStatus}'`, \"success\");\n      task.status = newStatus;\n      renderTasks();\n      updateMetrics();\n    } catch (err) {\n      showToast(`Update Failed: ${err.message}`, \"error\");\n      await fetchTasks();\n    }\n  }\n\n  async function deleteTask(id, title) {\n    if (!confirm(`Are you sure you want to delete task \"${title}\"?`)) {\n      return;\n    }\n\n    try {\n      const endpoint = `${apiBase}/api/tasks/${encodeURIComponent(id)}`;\n      const res = await fetch(endpoint, {\n        method: \"DELETE\",\n        headers: { \"Accept\": \"application/json\" }\n      });\n\n      if (!res.ok) {\n        const errData = await res.json().catch(() => ({}));\n        throw new Error(errData.message || `Delete failed with status ${res.status}`);\n      }\n\n      showToast(\"Task deleted from Cloudflare KV\", \"info\");\n      tasks = tasks.filter(t => t.id !== id);\n      renderTasks();\n      updateMetrics();\n    } catch (err) {\n      showAlert(`Delete Failed: ${err.message}`, \"error\");\n      showToast(err.message, \"error\");\n    }\n  }\n\n  // --------------------------------------------------------------------------\n  // Form State & Helpers\n  // --------------------------------------------------------------------------\n  function setSubmitting(isSubmitting, label) {\n    btnSubmitTask.disabled = isSubmitting;\n    btnSubmitLabel.textContent = label;\n    btnSpinner.style.display = isSubmitting ? \"inline-block\" : \"none\";\n  }\n\n  function startEditTask(task) {\n    taskIdInput.value = task.id;\n    taskTitleInput.value = task.title;\n    taskPriorityInput.value = task.priority;\n    taskStatusInput.value = task.status;\n\n    formHeading.textContent = \"Edit Student Task\";\n    btnSubmitLabel.textContent = \"Update Task\";\n    btnCancelEdit.style.display = \"inline-block\";\n\n    taskTitleInput.focus();\n    taskForm.scrollIntoView({ behavior: \"smooth\", block: \"start\" });\n  }\n\n  function resetForm() {\n    taskIdInput.value = \"\";\n    taskForm.reset();\n    formHeading.textContent = \"Create Student Task\";\n    btnSubmitLabel.textContent = \"Add Task\";\n    btnCancelEdit.style.display = \"none\";\n  }\n\n  btnCancelEdit?.addEventListener(\"click\", resetForm);\n\n  // --------------------------------------------------------------------------\n  // Rendering & UI State\n  // --------------------------------------------------------------------------\n  function renderTasks() {\n    const query = searchInput.value.trim().toLowerCase();\n    const statusVal = filterStatus.value;\n    const priorityVal = filterPriority.value;\n\n    const filtered = tasks.filter(task => {\n      const matchesSearch = !query || \n        (task.title && task.title.toLowerCase().includes(query)) ||\n        (task.id && task.id.toLowerCase().includes(query));\n\n      const matchesStatus = statusVal === \"ALL\" || task.status === statusVal;\n      const matchesPriority = priorityVal === \"ALL\" || task.priority === priorityVal;\n\n      return matchesSearch && matchesStatus && matchesPriority;\n    });\n\n    taskCountPill.textContent = `${filtered.length} of ${tasks.length} tasks`;\n\n    if (filtered.length === 0) {\n      tasksContainer.innerHTML = \"\";\n      emptyState.style.display = \"block\";\n      return;\n    }\n\n    emptyState.style.display = \"none\";\n    tasksContainer.innerHTML = filtered.map(t => createTaskCardHtml(t)).join(\"\");\n\n    // Attach Event Listeners to Dynamically Created Cards\n    filtered.forEach(task => {\n      const card = document.getElementById(`task-card-${task.id}`);\n      if (!card) return;\n\n      // Status inline select\n      const statusSelect = card.querySelector(\".status-select-inline\");\n      statusSelect?.addEventListener(\"change\", (e) => {\n        updateTaskStatusInline(task, e.target.value);\n      });\n\n      // Edit Button\n      const btnEdit = card.querySelector(\".btn-edit\");\n      btnEdit?.addEventListener(\"click\", () => startEditTask(task));\n\n      // Delete Button\n      const btnDelete = card.querySelector(\".btn-delete\");\n      btnDelete?.addEventListener(\"click\", () => deleteTask(task.id, task.title));\n\n      // Copy ID Badge\n      const idBadge = card.querySelector(\".task-id-badge\");\n      idBadge?.addEventListener(\"click\", () => {\n        navigator.clipboard.writeText(task.id).then(() => {\n          showToast(`Copied Task ID: ${task.id}`, \"info\");\n        });\n      });\n    });\n  }\n\n  function createTaskCardHtml(task) {\n    const formattedDate = formatDateTime(task.createdAt);\n\n    return `\n      <article class=\"task-card status-${escapeHtml(task.status)}\" id=\"task-card-${escapeHtml(task.id)}\">\n        <div class=\"task-card-header\">\n          <div class=\"task-meta-left\">\n            <span class=\"task-id-badge\" title=\"Click to copy Task ID\">\n              <svg width=\"11\" height=\"11\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\">\n                <rect x=\"9\" y=\"9\" width=\"13\" height=\"13\" rx=\"2\" ry=\"2\"></rect>\n                <path d=\"M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1\"></path>\n              </svg>\n              ${escapeHtml(task.id)}\n            </span>\n            <span class=\"priority-pill priority-${escapeHtml(task.priority)}\">\n              ${escapeHtml(task.priority)}\n            </span>\n          </div>\n\n          <!-- Inline Status Selector -->\n          <div class=\"task-status-control\">\n            <select class=\"status-select-inline\" aria-label=\"Change status for ${escapeHtml(task.title)}\">\n              <option value=\"Pending\" ${task.status === \"Pending\" ? \"selected\" : \"\"}>⏳ Pending</option>\n              <option value=\"In Progress\" ${task.status === \"In Progress\" ? \"selected\" : \"\"}>🚀 In Progress</option>\n              <option value=\"Completed\" ${task.status === \"Completed\" ? \"selected\" : \"\"}>✅ Completed</option>\n            </select>\n          </div>\n        </div>\n\n        <h3 class=\"task-title\">${escapeHtml(task.title)}</h3>\n\n        <div class=\"task-card-footer\">\n          <div class=\"task-creation-date\">\n            <svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\">\n              <rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"></rect>\n              <line x1=\"16\" y1=\"2\" x2=\"16\" y2=\"6\"></line>\n              <line x1=\"8\" y1=\"2\" x2=\"8\" y2=\"6\"></line>\n              <line x1=\"3\" y1=\"10\" x2=\"21\" y2=\"10\"></line>\n            </svg>\n            <span>Created: ${escapeHtml(formattedDate)}</span>\n          </div>\n\n          <div class=\"task-card-actions\">\n            <button type=\"button\" class=\"btn-icon btn-edit\" title=\"Edit Task\" aria-label=\"Edit Task\">\n              <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\">\n                <path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"></path>\n                <path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"></path>\n              </svg>\n            </button>\n            <button type=\"button\" class=\"btn-icon btn-delete\" title=\"Delete Task\" aria-label=\"Delete Task\">\n              <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\">\n                <polyline points=\"3 6 5 6 21 6\"></polyline>\n                <path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"></path>\n              </svg>\n            </button>\n          </div>\n        </div>\n      </article>\n    `;\n  }\n\n  function updateMetrics() {\n    const total = tasks.length;\n    const pending = tasks.filter(t => t.status === \"Pending\").length;\n    const progress = tasks.filter(t => t.status === \"In Progress\").length;\n    const completed = tasks.filter(t => t.status === \"Completed\").length;\n\n    metricTotal.textContent = total;\n    metricPending.textContent = pending;\n    metricProgress.textContent = progress;\n    metricCompleted.textContent = completed;\n  }\n\n  function formatDateTime(isoString) {\n    if (!isoString) return \"N/A\";\n    try {\n      const date = new Date(isoString);\n      return date.toLocaleDateString(undefined, {\n        month: \"short\",\n        day: \"numeric\",\n        year: \"numeric\",\n        hour: \"2-digit\",\n        minute: \"2-digit\"\n      });\n    } catch {\n      return isoString;\n    }\n  }\n\n  function escapeHtml(str) {\n    if (str === undefined || str === null) return \"\";\n    return String(str)\n      .replace(/&/g, \"&amp;\")\n      .replace(/</g, \"&lt;\")\n      .replace(/>/g, \"&gt;\")\n      .replace(/\"/g, \"&quot;\")\n      .replace(/'/g, \"&#039;\");\n  }\n\n  // --------------------------------------------------------------------------\n  // Event Handlers\n  // --------------------------------------------------------------------------\n  taskForm.addEventListener(\"submit\", (e) => {\n    e.preventDefault();\n\n    const title = taskTitleInput.value.trim();\n    const priority = taskPriorityInput.value;\n    const status = taskStatusInput.value;\n\n    if (!title) {\n      showAlert(\"Task title is required.\", \"error\");\n      taskTitleInput.focus();\n      return;\n    }\n\n    const payload = { title, priority, status };\n    const editingId = taskIdInput.value;\n\n    if (editingId) {\n      updateTask(editingId, payload);\n    } else {\n      createTask(payload);\n    }\n  });\n\n  searchInput.addEventListener(\"input\", renderTasks);\n  filterStatus.addEventListener(\"change\", renderTasks);\n  filterPriority.addEventListener(\"change\", renderTasks);\n\n  btnRefreshTasks.addEventListener(\"click\", () => {\n    showToast(\"Refreshing tasks from Edge...\", \"info\");\n    checkHealth();\n    fetchTasks();\n  });\n\n  // --------------------------------------------------------------------------\n  // Initialization\n  // --------------------------------------------------------------------------\n  checkHealth();\n  fetchTasks();\n})();\n";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    // Standard CORS Headers for API Endpoints
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Preflight OPTIONS Request Handling
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Helper: JSON response with CORS
    const jsonResponse = (data, status = 200) => {
      return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8"
        }
      });
    };

    // Helper: Error response with CORS
    const errorResponse = (message, status = 400) => {
      return jsonResponse({ error: true, message, status }, status);
    };

    // =========================================================================
    // 1. Static Frontend Assets Serving (Single-Application Architecture)
    // =========================================================================
    if (method === "GET") {
      if (path === "/" || path === "/index.html") {
        return new Response(HTML_CONTENT, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-cache"
          }
        });
      }

      if (path === "/style.css") {
        return new Response(CSS_CONTENT, {
          status: 200,
          headers: {
            "Content-Type": "text/css; charset=utf-8",
            "Cache-Control": "public, max-age=3600"
          }
        });
      }

      if (path === "/script.js") {
        return new Response(JS_CONTENT, {
          status: 200,
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-cache"
          }
        });
      }
    }

    // =========================================================================
    // 2. Health & Diagnostic Endpoint
    // =========================================================================
    if (path === "/api/health" && method === "GET") {
      return jsonResponse({
        service: "Student Task Manager Serverless API",
        worker: env.WORKER_NAME || "student-task-manager",
        environment: env.ENVIRONMENT || "dev",
        status: "healthy",
        kvBound: Boolean(env.TASKS_KV),
        timestamp: new Date().toISOString(),
        endpoints: [
          { method: "GET", path: "/api/tasks", description: "List all student tasks" },
          { method: "POST", path: "/api/tasks", description: "Create a new student task" },
          { method: "GET", path: "/api/tasks/:id", description: "Retrieve a task by ID" },
          { method: "PUT", path: "/api/tasks/:id", description: "Update an existing task" },
          { method: "DELETE", path: "/api/tasks/:id", description: "Delete a task" }
        ]
      });
    }

    // Ensure Workers KV namespace is bound
    if (!env.TASKS_KV) {
      return errorResponse("Storage binding 'TASKS_KV' is not configured in Cloudflare Workers.", 500);
    }

    try {
      // =======================================================================
      // 3. GET /api/tasks (List all tasks)
      // =======================================================================
      if (path === "/api/tasks" && method === "GET") {
        const listResult = await env.TASKS_KV.list({ prefix: "task:" });
        const keys = listResult.keys || [];

        const taskPromises = keys.map(async (key) => {
          const raw = await env.TASKS_KV.get(key.name);
          if (!raw) return null;
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        });

        let tasks = (await Promise.all(taskPromises)).filter(Boolean);

        // Optional query parameter filtering
        const statusFilter = url.searchParams.get("status");
        const priorityFilter = url.searchParams.get("priority");
        const search = url.searchParams.get("search");

        if (statusFilter && statusFilter !== "ALL") {
          tasks = tasks.filter(t => t.status && t.status.toLowerCase() === statusFilter.toLowerCase());
        }
        if (priorityFilter && priorityFilter !== "ALL") {
          tasks = tasks.filter(t => t.priority && t.priority.toLowerCase() === priorityFilter.toLowerCase());
        }
        if (search) {
          const q = search.toLowerCase();
          tasks = tasks.filter(t =>
            (t.title && t.title.toLowerCase().includes(q)) ||
            (t.id && t.id.toLowerCase().includes(q))
          );
        }

        // Sort descending by creation date (newest first)
        tasks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        return jsonResponse(tasks);
      }

      // =======================================================================
      // 4. POST /api/tasks (Create a task)
      // =======================================================================
      if (path === "/api/tasks" && method === "POST") {
        let payload;
        try {
          payload = await request.json();
        } catch {
          return errorResponse("Malformed request. Expected valid JSON body.", 400);
        }

        const { title, priority, status } = payload;

        // Validation
        if (!title || typeof title !== "string" || !title.trim()) {
          return errorResponse("Field 'title' is required and must be a non-empty string.", 400);
        }

        const validPriorities = ["High", "Medium", "Low"];
        const taskPriority = validPriorities.includes(priority) ? priority : "Medium";

        const validStatuses = ["Pending", "In Progress", "Completed"];
        const taskStatus = validStatuses.includes(status) ? status : "Pending";

        const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const newTask = {
          id: taskId,
          title: title.trim(),
          priority: taskPriority,
          status: taskStatus,
          createdAt: now,
          updatedAt: now
        };

        await env.TASKS_KV.put(`task:${taskId}`, JSON.stringify(newTask));

        return jsonResponse({
          message: "Task created successfully.",
          task: newTask
        }, 201);
      }

      // =======================================================================
      // 5. Individual Task Operations: /api/tasks/:id (GET, PUT, DELETE)
      // =======================================================================
      const taskMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
      if (taskMatch) {
        const taskId = decodeURIComponent(taskMatch[1]);
        const kvKey = taskId.startsWith("task:") ? taskId : `task:${taskId}`;

        // GET /api/tasks/:id
        if (method === "GET") {
          const raw = await env.TASKS_KV.get(kvKey);
          if (!raw) {
            return errorResponse(`Task with ID '${taskId}' was not found.`, 404);
          }
          return jsonResponse(JSON.parse(raw));
        }

        // PUT /api/tasks/:id
        if (method === "PUT") {
          const raw = await env.TASKS_KV.get(kvKey);
          if (!raw) {
            return errorResponse(`Task with ID '${taskId}' was not found.`, 404);
          }

          let updates;
          try {
            updates = await request.json();
          } catch {
            return errorResponse("Malformed request. Expected valid JSON body.", 400);
          }

          const existing = JSON.parse(raw);

          // Validate title if provided
          if (updates.title !== undefined) {
            if (typeof updates.title !== "string" || !updates.title.trim()) {
              return errorResponse("Field 'title' cannot be empty.", 400);
            }
            existing.title = updates.title.trim();
          }

          // Validate priority if provided
          if (updates.priority !== undefined) {
            const validPriorities = ["High", "Medium", "Low"];
            if (!validPriorities.includes(updates.priority)) {
              return errorResponse("Priority must be one of: 'High', 'Medium', 'Low'.", 400);
            }
            existing.priority = updates.priority;
          }

          // Validate status if provided
          if (updates.status !== undefined) {
            const validStatuses = ["Pending", "In Progress", "Completed"];
            if (!validStatuses.includes(updates.status)) {
              return errorResponse("Status must be one of: 'Pending', 'In Progress', 'Completed'.", 400);
            }
            existing.status = updates.status;
          }

          existing.updatedAt = new Date().toISOString();

          await env.TASKS_KV.put(kvKey, JSON.stringify(existing));

          return jsonResponse({
            message: "Task updated successfully.",
            task: existing
          });
        }

        // DELETE /api/tasks/:id
        if (method === "DELETE") {
          const raw = await env.TASKS_KV.get(kvKey);
          if (!raw) {
            return errorResponse(`Task with ID '${taskId}' was not found.`, 404);
          }

          await env.TASKS_KV.delete(kvKey);

          return jsonResponse({
            message: "Task deleted successfully.",
            id: taskId
          });
        }
      }

      // Route Not Found
      return errorResponse(`Route '${method} ${path}' not found.`, 404);

    } catch (err) {
      return jsonResponse({
        error: true,
        message: "Serverless runtime error occurred.",
        detail: err.message
      }, 500);
    }
  }
};
