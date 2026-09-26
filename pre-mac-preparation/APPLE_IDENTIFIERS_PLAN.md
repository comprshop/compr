# Identifiers: voorstel, niet geregistreerd

| Type | Voorstel | Betekenis/status |
|---|---|---|
| Appnaam | `COMPR` | Menselijke naam; beschikbaarheid verifiëren |
| Container bundle ID | `nl.getcompr.app` | **Voorstel**, eerst converteroutput en Apple-account controleren |
| Extension bundle ID | `nl.getcompr.app.extension` | **Voorstel**, moet uniek zijn binnen juiste team |
| App Group | `group.nl.getcompr.app` | Alleen indien container en extensie aantoonbaar gedeelde native opslag vereisen |
| Marketing/runtime versie | `0.3.6` | Safari- en Chrome-manifest lokaal beide 0.3.6; Xcode buildnummer later apart |

Bundle-ID's en product-ID's worden na registratie/gebruik moeilijk te wijzigen zonder migratie of nieuwe app. De converter kan eigen targetnamen en identifiers voorstellen; inspecteer die eerst in Xcode. Niets is nu geregistreerd of ingevuld in code.

Huidige websitecallback heeft exact de Chrome receiver `chrome-extension://fpikkglicmmlhkcmnobecnkpomfnnclh/auth-receiver.html`. De Safari receiver en feitelijke `Origin` zijn onbekend. De buildconfig bevat geen Safari-ID. Niet raden en geen brede CORS-regel toevoegen. Gebruik [waardenplan](SAFARI_VALUES_CAPTURE_PLAN.md).

## Toekomstig Pro-product: verschillende velden

| Veld | Voorstel/status |
|---|---|
| Subscription group internal reference name | `COMPR Pro` — alleen App Store Connect/intern |
| Subscription group display name | TODO: menselijk/lokaal vaststellen |
| Product internal reference name | `COMPR Pro Monthly` — intern; niet automatisch zichtbaar |
| Product visible display name | TODO: gebruikersnaam en lokalisatie kiezen |
| Product ID | `nl.getcompr.pro.monthly` — voorstel; na registratie niet licht wijzigen |
| Server entitlement | `pro` — interne COMPR-status na geverifieerde aankoop |
| App Store price point | Richting €2,99/maand; Apple-prijspunt nog selecteren |
| Werkelijke prijs per land | In App Store Connect controleren; niet uit richtprijs afleiden |

Apple onderscheidt interne reference names van zichtbare namen en product-ID's: [subscriptioninformatie](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/auto-renewable-subscription-information), [IAP-velden](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-information), geraadpleegd 2026-09-21. Er is niets geregistreerd.
