# StoreKit-backlog — klein en gescheiden uitvoeren

Geen item hieronder is in deze opdracht geïmplementeerd. P0 = vóór eerste **sandboxaankoop**; P1 = vóór publieke Free + Pro-release; P2 = na validatie.

| ID | Doel/component | Afhankelijkheid | Acceptatie + test | Risico | Mac? |
|---|---|---|---|---|---|
| P0-1 | Definitief Apple team/app/extension IDs en product-ID vastleggen | Account Holder, werkend Xcode-project | Geen conflict, schriftelijk bevestigd; targetinspectie | Identiteit later lastig te wijzigen | Ja |
| P0-2 | StoreKit 2 bridge in container, geen directe extensiebetaling | P0-1 | Mock load/cancel/pending/success; geen autoaankoop | UI/auth grens | Ja |
| P0-3 | Server-contract voor Apple-verificatie met accountbinding | Auth-contract | Ongeldige/andere user/JWS faalt; geen Pro op clientclaim | Entitlementfraude | Backend lokaal + Mac |
| P0-4 | Apple-JWS-signatuur, bundle/product/environment/tijd valideren | P0-3 | Gemuteerde/replayed/sandbox-in-prod cases falen | Verkeerde toekenning | Backend lokaal |
| P0-5 | Atomic Apple-entitlement en 15-check-periode ontwerpen/migreren | P0-4 | Eén transaction ID = één status; quota concurrency test | Dubbel tellen | Backend lokaal |
| P0-6 | Sandboxproduct later in App Store Connect aanmaken | P0-1, bevoegd houder | Product verschijnt in signed build; geen live koop | Accountactie | Ja/human |
| P0-7 | Eerste sandboxaankoop op fysiek toestel | P0-2..6 | `/v1/me` toont Pro pas na backendbewijs; 15-checkgrens | Geld/gegevens | Ja |
| P1-1 | Restore + tweede device | P0-7 | Zelfde account krijgt één entitlement; ander account niet | Accountkoppeling | Ja |
| P1-2 | Notifications V2 + idempotent webhook | P0-4/5 | Signed duplicate/out-of-order/refund/renewal tests | Drift | Backend + human config |
| P1-3 | Expiry/grace/retry/revoke/refund/reconcile | P1-2 | Fail-closed matrix + klokgrenzen | Onterechte toegang | Backend/Mac |
| P1-4 | Betaalde accountverwijdering, records en retention | P0-5, legal | In-app start, geen misleidende succesmelding | Privacy/App Review | Backend/Mac/human |
| P1-5 | Prijs-/voorwaarden-/privacy-/supportteksten en Apple-labels | Echte prijs/landen | Menselijke review en screenshotcontrole | Misleiding | Human |
| P1-6 | Free/Pro/Chrome-regressie en kostengrens | P0/P1 | Quota, matching en Chrome ongewijzigd | Financieel/kwaliteit | Beide |
| P2-1 | Gecontroleerde analytics zonder tracking | Toestemming/privacybesluit | Alleen geaggregeerd en expliciet toegestaan | Privacy | Nee |
| P2-2 | Prijs/limiet op echte kosten bijstellen | Cohortdata | Nieuw besluit, bestaande gebruikers correct behandeld | Vertrouwen | Nee |
