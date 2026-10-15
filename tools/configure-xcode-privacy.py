#!/usr/bin/env python3
"""Package canonical manifests and onboarding JS in converter-generated targets."""
from pathlib import Path
import hashlib, re, shutil, sys
project=Path(sys.argv[1]); root=Path(__file__).resolve().parents[1]
pbx=project/'COMPR.xcodeproj/project.pbxproj'
legacy=(project/'Shared (App)').is_dir()
app=project/('Shared (App)' if legacy else 'COMPR')
ext=project/('Shared (Extension)' if legacy else 'COMPR Extension')
for folder,kind in [(app,'app'),(ext,'extension')]:
    shutil.copy2(root/f'safari-mac-day-kit/container-{kind}/PrivacyInfo.xcprivacy',folder/'PrivacyInfo.xcprivacy')
shutil.copy2(root/'safari-mac-day-kit/container-app/Script.js',app/'Resources/Script.js')
s=pbx.read_text()
def identifier(value): return hashlib.sha256(value.encode()).hexdigest()[:24].upper()
def add_resource(text,match,relative,label):
    ref=identifier('compr-resource:'+relative); build=identifier(match.group(1)+relative)
    if build in text: return text
    if ref not in text:
        text=text.replace('/* End PBXFileReference section */',f'\t\t{ref} /* {label} */ = {{isa = PBXFileReference; lastKnownFileType = text; path = "{relative}"; sourceTree = SOURCE_ROOT; }};\n/* End PBXFileReference section */')
    text=text.replace('/* End PBXBuildFile section */',f'\t\t{build} /* {label} in Resources */ = {{isa = PBXBuildFile; fileRef = {ref}; }};\n/* End PBXBuildFile section */')
    pattern=rf'({match.group(1)} /\* Resources \*/ = \{{.*?files = \()'
    text,count=re.subn(pattern,lambda m:m.group(1)+f'\n\t\t\t\t{build} /* {label} in Resources */,',text,count=1,flags=re.S)
    assert count==1
    return text
phases=list(re.finditer(r'([0-9A-F]{24}) /\* Resources \*/ = \{\n\s*isa = PBXResourcesBuildPhase;[\s\S]*?\n\s*\};',s))
counts={'app':0,'extension':0}
for phase in phases:
    block=phase.group(0)
    kind='extension' if 'manifest.json in Resources' in block else 'app' if 'Main.html in Resources' in block else None
    if not kind: continue
    folder=app if kind=='app' else ext
    s=add_resource(s,phase,(folder/'PrivacyInfo.xcprivacy').relative_to(project).as_posix(),'PrivacyInfo.xcprivacy')
    if kind=='app' and 'Script.js in Resources' not in block:
        s=add_resource(s,phase,(app/'Resources/Script.js').relative_to(project).as_posix(),'Script.js')
    counts[kind]+=1
assert all(counts.values()), 'App/extension resource phases not found'
pbx.write_text(s)
print('Resource phases configured:',counts)
