# App Store metadata — concept voor review, niet publiceren

Basis: bevroren `safari-mac-day-kit/APP_STORE_METADATA_DRAFT.md`. Oude `COMPR_APPLE_SUBMISSION_PACK.md` noemt guest-only en is **niet** de gekozen publieke Free + Pro-specificatie.

| Veld | Concept / TODO |
|---|---|
| Appnaam | COMPR — TODO: beschikbaarheid en juridische naam bevestigen |
| Subtitel | Vergelijk dezelfde producten — TODO: taal/claimreview |
| Promotietekst | Bekijk op verzoek relevante prijsalternatieven — TODO: App Store-limiet en lokalisatie |
| Categorie | Shopping — TODO: Account Holder bevestigt |
| Keywords | prijsvergelijking, producten, Safari — TODO: ASO/beleid review |
| Support | `<PUBLIC_SUPPORT_URL_REQUIRED>` |
| Marketing | `<PUBLIC_MARKETING_URL_OPTIONAL>` |
| Privacy | `<PUBLIC_PRIVACY_URL_REQUIRED>` |
| Copyright | `<YEAR_AND_LEGAL_RIGHTS_HOLDER_REQUIRED>` |
| Reviewcontact | `<ACCOUNT_HOLDER_INPUT_REQUIRED>` |

## Beschrijving — voorlopig

COMPR is een Safari-extensie voor het bewaren en vergelijken van productgegevens. Wanneer je zelf een prijscheck start, zoekt COMPR naar mogelijke aanbiedingen voor hetzelfde product en controleert het kenmerken zoals model, uitvoering en totale prijs. Resultaten hangen af van beschikbare product- en winkelgegevens. COMPR controleert niet alle winkels en garandeert geen match, laagste prijs of besparing.

Voor de beoogde eerste publieke versie: Free omvat vijf introductiechecks binnen de eerste accountgebonden maand en daarna drie per maand. Een toekomstig Pro-abonnement is bedoeld voor vijftien checks per abonnementsmaand. **Publiceer deze Pro-tekst pas nadat StoreKit, prijs per land, rechten, voorwaarden en apparaten zijn getest.** Kernmatching/veiligheid blijven gelijk voor Free en Pro. Geen Ultimate, onbeperkte checks of jaarabonnement aanbieden.

## Reviewer-notities — TODO na echte build

Installeer container, schakel COMPR in Safari in, sta op één gekozen productpagina site access toe, test productdetectie/Save & Compare en een expliciet gestarte check. Zoek- en categoriepagina's horen niet als product te tellen. Voeg pas na echte device-smoke precieze stappen, testaccountstrategie en eventueel Pro-sandboxuitleg toe. Vraag nooit om een gedeeld productieaccount of token in dit document.

Account Holder/legal moet privacylabels, leeftijd, export compliance, supportcontact, landen, betaalvoorwaarden en actuele App Review-regels bevestigen. Niet suggereren dat onafhankelijkheid, alle retailers of specifieke besparing extern gecertificeerd is.
