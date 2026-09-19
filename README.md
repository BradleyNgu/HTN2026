# Conversation Escape

A foreground iOS/Android app that notices when a conversation has stalled and
opens a configurable, call-style interruption. Speech recognition prefers the
phone's offline service and falls back to its online service when necessary.
Only short text windows are sent to the app's server-side AI classifier; raw
audio is never persisted or sent to that classifier.

## What works

- Offline-first English speech recognition with an Android online fallback
- A 50-word rolling window evaluated every 20 new words
- Two-result confidence gate, sensitivity settings, stale-response handling,
  and a two-minute cooldown
- Immediate local triggers for AI, big data, blockchain, web3, and physical
  intelligence
- Add, edit, delete, and select custom callers
- Import a caller MP3 from Android storage, preview it, and play it after
  accepting the simulated call
- Call delay controls, a hold-to-trigger manual fallback, vibration, playback
  progress, and a spoken fallback when no MP3 is available
- Memory-only transcripts and locally stored, transcript-free feedback
- Rate-limited model proxy with structured output and no transcript logging

The app intentionally does not imitate tornado, government, or other official
emergency alerts. The messaging-style incoming call is an in-app simulation,
not a real WhatsApp, CallKit, or Android Telecom call. WhatsApp does not expose
a public API that lets third-party apps automatically place incoming calls.

## Requirements

- Node.js 22+
- A physical iOS or Android device with speech recognition
- Xcode or Android Studio for a native Expo development build
- An OpenAI API key

This project cannot run its speech recognition feature in Expo Go. Native
permissions and the speech recognition module require a development build.

## Setup

```bash
npm install
cp .env.example .env
```

Set `OPENAI_API_KEY` in `.env`. Set `EXPO_PUBLIC_API_URL` to an address the
device can reach:

- iOS simulator: `http://localhost:8787`
- Android emulator: `http://10.0.2.2:8787`
- Physical device: use an HTTPS tunnel to port `8787`, then use that URL

Never put the OpenAI key in an `EXPO_PUBLIC_` variable. Expo embeds those
values in the mobile bundle.

Start the API:

```bash
npm run server
```

Generate and run the native app:

```bash
npm run ios
# or
npm run android
```

After the first native build, use `npm run start` for normal Metro development.

## Independent Android APK

The phone does not need the laptop once the API is hosted and a release APK is
installed. It still needs internet access for OpenAI classification.

1. Push this repository to GitHub.
2. In Render, create a Blueprint and select the repository. Render reads
   [`render.yaml`](render.yaml) and creates `conversation-escape-api`.
3. Enter `OPENAI_API_KEY` when Render asks for the secret, then wait for
   `/health` to report `{ "ok": true }`.
4. Copy the Render HTTPS URL into local `.env`:

   ```env
   EXPO_PUBLIC_API_URL=https://your-service.onrender.com
   ```

5. Rebuild the APK so that public URL is embedded:

   ```bash
   cd android
   ./gradlew assembleRelease
   cd ..
   ```

6. Install the resulting standalone APK:

   ```bash
   adb install -r android/app/build/outputs/apk/release/app-release.apk
   ```

The current Gradle release uses the debug signing key and is intended for
direct test distribution only. Use a private release keystore before publishing
through Google Play. Never place `OPENAI_API_KEY` in an `EXPO_PUBLIC_` variable;
only the Render service should hold it.

## Demo flow

1. Complete the privacy notice.
2. Add or edit a caller and choose an MP3 up to 25 MB from phone storage.
3. Preview the MP3, save the caller, then select sensitivity and delay.
4. Start listening and grant microphone/speech permissions.
5. Speak at least 70 words so two overlapping windows can be evaluated.
6. Wait for two positive checks, or hold the manual escape control.
7. Accept the simulated call to hear the caller MP3.

Install an offline English speech model for maximum privacy and responsiveness.
If Samsung or another Android device rejects the offline service or locale, the
app retries through the phone's online speech service. Android 12 and older may
not support continuous recognition through every selected speech service.

## Privacy and safety

- Recognition is foreground-only and starts only after an explicit tap.
- The recognizer is configured not to persist audio. Android's speech service
  may process audio online when its offline recognizer is unavailable.
- Imported MP3s are copied into app-owned storage, never uploaded, and removed
  when their caller is deleted or the file is replaced.
- Transcript text exists in memory, is capped at 120 words, and is cleared
  when a session ends or triggers.
- The server validates snippets, limits requests, disables response caching,
  and does not log request bodies.
- Users should tell nearby participants when transcription is active and
  follow applicable consent laws.
- Safety-sensitive, medical, legal, threatening, or distressed conversation
  text is instructed to classify as not boring.

For a public production deployment, add authentication/device attestation,
TLS-only ingress, centralized rate limiting, monitoring that excludes request
bodies, a deletion policy, and jurisdiction-specific consent review.

## Checks

```bash
npm test
npm run typecheck
npm run doctor
```

Unit and API tests cover settings migration, caller deletion, MP3 validation,
missing-file fallback, media cleanup, rolling-window overlap, transcript
clearing, consecutive classifications, stale responses, cooldowns, request
validation, and provider error redaction. File picking, microphone permissions,
vibration, speech recognition, and MP3 playback still require physical-device
testing.
