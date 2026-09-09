# COMPR manual release handoff runbook

This is an operator checklist, not authorization. Record no credentials, tokens, complete sensitive URLs, personal data or database contents. Replace placeholders only in the relevant trusted UI/session. Any failed stop condition means stop with flags off and preserve evidence.

## 1. Before production

| Step | Operator / system | Prerequisite | Evidence | Stop condition | Safe recovery |
|---|---|---|---|---|---|
| Fresh encrypted backup | Production owner / approved backup workstation | BitLocker protection on; approved destination; PostgreSQL 17 tools; production change window | UTC archive name, checksum, inventory and tool versions | Encryption off, export error, unexpected host/version, checksum missing | Make no schema change; correct prerequisite and create a new backup without altering the prior one |
| Archive verification | Backup owner / isolated restore environment | Fresh archive and checksum | checksum match plus successful isolated restore/inventory report | checksum mismatch or restore/object validation failure | Quarantine failed copy; retain prior verified backup; create/verify a fresh archive |
| Schema preflight | DBA / Supabase SQL editor | confirmed project and migrations 001-011 present | schema/object/owner/ACL counts without row contents | wrong project, drift, missing dependency, unexpected owner/ACL | close editor without changes; investigate drift |
| Rollback ownership | Release lead / incident record | named DBA and backend owner available | named decision-maker, window and contact route | no accountable operator or recovery window | postpone release |
| Runtime baseline | Backend owner / Render and Supabase dashboards | authenticated owner session opened directly by owner | current deployed commit; `COMPR_GUEST_ENABLED=false`; Stripe flags false; Anonymous Auth state; exact allowed CORS origins | commit unknown; a flag unexpectedly on; origin too broad | keep/restore flags false; no deployment/migration |
| Migration authorization | DBA / change record | reviewed 012 hash `32dfff80f4862ebe5ff73b2c25391c0a8a8ad0888eae7b8fc4d063f72d96078e`; 013 reviewed | approvals, SQL hashes, backup evidence | SQL/hash differs or service-role boundaries unreviewed | do not run SQL; re-audit forward migration |

## 2. Production backend rollout

| Step | Operator / system | Prerequisite | Evidence | Stop condition | Safe recovery |
|---|---|---|---|---|---|
| Apply 012 | DBA / Supabase SQL editor | all section 1 gates pass; exact audited file loaded | transaction success and postcheck output | any SQL error, timeout or ambiguous transaction state | stop; determine transaction state read-only; use reviewed forward-fix or restore decision—never edit applied migration |
| Apply 013 | DBA / Supabase SQL editor | 012 postchecks pass | transaction success; function owners, fixed search paths, revokes and service-role grants | ownership/ACL/assertion mismatch | keep guest and Stripe off; apply only a reviewed forward correction |
| Postchecks | DBA / Supabase | 001-013 applied | object inventory, indexes, constraints, RLS, function definitions/owners/ACLs; synthetic test IDs only | missing/drifted object or anonymous boundary failure | no activation; forward-fix or approved restore decision |
| Deploy backend | Backend owner / Render | exact audited backend commit `<BACKEND_COMMIT>`; guest and Stripe false | deployment ID/commit, health response, startup logs | wrong commit, unhealthy service, config drift | roll back to prior known-good backend release; flags remain false |
| Normal Chrome smoke | QA / Chrome + backend | healthy backend, normal test account, guest off | `/v1/me`, one safe normal check, account/billing boundary results without sensitive payloads | auth/quota/matching regression | roll back backend; do not enable guest |
| Observe retention/logging | Backend owner / Render logs + Supabase metrics | smoke passed | bounded retention job result and sanitized logs | token, full sensitive URL, PII, repeated errors, unusual load | disable affected feature, restrict access, initiate incident procedure |

Rollback choice belongs to release lead + DBA. Prefer backend rollback for application regressions and a reviewed forward migration for already-committed schema changes. Restore is only for an approved destructive/corruption scenario and uses the verified archive; never improvise destructive SQL.

## 3. Guest activation

| Step | Operator / system | Prerequisite | Evidence | Stop condition | Safe recovery |
|---|---|---|---|---|---|
| Enable Anonymous Auth | Supabase owner / Auth settings | migrations/back end/postchecks and normal smoke pass; CAPTCHA/abuse decision recorded | setting timestamp and owner | unexpected trigger/user foundation behavior or abuse control missing | switch Anonymous Auth off; guest flag stays false |
| Flag-off guest tests | QA / signed client or controlled API test | Anonymous Auth on, `COMPR_GUEST_ENABLED=false` | anonymous identity can be created but guest status/search fails closed | guest search succeeds or billing/founding route opens | disable Anonymous Auth; investigate |
| Enable guest flag | Backend owner / Render | flag-off tests and kill-switch owner ready | deliberate config change and deployment/restart evidence | config ambiguity, unhealthy deploy | set exact flag false and redeploy/restart safely |
| Guest smoke | QA / Safari candidate + backend | guest flag on | status/me; five billable successes; sixth blocked; failure/no-match/cache unbilled; checkout/billing/founding/account deletion rejected; exact reset tested | any over-quota charge, cross-account access or forbidden route | emergency kill switch: set guest flag false; assess data and logs |
| Kill-switch rehearsal | Backend owner / Render | smoke evidence retained | guest-disabled response after false, then separately approved restoration | flag does not fail closed | keep service/guest disabled and escalate |
| Normal regression | QA / Chrome | guest state stable | existing account auth/quota/search unchanged | normal account behavior changes | guest false; roll back backend if required |

## 4. Apple work

| Step | Operator / system | Prerequisite | Evidence | Stop condition | Safe recovery |
|---|---|---|---|---|---|
| Account/team | Apple Account Holder / Apple Developer | legal identity and membership decision | membership/team/role confirmation without credentials | password sharing, wrong entity or unsigned agreements | sign out; correct roles through Apple |
| Convert in Xcode | Mac developer / macOS + Xcode 26+ | validated 48-file converter input; hash/inventory verified | converter version, generated targets and warnings | input differs, fixture/local URL, unsupported API | discard generated local project; restage approved input |
| Identifiers/signing | Account Holder + developer / Xcode portal | deliberate app/extension bundle IDs | IDs, team, entitlements, profiles (no private keys in notes) | wrong team, broad entitlement, signing workaround | remove local generated signing state; correct through Apple UI |
| Device tests | QA / physical iPhone, iPad, Mac | signed debug/TestFlight build | completed `SAFARI_APPLE_TEST_CHECKLIST.md` with OS/Safari/build | crash, permission, quota, layout, accessibility or privacy failure | do not archive/submit; fix and rebuild |
| Archive validation | Mac developer / Xcode Organizer | all required device gates pass | archive/build numbers and validation result | unexpected resources/config/signing | retain evidence; discard bad archive; fix locally |
| App Store record | Account Holder / App Store Connect | final metadata decisions and public support/privacy URLs | record ID and reviewed metadata | invented claim, wrong seller/region/category | save as draft or remove draft via Apple-supported UI |
| Privacy/screenshots | Privacy owner + designer / App Store Connect | final binary/network audit and real device captures | questionnaire export/notes and accepted screenshot set | mismatch with binary/backend or mock state | keep draft; correct disclosure/assets |
| TestFlight | Account Holder / App Store Connect + devices | authorized upload and beta information | processed build and physical beta report | processing/review failure or critical test failure | expire/stop testing for build; submit corrected build |
| App Review/release | Account Holder / App Store Connect | zero open P0/P1; review notes complete | submission ID/status; manual-release approval | rejected metadata/functionality or unresolved issue | keep unreleased; respond truthfully and submit corrected version |

## 5. After Apple approval

| Step | Operator / system | Prerequisite | Evidence | Stop condition | Safe recovery |
|---|---|---|---|---|---|
| Confirm public listing | Account Holder / App Store | approved version genuinely public | real App Store URL and availability check | URL/version not public | keep “Coming soon”; make no website claim |
| Final media | Designer + QA / real devices | public final build | screenshots/video matching actual UI | mock, stale or misleading state | discard asset and recapture |
| Website update | Website owner / local repo then HOST.nl | reviewed minimal diff, backup and real URL | changed-file allowlist, local tests, upload log | unrelated work, broken links, no rollback copy | abort upload or restore exact prior website files |
| Discoverability | Website owner / Google Search Console | public page and sitemap correct | inspection/re-index request only for changed relevant URL | wrong property/canonical or site unavailable | correct site first; do not repeat requests blindly |
