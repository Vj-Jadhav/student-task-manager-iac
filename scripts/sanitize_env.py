import os
import re

def main():
    raw_token = os.environ.get("RAW_TOKEN", "")
    raw_account = os.environ.get("RAW_ACCOUNT_ID", "")

    # Clean Token
    token = raw_token.strip()
    for ch in ['"', "'", '`', '\r', '\n']:
        token = token.replace(ch, '')
        raw_account = raw_account.replace(ch, '')

    # Strip accidental curl flags or Bearer prefix
    token = re.sub(r'^-H\s+', '', token)
    token = re.sub(r'^Authorization:\s*', '', token, flags=re.I)
    token = re.sub(r'^Bearer\s+', '', token, flags=re.I)
    token = token.strip()

    # Clean Account ID
    account = re.sub(r'\s+', '', raw_account.strip())

    github_env = os.environ.get("GITHUB_ENV")
    if github_env:
        with open(github_env, "a", encoding="utf-8") as f:
            f.write(f"CLOUDFLARE_API_TOKEN={token}\n")
            f.write(f"TF_VAR_cloudflare_api_token={token}\n")
            f.write(f"TF_VAR_cloudflare_account_id={account}\n")

    # Mask in logs
    if token:
        print(f"::add-mask::{token}")
    if account:
        print(f"::add-mask::{account}")

    print("Cloudflare credentials successfully prepared for Terraform.")

if __name__ == "__main__":
    main()
