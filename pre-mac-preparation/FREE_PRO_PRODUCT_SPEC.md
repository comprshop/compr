# Free + Pro productspecificatie — lokaal ontwerp

**Gekozen richting voor eerste publieke Safari-release:** Free + Pro. De eerste technische TestFlight-build mag alleen de gratis kernflow bevatten. Pro/StoreKit is nog niet actief. Kernmatching, veiligheid en resultaatbetrouwbaarheid zijn voor beide identiek.

| Eigenschap | Free | Pro |
|---|---|---|
| Intro | 5 succesvolle billable checks binnen eerste accountgebonden maand | Niet van toepassing |
| Daarna | 3 succesvolle billable checks per accountgebonden maand | 15 per abonnementsperiode |
| Prijs | €0 | €2,99/maand **richtprijs**, Apple-prijspunt en landenprijs later verifiëren |
| Entitlement | `free` | `pro` na serververificatie |
| Ultimate/onbeperkt/jaar | Geen actief aanbod | Geen actief aanbod |

## Bestaand servercontract

Bronnen: `find-cheaper-backend/supabase/migrations/001_phase1_foundation.sql`, `src/searchService.js` en tests. Intro begint bij Auth-user-aanmaak en eindigt op `intro_period_start + interval '1 month'`, ook wanneer minder dan vijf checks gebruikt zijn. Daarna maandperioden geankerd aan het intro-einde; Pro gebruikt de door entitlement geleverde abonnementsperiode. PostgreSQL `timestamptz`/`now()` bepalen grenzen; geen clienttijd of lokale tijdzone mag quota bepalen. `request_id` is idempotency-sleutel. Reserveringen verlopen na 90 seconden. Alleen uitgevoerde providerzoekacties met voldoende productidentiteit en een betrouwbaar vergelijkbaar aanbod worden billable gecommit.

| Geval | Bestaande of vereiste behandeling |
|---|---|
| Provider-timeout/interne fout/geen resultaten/onbetrouwbare match | Geen check: reservering releasen; bestaande tests bevestigen kerngevallen |
| Cachehit | Geen nieuwe billable check |
| Annuleren/popup sluiten | Geen automatische check beloofd; test late provider/finalize-uitkomst op echt apparaat; serverstatus beslist |
| Retry/dubbele request | Zelfde `request_id` mag geen dubbele check kosten; nieuwe ID is een nieuwe poging |
| Expired reservering | Fail closed, geen billable commit na expiratie |
| Accountwissel/meerdere apparaten | Server bindt quota aan geverifieerde Supabase-user; lokale opslag nooit autoritatief |
| Bestaande Chrome-gebruiker | Zelfde account kan Free-record hebben; betaalde cross-platform entitlement vereist expliciete migratie-/beleidstest |
| Guest | Uit; geen anonieme quota-aanmaak voor Safari-beta |

## Nog te beslissen en implementeren voor Pro

Apple-verifieerde start/einde-periode, renewal, grace/billing retry, downgrade na expiry, refund/revocation, restore, accountkoppeling en cross-device synchronisatie. Bij onbekende/ongeldige StoreKit-status **geen Pro-toekenning**; behoud waar veilig het Free-contract. Geen client-side boolean of Stripe-record als Safari-bewijs. Betaalde accountverwijdering is nu geblokkeerd door bestaand backendcontract en moet vóór betaald publiek aanbod worden opgelost.

Een Pro-aankoop mag bestaande Free-introgebruik niet wissen. Beslis en test hoe een geldige Pro-periode na afloop terugvalt op de Free-periode; geen reset naar vijf introductiechecks. De richtprijs/limiet worden vóór publicatie aan providerkosten en gebruikersdata getoetst.
