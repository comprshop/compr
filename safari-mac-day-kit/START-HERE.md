# COMPR Safari Mac Day Kit

1. Copy this entire kit to the Mac and open **Finder > Applications > Utilities > Terminal**.
2. Type `cd `, drag this kit folder into Terminal, and press Return.
3. Run `chmod +x verify-mac-handoff.sh prepare-xcode-conversion.sh`.
4. Run `./verify-mac-handoff.sh`. It must end with `PASS: handoff verified`.
5. Check independently: `shasum -a 256 COMPR-Safari-v0.3.6-mac-converter-input.zip`.
   Expected: `42a399a994ceb6c00c33b759f71c3db4048f5dbe277fabc8b65714744c470803`.
6. Unpack into a new directory: `mkdir converter-input && ditto -x -k COMPR-Safari-v0.3.6-mac-converter-input.zip converter-input`.
7. Run `./prepare-xcode-conversion.sh` and inspect its command before confirming.

**Never skip capturing the real Safari receiver URL and request Origin before changing callback or CORS.** Stop on a failed verification, unexpected host/permission, signing ambiguity, missing/`null` Origin, token in a URL/log, or any request to enter credentials into these scripts.

Continue with `SAFARI_MAC_TESTFLIGHT_RUNBOOK.md`.
