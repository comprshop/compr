#!/bin/sh
# Local generation/build only. This never uploads, installs or deploys.
set -eu
root=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
: "${COMPR_RELEASE_API_URL:?Explicit production backend required}"
: "${COMPR_RELEASE_SUPABASE_URL:?Explicit production Supabase required}"
: "${COMPR_RELEASE_SUPABASE_PUBLIC_KEY:?Public client key required}"
: "${COMPR_RELEASE_AUTH_CALLBACK_URL:?Explicit callback required}"
: "${COMPR_RELEASE_VERSION:?Explicit marketing version required}"
: "${COMPR_RELEASE_BUILD:?Explicit build number required}"
: "${1:?Use a NEW output directory under build/}"
output=$(python3 -c 'from pathlib import Path; import sys; p=Path(sys.argv[1]).resolve(); root=Path(sys.argv[2]).resolve()/"build"; assert p.is_relative_to(root) and p!=root and not p.exists(), "Output must be a new directory beneath build/"; print(p)' "$1" "$root")
node "$root/tools/stage-safari-release.mjs" "$output/converter-input"
xcrun safari-web-extension-converter "$output/converter-input" --project-location "$output/xcode-output" --app-name COMPR --bundle-identifier nl.getcompr.compr --swift --ios-only --copy-resources --no-open --no-prompt
sh "$root/safari-mac-day-kit/configure-generated-xcode-project.sh" "$output/xcode-output/COMPR" "$root/safari-mac-day-kit/COMPR-App-Icon-1024.png" nl.getcompr.compr.extension release "$COMPR_RELEASE_API_URL" "$COMPR_RELEASE_VERSION" "$COMPR_RELEASE_BUILD"
xcodebuild -project "$output/xcode-output/COMPR/COMPR.xcodeproj" -scheme COMPR -configuration Release -sdk iphoneos DEVELOPMENT_TEAM=2ZZK9M26TR CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO -derivedDataPath "$output/DerivedData" build
python3 "$root/tools/inspect-safari-release.py" "$output"
