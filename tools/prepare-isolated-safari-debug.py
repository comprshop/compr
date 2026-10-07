"""Prepare a separate, fail-closed sandbox project; never rewrite release staging."""
import base64
import json
import os
from pathlib import Path
import plistlib
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
REF = 'uhvukecryuvosuascics'
API = 'https://compr-backend-sandbox.onrender.com'
SUPABASE = f'https://{REF}.supabase.co'

def prepare(credentials):
    public_key = json.loads(Path(credentials).read_text())['SUPABASE_ANON_KEY']
    claims = json.loads(base64.urlsafe_b64decode(public_key.split('.')[1] + '==='))
    assert claims['ref'] == REF and claims['role'] == 'anon', 'Wrong public project key'
    source = ROOT / 'build/mac-launch-2026-09-27/xcode-output/COMPR'
    project = ROOT / 'build/isolated-sandbox/xcode-output/COMPR'
    if not project.exists():
        shutil.copytree(source, project)
    stage = ROOT / 'build/isolated-sandbox/converter-input'
    stage.mkdir(parents=True, exist_ok=True)
    inventory = (ROOT / 'tools/build-safari-extension.ps1').read_text().split('$files=@(')[1].split(')')[0]
    for item in re.findall(r"'([^']+)'", inventory):
        relative = Path(item.replace('\\', '/'))
        target = stage / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / 'V.0.3-prototype' / relative, target)
    shutil.copyfile(ROOT / 'platforms/safari/platform.js', stage / 'platform.js')
    manifest = json.loads((ROOT / 'platforms/safari/manifest.json').read_text(encoding='utf-8-sig'))
    manifest['host_permissions'] = [API + '/*', SUPABASE + '/*', 'https://www.ecb.europa.eu/*']
    manifest['web_accessible_resources'][0]['matches'] = [SUPABASE + '/*']
    (stage / 'manifest.json').write_text(json.dumps(manifest, indent=2))
    config = dict(apiBaseUrl=API, supabaseUrl=SUPABASE, supabaseAnonKey=public_key,
                  authProjectRef=REF, authCallbackUrl='', mode='sandbox-debug', betaMode=True,
                  betaAccessUrl='', storeReviewUrl='', appStoreReviewUrl='https://apps.apple.com/app/id6814896535?action=write-review',
                  platform='safari', guestMode=False)
    (stage / 'shared/runtimeConfig.js').write_text('const ComprRuntimeConfig = Object.freeze(' + json.dumps(config, indent=2) + ');\n')
    shutil.copytree(stage, project / 'Shared (Extension)/Resources', dirs_exist_ok=True)
    subprocess.run(['sh', str(ROOT / 'safari-mac-day-kit/configure-generated-xcode-project.sh'), str(project)], check=True)
    for relative in ['iOS (App)/Info.plist', 'iOS (Extension)/Info.plist']:
        path = project / relative
        info = plistlib.loads(path.read_bytes())
        info.update(COMPRSandboxProjectRef=REF, COMPRSandboxAnonKey=public_key)
        path.write_bytes(plistlib.dumps(info))
    guard = project / 'verify-sandbox.py'
    guard.write_text('''import base64,json,os,plistlib
from pathlib import Path
assert os.environ.get("CONFIGURATION")=="Debug", "Sandbox project is Debug-only"
assert os.environ.get("ACTION")!="install", "Sandbox archive/install action prohibited"
p=Path(os.environ["SRCROOT"])
r=json.loads((p/"Shared (Extension)/Resources/shared/runtimeConfig.js").read_text().split("Object.freeze(")[1].rsplit(");",1)[0])
assert r["apiBaseUrl"]=="https://compr-backend-sandbox.onrender.com"
assert r["supabaseUrl"]=="https://uhvukecryuvosuascics.supabase.co"
assert r["authProjectRef"]=="uhvukecryuvosuascics" and r["platform"]=="safari"
key=r["supabaseAnonKey"]
c=json.loads(base64.urlsafe_b64decode(key.split(".")[1]+"==="))
assert c["ref"]==r["authProjectRef"] and c["role"]=="anon"
for f in ["iOS (App)/Info.plist","iOS (Extension)/Info.plist"]:
 info=plistlib.loads((p/f).read_bytes())
 assert info["COMPRSandboxProjectRef"]==r["authProjectRef"] and info["COMPRSandboxAnonKey"]==key
print("Sandbox configuration guard passed")
''')
    pbx = project / 'COMPR.xcodeproj/project.pbxproj'
    text = pbx.read_text()
    if 'COMPR Sandbox Guard' not in text:
        identifier = 'C0ABCDEF0123456789ABCDEF'
        phase = f'''\n\t\t{identifier} /* COMPR Sandbox Guard */ = {{
            isa = PBXShellScriptBuildPhase;
            buildActionMask = 2147483647;
            files = (); inputPaths = (); outputPaths = ();
            alwaysOutOfDate = 1;
            name = "COMPR Sandbox Guard";
            runOnlyForDeploymentPostprocessing = 0;
            shellPath = /bin/sh;
            shellScript = "/usr/bin/python3 \\\"$SRCROOT/verify-sandbox.py\\\"";
        }};\n'''
        text = text.replace('/* Begin PBXSourcesBuildPhase section */', '/* Begin PBXShellScriptBuildPhase section */\n' + phase + '/* End PBXShellScriptBuildPhase section */\n\n/* Begin PBXSourcesBuildPhase section */')
        for target in ['CDF65DD930687A040095D289', 'CDF65DF730687A040095D289']:
            pattern = rf'({target} /\*[^\n]+\*/ = \{{.*?buildPhases = \()'
            text, count = re.subn(pattern, lambda m:m.group(1)+f'\n\t\t\t\t{identifier} /* COMPR Sandbox Guard */,', text, count=1, flags=re.S)
            assert count == 1
        text = text.replace('buildSettings = {', 'buildSettings = {\n\t\t\t\tENABLE_USER_SCRIPT_SANDBOXING = NO;')
        pbx.write_text(text)
    environment = dict(os.environ, SRCROOT=str(project), CONFIGURATION='Debug', ACTION='build')
    subprocess.run(['/usr/bin/python3', str(guard)], env=environment, check=True)
    print('Isolated sandbox project:', project / 'COMPR.xcodeproj')

if __name__ == '__main__':
    prepare(sys.argv[1])
