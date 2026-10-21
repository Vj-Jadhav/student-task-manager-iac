import os
import re
import sys


ACCOUNT_ID_PATTERN = re.compile(r"^[a-fA-F0-9]{32}$")
TOKEN_PATTERN = re.compile(r"\b[a-zA-Z0-9_-]{20,}\b")


def _normalize_raw(value: str) -> str:
    cleaned = value.strip()
    for ch in ['"', "'", "`", "\r", "\n"]:
        cleaned = cleaned.replace(ch, "")
    return cleaned.strip()


def sanitize_token(raw_token: str) -> str:
    token = _normalize_raw(raw_token)

    # Support values copied from curl/header snippets:
    # -H "Authorization: ******"
    token = re.sub(r"^-H\s+", "", token, flags=re.I)
    token = re.sub(r"^Authorization:\s*", "", token, flags=re.I)
    token = re.sub(r"^Bearer\s+", "", token, flags=re.I)

    if "Bearer " in token:
        token = token.split("Bearer ", 1)[1].strip()
    if "Authorization:" in token:
        token = token.split("Authorization:", 1)[1].strip()

    # Last-resort extraction for noisy input.
    match = TOKEN_PATTERN.search(token)
    if match:
        token = match.group(0)

    return token.strip()


def sanitize_account_id(raw_account: str) -> str:
    account = _normalize_raw(raw_account)
    account = re.sub(r"\s+", "", account)

    if "/accounts/" in account:
        account = account.split("/accounts/", 1)[1].split("/", 1)[0]

    if "account_id=" in account:
        account = account.split("account_id=", 1)[1].split("&", 1)[0]

    return account.strip()


def main():
    raw_token = os.environ.get("RAW_TOKEN", "")
    raw_account = os.environ.get("RAW_ACCOUNT_ID", "")

    token = sanitize_token(raw_token)
    account = sanitize_account_id(raw_account)

    if not token or token.startswith("***") or set(token) == {"*"}:
        print("::error::Invalid CLOUDFLARE_API_TOKEN. Store only the raw API token value (no masking, no curl/header text).")
        sys.exit(1)

    if not ACCOUNT_ID_PATTERN.fullmatch(account):
        print("::error::Invalid CLOUDFLARE_ACCOUNT_ID. Expected a 32-character hexadecimal Cloudflare account ID.")
        sys.exit(1)

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
