#!/bin/sh
set -eu
cd "$(dirname "$0")"
input=${1:-"$PWD/converter-input"}
output=${2:-"$PWD/xcode-output"}
fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }
command -v xcrun >/dev/null 2>&1 || fail 'xcrun unavailable; install/open Xcode manually first'
xcrun --find safari-web-extension-converter >/dev/null 2>&1 || fail 'Safari converter unavailable in selected Xcode'
[ -d "$input" ] || fail "input directory not found: $input"
[ -f "$input/manifest.json" ] || fail 'input manifest.json missing'
[ ! -e "$output" ] || fail "output already exists: $output"
help=$(xcrun safari-web-extension-converter --help 2>&1 || true)
printf 'Input:  %s\nOutput: %s\n' "$input" "$output"
if ! printf '%s' "$help" | grep -q -- '--project-location'; then
  printf '%s\n' 'STOP: this Xcode help does not prove --project-location support.'
  printf '%s\n' 'Review: xcrun safari-web-extension-converter --help'
  printf 'Then run the converter manually with input: %s\n' "$input"
  exit 2
fi
printf 'Planned command:\n  xcrun safari-web-extension-converter "%s" --project-location "%s"\n' "$input" "$output"
printf '%s' 'Type CONVERT to continue: '
IFS= read -r answer
[ "$answer" = 'CONVERT' ] || { printf 'Cancelled; nothing changed.\n'; exit 0; }
xcrun safari-web-extension-converter "$input" --project-location "$output"
printf '%s\n' 'Converter finished. No signing, Team ID, bundle ID, archive or upload was automated.'
