# COMPR Safari-portstatus

Datum: 3 september 2026

## Daadwerkelijk gebouwd

Er bestaat nu een statisch gevalideerd Safari-compatible WebExtension-bronpakket, opgebouwd uit de gedeelde `V.0.3-prototype`-bron plus `platforms/safari/manifest.json` en `platforms/safari/platform.js`. Er is geen Xcode-project, native app, Apple-package, TestFlight-build of ZIP gemaakt.

Gebouwd/geïmplementeerd:

- feature-detecterende Chrome/Safari browseradapter;
- alle runtime-aanroepen van directe `chrome.*` naar de adapter omgezet;
- Safari MV3-manifest zonder permanente alle-sitespermission;
- Safari-platformoverride die de onbekende Chrome Store-reviewactie verbergt en geen App Store-URL verzint;
- responsive/safe-area/touch/focusaanpassingen voor popup en comparepagina;
- duidelijke foutstatus bij ontbrekende site-/scripttoegang;
- validatie-only Safari-assemblagescript met fail-closed productieconfiguratie en cleanup;
- automatische adapter-, manifest-, privacyflow-, mobiele layout- en buildsafetytests.

## Gedeelde code en overrides

- Gedeeld: productdetectors, normalisatie, matching, searchclient, backendclient, Supabase OTP/session, opslag, reliability, i18n, popup, comparepagina, CSS, iconen en privacytekst.
- Chrome-specifiek: bestaand Chrome-manifest, winkelreview-URL en bestaande Chrome-productiebuild.
- Safari-specifiek: manifest, kleine winkel-UI-override en Safari-validatiescript.
- Werkelijk gedeeld: 42/44 runtimebestanden (circa 95% op bestandsniveau; >98% van runtimecode naar volume).

## Automatische validatiestatus

Geslaagd na implementatie:

- backend: 89/89 tests;
- gedeelde integratie + Safari: 18/18 tests;
- Chrome core: geslaagd;
- Find This Cheaper: geslaagd;
- Safari fixture dry-run: geslaagd, 44 runtimebestanden, tijdelijke map verwijderd;
- Safari productie-dry-run zonder API: verwacht fail-closed; echte publieke API ontbreekt;
- geen live webshop, Apple-service of productieomgeving gebruikt.

De definitieve eindvalidatie is lokaal uitgevoerd:

- alle JavaScript-bestanden slagen voor `node --check`;
- Chrome- en Safari-manifest parsen en slagen voor de platformasserties;
- de offline dependency-audit meldt 0 bekende kwetsbaarheden in de lokaal beschikbare advisorycache;
- backend- en website-repository slagen voor `git diff --check`; de extensieroot is zelf geen Git-repository, daarom is daar een equivalente whitespace/conflictmarkerscan over alle gewijzigde bestanden uitgevoerd en geslaagd;
- de Safari fixture-dry-run slaagt en laat geen tijdelijke map of ZIP achter;
- de Safari productie-dry-run stopt met `SAFARI_PRODUCTION_API_URL_REQUIRED`;
- de Chrome productie-dry-run weigert eveneens een bewust ongeldige placeholder vóór assemblage; een echte dry-run blijft door dezelfde ontbrekende geverifieerde API-URL geblokkeerd;
- de oude productie-ZIP behoudt SHA-256 `62574E1896CD52608F7FBB25C927040E76C0BD77E31E19F0F36E9F03C7D500B8`.

## Authenticatiestatus

**Technisch voorbereid:** de bestaande achtcijferige Supabase OTP-codeflow is browserneutraal en sessieopslag/-refresh loopt via de gedeelde adapter. Serviceworker/contextrestart is automatisch getest. Logout en accountverwijdering behouden hun bestaande veilige volgorde.

**Niet bewezen:** magic-linkterugkeer naar de Safari-extension, Supabase redirect-allowlist voor de uiteindelijke package-origin, iOS popup-lifecycle en globale tokenrevocation op echte Safari-hardware. OTP moet de eerste handmatige route zijn; magic link is geen releaseclaim.

## Ontbrekende configuratie

- geverifieerde publieke HTTPS COMPR API-base-URL;
- definitieve Safari Bundle ID en Apple Team/account;
- door Safari/Apple bepaalde extension-origin na packaging;
- bevestigde Supabase redirect- en CORS-config voor Safari;
- bevestiging dat het OTP-emailtemplate de achtcijferige code toont;
- App Store privacy-, support- en metadata-invoer;
- productie/providerretentie en migratie 011 blijven buiten deze taak handmatig.

## Niet op Apple-hardware bewezen

- installeren/activeren op iPhone, iPad en Mac;
- per-website Ask/Allow/Deny en `activeTab`-injectie;
- mobiele retailer-DOM's en alle detectoren;
- popupgrootte, sluiten tijdens zoeken en late responses;
- resultaten in een nieuwe Safari-tab openen en terugkeren;
- OTP/magic link, refresh, logout en accountverwijdering;
- lokale opslag na OS/Safari-restart en limietgedrag;
- 200% zoom, VoiceOver, Dynamic Type/softwaretoetsenbord en contrast;
- non-persistent serviceworker na echte suspensie;
- offline en traag netwerk op een echt toestel.

## Blockers voor TestFlight

1. Apple Developer Program-account en Account Holder ontbreken/niet geverifieerd.
2. Definitieve Bundle ID/apprecord ontbreken.
3. Publieke COMPR API-URL en productie-CORS ontbreken lokaal.
4. Migratie 011 mag in deze taak niet worden uitgevoerd en moet vóór productie gecontroleerd zijn.
5. App Store Connect web-packager of Mac/Xcode moet het bronpakket daadwerkelijk verwerken; dat is bewust niet uitgevoerd.
6. Appicon/containerassets, privacyvragen, beta-metadata en testinformatie moeten in Apple worden ingevuld.
7. Supabase OTP/callbackconfig moet voor de echte Safari-build bevestigd worden.

## Blockers voor App Store-publicatie

Alle TestFlight-blockers, plus geslaagde echte-apparaatchecklist, actuele privacyverklaringen/providerretentie, juridische verkopersgegevens, App Review-notities, screenshots/metadata, export-complianceantwoord en een besluit over gratis distributie. Betaalde functies blijven uit; voor betaling is later StoreKit/IAP-review nodig.

## Eerstvolgende veilige stap

Bevestig eerst de publieke HTTPS API-URL zonder credentials te delen. Draai dan de Safari-productievalidatie. Zodra de vader bewust een Apple Developer-account heeft geopend, upload het gevalideerde bronpakket handmatig naar Apples web-packager (of gebruik Xcode op een Mac), start met een interne gratis TestFlight-build en voer `SAFARI_MANUAL_TEST_CHECKLIST.md` uit. Publiceer niets vóór alle P0/P1-cases slagen.
