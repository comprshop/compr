#!/bin/sh
set -eu

caller_directory=$PWD
script_directory=$(CDPATH= cd "$(dirname "$0")" && pwd)

project_root=${1:-"$script_directory/xcode-output/COMPR"}
master=${2:-"$script_directory/COMPR-App-Icon-1024.png"}
extension_id=${3:-"nl.getcompr.compr.extension"}
build_mode=${4:-"debug"}
release_api=${5:-""}
marketing_version=${6:-"0.3.6"}
build_number=${7:-"8"}

case "$project_root" in /*) ;; *) project_root="$caller_directory/$project_root" ;; esac
case "$master" in /*) ;; *) master="$caller_directory/$master" ;; esac

fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }
pass() { printf 'PASS: %s\n' "$1"; }

case "$build_mode" in
  release) [ "$release_api" = 'https://compr-backend.onrender.com' ] || fail 'PRODUCTION_BACKEND_MISMATCH' ;;
  debug) ;;
  *) fail 'build mode must be debug or release' ;;
esac
case "$marketing_version:$build_number" in *[!0-9.:]*|'') fail 'invalid version/build metadata' ;; esac

command -v sips >/dev/null 2>&1 || fail 'sips unavailable; run this on macOS'
[ -d "$project_root/COMPR.xcodeproj" ] || fail "generated COMPR.xcodeproj not found under: $project_root"
[ -f "$master" ] || fail "approved 1024px icon not found: $master"

if [ -d "$project_root/Shared (App)" ]; then
  view_controller="$project_root/Shared (App)/ViewController.swift"
  extension_handler="$project_root/Shared (Extension)/SafariWebExtensionHandler.swift"
  scene_delegate="$project_root/iOS (App)/SceneDelegate.swift"
  app_info="$project_root/iOS (App)/Info.plist"
  extension_info="$project_root/iOS (Extension)/Info.plist"
  app_entitlements="$project_root/iOS (App)/COMPR.entitlements"
  extension_entitlements="$project_root/iOS (Extension)/COMPR Extension.entitlements"
  app_icons="$project_root/Shared (App)/Assets.xcassets/AppIcon.appiconset"
  large_icon="$project_root/Shared (App)/Assets.xcassets/LargeIcon.imageset"
  resources="$project_root/Shared (App)/Resources"
  app_privacy="$project_root/Shared (App)/PrivacyInfo.xcprivacy"
  extension_privacy="$project_root/Shared (Extension)/PrivacyInfo.xcprivacy"
else
  view_controller="$project_root/COMPR/ViewController.swift"
  extension_handler="$project_root/COMPR Extension/SafariWebExtensionHandler.swift"
  scene_delegate="$project_root/COMPR/SceneDelegate.swift"
  app_info="$project_root/COMPR/Info.plist"
  extension_info="$project_root/COMPR Extension/Info.plist"
  app_entitlements="$project_root/COMPR/COMPR.entitlements"
  extension_entitlements="$project_root/COMPR Extension/COMPR.Extension.entitlements"
  app_icons="$project_root/COMPR/Assets.xcassets/AppIcon.appiconset"
  large_icon="$project_root/COMPR/Assets.xcassets/LargeIcon.imageset"
  resources="$project_root/COMPR/Resources"
  app_privacy="$project_root/COMPR/PrivacyInfo.xcprivacy"
  extension_privacy="$project_root/COMPR Extension/PrivacyInfo.xcprivacy"
fi
project_file="$project_root/COMPR.xcodeproj/project.pbxproj"
container_app="$script_directory/container-app"
container_extension="$script_directory/container-extension"

[ -f "$view_controller" ] || fail "missing generated ViewController.swift"
[ -f "$extension_handler" ] || fail "missing generated SafariWebExtensionHandler.swift"
[ -f "$scene_delegate" ] || fail "missing generated iOS SceneDelegate.swift"
[ -f "$project_file" ] || fail 'missing generated project.pbxproj'
[ -f "$app_info" ] || fail 'missing generated iOS app Info.plist'
mkdir -p "$(dirname "$app_entitlements")" "$(dirname "$extension_entitlements")"
cp "$container_app/COMPR.entitlements" "$app_entitlements"
cp "$container_extension/COMPR.Extension.entitlements" "$extension_entitlements"
[ -d "$app_icons" ] || fail "missing generated AppIcon.appiconset"
[ -d "$large_icon" ] || fail "missing generated LargeIcon.imageset"
[ -d "$resources" ] || fail "missing generated app resources"
[ -f "$container_app/Main.html" ] || fail 'missing container app Main.html'
[ -f "$container_app/Style.css" ] || fail 'missing container app Style.css'
[ -f "$container_app/Script.js" ] || fail 'missing container app Script.js'
[ -f "$container_app/ViewController.swift" ] || fail 'missing container app ViewController.swift'
[ -f "$container_app/SceneDelegate.swift" ] || fail 'missing container app SceneDelegate.swift'
[ -f "$container_app/SafariWebExtensionHandler.swift" ] || fail 'missing safe SafariWebExtensionHandler.swift'
[ -f "$container_app/PrivacyInfo.xcprivacy" ] || fail 'missing app privacy manifest'
[ -f "$container_extension/PrivacyInfo.xcprivacy" ] || fail 'missing extension privacy manifest'

case "$extension_id" in
  *[!A-Za-z0-9.-]*|'') fail 'extension bundle ID contains unsupported characters' ;;
esac

cp "$container_app/ViewController.swift" "$view_controller"
cp "$container_app/SceneDelegate.swift" "$scene_delegate"
cp "$container_app/SafariWebExtensionHandler.swift" "$extension_handler"
python3 "$script_directory/../tools/configure-xcode-privacy.py" "$project_root"
python3 - "$project_file" <<'PYSET'
from pathlib import Path
import re, sys
p=Path(sys.argv[1]); s=p.read_text()
s=re.sub(r'\n\s*CODE_SIGN_ENTITLEMENTS = (?:COMPR/COMPR\.entitlements|"COMPR Extension/COMPR\.Extension\.entitlements");','',s)
s=s.replace('PRODUCT_BUNDLE_IDENTIFIER = nl.getcompr.COMPR;', 'PRODUCT_BUNDLE_IDENTIFIER = nl.getcompr.compr;')
s=s.replace('PRODUCT_BUNDLE_IDENTIFIER = nl.getcompr.compr.Extension;', 'PRODUCT_BUNDLE_IDENTIFIER = nl.getcompr.compr.extension;')
s=s.replace('INFOPLIST_FILE = COMPR/Info.plist;', 'CODE_SIGN_ENTITLEMENTS = COMPR/COMPR.entitlements;\n\t\t\t\tINFOPLIST_FILE = COMPR/Info.plist;')
s=s.replace('INFOPLIST_FILE = "COMPR Extension/Info.plist";', 'CODE_SIGN_ENTITLEMENTS = "COMPR Extension/COMPR.Extension.entitlements";\n\t\t\t\tINFOPLIST_FILE = "COMPR Extension/Info.plist";')
p.write_text(s)
PYSET
python3 - "$project_file" "$marketing_version" "$build_number" <<'PYVERSION'
from pathlib import Path
import re, sys
p=Path(sys.argv[1]); s=p.read_text()
s=re.sub(r'MARKETING_VERSION = [^;]+;', f'MARKETING_VERSION = {sys.argv[2]};', s)
s=re.sub(r'CURRENT_PROJECT_VERSION = [^;]+;', f'CURRENT_PROJECT_VERSION = {sys.argv[3]};', s)
p.write_text(s)
PYVERSION
grep -Fq 'NSPrivacyAccessedAPICategoryUserDefaults' "$app_privacy" || fail 'app privacy manifest missing UserDefaults declaration'
grep -Fq 'NSPrivacyAccessedAPICategoryUserDefaults' "$extension_privacy" || fail 'extension privacy manifest missing UserDefaults declaration'
grep -Fq 'PrivacyInfo.xcprivacy in Resources' "$project_file" || fail 'privacy manifests not packaged by generated project'
pass 'app and extension privacy manifests packaged'
if [ "$build_mode" = release ]; then
  [ "$release_api" = 'https://compr-backend.onrender.com' ] || fail 'PRODUCTION_BACKEND_MISMATCH'
  for plist in "$app_info" "$extension_info"; do
    /usr/libexec/PlistBuddy -c 'Delete :COMPRSandboxProjectRef' "$plist" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c 'Delete :COMPRSandboxAnonKey' "$plist" 2>/dev/null || true
  done
  /usr/libexec/PlistBuddy -c 'Delete :COMPRBackendURL' "$app_info" 2>/dev/null || true
  /usr/libexec/PlistBuddy -c "Add :COMPRBackendURL string $release_api" "$app_info"
elif [ "$build_mode" != debug ]; then
  fail 'build mode must be debug or release'
fi
if [ "$build_mode" = release ]; then
  cp "$script_directory/../tools/verify-safari-release.py" "$project_root/verify-release.py"
  python3 - "$project_file" <<'PYGUARD'
from pathlib import Path
import json, re, sys
p=Path(sys.argv[1]); s=p.read_text(); ident='C0ABCDEF0123456789ABCDE0'
if 'COMPR Release Guard' not in s:
 phase='''/* Begin PBXShellScriptBuildPhase section */
        C0ABCDEF0123456789ABCDE0 /* COMPR Release Guard */ = {
            isa = PBXShellScriptBuildPhase;
            buildActionMask = 2147483647;
            files = (); inputPaths = ("$(SRCROOT)"); outputPaths = ();
            alwaysOutOfDate = 1;
            name = "COMPR Release Guard";
            runOnlyForDeploymentPostprocessing = 0;
            shellPath = /bin/sh;
            shellScript = "/usr/bin/python3 \\\"$SRCROOT/verify-release.py\\\"";
        };
/* End PBXShellScriptBuildPhase section */
'''
 s=s.replace('/* Begin PBXSourcesBuildPhase section */',phase+'\n/* Begin PBXSourcesBuildPhase section */')
 s,n=re.subn(r'(isa = PBXNativeTarget;.*?buildPhases = \()',lambda m:m.group(1)+'\n                '+ident+' /* COMPR Release Guard */,',s,flags=re.S)
 assert n>=2
s=re.sub(r'(C0ABCDEF0123456789ABCDE0 /\* COMPR Release Guard \*/ = \{.*?shellScript = )[^\n]+', lambda m:m.group(1)+json.dumps('/usr/bin/python3 "$SRCROOT/verify-release.py"')+';', s, flags=re.S)
project=p.parent.parent
legacy=(project/'Shared (Extension)').is_dir()
paths=['verify-release.py', ('Shared (Extension)' if legacy else 'COMPR Extension')+'/Resources/shared/runtimeConfig.js', ('iOS (App)' if legacy else 'COMPR')+'/Info.plist', ('iOS (Extension)' if legacy else 'COMPR Extension')+'/Info.plist']
inputs=', '.join(json.dumps('$(SRCROOT)/'+name) for name in paths)
s=re.sub(r'(C0ABCDEF0123456789ABCDE0 /\* COMPR Release Guard \*/ = \{.*?inputPaths = )\([^;]*\)', lambda m:m.group(1)+'('+inputs+')',s,flags=re.S)
p.write_text(s)
PYGUARD
fi
/usr/libexec/PlistBuddy -c 'Delete :CFBundleURLTypes' "$app_info" 2>/dev/null || true
/usr/libexec/PlistBuddy -c 'Add :CFBundleURLTypes array' "$app_info"
/usr/libexec/PlistBuddy -c 'Add :CFBundleURLTypes:0 dict' "$app_info"
/usr/libexec/PlistBuddy -c 'Add :CFBundleURLTypes:0:CFBundleURLSchemes array' "$app_info"
/usr/libexec/PlistBuddy -c 'Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string compr' "$app_info"
if [ "$extension_id" != 'nl.getcompr.compr.extension' ]; then
  temporary="$view_controller.tmp.$$"
  sed "s/nl\.getcompr\.compr\.extension/$extension_id/g" "$view_controller" > "$temporary"
  mv "$temporary" "$view_controller"
fi
grep -Fq "let extensionBundleIdentifier = \"$extension_id\"" "$view_controller" \
  || fail 'generated extension identifier was not configured'
pass "container extension identifier: $extension_id"
grep -Fq 'NATIVE_ACTION_UNAVAILABLE' "$extension_handler" \
  || fail 'safe native extension handler was not configured'
for action in auth.openApp auth.session auth.storeSession auth.clear billing.products billing.purchase billing.restore billing.finish; do
  grep -Fq "\"$action\"" "$extension_handler" \
    || fail "native extension handler is missing required action: $action"
done
for product_id in nl.getcompr.pro.monthly nl.getcompr.pro.yearly nl.getcompr.ultimate.monthly nl.getcompr.ultimate.yearly; do
  grep -Fq "\"$product_id\"" "$extension_handler" \
    || fail "native extension handler is missing StoreKit product: $product_id"
done
grep -Fq 'group.nl.getcompr.compr' "$extension_handler" \
  || fail 'native extension handler is missing the COMPR App Group'
grep -Fq 'URL(string: "compr://signin")' "$extension_handler" \
  || fail 'native extension handler is missing the COMPR sign-in deep link'
grep -Fq 'SafariWebExtensionHandler.swift in Sources' "$project_file" \
  || fail 'native extension handler is not included in the generated extension target'
grep -Fq 'SceneDelegate.swift in Sources' "$project_file" \
  || fail 'SceneDelegate is not included in the generated iOS app target'
grep -Fq 'group.nl.getcompr.compr' "$app_entitlements" \
  || fail 'generated iOS app is missing the COMPR App Group entitlement'
grep -Fq 'group.nl.getcompr.compr' "$extension_entitlements" \
  || fail 'generated iOS extension is missing the COMPR App Group entitlement'
grep -Fq 'com.apple.developer.applesignin' "$app_entitlements" \
  || fail 'generated iOS app is missing the Sign in with Apple entitlement'
grep -Fq '<string>compr</string>' "$app_info" \
  || fail 'generated iOS app is missing the compr URL scheme'
grep -Fq 'context.url.scheme == "compr" && context.url.host == "signin"' "$scene_delegate" \
  || fail 'generated SceneDelegate is missing the compr://signin route'
if grep -Eq 'os_log|NSLog|print\(|"echo"' "$extension_handler"; then
  fail 'native extension handler logs or echoes message content'
fi
pass 'native extension messages fail closed without logging or echoing payloads'
pass 'Apple sign-in bridge, App Group, deep link and StoreKit actions configured'

cp "$container_app/Main.html" "$resources/Base.lproj/Main.html"
cp "$container_app/Style.css" "$resources/Style.css"
cp "$container_app/Script.js" "$resources/Script.js"
pass 'getcompr.nl-style container onboarding configured'

resize() {
  pixels=$1
  output=$2
  sips -z "$pixels" "$pixels" "$master" --out "$output" >/dev/null
}

resize 16 "$app_icons/mac-icon-16@1x.png"
resize 32 "$app_icons/mac-icon-16@2x.png"
resize 32 "$app_icons/mac-icon-32@1x.png"
resize 64 "$app_icons/mac-icon-32@2x.png"
resize 128 "$app_icons/mac-icon-128@1x.png"
resize 256 "$app_icons/mac-icon-128@2x.png"
resize 256 "$app_icons/mac-icon-256@1x.png"
resize 512 "$app_icons/mac-icon-256@2x.png"
resize 512 "$app_icons/mac-icon-512@1x.png"
cp "$master" "$app_icons/mac-icon-512@2x.png"
cp "$master" "$app_icons/universal-icon-1024@1x.png"

resize 128 "$large_icon/icon128.png"
resize 256 "$large_icon/icon128@2x.png"
resize 384 "$large_icon/icon128@3x.png"
resize 384 "$resources/Icon.png"

cat > "$large_icon/Contents.json" <<'JSON'
{
  "images" : [
    {
      "idiom" : "universal",
      "scale" : "1x",
      "filename" : "icon128.png"
    },
    {
      "idiom" : "universal",
      "scale" : "2x",
      "filename" : "icon128@2x.png"
    },
    {
      "idiom" : "universal",
      "scale" : "3x",
      "filename" : "icon128@3x.png"
    }
  ],
  "info" : {
    "version" : 1,
    "author" : "xcode"
  }
}
JSON

pass 'approved AppIcon slots, 1x/2x/3x image set and container screen artwork configured'
printf '%s\n' 'Open the project in Xcode and set the team, app/extension bundle IDs, version and build number before building.'
