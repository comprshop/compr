# COMPR Safari callback and CORS template

This is a local fill-in template. Do not deploy it and do not guess Safari values.

## Values already fixed

- Website callback: `https://getcompr.nl/auth-callback.html`
- Chrome receiver: `chrome-extension://fpikkglicmmlhkcmnobecnkpomfnnclh/auth-receiver.html`
- Chrome CORS origin: `chrome-extension://fpikkglicmmlhkcmnobecnkpomfnnclh`
- Website origin, only for routes that truly need it: `https://getcompr.nl`

## Values to capture from the signed Mac build

- `SAFARI_RUNTIME_RECEIVER_REQUIRED`
- `SAFARI_REQUEST_ORIGIN_REQUIRED`
- `SAFARI_BUNDLE_ID_REQUIRED`
- `APPLE_TEAM_ID_REQUIRED`
- `APP_GROUP_REQUIRED_IF_NEEDED`

Record the Safari receiver using `browser.runtime.getURL("auth-receiver.html")` and record the actual `Origin` observed by the local/backend request inspector. They may differ. Never derive either value from the bundle ID by assumption.

## Fail-closed website change after capture

The current callback supports Chrome only and must stay that way until the signed Safari receiver is known. A later change may add a server-owned platform choice whose values are an exact allowlist of the Chrome receiver and the observed Safari receiver. It must not accept a caller-provided `next`, receiver, scheme, extension ID or bundle ID. URL fragments must be copied into memory and removed from the visible URL immediately; the DOM remains tokenless; transfer occurs only after an explicit user action; unknown platforms fail closed.

## Future Render value template

```text
COMPR_ALLOWED_ORIGINS=chrome-extension://fpikkglicmmlhkcmnobecnkpomfnnclh,https://getcompr.nl,SAFARI_REQUEST_ORIGIN_REQUIRED
```

Only include `https://getcompr.nl` if a production API route is actually called by the website. No wildcard, trailing slash, `null`, missing origin, localhost, preview origin or Markdown syntax is allowed.

## Required local test matrix before deployment

| Request origin | Expected |
|---|---|
| Exact Chrome origin | Allowed |
| Exact captured Safari origin | Allowed after configuration |
| Different Safari origin | 403 |
| Missing Origin | 403 in production |
| `null` | 403 |
| Exact origin plus trailing slash | 403 |
| `https://getcompr.nl` | Allowed only if explicitly required/configured |
| Valid bearer plus wrong origin | 403 before bearer authentication |
