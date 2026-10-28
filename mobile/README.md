# Solar Maintenance — Engineer Mobile App (Expo)

Expo SDK 58, Expo Router, TypeScript, React Hook Form + Zod, expo-sqlite (drafts and offline cache), react-native-signature-canvas, @react-native-community/datetimepicker, expo-sharing.

## Run locally
```
cp .env.example .env     # EXPO_PUBLIC_API_URL: 10.0.2.2 = host machine from the Android emulator; use your LAN IP for a physical phone
npm install
npx expo start           # press a for Android emulator, or scan with a development build
```
`react-native-signature-canvas` (WebView) and `expo-sqlite` need native code, so use a **development build** rather than Expo Go:
```
npx eas build -p android --profile development    # once; install the APK on the phone/emulator
```
Login uses Supabase Auth (publishable key). The API then checks `app_users`; only `engineer` users can create reports.

Local API note: the API's `Cors` list is irrelevant for the app (no browser), but the Supabase auth user id must exist in whatever database the API uses (see backend/README.md).

## Structure
```
src/app/              routes (expo-router)
  _layout.tsx         session gate, sync engine start
  (auth)/login.tsx
  (app)/              tabs: index (dashboard), drafts, history, profile
  (app)/clients/      search, details → start visit
  (app)/reports/[localId]/section/[n].tsx   sections 1–8 (header fields on section 1)
  (app)/reports/[localId]/signatures.tsx | review.tsx | success.tsx
  (app)/reports/view/[id].tsx               submitted report + PDF share
src/db/               SQLite: drafts (fields JSON, sync flags), clients_cache
src/sync/engine.ts    create → update → signatures → submit; backoff; 409 conflict; 423 locked
src/forms/            zod section schemas, useDraft autosave hook
src/lib/              config, supabase, api (axios + token refresh + PDF download), types (form labels), store
src/components/       ui (Screen, Button, Toggle, banner, badges), SignaturePad
```

## Offline behaviour
- Every edit is saved to SQLite after 1.2 s, and immediately when the screen loses focus or the app goes to the background.
- Drafts belong to the user who created them; another engineer signing in on the same phone neither sees nor syncs them.
- Sync order per draft: create (idempotent on the device id) → fields (PUT with version) → signatures → submit (idempotent).
  An edit made while a request is in flight is never marked as synced (edit-sequence check), so it is sent in the next pass.
- A 409 caused by the phone's own earlier write (response lost) is resolved automatically; a real change by someone else shows a
  field-by-field comparison and waits for the engineer's choice. Submission pauses until then.
- A queued Submit stays "Submitting" through network errors and keeps retrying (backoff up to 10 min) until the server confirms.
- "Submitted elsewhere": the server report was finalised from another device or by an admin; the local copy is kept read-only with a Discard button.
- Drafts are deleted only by Done on the success screen (after the server confirmed) or by a long-press in Drafts; their signature files are deleted with them.
- Badges: Saved on phone, Syncing, Synced, Submitting, Submitted, Sync failed (tap the banner or Sync now), Conflict, Submitted elsewhere.

## Known limitations
- The Supabase session is stored in the expo-sqlite key-value store, not the encrypted SecureStore (Supabase sessions exceed SecureStore's 2 KB value limit). Phones should use a screen lock.
- Drafts started on another device are not listed on this phone (server-side drafts are not downloaded).
- `usesCleartextTraffic` is on for the local HTTP API; turn it off for production builds that use HTTPS.
- Keyboard avoidance and the native date picker need checking on a real device.

## Builds
- `eas build -p android --profile preview` → APK for internal testing against staging.
- `eas build -p android --profile production` → AAB for Play Console.
- iOS: requires an Apple Developer account; `eas build -p ios`. Not yet tested.
Set the real API URLs in `eas.json` before building. Never point a production build at localhost.

## Building an APK locally on Windows
React Native's native build creates file paths longer than 260 characters, which fails on Windows unless long paths are enabled. One-time, in an **elevated** PowerShell:
```
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name LongPathsEnabled -Value 1 -PropertyType DWORD -Force
```
Then (short path recommended; `C:\sm` is a copy of this folder used only for building):
```
npx expo prebuild --platform android --no-install
cd android
.\gradlew.bat assembleRelease --no-daemon
# APK: android\app\build\outputs\apk\release\app-release.apk (signed with the debug keystore — internal testing only)
```
`reactNativeArchitectures=arm64-v8a,x86_64` in `android/gradle.properties` halves build time (phones + emulator).
Alternative without a local SDK: the `android-apk` GitHub Actions workflow builds on Linux and uploads the APK as an artifact.
