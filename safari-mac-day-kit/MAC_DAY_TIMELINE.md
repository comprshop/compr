# Mac-day timeline

| Phase | Goal and allowed actions | Stop criteria | Evidence |
|---|---|---|---|
| First 15 minutes | Verify OS/Xcode, copy kit, run offline verifier and confirm ZIP hash | Any hash/file/scan failure | About screens and verifier output |
| First hour | Unpack, inspect converter help, generate project, inspect targets/permissions; no auth/config change | Converter warning, unexpected host/permission, build/signing ambiguity | Command, target list, build log |
| Before iPhone test | Build/run Mac container and extension; choose team/bundle IDs manually; confirm Safari launch | Mac build/basic flow fails | Redacted target/signing and Safari images |
| Before auth/CORS change | Install on iPhone, grant site permission, capture receiver and `/v1/me` Origin on Mac/iPhone, repeat after restart | Missing/`null`/unstable values or unexplained mismatch | Values worksheet and cropped evidence |
| Before Archive | Apply exact receiver/CORS separately, review diff, run gates, test OTP/logout without token leakage | Any auth/CORS/security failure | Test logs and cleaned callback URL |
| Before TestFlight | Archive, validate, complete smoke matrix; Account Holder reviews agreements/metadata | Any TestFlight blocker | Validation and signed checklist |

Priority: converter/build → Safari launch → iPhone install → receiver/origin measurement → callback/CORS → auth → TestFlight.
