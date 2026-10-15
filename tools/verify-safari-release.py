#!/usr/bin/env python3
"""Build-time, offline guard. Never reads credentials or contacts a service."""
import json, os, plistlib
from pathlib import Path
p=Path(os.environ['SRCROOT'])
assert os.environ.get('CONFIGURATION')=='Release', 'Release project only; use isolated project for Debug'
ext=p/('Shared (Extension)' if (p/'Shared (Extension)').is_dir() else 'COMPR Extension')
app=p/('iOS (App)' if (p/'iOS (App)').is_dir() else 'COMPR')
r=json.loads((ext/'Resources/shared/runtimeConfig.js').read_text().split('Object.freeze(')[1].rsplit(');',1)[0])
assert r['mode']=='production' and r['platform']=='safari'
assert r['authProjectRef']=='taosgvfdnblnopaywimf'
assert r['apiBaseUrl']=='https://compr-backend.onrender.com'
assert r['supabaseUrl']=='https://taosgvfdnblnopaywimf.supabase.co'
assert r['supabaseAnonKey']=='sb_publishable_cZtYQI3ApFTw8kU2a2AoBQ_nGdlSw1W'
assert r['diagnosticsEnabled'] is False and r['guestMode'] is False
assert r['authCallbackUrl']=='https://getcompr.nl/auth-callback.html'
for info in [app/'Info.plist', (p/'iOS (Extension)' if (p/'iOS (Extension)').is_dir() else ext)/'Info.plist']:
    value=plistlib.loads(info.read_bytes())
    assert not any(k.startswith('COMPRSandbox') for k in value)
info=plistlib.loads((app/'Info.plist').read_bytes())
assert info['COMPRBackendURL']==r['apiBaseUrl']
print('Production Release configuration guard passed (offline)')
