# COMPR Safari-port

Datum: 3 september 2026
Doel: één gedeelde WebExtension-bron voor Chrome, Safari op macOS en Safari op iPhone/iPad. Dit is geen Apple-build, Xcode-project of release.

## Gekozen structuur

```text
V.0.3-prototype/              gedeelde runtimebron en tests
  shared/browserAdapter.js   kleine browser-API-adapter
platforms/chrome/            Chrome-platformmetadata; canoniek manifest blijft ongewijzigd
platforms/safari/            Safari MV3-manifest en kleine UI-override
tools/
  build-production-extension.ps1  bestaande Chrome-build
  build-safari-extension.ps1      tijdelijke Safari-validatie, nooit upload/ZIP
tmp/                         alleen kortlevende validatieoutput
```

De bestaande bron is niet verplaatst of gekopieerd. Beide platformroutes gebruiken `V.0.3-prototype/`. Alleen manifests, winkelgedrag en gegenereerde publieke runtimeconfiguratie zijn platformspecifiek.

## Browsercompatibilitylaag

`shared/browserAdapter.js` kiest met feature detection eerst een aanwezige `browser`-implementatie en anders `chrome`. De runtimecode gebruikt voortaan deze beperkte adapter voor:

- runtime-ID, interne URL's, install/startup-events en messaging;
- `storage.local` en storagewijzigingen;
- tabs opvragen/openen;
- scripts injecteren;
- action badges;
- permission checks/requests voor toekomstig expliciet sitepermissiongedrag;
- uitsluitend veilige `http`/`https`-URL's openen.

De adapter roept een API maar één keer aan. Dezelfde aanroep accepteert vervolgens óf de callback óf de Promise-uitkomst en negeert een eventuele tweede afronding. Ontbrekende API's en platformfouten worden naar veilige foutcodes genormaliseerd; oorspronkelijke browserdetails worden niet aan gebruikers getoond. De adapter gebruikt geen user-agentdetectie en bevat geen algemene externe polyfill.

Apple ondersteunt zowel `chrome.*`/`browser.*`, callbacks/Promises en Manifest V3 vanaf Safari 15.4. Op iOS zijn MV3-achtergrondworkers non-persistent. [Apple compatibility](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility)

## Manifesten en permissions

Het bestaande `V.0.3-prototype/manifest.json` blijft het Chrome-ontwikkelmanifest. `platforms/safari/manifest.json` is de Safari-overlay:

- Manifest V3, action-popup en `background.js` serviceworker;
- alleen `storage`, `activeTab` en `scripting`;
- geen `<all_urls>`, statisch content script of permanente winkeltoegang;
- alleen de bekende Supabase- en ECB-host in de bron;
- de publieke COMPR API-host wordt uitsluitend tijdens validatie uit een expliciete HTTPS-parameter toegevoegd;
- alleen `auth-receiver.html` is web-accessible en beperkt tot de auth-callbackorigin;
- self-only CSP en bestaande iconen.

Het openen van de popup is de bewuste browseractie die `activeTab` activeert. Productextractie gebeurt daarna lokaal. Een COMPR API/searchrequest ontstaat pas wanneer de gebruiker “Find This Cheaper” kiest. Een injectie- of tabfout krijgt een concrete uitleg om COMPR voor die website toe te staan en opnieuw te openen. Matchingregels zijn niet gewijzigd.

## Safari-buildvalidatie

`tools/build-safari-extension.ps1` ondersteunt bewust alleen `-ValidationOnly`:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\build-safari-extension.ps1 `
  -ValidationOnly -ApiBaseUrl 'https://<geverifieerde-compr-api>' -ShowInventory
```

Zonder echte publieke API-URL stopt productievalidatie met `SAFARI_PRODUCTION_API_URL_REQUIRED`. `-UseTestFixture` gebruikt uitsluitend de gereserveerde `.test`-fixture om assemblage en scanners offline te testen. De tijdelijke map wordt altijd verwijderd.

Het script:

1. controleert kernbestanden en configuratie;
2. draait backend-, gedeelde-, Chrome- en Safari-tests vóór assemblage;
3. kopieert alleen runtimebestanden naar een unieke tijdelijke map;
4. past Safari-manifest, platformoverride en publieke runtimeconfig toe;
5. verwijdert demo- en matchtestbestanden;
6. blokkeert localhost, HTTP in productie, placeholders, geheime sleutelpatronen, remote-codepatronen, tests, `.env`, documentatie, scripts en ZIP's;
7. valideert MV3, CSP, minimale permissions en web-accessible resources;
8. kan een inventarislijst tonen;
9. verwijdert de tijdelijke output en maakt nooit een ZIP of upload.

Apples web-packager of Xcode is niet aangeroepen. Apple biedt later zowel een commandlinepackager op Mac als een App Store Connect-webpackager. [Apple Xcode/CLI packager](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari), [Apple web-packager](https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect)

## Mobiele UI en toegankelijkheid

De bestaande vormgeving is behouden. Gerichte aanvullingen maken popup en comparepagina bruikbaar op smalle Safari-oppervlakken:

- vloeiende breedte onder 420 px en geen verplichte desktopbreedte;
- safe-area-insets;
- minimaal 44 px aanraakdoel bij coarse pointers;
- lange account- en productnamen mogen afbreken;
- comparecontrols stapelen op kleine schermen;
- zichtbare toetsenbordfocus voor knoppen, links, inputs, selects en summaries;
- bestaande live regions, labels, dialogs en reduced-motiongedrag blijven behouden.

DOM/CSS-tests bewaken deze eigenschappen. 200% zoom, VoiceOver, werkelijk Safari-popupscrollen, softwaretoetsenbord en contrast moeten nog visueel op Apple-hardware worden bewezen.

## Authenticatie

De bestaande Supabase-emailflow biedt al een achtcijferige OTP-invoer in de popup. Dit is nu de platformneutrale primaire Safari-route: de gebruiker kan de code uit e-mail kopiëren en opnieuw in COMPR invoeren zonder dat een magic link tokens naar een specifieke extension-origin moet terugbrengen.

- sessie blijft lokaal in extension storage;
- tokenrefresh is single-flight en herstelt na context/serviceworkerrestart;
- logout probeert globale Supabase-revocation en wist daarna lokaal;
- accountverwijdering behoudt dubbele bevestiging, server-first verwijderen en meldt geen volledig succes na een mislukte stap;
- tokens, volledige e-mails en magic links worden niet gelogd.

Niet bewezen: de bestaande magic-linkcallback via de website naar `auth-receiver.html` op iPhone/iPad/macOS Safari. Er is geen nieuwe native callback of authenticatiemethode verzonnen. Vóór TestFlight moeten de daadwerkelijke Safari-extension-origin, Supabase redirect-allowlist, CORS en OTP-emailtemplate handmatig worden gecontroleerd. Apple ondersteunt de `identity`-API niet en adviseert voor OAuth een nieuwe tab. [Apple compatibility](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility)

## Overdracht en toekomstige betalingen

De port voegt geen Sign in with Apple, iCloud, Keychain Sharing, App Groups, Apple Pay of native entitlement toe. Daardoor blijft een latere apptransfer eenvoudiger. Bundle ID, Team ID en Apple-verkopersgegevens zijn nergens in gedeelde runtimecode hardgecodeerd.

Stripe en betaalde UI blijven door `betaMode: true` uitgeschakeld. Voor een latere Apple-subscription zijn afzonderlijk nodig: StoreKit-productconfiguratie, transaction/receiptvalidatie op de backend, App Store Server Notifications, een platformneutrale entitlementmapping, herstel aankopen en een overdrachtsrunbook voor secrets. Niets daarvan is nu geactiveerd.

## Gedeeld percentage

Van de 44 bestanden in de gevalideerde Safari-runtime zijn 42 rechtstreeks uit de gedeelde bron afkomstig. Alleen `manifest.json` en `platform.js` zijn Safari-specifiek; de runtimeconfiguratie wordt gegenereerd uit gedeelde configuratievelden. Op bestandsniveau is daarmee circa **95% gedeeld**. Gewogen naar codevolume is **meer dan 98% van de JavaScript/HTML/CSS-runtime gedeeld**. Packaging, Apple-containerassets en handmatige platformtests vallen buiten dit broncodepercentage.
