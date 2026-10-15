#!/usr/bin/env python3
"""Inspect the local unsigned artifact and byte equality. No network or device access."""
from pathlib import Path
import json, plistlib, sys
out=Path(sys.argv[1]).resolve(); root=Path(__file__).resolve().parents[1]
stage=out/'converter-input'; generated=out/'xcode-output/COMPR/COMPR Extension/Resources'
app=out/'DerivedData/Build/Products/Release-iphoneos/COMPR.app'; ext=app/'PlugIns/COMPR Extension.appex'
for folder,bundle in [(app,'nl.getcompr.compr'),(ext,'nl.getcompr.compr.extension')]:
    info=plistlib.loads((folder/'Info.plist').read_bytes()); assert info['CFBundleIdentifier']==bundle
    assert not any(k.startswith('COMPRSandbox') for k in info)
    print(bundle,'version',info['CFBundleShortVersionString'],'build',info['CFBundleVersion'])
assert plistlib.loads((app/'Info.plist').read_bytes())['COMPRBackendURL']=='https://compr-backend.onrender.com'
for folder,kind in [(app,'app'),(ext,'extension')]:
    expected=root/f'safari-mac-day-kit/container-{kind}/PrivacyInfo.xcprivacy'
    assert plistlib.loads((folder/'PrivacyInfo.xcprivacy').read_bytes())==plistlib.loads(expected.read_bytes())
for rel in ['Script.js','Style.css','Base.lproj/Main.html']:
    canonical=root/'safari-mac-day-kit/container-app'/Path(rel).name
    assert (app/rel).read_bytes()==canonical.read_bytes(),rel
count=0
for source in stage.rglob('*'):
    if not source.is_file(): continue
    relative=source.relative_to(stage)
    assert source.read_bytes()==(generated/relative).read_bytes(),f'generated {relative}'
    assert source.read_bytes()==(ext/relative).read_bytes(),f'embedded {relative}'
    if source.suffix in ['.js','.html','.json','.md']:
        text=source.read_text()
        assert not any(v in text for v in ['compr-backend-sandbox.onrender.com','uhvukecryuvosuascics','127.0.0.1','localhost'])
    count+=1
for folder,name in [(app,'COMPR'),(ext,'COMPR Extension')]:
    binary=(folder/name).read_bytes()
    for marker in [b'compr-backend-sandbox.onrender.com',b'uhvukecryuvosuascics',b'compr-product-diagnostics.json']:
        assert marker not in binary, f'debug marker in {name}'
runtime=(ext/'shared/runtimeConfig.js').read_text(); assert '"diagnosticsEnabled": false' in runtime
for target,canonical in [('COMPR','container-app/COMPR.entitlements'),('COMPR Extension','container-extension/COMPR.Extension.entitlements')]:
    file='COMPR.entitlements' if target=='COMPR' else 'COMPR.Extension.entitlements'
    assert (out/'xcode-output/COMPR'/target/file).read_bytes()==(root/'safari-mac-day-kit'/canonical).read_bytes()
print(f'PASS: {count} stage/generated/embedded resources byte-identical; manifests and onboarding packaged; production-only runtime; unsigned artifact (not an archive).')
