# TestFlightmatrix — invulblad, niets uitgevoerd

Vul **per rij en per platform** in: `buildnummer=___`, `werkelijk resultaat=___`, `PASS/FAIL/BLOCKED=___`, `bewijsbestand=___`. Platformcodes: M=Mac Safari, I=iPhone Safari, P=iPad Safari indien beschikbaar, C=Chrome-regressie. Gebruik echte op testmoment genoteerde bronprijs en URL; verzin geen actuele prijzen.

| ID | Platform | Doel/setup | Stappen | Verwacht |
|---|---|---|---|---|
| T01 | M/I/P | Installatie, signed build | Installeer container | App en extensie zichtbaar |
| T02 | M/I/P | Inschakelen | Safari Extensions > COMPR | Uit/aan werkt, geen onverwachte host |
| T03 | M/I/P | Toestemming | Ask, Deny, Allow op één productsite | Deny injecteert/zoekt niet; Allow alleen gekozen site |
| T04 | M/I/P/C | Login OTP | Vraag code na expliciete actie aan | Succes/fout zonder accountenumeratie of tokenlog |
| T05 | M/I/P | Magic link | Open link op zelfde toestel | Alleen exacte receiver; zichtbare URL direct schoon |
| T06 | M/I/P/C | Sessieherstel | Herstart Safari/extensie | `/v1/me` herstelt geldig account |
| T07 | M/I/P/C | Logout | Meld af | Lokale sessie gewist, `/v1/me` niet meer ingelogd |
| T08 | M/I/P/C | Samsung Galaxy A57 256GB | Productdetail openen | Model/opslag juist; 128GB geen match |
| T09 | M/I/P/C | Sony WH-1000XM5 | Productdetail openen | Geen verwarring met WF/andere generatie |
| T10 | M/I/P/C | JBL Tune 730BT indien verkrijgbaar | Productdetail openen | Exact model, geen naastgelegen generatie |
| T11 | M/I/P/C | Adidas Samba of Nike Air Max met maat | Productdetail openen | Maat blijft vereist |
| T12 | M/I/P/C | Geen goedkoper aanbod | Check starten | Eerlijk no-match, geen billable check zonder betrouwbare match |
| T13 | M/I/P/C | Negatieven | Verkeerd model/opslag/maat, refurbished, accessoire | Alle verkeerde kandidaten afgewezen |
| T14 | M/I/P/C | Paginafilter | Zoek-, categorie- en socialpagina openen | Geen productcheck vanuit zulke pagina's |
| T15 | M/I/P/C | Find This Cheaper | Klik éénmaal op productdetail | Geen request vóór klik/auth; loading zichtbaar |
| T16 | M/I/P/C | Loading/cancel/close | Annuleer en sluit popup tijdens trage request | Geen spookresultaat of dubbele charge |
| T17 | M/I/P/C | Timeout/netwerkverlies | Maak netwerk lokaal onbeschikbaar | Generieke fout, geen billable check zonder match |
| T18 | M/I/P/C | Onveilige URL | Gebruik testfixture/pagina met onveilige kandidaat-URL | Kandidaat afgewezen, geen navigatie |
| T19 | M/I/P/C | Save & Compare | Opslaan, opnieuw opslaan, verwijderen, Clear all | Dedupe en opslag correct |
| T20 | M/I/P/C | Free-intro | 5 gecontroleerde succesvolle billable checks; 6e proberen | 5/5 dan serverblokkade; geen verborgen extra |
| T21 | M/I/P/C | Free-maandgrens | Gecontroleerde testklok/schemafixture | 3 per accountgebonden maand, niet 5+3 |
| T22 | M/I/P/C | Retry/idempotency | Zelfde request-ID tweemaal in veilige test | Eén charge/response |
| T23 | M/I/P/C | Pro-sandbox | **Tweede build pas na StoreKit P0**; koop in sandbox | Pro pas na serververificatie; 15 per periode |
| T24 | M/I/P | Restore/tweede toestel | Zelfde COMPR-account, Apple restore | Eén entitlement, geen duplicaat |
| T25 | M/I/P | Expiry/refund/revoke | Sandbox-simulatie indien ondersteund | Pro vervalt correct; geen fail-open |
| T26 | M/I/P | Restart/reload | App/Safari/extensie herstarten | Sessie en veilige status hersteld |
| T27 | M/I/P | Oriëntatie/klein scherm | Roteer, focus, zoom/Dynamic Type | Geen afgesneden knoppen/tekst |
| T28 | M/I/P/C | Console/netwerk | Inspecteer routes, hosts, logs | Alleen verwachte HTTPS-hosts, geen tokens/PII |
| T29 | C | Bestaande Chrome-flow | Login, `/v1/me`, één gecontroleerde check, Save | Ongewijzigd gedrag |

T20/T21/T23–T25 vereisen een geautoriseerde veilige testomgeving en zijn **niet** uitgevoerd in deze voorbereiding. Leg voor ieder resultaat bronprijs, kandidaatwinkel, verzendkosten, uitvoering en moment vast. Geen echte aankoop in de eerste technische gratis build.
