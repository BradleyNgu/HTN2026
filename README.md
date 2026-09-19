# Conversation Escape

An iOS/Android app that notices when a conversation has stalled and asks Twilio
to place a real phone call. Android can continue listening from a
microphone foreground service while the phone is on Home or locked; iOS remains
foreground-only. Speech recognition prefers the phone's offline service and
falls back to its online service when necessary. Only short text windows are
sent to the app's server-side AI classifier; raw audio is never persisted or
sent to that classifier.

## What works

- Offline-first English speech recognition with an Android online fallback
- A 10-word transcript window evaluated every 10 new words
- Two-result confidence gate, sensitivity settings, stale-response handling,
  and a two-minute cooldown
- Immediate local triggers for AI, big data, blockchain, web3, and physical
  intelligence
- Mom, Boss, and Girlfriend call audio choices routed through Twilio
- Call delay controls and a hold-to-trigger manual fallback
- Memory-only transcripts and locally stored, transcript-free feedback
- Rate-limited model proxy with structured output and no transcript logging
- Android background listening with a permanent notification and Stop/Open
  actions

The app intentionally does not imitate tornado, government, or other official
emergency alerts. Calls are ordinary Twilio phone calls, not WhatsApp, CallKit,
or Android Telecom simulations.

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
Changes under `modules/background-listener/`, the config plugin, permissions, or
notification channels require a new native build; Fast Refresh cannot install
them.

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
   ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
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

### Twilio real calls

Configure these server-only Render variables in addition to the OpenAI key:

```env
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+15555550123
TWILIO_RECIPIENT_MOM=+15555550124
```

After the existing two-positive or keyword trigger, the app sends only the
selected Mom/Boss/Girlfriend audio type to `/call`. During testing, every type
calls the single fixed `TWILIO_RECIPIENT_MOM` number. Arbitrary destination
numbers are rejected, and the endpoint is rate-limited. Twilio trial accounts
can call only verified recipient numbers. The Tornado option does not place a
call.

## Demo flow

1. Complete the privacy notice.
2. Select the desired Twilio call audio and detection settings.
3. Confirm the test recipient is verified in Twilio.
4. Start listening and grant microphone and notification permissions.
5. Speak at least 20 words so two 10-word windows can be evaluated.
6. On Android, press Home or lock the phone and confirm the persistent
   “Conversation Escape is listening” notification remains.
7. Wait for two positive checks, use a keyword, or hold the manual escape
   control.
8. Answer the real Twilio call on the configured test phone.

Install an offline English speech model for maximum privacy and responsiveness.
If Samsung or another Android device rejects the offline service or locale, the
app retries through the phone's online speech service. Android 12 and older may
not support continuous recognition through every selected speech service.

### Samsung background settings

On a Samsung S21, open **Settings → Apps → Conversation Escape → Battery** and
choose **Unrestricted** for the most reliable locked-screen behavior. Also
remove the app from **Battery and device care → Battery → Background usage
limits → Sleeping apps**. Android or One UI may still stop microphone work
under memory, thermal, or vendor power pressure; return to the app and start a
new session if the persistent notification disappears.

The service starts only from the visible listening screen. Swiping the UI away
does not intentionally end it, but tapping Stop, revoking microphone permission,
restarting the phone, or force-stopping the app ends listening. It does not
restart itself after a force-stop or reboot.

## Privacy and safety

- Recognition starts only after an explicit tap. Android can keep the
  microphone active on Home or while locked and always shows an ongoing system
  notification; iOS recognition is foreground-only.
- The recognizer is configured not to persist audio. Android's speech service
  may process audio online when its offline recognizer is unavailable.
- Background recognition and cloud classification can increase battery and
  mobile-data use. Stop from the app or the ongoing notification.
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
cd android && ./gradlew :background-listener:test :app:assembleRelease \
  -PreactNativeArchitectures=arm64-v8a
```

Unit and API tests cover settings migration, caller deletion, Twilio request
validation, rolling-window overlap, transcript
clearing, consecutive classifications, stale responses, cooldowns, request
validation, and provider error redaction. Microphone permissions,
speech recognition, and real phone calls still require physical-device
testing. Background verification should cover Home, screen lock, notification
Stop/Open, network loss and recovery, Render cold starts, permission denial,
force-stop, and Samsung battery optimization.
