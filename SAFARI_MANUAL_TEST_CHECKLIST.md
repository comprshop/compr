# COMPR Safari handmatige testchecklist

Vul alleen echte resultaten in. Gebruik `PASS`, `FAIL` of `BLOCKED`, noteer apparaat/OS/Safari/build en voeg geen tokens, volledige e-mailadressen, magic links of gevoelige URL-query's toe.

## Testgegevens

- Buildnummer:
- Datum:
- Tester:
- Apparaat/model:
- OS- en Safari-versie:
- Netwerkconditie:

## Installatie en permissions — iPhone/iPad/Mac

- [ ] Containerapp installeert en opent zonder crash.
- [ ] Safari toont COMPR onder Extensions.
- [ ] Uitgeschakelde extensie verzamelt of verzendt niets.
- [ ] Onboarding legt correct uit hoe COMPR wordt ingeschakeld.
- [ ] “Ask”/geen sitepermission geeft een begrijpelijke melding, niet “geen product”.
- [ ] “Deny” verzendt geen producttitel, variant of URL.
- [ ] “Allow” voor één webshop laat herkenning na de bewuste COMPR-actie toe.
- [ ] Er wordt geen permanente toegang tot alle websites gevraagd.
- [ ] Uitschakelen voor een site stopt herkenning en verzending onmiddellijk.
- [ ] Private Browsing-gedrag komt overeen met de getoonde Safari-instelling.

## Productherkenning en Find This Cheaper

Test minimaal vijf retailers en zowel mobiele als desktop-layout waar beschikbaar. Noteer alleen domein en een geredigeerde productomschrijving.

- [ ] Product met JSON-LD wordt correct herkend.
- [ ] Product met alleen Open Graph/zichtbare DOM wordt correct herkend.
- [ ] Normale categorie-/zoek-/artikelpagina wordt niet als product geaccepteerd.
- [ ] Ontbrekende afbeelding toont een nette fallback.
- [ ] Zeer lange productnaam blijft leesbaar en breekt de layout niet.
- [ ] Productdetails blijven lokaal totdat “Find This Cheaper” wordt gestart.
- [ ] Find This Cheaper toont loading en blokkeert dubbelklikken.
- [ ] Exacte model-, opslag-, maat-, kleur-, conditie- en packregels blijven streng.
- [ ] Eén betrouwbare goedkopere match wordt correct getoond.
- [ ] Geen betrouwbare match toont geen misleidend alternatief.
- [ ] Provider-time-out/offline verbruikt geen zoektegoed en toont retry.
- [ ] Een late response na sluiten/nieuwe actie overschrijft geen nieuwere status.
- [ ] Resultaat opent uitsluitend als HTTP(S)-URL in Safari.
- [ ] Terugkeren naar de oorspronkelijke winkel en COMPR werkt.

## Save & Compare

- [ ] Product opslaan, dedupliceren en verwijderen werkt.
- [ ] Opgeslagen producten overleven sluiten/heropenen van Safari.
- [ ] Comparepagina opent op iPhone, iPad en Mac.
- [ ] Zoeken, filteren, sorteren en groeperen blijven werken.
- [ ] Ontbrekende afbeeldingen/prijs/beleid veroorzaken geen kapotte kaart.
- [ ] Lokale data wordt niet ten onrechte tussen apparaten beloofd of getoond als gesynchroniseerd.

## Authenticatie en account

- [ ] OTP-aanvraag toont een generieke status zonder volledig e-mailadres te loggen.
- [ ] Nieuwste achtcijferige OTP werkt na terugkeer vanuit de mailapp.
- [ ] Verkeerde/verlopen OTP geeft een veilige fout zonder interne details.
- [ ] Popup sluiten tussen aanvragen en invoeren verliest de veilige pending state niet.
- [ ] Geldige sessie herstelt na Safari-/apprestart.
- [ ] Verlopen sessie refresht één keer, ook bij gelijktijdige aanvragen.
- [ ] Gefaalde refresh wist de ongeldige sessie en vraagt opnieuw in te loggen.
- [ ] Magic-linkterugkeer is apart getest; zo niet: markeer BLOCKED en gebruik OTP als releaseflow.
- [ ] Logout trekt de sessie server-side in en wist lokale tokens.
- [ ] Account verwijderen vereist `DELETE` plus definitieve bevestiging.
- [ ] Annuleren verwijdert niets.
- [ ] Serverfout toont geen succes en bewaart een herstelbare toestand.
- [ ] Succes verwijdert account, gekoppelde verwijderbare data en lokale COMPR-data; oude sessie werkt niet meer.

## Lifecycle en netwerk

- [ ] Serviceworker wordt bewust lang genoeg gesuspendeerd; badge, rates, messaging en sessie herstellen.
- [ ] Wisselkoerscache werkt na restart en faalt veilig offline.
- [ ] Langzaam 3G-achtig netwerk toont voortgang en timeout zonder vastlopende knop.
- [ ] Volledig offline gedrag is begrijpelijk en retry werkt na herstel.
- [ ] Popup sluiten tijdens actieve zoekopdracht veroorzaakt geen dubbele serveractie.
- [ ] Achtergrond/voorgrond en schermvergrendeling veroorzaken geen dataverlies.

## Mobiele UX en toegankelijkheid

- [ ] iPhone portrait en landscape hebben geen horizontale scroll.
- [ ] iPad split view en volledig scherm blijven bruikbaar.
- [ ] Mac-popup en comparepagina behouden het bestaande ontwerp.
- [ ] 200% zoom laat alle functies en tekst bereikbaar.
- [ ] Softwaretoetsenbord bedekt OTP/e-mailactie niet blijvend.
- [ ] Alle aanraakdoelen zijn praktisch minimaal 44×44 pt.
- [ ] Toetsenbordfocus is zichtbaar en logisch; Escape sluit dialogs waar verwacht.
- [ ] VoiceOver leest labels, statusupdates, knoppen en dialogtitel in logische volgorde.
- [ ] Contrast is visueel/meetbaar voldoende in light mode en systeeminstellingen.
- [ ] Reduced Motion voorkomt niet-essentiële beweging.
- [ ] Safe areas/notch/home indicator bedekken geen bediening.

## TestFlight en releasepoort

- [ ] Interne TestFlight-installatie en update werken.
- [ ] Eerste external Beta App Review-status is vastgelegd indien gebruikt.
- [ ] Build bevat geen tests, `.env`, docs, demo, localhost, secrets of oude ZIP.
- [ ] App Privacy Details komen overeen met werkelijke payloads/providers/retentie.
- [ ] Privacy- en supportlinks openen en accountverwijdering is makkelijk vindbaar.
- [ ] Stripe, checkout, portal en Apple-betalingen blijven uitgeschakeld.
- [ ] Geen P0/P1-fout staat open vóór verdere indiening.

## Resultaat

- Eindstatus:
- Open P0/P1-problemen:
- Her-test vereist:
- Besluit (niet publiceren / nieuwe beta / klaar voor afzonderlijke releasebeslissing):
