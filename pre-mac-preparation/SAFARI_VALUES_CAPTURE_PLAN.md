# Aanvulling op bevroren Safari-waardenblad

Gebruik het origineel `safari-mac-day-kit/SAFARI_VALUES_TO_CAPTURE.md` zonder het te wijzigen. Noteer per meting: datum, buildnummer, Mac/iPhone/iPad, OS/Safari, testerinitialen, `PASS/FAIL/BLOCKED`, screenshotnaam en redacted logpad. Geen tokens, e-mails, volledige magic links, Authorization, cookies, JWS of headersets bewaren.

| Waarde/gebeurtenis | Waar op Mac/iPhone | Vast te leggen zonder geheimen | Stopcriterium |
|---|---|---|---|
| Container/extensie ID | Xcode target General/Signing | Exacte bundle-ID als tekst | Onbekend team/conflict |
| Receiver | In extensiecontext `browser.runtime.getURL('auth-receiver.html')` | Scheme/host/pad, géén query/fragment | Instabiel of onverwacht |
| Callback | Safari Web Inspector / zichtbare URL na expliciete handoff | Alleen schone URL en status | Token zichtbaar of open redirect |
| Origin `/v1/me` | Web Inspector Network > request headers | Alleen `Origin`-waarde; statuscode | Missing/`null`/onverklaarbaar |
| Mac/iPhone/iPad verschil | Herhaal dezelfde actie per apparaat en na restart | Verschilt ja/nee + exacte niet-geheime waarden | Niet begrepen verschil |
| CORS-fout | Network status + backend reason-code als veilig beschikbaar | 403 en reason-code, geen payload | Brede allowlist nodig lijkt |
| Magic-link-return | Open op hetzelfde toestel na geconfigureerde callback | Alleen succes/falen + schone URL | Fragment blijft zichtbaar |
| Sessieherstel | Safari/container herstart | `/v1/me` status, plan, geen ID | Onverklaarde uitlog/authbypass |
| Zoekrequest | Expliciete knop → `/v1/search` | Route, status, eventueel willekeurige request-ID in lokaal testblad | Request vóór auth/klik |
| Quotaresponse | `/v1/me` | mode/limit/used/remaining zonder user-ID | Extra gebruik of dubbel tellen |
| Foutstatus | Console/Network | Foutcode zonder URL/query/body | Geheim of PII in log |
| Sitepermission | Safari Settings > Extensions | Ask/Deny/Allow per testsite | Brede impliciete toestemming |

Maak screenshot pas na sluiten van mail, notificaties en Network-headers. Masker URL-fragmenten vóór delen; bewaar zo nodig alleen een lokale geanonimiseerde notitie. Safari-waarden nooit uit Chrome-ID of voorbeeld-URL afleiden.
