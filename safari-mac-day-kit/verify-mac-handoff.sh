#!/bin/sh
set -eu
cd "$(dirname "$0")"
archive='COMPR-Safari-v0.3.6-mac-converter-input.zip'
manifest='COMPR-Safari-v0.3.6-file-manifest.sha256'
expected='42a399a994ceb6c00c33b759f71c3db4048f5dbe277fabc8b65714744c470803'
fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }
pass() { printf 'PASS: %s\n' "$1"; }
for tool in shasum unzip awk grep sed; do
  command -v "$tool" >/dev/null 2>&1 || fail "required standard macOS tool unavailable: $tool"
done
for required in "$archive" "$manifest" START-HERE.md SAFARI_MAC_TESTFLIGHT_RUNBOOK.md SAFARI_SMOKE_TEST_MATRIX.md SAFARI_CORS_AND_CALLBACK_TEMPLATE.md SAFARI_VALUES_TO_CAPTURE.md APP_STORE_METADATA_DRAFT.md SCREENSHOT_PLAN.md MAC_DAY_TIMELINE.md ASSET_INVENTORY.md; do
  [ -f "$required" ] || fail "missing $required"
done
actual=$(shasum -a 256 "$archive" | awk '{print tolower($1)}')
[ "$actual" = "$expected" ] || fail 'archive SHA-256 mismatch'
pass 'archive SHA-256'
unzip -tq "$archive" >/dev/null || fail 'ZIP integrity check'
pass 'ZIP integrity'
count=0
while IFS='  ' read -r hash path; do
  [ -n "$hash" ] || continue
  path=$(printf '%s' "$path" | sed 's/^ *//')
  case "$path" in /*|*'..'*|*\\*) fail "unsafe manifest path: $path";; esac
  unzip -Z1 "$archive" | grep -Fqx "$path" || fail "archive entry missing: $path"
  got=$(unzip -p "$archive" "$path" | shasum -a 256 | awk '{print tolower($1)}')
  [ "$got" = "$hash" ] || fail "file hash mismatch: $path"
  count=$((count + 1))
done < "$manifest"
[ "$count" -eq 52 ] || fail "expected 52 manifest entries, found $count"
pass '52 manifest entries and hashes'
if command -v plutil >/dev/null 2>&1; then
  unzip -p "$archive" manifest.json | plutil -lint - >/dev/null || fail 'manifest.json syntax'
fi
pass 'manifest.json syntax'
scan=$(unzip -Z1 "$archive" | grep -E '\.(js|html|json|md|css)$' || true)
for pattern in 'localhost' '127\.0\.0\.1' 'comprshop\.github\.io' 'vercel\.app' 'opgdgckljdepjokbbdgahhbocdlkggkj' 'hiioneifjfpbgbnmmhjbhcnbbkpddnle' 'sk_live_' 'sk_test_' 'whsec_' 'service_role' 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY'; do
  for file in $scan; do
    unzip -p "$archive" "$file" | grep -Eiq "$pattern" && fail "blocked content pattern in $file"
  done
done
pass 'offline safety scan'
printf 'PASS: handoff verified\n'
