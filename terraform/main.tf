# ==============================================================================
# Main Infrastructure Definition: Cloudflare Worker & Workers KV Store
# Project: Serverless Student Task Management Application
# ==============================================================================

# 1. Cloudflare Workers KV Namespace for persistent task storage
resource "cloudflare_workers_kv_namespace" "tasks_kv" {
  account_id = var.cloudflare_account_id
  title      = "${var.kv_namespace_name}-${var.environment}"
}

# 2. Serverless Cloudflare Worker Script running the Task API and Frontend
resource "cloudflare_workers_script" "student_task_worker" {
  account_id         = var.cloudflare_account_id
  name               = "${var.worker_name}-${var.environment}"
  content            = file("${path.module}/../application/worker.js")
  module             = true
  compatibility_date = var.compatibility_date

  # Bind the Workers KV namespace to the worker environment (accessed via env.TASKS_KV)
  kv_namespace_binding {
    name         = "TASKS_KV"
    namespace_id = cloudflare_workers_kv_namespace.tasks_kv.id
  }

  # Runtime environment variables accessible inside the worker via env.ENVIRONMENT & env.WORKER_NAME
  plain_text_binding {
    name = "ENVIRONMENT"
    text = var.environment
  }

  plain_text_binding {
    name = "WORKER_NAME"
    text = var.worker_name
  }
}
