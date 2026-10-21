# Screenshots Guide for Project Report

This folder stores demonstration and verification screenshots for the academic project:
**"Automated Deployment of a Serverless Student Task Management Application Using Terraform"**.

Recommended screenshots to capture and include in your project report:

1. `01-terraform-init-plan.png`: Terminal output showing successful `terraform init` and `terraform plan`.
2. `02-terraform-apply-success.png`: Terminal output showing `Apply complete! Resources: 3 added, 0 changed, 0 destroyed` and the output variables.
3. `03-cloudflare-workers-dashboard.png`: Cloudflare Dashboard showing the deployed worker script (`student-task-manager-dev`) and bound KV namespace.
4. `04-cloudflare-kv-storage.png`: Cloudflare Workers KV dashboard showing persisted task keys (`task:*`).
5. `05-student-task-manager-ui.png`: Student Task Manager frontend displaying metrics, task list, and online status badge.
6. `06-task-crud-operations.png`: Creating, editing, or filtering tasks in the web dashboard.
7. `07-github-actions-pipeline.png`: GitHub Actions run showing automated lint, plan, and apply stages passing on push.
