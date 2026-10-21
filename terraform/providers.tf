# ==============================================================================
# Terraform Provider Configuration for Cloudflare
# Project: Serverless Student Task Management Application
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "4.52.0"
    }
  }

  # ============================================================================
  # Remote State Backend Strategy for CI/CD & Production
  # ============================================================================
  # GitHub-hosted runners are ephemeral VMs; local state files (*.tfstate) do not
  # persist between workflow executions. For collaborative CI/CD pipelines, enable
  # an S3-compatible remote backend (such as Cloudflare R2 or AWS S3) with state locking.
  #
  # Example configuration for Cloudflare R2 (Free Tier compatible):
  # backend "s3" {
  #   bucket                      = "student-task-manager-tfstate"
  #   key                         = "dev/terraform.tfstate"
  #   region                      = "auto"
  #   endpoint                    = "https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com"
  #   skip_credentials_validation = true
  #   skip_region_validation      = true
  #   skip_requesting_account_id  = true
  #   skip_metadata_api_check     = true
  #   skip_s3_checksum            = true
  # }
}

# The Cloudflare provider natively supports authentication via:
# 1. The 'api_token' attribute specified below (if passed via var.cloudflare_api_token)
# 2. Or the 'CLOUDFLARE_API_TOKEN' environment variable (recommended, zero hard-coding)
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
