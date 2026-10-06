# مَسار for iPhone

The iPhone app is the **same portal** as the website: it opens the live مَسار site
(`https://rehab-kohl.vercel.app`) inside a native iOS shell. Accounts, data, sign-in
(national ID + WhatsApp/SMS code for patients, work email for staff), everything is
shared, so people can use the website or the app interchangeably.

## What the app adds
- Home-screen icon and launch screen with the مَسار mark and the hospital's official logo.
- Swipe from the edge to go back, pull down to refresh.
- Reopens the last page the user was on (a signed-in patient lands back on «اليوم»).
- A branded offline screen with a retry button when there is no connection.
- Links outside the portal (phone, maps, WhatsApp) open in the right iPhone app.
- iPhone only, portrait, Arabic as the primary language.

## Getting the .ipa
Every push to the `ios-app` branch builds the app on GitHub's macOS runners
(**Actions → iOS app (.ipa)**). Download the `.ipa` from the run's **Artifacts**.

### Without an Apple Developer account (testing)
The build is unsigned. Install it with **Sideloadly** or **AltStore** using a free Apple ID;
they sign it for your device. Free signatures expire after 7 days (re-install to renew).

### With an Apple Developer account (distribution)
Add these repository secrets (**Settings → Secrets and variables → Actions**) and re-run:

| Secret | Value |
|---|---|
| `IOS_CERTIFICATE_P12_BASE64` | Apple Distribution certificate (.p12), base64 |
| `IOS_CERTIFICATE_PASSWORD` | Password of the .p12 |
| `IOS_PROVISIONING_PROFILE_BASE64` | Provisioning profile for `sa.alhadithah.masar`, base64 |
| `IOS_TEAM_ID` | Apple Developer Team ID |
| `IOS_EXPORT_METHOD` | Optional: `release-testing` (default, ad hoc), `app-store-connect`, `enterprise` |
| `APPSTORE_API_KEY_ID`, `APPSTORE_API_ISSUER_ID`, `APPSTORE_API_PRIVATE_KEY` | Optional: upload straight to TestFlight |

`base64 -i file.p12 | pbcopy` produces the base64 value on a Mac.

## Changing things
- Portal address: `capacitor.config.json` → `server.url` and `allowNavigation`.
- Icon / launch screen: replace `assets/icon-only.png` (1024²) and `assets/splash.png` (2732²), then `npm run assets`.
- Local build on a Mac: `npm ci && npx cap sync ios && npx cap open ios`.
