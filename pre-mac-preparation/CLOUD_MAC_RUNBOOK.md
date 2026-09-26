# Cloud-Mac sessies — providerneutraal draaiboek

Voorlopige kandidaat: MacInCloud Pay-As-You-Go; huidige beschikbaarheid/prijs **niet** gecontroleerd. Start pas nadat [menselijke acties](HUMAN_ACTIONS_BEFORE_RENTAL.md) klaar zijn. Geen wachtwoorden in bestanden, logs of chat.

## Sessie 1 — reken op 3–4 uur, alleen gratis kernbuild

| Tijd | Actie/evidence | Stop/herstel |
|---|---|---|
| Vóór huur | Vader bevestigt team/2FA; provider bevestigt geschikte macOS/Xcode, packager/converter, admin, transfer, iPhoneverbinding en opslag; kit/backup/hash gereed | Bij een ontbrekende gate niet huren |
| 0–15 min | `sw_vers`, `xcodebuild -version`, `xcode-select -p`, `df -h`, `date`; controleer veilige netwerktoegang en tool `xcrun --find safari-web-extension-packager` of oudere converter. Zet kit via privé overdracht over; `shasum -a 256` vóór uitpakken | Verkeerde hash/Xcode/klok/opslag/tool: stop, transfereer opnieuw of andere Mac |
| 15–60 min | `verify-mac-handoff.sh`; pak ZIP uit naar nieuwe map; bekijk `xcrun ... --help`; Apple noemt nu `safari-web-extension-packager` (oude naam converter). Gebruik helper alleen wanneer geïnstalleerde tool/flags overeenkomen; anders handmatig uit Apple-doc. Inspecteer gegenereerd Xcode-project/targets/host permissions, kies identifiers niet blind | Onverwachte runtime/host/permission/converterwaarschuwing: stop en leg redacted bewijs vast |
| Daarna | Account Holder kiest juist team, ondertekent waar nodig, lost provisioning op. Bouw Mac-container lokaal; schakel extensie in Safari in; test permissies/detectie/opslaan zonder echte zoek- of loginactie zolang origin onbekend is | Verkeerd team, bundleconflict, crash, secret in log: stop |
| Indien mogelijk | Koppel fysieke iPhone via providerondersteunde methode; bouw/run iOS-target; test sitepermission, popup en opslag. Meet exact receiver en `/v1/me` Origin op Mac/iPhone na restart; noteer alleen niet-geheime waarden in waardenblad | Missing/`null`/instabiele origin: geen CORS/callbackwijziging |
| Einde | Bewaar lokaal project/targetinstellingen, manifest van wijzigingen, redacted buildlogs/screenshots, buildnummer, gemeten waarden en blockers; geen certificaten/keys los exporteren. Log uit Apple/cloudaccounts, volg normale providerprocedure voor tijdelijke bestanden | Als sessie onvolledig: plan sessie 2 vanaf bewijs, niet vanaf gok |

## Tussen sessies — Windows/iPhone

Review de werkelijke Safari receiver/Origin, Supabase redirect-allowlist en Chrome-regressie. Maak een aparte, geteste callback/CORS-patch pas met bewijs. Voor de eerste gratis TestFlight-build blijven StoreKit, Pro en betaalroutes uit. Als iPhone fysiek niet via cloudprovider gekoppeld kan worden, kies een andere testmethode of provider; claim geen apparaatpass.

## Sessie 2 — alleen indien nodig, schat 2–4 uur

Huur pas wanneer afzonderlijke callback/CORS/auth- of StoreKit-wijziging lokaal getest en opnieuw als handoff verpakt is. Herhaal hashes en signing; build Mac/iPhone opnieuw; voer OTP en magic link afzonderlijk uit, controleer `/v1/me`, quota, logout, tokenverwijdering en Chrome-regressie. Daarna pas Product > Archive, Organizer-validatie en eventuele App Store Connect-upload, uitsluitend met expliciete menselijke autorisatie en juiste apprecord/team. TestFlight-processing en installatie zijn aparte stappen. Een Pro-sandboxbuild is pas later zinvol na StoreKit-backend-P0, productregistratie en privacy/voorwaardenreview.

## Universele stopregels

Hashverschil, onbekend team/signing, bundleconflict, onverwachte overeenkomst of betaalvraag, onbedoelde productieconfig, geheim in log, brede sitepermission, CORS-versoepeling, automatische aankoop/providerrequest of onduidelijke Apple-reviewmelding: stop. Geen certificaten, wachtwoorden of magic links in een cloudmap laten staan.

Officiële Apple-bronnen gecontroleerd 2026-09-21: [packager](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari), [Xcode uploadversies](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds), [TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/). Huidige UI/regels opnieuw controleren op de Mac.
