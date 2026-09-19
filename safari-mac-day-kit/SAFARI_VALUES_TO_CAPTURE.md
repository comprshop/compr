# Safari values to capture

Record non-secret facts only. Never paste tokens, cookies, Authorization headers, passwords, private keys or complete request headers.

| Field | Value/evidence | Where to find it |
|---|---|---|
| Date and tester | `REQUIRED` | Local date and tester initials |
| macOS version | `REQUIRED` | Apple menu > About This Mac |
| Xcode version/build | `REQUIRED` | Xcode > About Xcode |
| iPhone model/iOS | `REQUIRED` | Settings > General > About |
| Apple Team name (not credentials) | `REQUIRED` | Xcode target > Signing & Capabilities > Team |
| Container bundle ID | `SAFARI_BUNDLE_ID_REQUIRED` | Container target > General > Identity |
| Extension bundle ID | `SAFARI_BUNDLE_ID_REQUIRED` | Extension target > General > Identity |
| `runtime.getURL("auth-receiver.html")` | `SAFARI_RUNTIME_RECEIVER_REQUIRED` | Inspect the running extension and evaluate only this expression |
| `/v1/me` Origin | `SAFARI_REQUEST_ORIGIN_REQUIRED` | Safari Web Inspector > Network > `/v1/me` > Request Headers; record Origin only |
| Missing/`null` Origin behavior | `REQUIRED` | Record status/reason only; never weaken CORS |
| Mac/iPhone receiver comparison | `REQUIRED` | Repeat the runtime expression on both devices |
| Mac/iPhone Origin comparison | `REQUIRED` | Repeat the Network inspection on both devices |
| Site permissions | `REQUIRED` | Safari Settings > Extensions > COMPR > Websites |
| Callback result | `BLOCKED until exact receiver configured` | Status and cleaned visible URL only |
| Evidence paths | `REQUIRED` | Local screenshot filenames with secrets cropped |

## Offline receiver/origin checklist

- Keep values in a local note; do not send them anywhere.
- Reject leading/trailing whitespace, query, fragment or wildcard.
- Receiver must use the exact Safari-generated scheme, authority and `/auth-receiver.html`.
- Origin must contain scheme plus authority only. Keep a trailing slash only if Safari demonstrably sends it.
- Repeat after Safari and device restart; values must remain stable.
- Compare Mac and iPhone explicitly and record differences instead of guessing.
- Stop on missing or `null` Origin. Never add either to an allowlist.
