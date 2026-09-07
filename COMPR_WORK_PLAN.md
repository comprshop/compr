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
| 2. Geïsoleerde hersteltest | Voorstel; nog niet goedgekeurd | Eerst opslagversleuteling en beschikbare geschikte omgeving bevestigen; werkelijk dataherstel strikt scheiden van synthetische tests |
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

## Voorgesteld volgend pakket: 2A geïsoleerde herstelomgeving

Nog apart goed te keuren. Eerst moet de eigenaar actieve versleuteling van de gekozen lokale opslag via een bevoegde Windows-controle bevestigen. Daarna: maak een disposable PostgreSQL 17/Supabase-compatibele Dockeromgeving met een intern netwerk zonder productieroutes; inventariseer en map uitsluitend vereiste extensies/rollen; voer eerst een synthetische restore-dry-run uit; leg fail-closed restore- en verwijdergrenzen vast; en test metadata, constraints, RLS en functies met synthetische records. Een restore van de echte back-up blijft een afzonderlijke gevoelige handeling en wordt pas uitgevoerd na expliciete toestemming, bevestigde versleuteling en een vooraf gecontroleerde exacte cleanupscope.
