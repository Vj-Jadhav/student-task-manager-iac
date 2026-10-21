# ==============================================================================
# Outputs for Student Task Manager Infrastructure
# ==============================================================================

output "kv_namespace_id" {
  description = "The unique identifier of the Cloudflare Workers KV namespace."
  value       = cloudflare_workers_kv_namespace.tasks_kv.id
}

output "kv_namespace_title" {
  description = "The human-readable title assigned to the Cloudflare Workers KV namespace."
  value       = cloudflare_workers_kv_namespace.tasks_kv.title
}

output "worker_name" {
  description = "The name of the deployed Cloudflare Worker script."
  value       = cloudflare_workers_script.student_task_worker.name
}

output "worker_url" {
  description = "The public URL to access the deployed Cloudflare Worker application."
  value = var.workers_dev_subdomain != null && var.workers_dev_subdomain != "" ? (
    "https://${cloudflare_workers_script.student_task_worker.name}.${var.workers_dev_subdomain}.workers.dev"
    ) : (
    "https://${cloudflare_workers_script.student_task_worker.name}.<your-subdomain>.workers.dev"
  )
}

output "api_health_endpoint" {
  description = "The verification URL for the healthcheck endpoint."
  value = var.workers_dev_subdomain != null && var.workers_dev_subdomain != "" ? (
    "https://${cloudflare_workers_script.student_task_worker.name}.${var.workers_dev_subdomain}.workers.dev/api/health"
    ) : (
    "https://${cloudflare_workers_script.student_task_worker.name}.<your-subdomain>.workers.dev/api/health"
  )
}

output "environment" {
  description = "The active deployment environment."
  value       = var.environment
}
