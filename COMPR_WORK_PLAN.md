# COMPR werkplan

Doel: professionele, betrouwbare COMPR voor een betaalde lancering. Beschikbaarheid: 13 uur per week; geen werk gepland op 14-18 september 2026. De eerdere 30-50 uur is een ruwe schatting, geen deadline of kwaliteitsgarantie.

## Werkwijze en grenzen

Deze agent bespreekt en voert goedgekeurde pakketten rechtstreeks met de eigenaar uit. Binnen een pakket: implementeren, gericht testen, controleren, exact toegestane bestanden lokaal committen. Bestaande wijzigingen blijven behouden; client en backend hebben afzonderlijke Git-geschiedenissen. De nested backend wordt nooit in de client gestaged.

Afzonderlijke toestemming nodig voor push (Render Auto-Deploy), productieconnecties/migraties/configuratie, herstel/kopiëren/upload van productiegegevens, installatie/betaalde diensten en Apple-account/signing/TestFlight/publicatie. Geen secrets, persoonsgegevens of back-upinhoud in Git, logs of dit plan.

## Actuele positie (8 september 2026)

- Lokaal gecontroleerd: client `29e8a3bfbe7ca6ab10b00b0db51321e13c5fe478`, backend `b5f371a9682a8342352bd38114e2687433abf066`; beide branch `main`. Geen toepasselijke AGENTS.md gevonden. Historische untracked clientbestanden blijven behouden.
- Live bevestigd: backend `b5f371a9682a8342352bd38114e2687433abf066`; database PostgreSQL 17.6; migratie 012 toegepast en metadata-only nagecontroleerd. `COMPR_GUEST_ENABLED=false`, `COMPR_STRIPE_ENABLED=false` en Supabase Anonymous Sign-Ins staat uit.
- Lokaal: Safari-converterstaging bestaat; huidige output is fixturemateriaal. StoreKit en betaalde Apple-entitlements ontbreken. Apple Developer-lidmaatschap actief volgens eigenaar; Apple-runtime/signing nog niet getest.
- Back-upset `20260906T192616Z` is lokaal werkelijk hersteld en structureel/synthetisch getest. Verse pre-012-set `20260908T131424Z` is structureel geverifieerd. C: gebruikt 100% Used Space Only Encryption met BitLocker Protection On; de eigenaar accepteert dit expliciet voor deze na activering gemaakte back-ups.

## Werkpakketten

| Pakket | Status | Resultaat / bewijs |
|---|---|---|
| 1. Schemafase verifier, back-uptools en herstelvoorstel | Afgerond | Backendcheckpoint `c60e8e3f98a83ce141025d3a9fccd1fad7dc7dd5`; 102/102 backendtests; 27 inventory- en 42 exportveiligheidstests; bestaande export structureel pre-012 PASS |
| 2A. Geïsoleerde hersteltest | Afgerond | Volledige pre-012-datarestore en aparte schema-only synthetische tests PASS op officiële Supabase PostgreSQL 17.6-image; exacte container en volume verwijderd |
| 3A. Guestbackend flag-off naar productie | Deels afgerond | Verse pre-012-back-up en postcheck PASS; migratie 012 en backend `b5f371a` live; health en tokenloze fail-closed-smokes PASS. Echte authenticated Chrome-productiesmoke niet bewezen omdat alleen een lokale developmentbuild is geïnstalleerd |
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

## Bewijs pakket 3A

- BitLocker op C: is 100% `Used Space Only Encrypted` met bescherming aan; dit is door de eigenaar expliciet geaccepteerd voor back-ups die na activering zijn gemaakt. Geen BitLockerwijziging uitgevoerd.
- Verse pre-migratieback-up `20260908T131424Z`: hashes, archive, globals, ACL en 106/106 pre-012-inventory PASS. Eerdere herstelde back-up bleef behouden.
- Productiepreflight PASS; migratie 012 is transactioneel toegepast. Postcheck: 9/9 PASS, 38 rijen en 147456 bytes voor `search_requests`; vier service-role-only RPC's, veilige paden/grants en quota-index bevestigd.
- Backend `b5f371a9682a8342352bd38114e2687433abf066` is lineair en zonder force-push naar bestaand `origin/main` gepusht en door Render live gezet. Health: HTTP 200, `live-web`, engine 14. Logs tonen normale start/cleanup en alleen verwachte fail-closed fouten.
- Flag-off-smokes: `/v1/me` zonder token geeft `AUTH_REQUIRED`; `/v1/guest/status` geeft `GUEST_ACCESS_DISABLED`. Een echte authenticated Chrome-flow blijft onbekend: de aanwezige unpacked client gebruikt localhost en is geen productiebuild.
- Volledige pre-push regressie: backend 102/102 plus legacy PASS; client 65/65, core, Find This Cheaper en 2/2 matcherfixtures PASS; manifests, JavaScript-syntax, diff-, secret- en persoonlijke-padcontroles PASS.

## Voorgesteld volgend pakket: 3B activatiegereedheid

Houd guest en Stripe uit. Implementeer en test eerst automatische verwijdering van inactieve anonymous accounts (besluit: 30 dagen), bepaal CAPTCHA/abusebeleid, maak een gecontroleerde productieclient voor een authenticated Chrome-regressiesmoke en bereid daarna Safari/Xcode- en StoreKit-entitlementvalidatie als afzonderlijke pakketten voor. Anonymous Sign-Ins en de guestflag mogen pas na nieuw expliciet go/no-go worden aangezet.
