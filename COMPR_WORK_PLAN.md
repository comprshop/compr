# COMPR werkplan

Doel: professionele, betrouwbare COMPR voor een betaalde lancering. Beschikbaarheid: 13 uur per week; geen werk gepland op 14-18 september 2026. De eerdere 30-50 uur is een ruwe schatting, geen deadline of kwaliteitsgarantie.

## Werkwijze en grenzen

Deze agent bespreekt en voert goedgekeurde pakketten rechtstreeks met de eigenaar uit. Binnen een pakket: implementeren, gericht testen, controleren, exact toegestane bestanden lokaal committen. Bestaande wijzigingen blijven behouden; client en backend hebben afzonderlijke Git-geschiedenissen. De nested backend wordt nooit in de client gestaged.

Afzonderlijke toestemming nodig voor push (Render Auto-Deploy), productieconnecties/migraties/configuratie, herstel/kopiëren/upload van productiegegevens, installatie/betaalde diensten en Apple-account/signing/TestFlight/publicatie. Geen secrets, persoonsgegevens of back-upinhoud in Git, logs of dit plan.

## Vastgestelde uitgangspositie (7 september 2026)

- Lokaal gecontroleerd: client `7da51a95934fc6000a59015320d62b83c4be64fa`, backend `45ae45d36518fbf9e8b840a46aa3cc5c0a1954e2`; beide branch `main`. Geen toepasselijke AGENTS.md gevonden. Historische untracked clientbestanden en ongecommitte back-uptools blijven behouden.
- Door eigenaar live bevestigd, niet opnieuw verbonden: backend `a9156a254638e8e1ca36363d17dcc9d32da5bb47`; database PostgreSQL 17.6; migratie 012 niet live. Guestcode lokaal in `aff3f43c13ce5e469bd46ef3af54b4485170c79c`.
- Lokaal: Safari-converterstaging bestaat; huidige output is fixturemateriaal. StoreKit en betaalde Apple-entitlements ontbreken. Apple Developer-lidmaatschap actief volgens eigenaar; Apple-runtime/signing nog niet getest.
- Back-upset 20260906T192616Z: eerdere hash/TOC-controle geslaagd; geen bewezen restore. Schijfversleuteling onbekend. Een papieren herstelsleutel bewijst geen actieve versleuteling. Geweigerde beheerderscontrole niet omzeilen.

## Werkpakketten

| Pakket | Status | Resultaat / bewijs |
|---|---|---|
| 1. Schemafase verifier, back-uptools en herstelvoorstel | Afgerond | Backendcheckpoint `c60e8e3f98a83ce141025d3a9fccd1fad7dc7dd5`; 102/102 backendtests; 27 inventory- en 42 exportveiligheidstests; bestaande export structureel pre-012 PASS |
| 2A. Geïsoleerde hersteltest | Afgerond | Volledige pre-012-datarestore en aparte schema-only synthetische tests PASS op officiële Supabase PostgreSQL 17.6-image; exacte container en volume verwijderd |
| 3. Guestbackend naar productie | Niet goedgekeurd | Herstelbewijs, retentie/abusebesluit, gecontroleerde migratie 012, flag-off-regressie, activering als laatste |
| 4. Echte Safari/iPhone-validatie | Niet goedgekeurd | Productiegeschikte staging, Mac/Xcode, permissions, UX/accessibility en apparaatchecks |
| 5. Betaalde lancering | Niet goedgekeurd | Betaalmodel vaststellen, echte entitlement-/StoreKit-validatie, herstel aankopen, privacy/support en releasegates |

Actuele Apple-checklist: SAFARI_APPLE_TEST_CHECKLIST.md. Deploymentreferentie: find-cheaper-backend/PRODUCTION_GUEST_DEPLOYMENT_RUNBOOK.md. Back-up- en herstelvoorstel: find-cheaper-backend/DATABASE_BACKUP_RECOVERY.md. Historische audits gelden niet als nieuw testbewijs.

## Beslissingen en voortgang pakket 1

- Schemafase wordt expliciet gekozen: pre-012 vereist 001-011-objecten en weigert elk 012-object; post-012 vereist alle vijf kenmerkende 012-objecten.
- Een los SCHEMA public-TOC-item is optioneel, maar noodzakelijke public-tabellen, data-items, functies, constraints, RLS en grants blijven verplicht. TOC-aanwezigheid bewijst niet de inhoud van SQL-definities of recordherstel.
- Concrete gaten in de ongecommitte exporttool (padgrenzen, libpq-configuratie, TLS en foutafhandeling) worden binnen dit pakket hersteld voordat die broncode wordt gecommit.
- Exporttooling gebruikt een expliciete productiebevestiging, een schone libpq-omgeving, TLS `verify-full` met een gevalideerde publieke PEM-CA-bundel, bestaande beveiligde output en nooit overschrijven. Native foutdetails en configuratiewaarden worden niet gelogd.
- Back-upset `20260906T192616Z` is opnieuw uitsluitend lokaal gecontroleerd: beide hashes PASS, custom archive leesbaar, 106 vereiste pre-012-objecten PASS, nul 012-markers, globalsstructuur PASS. De post-012-negatieve controle faalt zoals bedoeld. Bestanden bleven ongewijzigd. Dit is geen restorebewijs.
- Backend: PowerShell- en JavaScript-syntax PASS, `npm test` 102/102 PASS, legacytest PASS, diff/secret/padcontroles PASS. Alleen synthetische fixturemetadata staat in Git; geen back-upinhoud.
- Herstelarchitectuur staat in `find-cheaper-backend/DATABASE_BACKUP_RECOVERY.md`: archiefcontrole, werkelijk dataherstel en synthetische functietests zijn drie afzonderlijke bewijsniveaus.

## Bewijs pakket 2A

- Lokaal getest met reeds aanwezige officiële image `public.ecr.aws/supabase/postgres:17.6.1.165`, exact op digest vastgezet, netwerk `none`, geen poorten, back-up read-only en een uniek disposable volume.
- Exact-ownerrestore blokkeerde door een managed-platform event-trigger/owner-superuserafwijking. De schone herhaling met expliciet `--no-owner` voltooide zonder meldingen; ACL-verwerking bleef ingeschakeld. Dit bewijst geen exacte productieownership.
- Alle 106 pre-012-vereisten, 26 gevalideerde constraints, nul public-FK-orphans, migratie 011, RLS/grants/sequences en afwezigheid van 012 zijn bevestigd. Alleen aantallen zijn gelezen.
- Afzonderlijke schema-only database: Auth-foundation, normale vijf-checkquota, zesde blokkade, retentie en accountcascade PASS met één synthetische gebruiker in een teruggedraaide transactie; nul residue.
- Container en volume zijn exact verwijderd. Auth-services, Storage, dashboardconfiguratie, Anonymous Auth en productieflags blijven onbewezen. Actieve schijfversleuteling van de back-uplocatie blijft handmatig te bevestigen.

## Voorgesteld volgend pakket: 3A productie-go/no-go en flag-off uitrol

Nog apart goed te keuren omdat dit productiehandelingen omvat. Voer de bestaande productieschema-preflight opnieuw read-only uit, bevestig herstelverantwoordelijke, Anonymous Auth, guestretentie, `COMPR_GUEST_ENABLED=false`, Stripe uit en de toegestane origins. Pas daarna migratie 012 transactioneel toe, verifieer metadata, push/deploy exact de geteste backend met guestflag uit, test de bestaande Chrome-flow en zet de guestflag pas als laatste aan na een afzonderlijk beslismoment.
