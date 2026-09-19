# COMPR Safari smoke-test matrix

Use only redacted evidence. Never capture tokens, full email addresses, magic links or Authorization headers.

| Test | Windows | Mac | iPhone/iPad | Production backend | Gate |
|---|---:|---:|---:|---:|---|
| Manifest, inventory, syntax and hashes | Yes | Repeat | No | No | TestFlight |
| Install/enable extension and per-site Ask/Allow/Deny | No | Yes | Yes | No | TestFlight |
| Product detail page accepted | Static only | Yes | Yes | Optional | TestFlight |
| Search/category/Google page rejected | Static only | Yes | Yes | No | TestFlight |
| Mobile product DOM and lazy-loaded details | Fixtures only | Optional | Yes | Optional | TestFlight |
| Long names, portrait/landscape, small screen, 200% zoom | Render only | Yes | Yes | No | TestFlight |
| Touch targets, keyboard/focus, Escape, VoiceOver | Partial | Yes | Yes | No | TestFlight |
| Save, deduplicate, remove and Clear all | Unit tests | Yes | Yes | No | TestFlight |
| Storage/session recovery after restart | Unit tests | Yes | Yes | No | TestFlight |
| One deliberate search; no automatic request | Unit tests | Yes | Yes | Yes | TestFlight |
| Reliable cheaper match; dearer candidates hidden | Unit tests | Yes | Yes | Yes | TestFlight |
| No-match | Unit tests | Yes | Yes | Yes | TestFlight |
| Timeout/offline/cancel/retry | Unit tests | Yes | Yes | Mock/production | TestFlight |
| Close popup during request; late result ignored | Unit tests | Yes | Yes | Yes | TestFlight |
| Deal opens in a new Safari tab and returns safely | Unit tests | Yes | Yes | Optional | TestFlight |
| OTP request, eight-digit verification, `/v1/me` | Mock only | Yes | Yes | Yes | TestFlight |
| Magic-link callback and immediate URL cleanup | Chrome tests only | Yes | Yes | Yes | Public release unless claimed in beta |
| Logout/global revocation | Unit tests | Yes | Yes | Yes | TestFlight |
| Expired session refresh/fail-closed logout | Unit tests | Yes | Yes | Yes | TestFlight |
| Network/console contains only expected HTTPS hosts | Static scan | Yes | Yes | Yes | TestFlight |
| No tokens in URL, DOM, console or logs | Unit tests | Yes | Yes | Yes | TestFlight |
| Guest, Stripe, checkout, portal and StoreKit absent | Build scan | Yes | Yes | No | TestFlight |
| TestFlight install and update | No | No | Yes | No | TestFlight |

For every row record `PASS`, `FAIL` or `BLOCKED`, device, OS/Safari version, build number, redacted evidence, and retest owner. Any auth bypass, token exposure, broad site permission, crash, wrong-product match, unintended billing/guest activation or unknown network host is an immediate stop.
