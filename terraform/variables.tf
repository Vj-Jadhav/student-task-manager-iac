# ==============================================================================
# Input Variables for Student Task Manager Infrastructure
# ==============================================================================

variable "cloudflare_account_id" {
  type        = string
  description = "The Cloudflare Account ID where resources will be provisioned. Found on the right sidebar of the Cloudflare Dashboard overview."
}

variable "cloudflare_api_token" {
  type        = string
  description = "Cloudflare API Token. If null, the provider will read from the CLOUDFLARE_API_TOKEN environment variable."
  sensitive   = true
  default     = null
}

variable "worker_name" {
  type        = string
  description = "The base name for the Cloudflare Worker script."
  default     = "student-task-manager"
}

variable "kv_namespace_name" {
  type        = string
  description = "The base name/title for the Cloudflare Workers KV namespace."
  default     = "student-task-manager-kv"
}

variable "environment" {
  type        = string
  description = "Deployment environment identifier (e.g., dev, staging, prod)."
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "The environment variable must be one of: dev, staging, prod."
  }
}

variable "workers_dev_subdomain" {
  type        = string
  description = "Your Cloudflare account's *.workers.dev subdomain prefix (optional, used to construct exact worker_url output)."
  default     = ""
}

variable "enable_workers_dev" {
  type        = bool
  description = "Whether to publish the worker to the *.workers.dev subdomain for public access."
  default     = true
}

variable "compatibility_date" {
  type        = string
  description = "Compatibility date used by the Cloudflare Workers runtime."
  default     = "2024-09-01"
}
