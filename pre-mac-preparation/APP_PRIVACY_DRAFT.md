# Gegevenskaart — concept, geen juridisch advies

Bronnen: `V.0.3-prototype/privacy.md`, `website-live/privacy.html`, `shared/auth.js`, `shared/storage.js`, `shared/apiClient.js`, backend `src/searchService.js` en migratie 011. De Account Holder/volwassene moet de uiteindelijke verklaring tegen de **getekende binary**, configuratie en echte leverancierscontracten controleren.

| Data/stroom | Huidige werking / gratis Safari-beta | Later met Pro |
|---|---|---|
| Productpagina | Alleen na gebruikersactie: product-URL, naam/merk/model/variant/prijs naar COMPR API | Zelfde kernmatching, niet achter betaalmuur |
| Zoekactie | Backend leidt query af en gebruikt Brave Search; bezoekt kandidaatwinkels via HTTPS voor verificatie | Zelfde, hoger quota |
| Resultaat | Response en request/outcome/billable/fingerprint in serverdata voor idempotency/quota | Zelfde plus entitlementcontrole |
| Auth | E-mail, OTP/magic link via Supabase en geconfigureerde mailprovider Brevo; minimale sessietokens in extension storage | Koppeling aan Apple-transactiebewijs, geen Apple-loginclaim |
| Lokale opslag | Saved products, voorkeuren en sessie via `storage.local`; gebruiker kan wissen | Native gedeelde opslag alleen na bewezen behoefte/App Group-review |
| Quota | Serverdata over intro/maand en verbruik; geen clientcounter als bron van waarheid | 15 per bewezen abonnementstermijn |
| Betaling | Geen betaling/Stripe in Safari-beta | StoreKit 2; noodzakelijke Apple-transactie-ID, product, status en tijd in backend; exact ontwerp/retentie nog open |
| Logs | Backend beperkt methode/route en foutcode; netwerkproviders zien normale metadata | Geen tokens/JWS/e-mail in logs; audit vóór release |

Bestaande standaardretentie volgens backend README/migratie: search records 30 dagen, beëindigde usageperioden 90 dagen na einde, verlopen checkoutreserveringen 1 dag, product/couponcache 24 uur; configuratie kan binnen grenzen afwijken. **Productie-instellingen en providerlogretentie moeten menselijk worden bevestigd.** Lokale opgeslagen producten blijven tot wissen/clear/uninstall. Accountverwijdering vraagt `DELETE` plus finale bevestiging en wist na backendbevestiging lokale data; bestaande backend blokkeert automatische verwijdering voor een account met abonnement. Dat is vóór betaald Pro een blocker.

Leveranciers volgens huidige privacytekst: Supabase (auth/data), Brevo (authmail), Render (hosting), Brave Search (queries), websitehost, ECB (valuta), benaderde retailers en Outlook voor vrijwillige supportmails. Apple komt pas in het toekomstige StoreKit-pad bij. Geen analytics-SDK, trackingpixel of advertentietracker in huidige build beweerd; hercontroleer netwerk/binary op Mac.

Doel/rechtsgrond, landen, bewaartermijnen, kinderen, verzoekrechten, financiële bewaarplicht, Apple privacylabels en wettelijke vertegenwoordiging vereisen menselijke/juridische beoordeling. Geen betaalde datastroom of retentionclaim publiceren vóór implementatie en verificatie.
