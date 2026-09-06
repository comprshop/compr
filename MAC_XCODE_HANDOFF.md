# COMPR Mac/Xcode handoff

Status: Windows preparation only. No Xcode project, Apple identifier, signing asset, archive, upload or release has been created.

The client checkpoint inspected for this handoff is `155d554482cbdb20581ad5b40dbd386ce856fbc1`. The separately versioned backend checkpoint is `aff3f43c13ce5e469bd46ef3af54b4485170c79c`; backend files and credentials are not part of the Mac transfer.

## 1. Decisions before renting a cloud Mac

Do not rent or sign in until all of these are decided:

- Choose a provider whose written policy covers tenant isolation, storage location, snapshot retention, deletion timing and support access. Record the policy URL and date outside the machine.
- Prefer a dedicated single-tenant Mac. If the machine is shared, managed in an unknown way or cannot be securely erased, do not use a parent's primary Apple account.
- Decide who controls the Apple Developer membership. Only the parent/account holder may accept agreements, approve membership changes, register identifiers or authorize signing.
- Choose provisional identifiers without registering them: container app `<COMPR_APP_BUNDLE_ID>` and web-extension target `<COMPR_EXTENSION_BUNDLE_ID>`. A common provisional relationship is `<COMPR_APP_BUNDLE_ID>.Extension`, but the converter/Xcode result must be inspected before registration.
- Keep placeholders for `<APPLE_TEAM_ID>`, `<APP_STORE_CONNECT_APP_ID>`, `<APPLE_ACCOUNT>` and `<SIGNING_IDENTITY>` until the account holder acts.
- Decide the safe transfer route: a private, access-controlled temporary transfer or a future reviewed private Git remote. Do not use a public repository or paste source into prompts.
- Use the reviewed Windows staging mode to create a persistent converter input. It remains local, performs no conversion or publication, and replaces only its generated output after a complete validation succeeds.
- Confirm the public COMPR API URL, public Supabase URL/publishable key and callback origin outside this document. Public client configuration is not a server secret, but it still needs production-owner approval. Never transfer a service-role key or private `.env`.
- Keep Stripe, StoreKit purchases and paid entitlement activation disabled. The Pro sheet is informational UI only.

## 2. What may be transferred

Transfer only a clean copy of the tracked client source at the recorded checkpoint, after reviewing its file inventory:

- `V.0.3-prototype/` runtime source and required icons/styles/shared modules;
- `platforms/safari/manifest.json` and `platforms/safari/platform.js`;
- the reviewed staging/conversion instructions and the current Apple test checklist;
- optionally the tracked tests for local verification, kept outside the eventual extension resources;
- no nested repository contents.

The eventual converter-input directory should contain the validated Safari manifest and runtime files selected by `tools/build-safari-extension.ps1`. It must exclude tests, previews, audit documents, PowerShell scripts, demo catalogs and development matchers. `platform.js` must load before `popup.js`. Each HTML context must load `shared/browserAdapter.js` exactly once and before dependent modules. The background worker imports it once. Page-context injection probes the adapter before injecting it and then loads product eligibility, detectors and `content.js` in that order.

Absolutely do not transfer:

- `find-cheaper-backend/`, `website-live/`, `tools/SadTalker/` or any nested `.git` directory;
- `.env` files, production connection strings, service-role keys, database passwords, provider keys, Stripe keys or tokens;
- browser profiles, cookies, local storage exports, auth sessions, password-manager data or personal test evidence;
- `node_modules`, logs, screenshots, preview output, ZIP files, build/dist/coverage/tmp folders, Docker/Supabase data or caches;
- certificates, private keys, provisioning profiles, signing exports, recovery keys or verification codes;
- historical release archives and generated marketing media.

Before transfer, produce a file list and scan it locally. After transfer, compare its hash/inventory with the approved source. Do not copy any ignored file merely because it sits below an approved directory.

Run the Windows validation and staging commands from the project root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/build-safari-extension.ps1 -ValidationOnly -ApiBaseUrl "<VERIFIED_PUBLIC_COMPR_API_URL>"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/build-safari-extension.ps1 -StageConverterInput -ApiBaseUrl "<VERIFIED_PUBLIC_COMPR_API_URL>" -ShowInventory
```

The persistent output is `build/safari-converter-input/`, which is already ignored by Git. `-UseTestFixture` is only for local repeatability tests; fixture output must never be transferred to a Mac or treated as a release candidate. Before transfer, rerun staging with the owner-confirmed public HTTPS API URL, review the printed inventory without exposing configuration values, verify Git still ignores the output, and repeat the secret/personal-path scan. The Apple converter runs only later on the Mac.

## 3. Mac and Xcode prerequisites

These commands are for a terminal on the rented Mac only. Confirm their exact syntax locally; Apple can change Xcode tooling.

```sh
sw_vers
xcodebuild -version
xcode-select -p
xcrun --find safari-web-extension-converter
xcrun safari-web-extension-converter --help
```

If Command Line Tools are genuinely absent, the human operator may start Apple's installer with `xcode-select --install`. Install/update Xcode only through Apple's supported channel and verify that the selected Xcode path is expected. Accept licenses only after the account holder reviews them. Record Xcode, macOS and Safari versions in `SAFARI_APPLE_TEST_CHECKLIST.md`.

Do not install unrelated package managers, remote-control agents, certificates or browser extensions on the cloud Mac.

## 4. Generate the Safari Web Extension project

First create a clean converter-input folder using the separately approved staging method. Do not point the converter at the entire repository. Inspect the converter help supplied by the installed Xcode before running anything.

Expected command shape, not a command to run blindly:

```sh
xcrun safari-web-extension-converter <VALIDATED_EXTENSION_DIRECTORY> \
  --project-location <LOCAL_TEMP_PROJECT_PARENT> \
  --app-name COMPR \
  --bundle-identifier <COMPR_APP_BUNDLE_ID>
```

Some Xcode versions expose additional flags such as copying resources or language selection. Use only flags shown by that Mac's `--help`. Never add an upload, distribution or signing automation flag. The converter step and its generated project structure can only be proven on macOS with the installed Xcode.

Immediately inspect rather than assume:

```sh
xcodebuild -list -project <GENERATED_XCODEPROJ>
```

Expected logical targets are:

1. a containing iOS/macOS app target used to install and enable COMPR;
2. a Safari Web Extension target containing the web-extension resources;
3. optional unit/UI test targets generated by the selected template.

Target names, schemes, supported destinations and generated native files are Mac-only findings. Do not delete generated native handlers until their role is understood.

## 5. Manifest and permission review in Xcode

The reviewed Safari manifest is MV3 and currently requests only `storage`, `activeTab` and `scripting`. It contains no `content_scripts` entry and no `<all_urls>` host permission. Runtime host permissions must be restricted to the approved HTTPS COMPR API, approved public Supabase origin and ECB exchange-rate origin. The callback match must be restricted to the approved callback origin.

Website inspection occurs only after the user invokes COMPR and Safari grants access for that site. On Apple devices verify Ask/Deny/Allow behavior; do not infer it from Chrome or the Windows preview. Reject search, category, listing, social, map and ordinary pages through the shared fail-closed eligibility control.

## 6. Bundle identifiers and signing

Set provisional values in the generated project first:

- containing app: `<COMPR_APP_BUNDLE_ID>`;
- extension: `<COMPR_EXTENSION_BUNDLE_ID>`;
- development team: `<APPLE_TEAM_ID>`;
- signing identity/profile: `<SIGNING_IDENTITY>`;
- App Store Connect record: `<APP_STORE_CONNECT_APP_ID>` only after deliberate registration.

Check every target independently. The app and extension require distinct bundle identifiers. Their application groups or entitlements, if the generated project proposes any, must be reviewed before acceptance; do not add capabilities merely to silence a signing error.

Only the parent/account holder may:

- enter `<APPLE_ACCOUNT>` credentials and the verification code directly into Apple's UI;
- accept Apple Developer agreements or paid membership terms;
- select/authorize `<APPLE_TEAM_ID>`;
- register bundle identifiers or create the App Store Connect app record;
- approve certificate/provisioning creation and export;
- accept encryption, privacy, tax, banking or distribution declarations;
- authorize TestFlight submission or invite testers.

Never put the Apple password, verification code, recovery key, session cookie, certificate private key or provisioning data in a prompt, chat, Git commit or this document.

## 7. First simulator build

Select the containing app scheme and an available iPhone Simulator. Keep automatic upload disabled. Build with Product > Build, then run locally in the simulator if the generated target supports it. Record the exact scheme/destination and errors.

A command-line build may be used only after `xcodebuild -list` confirms the generated names:

```sh
xcodebuild -project <GENERATED_XCODEPROJ> \
  -scheme <CONFIRMED_APP_SCHEME> \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=<AVAILABLE_SIMULATOR>' \
  build
```

Simulator success does not prove device signing, Safari permission behavior, TestFlight installation, Dynamic Type or VoiceOver behavior.

## 8. First archive without upload

After a successful simulator check and signing review, select a generic device destination and use Product > Archive. Stop in Organizer. Do not choose Distribute App or upload.

Before archiving, confirm:

- Release configuration contains no localhost, demo catalog, fixture entitlement, test or preview resources;
- Stripe and StoreKit purchase paths remain disabled;
- version/build numbers are deliberate and unique;
- app and extension signing resolve to the intended team;
- privacy/support URLs and app metadata are not invented;
- no production configuration was changed to accommodate the build.

An archive existing locally is not evidence that App Store Connect will accept it.

## 9. TestFlight preparation and physical iPhone

TestFlight requires a deliberate later approval. Before upload, the parent must review the App Store Connect record, agreements, roles, identifiers, signing, privacy disclosures, encryption answers, beta metadata and tester scope. Use placeholders until those facts exist.

Only after separate authorization may the parent select Distribute App/App Store Connect and upload. Wait for processing and any beta review. Install through Apple's TestFlight app on the intended physical iPhone, then enable COMPR under the current Safari extension settings and execute every item in `SAFARI_APPLE_TEST_CHECKLIST.md`.

Do not call a simulator build, local archive or processed upload a successful iPhone beta. TestFlight installation and real Safari behavior must be observed separately.

## 10. Safe cloud-Mac shutdown

Before ending the session:

1. Export only non-sensitive test notes and permitted source changes after reviewing them.
2. Do not export Keychain items, profiles, derived data, browser data or Apple session artifacts.
3. Sign out of Xcode Accounts, App Store Connect and Apple websites.
4. Remove the Apple account from system Internet Accounts if it was added.
5. Delete temporary project copies, archives, DerivedData, provisioning profiles and any temporary signing files from the rented machine. Do not delete assets from the parent's real Apple account.
6. Empty Trash where permitted and clear browser site data for Apple/provider portals.
7. Confirm no credentials entered Git history, shell history, source files, screenshots or provider snapshots. Avoid commands containing credentials in the first place.
8. End remote-control sessions and completely terminate/delete the cloud instance according to the provider's process.
9. Confirm the provider dashboard shows the instance terminated, then record the provider's retention/deletion confirmation.
10. If exposure is suspected, the parent must review Apple account sessions/devices and revoke the affected session or certificate through Apple's supported UI.

## 11. Claims that remain forbidden until tested

Do not claim that COMPR:

- works on iPhone, iPad or Mac Safari merely because the browser preview or converter succeeds;
- has passed Apple review, TestFlight processing, signing or physical-device installation;
- enforces site permissions correctly before Ask/Deny/Allow is tested on real Safari;
- has working purchases, trials, subscriptions, restore or StoreKit validation;
- has production guest access before Anonymous Auth, migration 012 and the backend guest flag are separately verified and enabled;
- always preserves quota under concurrency/offline conditions based only on mocked tests;
- meets Dynamic Type, VoiceOver, contrast or mobile-layout requirements before device checks;
- is ready to publish while a P0/P1 issue or an UNKNOWN/BLOCKED checklist item remains.

## 12. Authoritative checklist

For the upcoming Apple handoff, `SAFARI_APPLE_TEST_CHECKLIST.md` is the current checklist. `SAFARI_MANUAL_TEST_CHECKLIST.md` is retained unchanged as historical pre-guest documentation and must not be used as the current release gate.

Useful Apple references to re-open on the Mac are Apple's Safari Web Extensions documentation, Xcode signing/capabilities documentation, App Store Connect help and TestFlight documentation. Tool availability and exact converter flags must be confirmed from the installed Xcode rather than assumed from this Windows preparation.
