# COMPR Safari Web Extension — haalbaarheidsonderzoek

Datum onderzoek: 3 september 2026
Status: read-only analyse; er is niets gebouwd, verpakt, geüpload of gepubliceerd.
## Managementsamenvatting

COMPR kan waarschijnlijk als Safari Web Extension op Mac, iPhone en iPad werken. De kern is al gunstig opgebouwd: Manifest V3, gewone JavaScript/HTML/CSS, een actie-popup, contentextractie na een gebruikersactie, lokale opslag en een externe HTTPS-backend. Safari ondersteunt WebExtensions, Manifest V3 en zowel de `chrome.*`- als `browser.*`-namespace. De productherkenning, matching, backendclient en het grootste deel van de UI zijn daarom herbruikbaar.

Safari-first is echter niet de technisch kortste route. De huidige Chrome-versie is verder gevorderd en Safari voegt drie onbekenden toe die alleen met een echt Apple-traject betrouwbaar kunnen worden afgevinkt: de popup op een klein iPhone-scherm, permissies/injectie op echte webshops en de Supabase-login wanneer een e-maillink de extensie-popup verlaat. Apple biedt tegenwoordig wel een webgebaseerde Safari Extension Packager in App Store Connect. Daarmee kan een build zonder eigen Mac of Xcode worden verpakt en via TestFlight worden verspreid. Voor snel itereren, console-inspectie, signingproblemen, simulatorgebruik en native aanpassingen is toegang tot een Mac met Xcode nog steeds de praktische kwaliteitsroute.

**Advies:** rond de gedeelde Chrome-techniek af en port Safari direct daarna, vóórdat nieuwe productfuncties worden toegevoegd. Maak eerst een korte iPhone-spike voor permissies, productextractie, resultaten openen en OTP-login. Dit behoudt één codebase, beperkt dubbel werk en sluit tegelijk aan bij de voorkeur van de vader voor een gecontroleerde App Store/TestFlight-route.

## 1. Feiten, conclusies en onzekerheden

- **Bevestigd:** bevindingen rechtstreeks uit de huidige repository of actuele Apple-documentatie.
- **Waarschijnlijke conclusie:** technische inschatting op basis van die feiten, maar nog niet op echte Safari-apparaten bewezen.
- **Onzeker:** vereist een Apple Developer-account, verpakking, TestFlight, een echt apparaat of een expliciet antwoord van Apple Developer Support/App Review.

Apple ondersteunt Safari Web Extensions sinds Safari 14 op macOS en sinds iOS/iPadOS 15. Ze worden als app-extension in een containerapp verspreid, maar bestaan hoofdzakelijk uit dezelfde JavaScript-, HTML- en CSS-bestanden als andere browserextensies. [Apple: Safari web extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions)

## 2. Technische inventarisatie van COMPR

De actieve bron die voor deze analyse is gebruikt is `V.0.3-prototype/`. Oudere kopieën onder `compr/` en `V.0.2.3/` zijn geen geschikte basis voor een nieuwe port.

### Manifest en extensie-opbouw

In `V.0.3-prototype/manifest.json` staat:

- Manifest V3, versie `0.3.0`;
- `action.default_popup: popup.html`;
- MV3-serviceworker `background.js`;
- permissions `storage`, `activeTab` en `scripting`;
- host permissions voor ECB, Supabase en de lokale ontwikkelbackend;
- `auth-receiver.html` als web-accessible resource, uitsluitend voor de GitHub Pages-site;
- een self-only CSP voor extensionscripts;
- iconen van 16, 32, 48 en 128 pixels.

De `localhost`-host permission is ontwikkelconfiguratie en mag niet in een Safari-productiebestand komen. De uiteindelijke HTTPS-API-host moet expliciet worden toegevoegd. Apple negeert onbekende manifestsleutels; dat betekent niet dat genegeerde functionaliteit automatisch veilig werkt. De packager moet zijn waarschuwingen daarom foutvrij of bewust verklaard opleveren.

### Gebruikte browser-API's

| API | Doel in COMPR | Belangrijkste bestanden |
|---|---|---|
| `chrome.action.setBadgeBackgroundColor`, `setBadgeText` | teller voor opgeslagen producten | `background.js` |
| `chrome.runtime.onInstalled`, `onStartup` | badge en wisselkoerscache initialiseren | `background.js` |
| `chrome.runtime.onMessage`, `chrome.runtime.id` | intern bericht voor wisselkoersen en productextractie; afzendercontrole | `background.js`, `content.js` |
| `chrome.runtime.getURL` | interne comparepagina openen | `popup.js` |
| `chrome.runtime.lastError` | storage-callbackfouten herkennen | `shared/storage.js` |
| `chrome.scripting.executeScript` | detectors en `content.js` op de actieve productpagina injecteren | `popup.js` |
| `chrome.tabs.query` | actieve tab bepalen | `popup.js` |
| `chrome.tabs.create` | comparepagina, resultaten en externe links openen | `popup.js`, `compare.js` |
| `chrome.storage.local` | producten, voorkeuren, land/taal, sessie en tijdelijke loginstatus | `popup.js`, `compare.js`, `background.js`, `shared/*.js` |
| `chrome.storage.onChanged` | badge bijwerken | `background.js` |

Er is geen gebruik gevonden van `identity`, `webRequest`, `cookies`, `downloads`, `contextMenus`, `windows`, native messaging of Chromium-only offscreen documents. Dat verlaagt de portingcomplexiteit aanzienlijk.

### Content scripts, messaging en bewuste actie

COMPR declareert geen altijd-actief content script. `popup.js` vraagt de actuele tab op en gebruikt pas na de relevante gebruikersactie `chrome.scripting.executeScript` om detectorbestanden en `content.js` te injecteren. `content.js` leest productvelden en retourneert die via extension messaging. Zowel `content.js` als `background.js` controleren `sender.id === chrome.runtime.id`. Dit past inhoudelijk goed bij `activeTab` en dataminimalisatie, maar de exacte injectievolgorde en afzenderwaarde moeten op Safari worden getest.

### Popup en comparepagina

- `popup.html`/`popup.js` bieden herkenning, Find This Cheaper, Save & Compare, accountfuncties en taal/land.
- `compare.html`/`compare.js` bieden de grotere collectie- en resultatenweergave.
- De huidige popup is ontworpen als desktop-extensiepaneel. Op iPhone is niet bewezen hoeveel viewport Safari geeft, wanneer het paneel sluit of hoe toetsenbord/modals uitpakken.
- Resultaatlinks worden eerst met `new URL(...)` gevalideerd en daarna via `tabs.create` geopend. Dat is conceptueel passend voor Safari.
- Een Chrome Web Store-reviewlink in `popup.js` moet platformspecifiek worden gemaakt.

### Opslag en authenticatie

- `shared/storage.js` abstraheert alleen bewerkingen op `chrome.storage.local`; dit is een goed aangrijpingspunt voor een dunne browserlaag.
- Opgeslagen producten, voorkeuren en Supabase-sessie staan lokaal. `shared/auth.js` bewaart een beperkte sessie, vernieuwt tokens en verwijdert de sessie bij uitloggen.
- Magic-link/OTP wordt rechtstreeks tegen Supabase Auth aangeroepen. `runtimeConfig.js` gebruikt een HTTPS GitHub Pages-callback. De webpagina moet het resultaat vervolgens terugbrengen naar de extensie via `auth-receiver.html`.
- Safari ondersteunt `storage.local`, maar Apple noemt een limiet van 5 MB. `storage.sync` bestaat als API maar synchroniseert volgens Apple niet. De huidige producten en login worden dus niet automatisch tussen iPhone, iPad en Mac gedeeld. [Apple: browsercompatibiliteit](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility)

### Netwerk, backend en CORS

- `shared/apiClient.js` verstuurt aanvragen naar de configureerbare COMPR API en voegt voor ingelogde aanvragen de bearer-token toe.
- `shared/auth.js` praat rechtstreeks met Supabase.
- `background.js` en `shared/currency.js` halen ECB-wisselkoersen op.
- `detectors/discountCodes.js` kan beperkte same-site pagina's ophalen met weggelaten credentials.
- De backend voert zoek- en matchvalidatie uit; dit gedrag is browseronafhankelijk.

Safari krijgt een eigen extension-origin en package-identiteit. Daarom moeten CORS-allowlists van COMPR, Supabase redirect-allowlists en eventuele origincontroles expliciet voor de uiteindelijke Safari-origin/bundle-flow worden getest. Een succesvolle Chrome-CORS-test bewijst dit niet.

## 3. Compatibility matrix

Legenda: **direct** = dezelfde aanpak hoort te werken; **laag** = via een kleine wrapper/config; **aanpassen** = platform-UX of lifecyclewerk; **testen** = door Apple ondersteund maar voor COMPR nog onbewezen. Geen huidige kernfunctie vereist aantoonbaar Swift.

| Functie/API | Gebruik | Chrome | Safari Mac | Safari iPhone/iPad | Hergebruik / actie | Native Swift? | Bron |
|---|---|---|---|---|---|---|---|
| Manifest V3 | extensieconfiguratie | ja | Safari 15.4+ | Safari 15.4+ | apart Safari-manifest; packagerwaarschuwingen controleren | nee | [Apple compatibility](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility) |
| `runtime` | events, messaging, URL, ID | ja | grotendeels | grotendeels | direct/laag; afzender- en lifecycletests | nee | [Apple compatibility](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility) |
| extension messaging | popup/content/background | ja | waarschijnlijk ja | waarschijnlijk ja | testen na serviceworker-suspensie | nee | [Apple Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions) |
| `tabs.query` | actuele tab | ja | ja met juiste toestemming | ja met juiste toestemming | permissies testen | nee | [Apple compatibility](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility) |
| `tabs.create` | interne/externe pagina openen | ja | waarschijnlijk ja | waarschijnlijk ja | direct; mobiele terugkeer testen | nee | [Apple compatibility](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility) |
| `scripting.executeScript` | detectors injecteren | ja | ondersteunde WebExtension-aanpak | ondersteunde WebExtension-aanpak | cruciale echte-site test | nee verwacht | [Apple Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions) |
| `storage.local` | sessie, producten, instellingen, cache | ja | ja | ja | direct tot 5 MB; quota-afhandeling houden | nee | [Apple compatibility](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility) |
| `storage.sync` | niet gebruikt | n.v.t. | API, geen sync | API, geen sync | niet inzetten voor cross-device | nee | [Apple compatibility](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility) |
| `storage.onChanged` | badge | ja | waarschijnlijk ja | waarschijnlijk ja | testen | nee | [Apple Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions) |
| `activeTab` | tijdelijke toegang na actie | ja | ja | ja, gebruiker beheert sitepermissie | uitleg en foutstatus toevoegen | nee | [Apple iPhone-gebruikershandleiding](https://support.apple.com/en-ie/guide/iphone/iphab0432bf6/ios) |
| `action`/popup | hoofdinterface | ja | ja | ja | responsive herontwerp/test; paneel kan sluiten | nee | [Apple running extensions](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension) |
| contentextractie | DOM van webshop lezen | ja | ja na toestemming | ja na toestemming | selectors herbruikbaar; mobiele DOM kan verschillen | nee | [Apple Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions) |
| MV3-serviceworker | badge/cache/messages | ja | non-persistent | non-persistent verplicht | geen geheugen als waarheid; werk idempotent maken | nee | [Apple compatibility](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility) |
| externe HTTPS-fetch | Supabase, COMPR, ECB | ja | ja met host/CORS | ja met host/CORS | aparte productie-hosts en CORS-test | nee | [Apple compatibility](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility) |
| web-accessible resource | auth-receiver | ja | manifestfunctie beschikbaar | manifestfunctie beschikbaar | callbackarchitectuur aanpassen/testen | mogelijk, niet per se | [Apple compatibility](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility) |
| extern resultaat openen | andere webshop | ja | waarschijnlijk ja | waarschijnlijk ja | gebruikersgebaar en nieuwe-tabgedrag testen | nee | [Apple Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions) |
| badge | aantal opgeslagen items | ja | waarschijnlijk ja | zichtbaar gedrag platformafhankelijk | niet essentieel; graceful degradation | nee | [Apple Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions) |

**Conclusie matrix:** geen gevonden API vormt op papier een harde Safari-blokkade. De status blijft “waarschijnlijk” totdat de packagercompatibiliteitsrapportage en echte apparaatflows zijn uitgevoerd.

## 4. Volledige iPhone-flow

| Stap | Status | Benodigde actie of reden |
|---|---|---|
| 1. Installeren | Haalbaar | iOS-containerapp via TestFlight/App Store installeren. |
| 2. Extensie activeren | Haalbaar | Gebruiker moet Safari > Extensions openen en COMPR inschakelen; onboarding moet dit tonen. |
| 3. Toestemming voor webshop | Haalbaar, UX-aanpassing | Safari laat extensies per website beheren. Toon een duidelijke “Allow/Sta toe”-instructie en herken geweigerde toegang. |
| 4. Alleen na bewuste actie lezen | Haalbaar | Huidige `activeTab` plus programmatische injectie past hierbij; echte Safari-test vereist. |
| 5. Find This Cheaper starten | Haalbaar, testen | Popup moet mobiel responsief zijn en laadstatus behouden wanneer mogelijk. |
| 6. Veilig naar backend | Haalbaar | Uitsluitend productie-HTTPS, minimale payload, juiste host permission en CORS. |
| 7. Backend zoeken/valideren | Haalbaar | Browseronafhankelijke serverflow; mobiel netwerk vraagt time-outs/retry-UX. |
| 8. Alleen betrouwbare match tonen | Haalbaar | Bestaande precision-first serverlogica blijft gedeeld. |
| 9. Andere webshop openen | Haalbaar, testen | `tabs.create`; verifieer Safari-tabgedrag en terugkeer naar COMPR. |
| 10. Opslaan/login/logout/verwijderen | Deels haalbaar | Lokaal opslaan, logout en verwijderendpoint passen. Login-callback en volledige verwijderflow moeten op iPhone bewezen worden. |

### Mobiele aandachtspunten

1. **Kleine popup:** de huidige lange desktoppopup moet op ongeveer 320–430 CSS-pixels breed, grote tekstinstellingen, landscape en met softwaretoetsenbord worden getest. Accountbeheer of vergelijking kan beter naar een volledige extension-tab dan in één lang popup-paneel.
2. **Per-website toestemming:** installatie alleen geeft nog geen toegang. Apple laat de gebruiker een extensie globaal en per site aan- of uitzetten. COMPR moet een geweigerde permissie niet verwarren met “geen product gevonden”. [Apple: extensies op iPhone](https://support.apple.com/en-ie/guide/iphone/iphab0432bf6/ios)
3. **Serviceworker-suspensie:** alle belangrijke toestand moet in opslag/server staan; een callback mag niet aannemen dat globale variabelen blijven bestaan. Apples MV3-achtergrond op iOS is non-persistent. [Apple compatibility](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility)
4. **Mobiel netwerk:** behoud AbortController/time-outs, toon “opnieuw proberen”, maak backendrequests idempotent waar relevant en laat een gesloten popup geen onduidelijke successtatus veroorzaken.
5. **Magic link:** een e-maillink opent waarschijnlijk een gewone Safari-context en de extensie-popup kan intussen gesloten zijn. De huidige GitHub Pages → `auth-receiver.html`-overdracht is daarom een onzeker punt. Apple ondersteunt `identity` niet en adviseert OAuth in een nieuwe tab. Voor COMPR is OTP-code invoeren rechtstreeks in de extensie de veiligste eerste mobiele route; magic-link terugkeer vereist een aparte Safari-proef en mogelijk native/universal-linkwerk. [Apple compatibility](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility)
6. **Cross-device:** Apple kan de extensie op andere apparaten vindbaar maken, maar COMPR-data in `storage.local` synchroniseert niet. Producten en sessies blijven per installatie. Als synchronisatie later gewenst is, hoort die via een expliciete, ingelogde COMPR-backendfunctie met privacykeuze te lopen—niet via een aanname over `storage.sync`.
7. **Account verwijderen:** de bestaande dubbele bevestiging en serververwijdering vóór lokale clear zijn een sterke basis. In de Safari-UI moet de optie makkelijk vindbaar blijven en mislukking zichtbaar blijven. Apple vereist dat apps met accountaanmaak accountverwijdering vanuit de app kunnen initiëren. [Apple: account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)

## 5. Conversie, verpakking, testen en distributie

### Route A — commandline-packager + Xcode op een Mac

Apple noemt de huidige tool `safari-web-extension-packager`; deze heette eerder `safari-web-extension-converter`. De invoer is de map met manifest en extensieresources. De tool maakt een Xcode-project, containerapp(s) en extensietarget(s) voor macOS en/of iOS. Native aanpassingen kunnen Swift of Objective-C gebruiken, maar Apple zegt expliciet dat die voor een pure HTML/CSS/JS-extensie mogelijk niet nodig zijn. [Apple: packaging with Xcode](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari)

- Hardware: Mac waarop een passende Xcode-versie draait; voor echt iPhone/iPad testen ook een apparaat en kabel/netwerkpairing.
- Account: gratis Apple-account volstaat voor simulatorproeven; Apple Developer Program is nodig voor testen op een fysiek iOS-apparaat volgens Apples Safari-documentatie en voor distributie.
- Output: Xcode-project met twee targets per platform (containerapp + Safari Web Extension).
- Testen: tijdelijke extensie op macOS, iOS-simulator, fysiek apparaat, console/Web Inspector, signing en native code.
- Sterk voor COMPR: beste debugloop voor auth, popup, sitepermissions, serviceworker en echte webshops.
- Zwak: vereist Mac-toegang en kennis van Xcode/signing.

Apple staat tijdelijke installatie van de losse extensiemap in macOS Safari toe. Voor iOS packaging en distributie verwijst Apple naar een Xcode-project; een simulator kan vóór betaald lidmaatschap worden gebruikt. [Apple: running a Safari web extension](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension)

### Route B — web-packager in App Store Connect

Apple biedt inmiddels een webgebaseerde Safari Extension Packager. Vanaf elke browser upload je de volledige extensie-inhoud bij een macOS- en/of iOS-apprecord. Apple verpakt de extensie; daarna kan de build via TestFlight of App Review worden verspreid. De iOS-build werkt op iPhone, iPad en visionOS. De rekentijd gaat af van de inbegrepen 25 Xcode Cloud-uren per maand. [Apple: web packaging](https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect)

- Hardware: geen eigen Mac of Xcode nodig om te verpakken/submitten; wel Apple-apparaten voor representatieve gebruikstests.
- Account: betaald Apple Developer Program en App Store Connect-apprecord.
- Invoer: volledige extensieresources, inclusief Safari-manifest en assets.
- Output: door Apple verpakte iOS/macOS-builds in App Store Connect.
- Testen: TestFlight; externe testers kunnen een eerste Beta App Review nodig hebben. Builds zijn maximaal 90 dagen testbaar. [Apple: TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview)
- Handmatig: Bundle ID, apprecord, platformen, metadata, privacy-antwoorden, screenshots, leeftijdsclassificatie, export compliance, testinformatie en reviewnotities.
- Sterk voor COMPR: vader kan een gecontroleerde beta laten testen zonder eerst een Mac te kopen.
- Zwak: minder directe inspectie en tragere edit-upload-TestFlight-debugcyclus. Als native callbackcode of een moeilijk Safari-specifiek probleem nodig blijkt, is Mac/Xcode-toegang praktisch alsnog nodig.

**Keuze:** start de eerste distributieproef desgewenst met de web-packager, maar reserveer toegang tot een geleende/gehuurde Mac zodra auth, signing, popup-lifecycle of Web Inspector een blokkade wordt. “Geen Mac nodig voor packaging” is niet hetzelfde als “geen Mac nuttig voor professionele debugging”.

## 6. Account van de vader en latere overgang naar een onderneming

### Start als individueel lid

- De contractpartij moet de wettelijke meerderjarigheidsleeftijd in zijn rechtsgebied hebben; Apple noemt ten minste 18 jaar in veel landen. Een zestienjarige kan deze overeenkomst dus niet zelfstandig dragen. De vader kan met zijn eigen gegevens inschrijven en wordt Account Holder en contractuele verantwoordelijke. [Apple Developer Program License Agreement](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- Een individueel lid of eenmanszaak wordt in de App Store onder de persoonlijke naam van die ontwikkelaar getoond; een organisatie onder haar juridische entiteitsnaam. [Apple: memberships vergelijken](https://developer.apple.com/support/compare-memberships/)
- Lidmaatschap kost 99 USD per lidmaatschapsjaar of lokale valuta waar beschikbaar. [Apple: memberships vergelijken](https://developer.apple.com/support/compare-memberships/)
- Gratis apps kunnen onder de gewone overeenkomst worden verspreid. Voor een betaalde app of In-App Purchases moet de Account Holder de Paid Apps Agreement tekenen en bank- en belastinggegevens invullen. Apple vereist voor uitbetaling relevante belastingformulieren; buiten de VS kan onder andere een W-8-formulier verschijnen. Dit is procesinformatie, geen Nederlands fiscaal advies. [Apple: agreements](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/), [Apple: tax information](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information)
- Inkomsten worden contractueel aan de accountpartij uitbetaald. De vader draagt dus voorlopig verantwoordelijkheid voor overeenkomsten, correcte gegevens, reviewcommunicatie, betalingen en accountbeveiliging. De fiscale behandeling moet met een Nederlandse deskundige/KVK worden vastgesteld.

### Omzetten van individueel naar organisatie

Apple laat een verzoek tot omzetting toe wanneer het individuele lid founder/cofounder van de organisatie is. Apple vraagt onder andere een D-U-N-S-nummer en kan bedrijfsdocumenten verifiëren. Een rechtspersoon moet door Apple als legal entity worden erkend; Apple meldt dat een eenmanszaak als individueel account moet inschrijven. [Apple: accountgegevens bijwerken](https://developer.apple.com/help/account/membership/updating-your-account-information), [Apple: D-U-N-S](https://developer.apple.com/help/account/membership/D-U-N-S/)

Dit maakt omzetting aantrekkelijker dan een apptransfer als de vader daadwerkelijk founder/cofounder van de toekomstige entiteit is en Apple die entiteit accepteert. Als dat niet klopt, is een transfer naar een apart organisatieaccount waarschijnlijk de zuiverdere route. Apple moet de concrete Nederlandse constructie vooraf bevestigen.

### App overdragen naar een ander zakelijk account

Een transfer kan pas wanneer minstens één appversie op de App Store is uitgebracht; een alleen-TestFlight-app voldoet dus niet. De accounts mogen niet in een pending/change-status staan, overeenkomsten moeten actueel zijn en de app mag niet in review of bepaalde andere statussen staan. [Apple: transfercriteria](https://developer.apple.com/help/app-store-connect/transfer-an-app/app-transfer-criteria/)

Bij een geldige transfer blijven de app beschikbaar, reviews en ratings behouden, gebruikers updates ontvangen en de Bundle ID behouden. De App ID gaat mee. Verkoop- en betalingsrapporten worden rond de transfer gesplitst; App Analytics gaat volgens Apple naar de ontvanger, terwijl de verzender historische verkoopgegevens behoudt. [Apple: app transfer](https://developer.apple.com/help/app-store-connect/transfer-an-app/overview-of-app-transfer/)

Belangrijke gevolgen:

- **TestFlight:** vóór transfer moeten beta testing, builds/testers en gelokaliseerde testinformatie worden verwijderd. Plan dus een testpauze en exporteer noodzakelijke informatie.
- **Authenticatie:** Supabase-accounts zelf zitten buiten Apple en hoeven niet te worden gemigreerd zolang COMPR dezelfde backend en user-ID's houdt. Safari-bundle/team-gerelateerde callback- of associated-domainconfiguratie moet wel opnieuw worden gecontroleerd.
- **Keychain:** behandel teamgebonden keychain sharing als transfergevoelig. COMPR gebruikt dit nu niet; voeg het alleen toe met een gedocumenteerd migratieplan.
- **App Groups:** Apple noemt beperkingen en herregistratie. Vermijd gedeelde App Groups tenzij ze aantoonbaar nodig zijn. Een Mac-app die sandbox/App Group-containers deelt met andere Mac-apps kan zelfs niet overdraagbaar zijn onder de genoemde criteria.
- **Sign in with Apple:** COMPR gebruikt dit nu niet. Als het later wordt toegevoegd, vereist transfer een afzonderlijke officiële gebruikers-/sleutelmigratieprocedure. Voeg het niet alleen voor de Safari-port toe.
- **Abonnementen:** auto-renewable subscriptions kunnen meegaan, maar vóór transfer moet een app-specific shared secret worden gedeeld; na transfer maakt de ontvanger een nieuw secret. Servers en ontvangstvalidatie moeten gecontroleerd worden.
- **Servernotificaties:** behandel App Store Server Notifications, StoreKit-sleutels en endpoints als overdrachtsrunbook: inventariseren, eigenaarschap wijzigen, nieuwe credentials, sandbox én production end-to-end testen. Apple documenteert niet op één transferpagina dat elke COMPR-specifieke notificatieconfiguratie automatisch correct blijft.

### Nu al technisch vermijden

1. Geen Apple Team ID, persoonlijk e-mailadres of verkopersnaam hardcoderen in gedeelde JS/backend.
2. Eén stabiele Bundle ID kiezen; die is na upload niet wijzigbaar.
3. Geen onnodige App Groups, Keychain-sharing, iCloud-container, push of Sign in with Apple toevoegen.
4. Auth en entitlements aan eigen stabiele COMPR-user-ID's koppelen, niet alleen aan Apple receipt/account/team.
5. StoreKit-validatie en servernotificatieconfiguratie achter configureerbare serveradapters plaatsen; secrets nooit in de extensie.
6. Broncode, signingassets, App Store-metadata, agreements en operationele stappen documenteren.
7. App-specifieke shared secrets gebruiken als abonnementen worden ingevoerd.

## 7. Verdienmodellen

De basisregel van Apple is dat digitale functionaliteit die in de app wordt ontgrendeld In-App Purchase moet gebruiken. Multiplatformdiensten mogen eerder elders gekochte toegang laten gebruiken wanneer diezelfde toegang ook als IAP in de app beschikbaar is. Een beperkte uitzondering bestaat voor gratis stand-alone companions zonder aankoop of aankoopoproep, maar het is onzeker of Apple COMPR daaronder schaart. De precieze toepassing op een Safari Web Extension moet vóór monetisatie schriftelijk bij Apple Developer Support worden bevestigd. [Apple App Review Guidelines §3.1](https://developer.apple.com/app-store/review/guidelines/)

| Model | Regels/commissie | Werk en transferrisico | Geschiktheid eerste validatie |
|---|---|---|---|
| Gratis extensie | Geen IAP nodig; 99 USD/jaar account blijft | Minimaal; backendkosten blijven | **Beste eerste beta** |
| Eenmalig betaalde download | Paid Apps Agreement; App Store-commissie. Small Business Program kan 15% bieden | Eenvoudiger dan abonnement, maar entitlement/herinstallatie en transfer testen | Redelijk, maar remt eerste gebruikers |
| Freemium | Gratis basis; digitale Pro-unlock hoort via IAP | StoreKit, receipt/transaction-validatie, herstel aankopen, entitlementmapping | Goed na productvalidatie |
| Apple IAP (eenmalig) | Vereist voor een digitale unlock in de app | Serveradapter en transferrunbook | Mogelijk voor “lifetime Pro”, niet nu |
| Auto-renewable abonnement | StoreKit + subscription group; normaal 70% opbrengst in jaar 1 en 85% daarna; Small Business-deelnemers 85% vanaf dag één, minus belastingen | Meeste backend-, support- en transferwerk | Waarschijnlijk beste duurzame Pro/Ultimate-route, pas na validatie |
| Alleen bestaand webabonnement + login | Reviewrisico: multiplatformregel verlangt doorgaans dat dezelfde features ook via IAP beschikbaar zijn; storefront-/entitlementregels verschillen | Dubbele billing/entitlements of Apple-uitzondering nodig | Niet als onbewezen eerste App Store-model |
| Gratis beta, later betaald | Gratis distributie en TestFlight; later nieuw reviewmoment voor StoreKit/IAP | Lage initiële complexiteit; entitlementontwerp later | **Aanbevolen fasering** |

Het App Store Small Business Program biedt kwalificerende nieuwe/kleine ontwikkelaars een commissie van 15% op betaalde apps en IAP tot de voorwaarden/omzetgrens; deelname en gelieerde accounts moeten correct worden opgegeven. [Apple Small Business Program](https://developer.apple.com/app-store/small-business-program/) Bij normale auto-renewable subscriptions ontvangt de ontwikkelaar volgens Apple 70% in het eerste betaalde jaar en 85% daarna; Small Business-leden ontvangen 85% vanaf dag één, telkens minus toepasselijke belastingen. [Apple subscriptions](https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/)

**Aanbevolen:** start gratis via TestFlight en eventueel een gratis App Store-beta. Voeg pas na bewezen gebruik Apple auto-renewable subscriptions toe voor Pro/Ultimate, met één server-side entitlementbron die Chrome/web en Safari bedient. Laat de huidige Stripe-flow uitgeschakeld. Vraag Apple vóór bouw expliciet of COMPR als gratis companion met alleen bestaande web-login onder §3.1.3(f) zou vallen; ga er niet van uit.

## 8. Privacy en App Review

### Verwachte App Privacy Details

Apple verlangt dat de privacy-antwoorden ook gegevens omvatten die externe partners verzamelen en dat het doel, tracking en koppeling aan identiteit correct worden aangegeven. “Collected” betekent bij Apple grofweg: van het apparaat verzonden en langer bewaard dan noodzakelijk om het realtime verzoek uit te voeren. [Apple: App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)

Op basis van de huidige architectuur moeten minimaal de volgende categorieën feitelijk worden nagegaan vóór indiening:

| Apple-categorie | COMPR-relevantie | Voorlopige behandeling |
|---|---|---|
| Email Address | Supabase-login | waarschijnlijk collected en linked voor app functionality/account management |
| User ID | Supabase/COMPR-account-ID | waarschijnlijk collected en linked |
| Browsing History | bezochte product-URL of webshopcontext kan worden verzonden/opgeslagen | exact payload/logretentie controleren; minimaliseren en zo nodig declareren |
| Search History | Find This Cheaper-query/productzoekopdracht | waarschijnlijk declareren als die server-side langer dan realtime wordt bewaard |
| Other User Content | producttitel, variant, handmatig opgeslagen data | beoordelen op uiteindelijke serverpayload versus alleen lokale opslag |
| Product Interaction / diagnostics | alleen als serverlogs/telemetrie dit bewaren | geen analytics toevoegen; operationele logs exact auditen |
| Purchases | pas bij StoreKit/abonnementen | later label en policy aanpassen |

Lokaal-only opgeslagen producten zijn volgens Apples definitie niet door de ontwikkelaar “collected”. Het versturen naar COMPR, Supabase of een zoekprovider kan dat wel zijn. Providers, doeleinden en bewaartermijnen moeten overeenkomen met `PRIVACY_DATA_AUDIT.md`, `V.0.3-prototype/privacy.md` en `website-live/privacy.html`; niet alleen de ideale architectuur maar de productieconfiguratie telt.

COMPR bevat geen advertentie-SDK of cross-app trackingontwerp. Dat wijst waarschijnlijk op “not used for tracking”, maar dit is pas bevestigbaar na controle van alle productieproviders en SDK's. Voeg geen trackingpermission toe wanneer er niet wordt getrackt.

### Apple-specifieke aanvullingen

- publieke Privacy Policy URL in App Store Connect;
- exact App Privacy-label per gegevenscategorie, doel en linkability;
- uitleg dat Safari-gebruikers websitepermission beheren en dat productinformatie pas na hun actie wordt verwerkt;
- onderscheid tussen lokaal opgeslagen producten en serverrecords;
- lijst van COMPR-backend, Supabase en feitelijk gebruikte zoekprovider;
- platform-specifieke accountverwijderingsinstructie;
- contact- en privacykeuzelink;
- verwijzing naar App Store-betalingen en Apple-data wanneer StoreKit later wordt gebruikt;
- retentie/deletiontekst identiek aan de geïmplementeerde backendinstellingen.

Apple vereist voor apps met accountcreatie dat gebruikers accountverwijdering vanuit de app kunnen initiëren; volledige accountdata moet worden verwijderd behalve wettelijk vereiste bewaring. De bestaande COMPR-flow is conceptueel geschikt, maar moet in de Safari-container/extension makkelijk vindbaar en end-to-end getest zijn. [Apple: account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)

Voor encryptie moet App Store Connect correct worden beantwoord. Alleen OS-geleverde standaard HTTPS is volgens Apple doorgaans vrijgesteld van document-upload; dit moet op de uiteindelijke app inclusief libraries worden beoordeeld. `ITSAppUsesNonExemptEncryption = NO` mag alleen worden gezet als werkelijk uitsluitend geen of vrijgestelde encryptie wordt gebruikt. [Apple: export compliance](https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations), [Apple: Info.plist key](https://developer.apple.com/documentation/bundleresources/information-property-list/itsappusesnonexemptencryption)

## 9. Aanbevolen gedeelde architectuur

Gebruik geen Safari-fork. Richt bij uitvoering één repositorystructuur in volgens dit model:

```text
shared core
├── productherkenning en detectors
├── productnormalisatie en matching
├── API-, auth- en opslaginterfaces
├── popup/compare UI en i18n
└── gedeelde unit- en contracttests
platform adapters
├── Chrome: chrome.* adapter + Chrome-manifest
└── Safari: WebExtension-adapter + Safari-manifest/config
packaging
├── Chrome build/ZIP-route
└── Safari App Store Connect- of Xcode-route
```

Concreet:

- definieer een kleine `browserApi` voor storage, actieve tab, injectie, tab openen, runtime-URL en messaging;
- houd detectors, productidentity, matchbeleid, API-schema's en backend volledig gedeeld;
- maak Chrome- en Safari-manifests vanuit expliciete platformconfiguratie, zonder localhost in productie;
- maak UI responsive maar gebruik dezelfde componenten/HTML/CSS;
- laat auth een gedeelde Supabase/COMPR-laag houden, met alleen een platformspecifieke callbacktransport-adapter;
- test corefuncties één keer en voeg per platform kleine contract-/smoketests toe;
- houd signing, Bundle IDs, App Store-assets en packaging buiten de gedeelde bron;
- voeg pas native Swift toe als een bewezen auth- of containerbehoefte dat vereist.

Raming hergebruik: **80–90% van de huidige core JavaScript/HTML/CSS** en **70–85% van het totale Safari-productwerk**. Het verschil bestaat uit manifest/config, responsieve UI, auth-handoff, permissions/onboarding, containerassets, packaging en platformtests. Dit is een inschatting, geen meetresultaat van een gebouwde port.

## 10. Tijd, kosten en risico's

Onderstaande tijd is een technische raming voor één ontwikkelaar die de code kent; Apple-reviewwachttijd en onvoorziene webshops verschillen. Geen offerte of garantie.

| Resultaat | Realistische bandbreedte |
|---|---:|
| Safari Mac-prototype | 1–3 werkdagen |
| iPhone/iPad-prototype met productflow | 3–7 werkdagen |
| Volledige iPhone/iPad/Mac-beta incl. auth/privacy/device-tests | 2–4 weken |
| App Store-klare release incl. metadata/reviewfixes | 3–6 weken plus Apple-review/accounthandling |
| Onderhoud per release | circa 0,5–2 werkdagen plus regressie-/reviewtijd |

Minimale directe kosten:

- Apple Developer Program: 99 USD per jaar of lokale prijs;
- packaging via App Store Connect: inbegrepen, waarbij Apple 25 Xcode Cloud-compute-uren per maand noemt;
- testapparatuur: €0 als geschikte iPhone/iPad/Mac kan worden geleend; anders marktprijs;
- eigen Mac: niet noodzakelijk voor web-packaging, maar geleende/gehuurde Mac-toegang is een verstandige risicobuffer;
- bestaande backend/providerkosten blijven apart en moeten vóór livegang uit dashboards worden bevestigd.

### Vijf grootste risico's

1. **Mobiele auth-handoff:** magic link verlaat de popup en keert mogelijk niet betrouwbaar terug; OTP moet eerst bewezen worden.
2. **Echte webshopcompatibiliteit:** mobiele DOM's, cookie-/consentlagen en Safari-injectie kunnen productextractie beïnvloeden.
3. **App Review/monetisatie:** alleen extern webabonnement kan met §3.1 botsen; vooraf Support vragen en later IAP ontwerpen.
4. **Account-/eigendomsoverdracht:** alleen-TestFlight is niet transferbaar; App Groups, Keychain, Sign in with Apple en subscriptions verhogen migratierisico.
5. **Geen lokale Apple-debugomgeving:** de web-packager verlaagt de instapdrempel, maar moeilijke iOS-lifecycle- en signingproblemen kosten zonder Mac meer iteraties.

## 11. Routevergelijking en beslisadvies

| Criterium | Route A: Chrome eerst volledig | Route B: nu Safari-first | Beste gecombineerde route |
|---|---|---|---|
| Snelheid tot toestemming vader | mogelijk lager | waarschijnlijk hoger door TestFlight/App Store-controle | korte Safari-spike na gedeelde techniek |
| Snelheid tot eerste gebruikers | hoog zodra Chrome-review klaar is | lager door account, packaging en beta review | Chrome gereedhouden, Safari direct erachter |
| Kosten | laag | 99 USD/jaar + Apple-testtoegang | kosten pas aangaan na iPhone-spikeplan/goedkeuring |
| Technische moeilijkheid | laagste | extra mobile/auth/packaging | gedeelde laag voorkomt duplicatie |
| Mobiele bruikbaarheid | geen iPhone-Safari | sterk potentieel | Safari-port levert mobiel kanaal |
| Betaald testen | web/Stripe later | IAP/App Store mogelijk, extra werk | eerst gratis valideren |
| Reviewrisico | Chrome-regels | Apple privacy, account deletion, §3.1 | reviews gescheiden behandelen |
| Hergebruik | uitgangspunt aanwezig | 70–85% totaal geschat | hoogste hergebruik |
| Afhankelijk vader | bestaande bedrijfsbeslissing | extra: Account Holder/contractpartij | vooraf schriftelijke rollen/exitroute |
| Later onderneming | webassets eenvoudig | omzetting/transfer mogelijk maar voorwaarden | transferarme architectuur vanaf dag één |

**Definitief advies: eerst Chrome technisch afronden en direct daarna Safari porten.** “Afronden” betekent hier de gedeelde code stabiel houden, niet per se Chrome onmiddellijk publiceren. Begin vervolgens met een afgebakende Safari iPhone-spike en distribueer die gratis via TestFlight zodra de vader het account opent. Dit geeft hem de gewenste gecontroleerde Apple-route zonder de bijna-afgeronde Chrome-investering weg te gooien. Volledig Safari-first zou de kritieke route juist afhankelijk maken van onbewezen mobiele auth, Apple-accountverificatie en App Review.

## 12. Handmatig te verifiëren vóór uitvoering

1. Vader: akkoord met persoonlijke verkopersnaam, Account Holder-verantwoordelijkheid, jaarlijkse kosten en mogelijke ontvangsten.
2. Apple Developer Support: of de beoogde toekomstige Nederlandse entiteit via membership conversion kan, of apptransfer nodig is.
3. Apple Developer Support/App Review: of een gratis COMPR-app met uitsluitend login op een bestaand webabonnement onder §3.1.3(f) valt; niet aannemen.
4. Beschikbare echte apparaten en Safari/iOS-versies voor iPhone, iPad en Mac.
5. Safari-packagercompatibiliteitsrapport na toekomstige upload.
6. Supabase redirect-allowlist, CORS en callbackgedrag voor de werkelijke Safari-build.
7. OTP, magic link, sessievernieuwing, logout en accountverwijdering op echt iPhone-apparaat.
8. App Privacy-antwoorden tegen feitelijke productieproviders, payloads, logs en retentie.
9. Definitieve Bundle ID vóór de eerste buildupload.
10. Bank-, belasting- en ondernemingsvragen met KVK/boekhouder of andere bevoegde deskundige.

## 13. Korte antwoorden

1. **Kan COMPR goed werken op Safari voor iPhone?** Ja, waarschijnlijk. De kern-API's passen, maar popup, sitepermissies en auth moeten op een echt toestel bewezen worden.
2. **Welk percentage van de huidige code lijkt herbruikbaar?** Circa 80–90% van de core en 70–85% van het totale Safari-productwerk.
3. **Is een Mac noodzakelijk?** Niet voor Apples web-packager, TestFlight of indiening. Voor de beste lokale iOS-debugging, simulator, signing en eventuele native aanpassing is Mac-toegang praktisch wel belangrijk.
4. **Wat kost de minimale route?** 99 USD per jaar/lokale Apple-prijs, plus alleen eventuele apparaten/Mac-toegang en bestaande backendkosten; gratis als hardware wordt geleend, afgezien van lidmaatschap.
5. **Kan de vader eerst als individuele ontwikkelaar starten?** Ja, mits hij zelf inschrijft, meerderjarig is en de contractuele Account Holder/verantwoordelijke wordt; zijn persoonlijke naam verschijnt als verkoper.
6. **Kan COMPR later naar een onderneming worden overgedragen?** Ja, via goedgekeurde membership conversion of apptransfer. Een transfer vereist onder meer minstens één publieke App Store-versie; alleen TestFlight is onvoldoende.
7. **Wat moeten we nu technisch vermijden?** Persoons-/Team-ID-hardcoding, onnodige App Groups/Keychain/iCloud/Sign in with Apple/push, client-side secrets en Apple-only user-ID's als primaire accountidentiteit.
8. **Welk betaalmodel is waarschijnlijk het geschiktst?** Eerst gratis TestFlight/App Store-validatie; daarna waarschijnlijk Apple auto-renewable subscriptions gekoppeld aan één gedeelde server-entitlementlaag.
9. **Wat is de grootste blokkade?** De nog onbewezen iPhone end-to-end-flow, vooral Supabase-login/terugkeer naar de extensie, gevolgd door echte webshoppermissies en mobiele DOM's.
10. **Welke route adviseer je uiteindelijk en waarom?** Eerst Chrome technisch afronden en direct daarna Safari porten: maximaal hergebruik en snelheid, terwijl een vroege Safari/TestFlight-spike de vader gecontroleerde validatie geeft zonder twee codebases te creëren.
