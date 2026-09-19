# Conversation Escape

A foreground iOS/Android app that notices when a conversation has stalled and
opens a configurable, call-style interruption. Speech recognition runs on the
device. Only short text windows are sent to a server-side AI classifier; raw
audio is never recorded or uploaded.

## What works

- On-device, continuous English speech recognition
- A 50-word rolling window evaluated every 20 new words
- Two-result confidence gate, sensitivity settings, stale-response handling,
  and a two-minute cooldown
- Partner, boss, family, and editable custom caller presets
- Call delay controls, a hold-to-trigger manual fallback, vibration, and a
  spoken caller script
- Memory-only transcripts and locally stored, transcript-free feedback
- Rate-limited model proxy with structured output and no transcript logging

The app intentionally does not imitate tornado, government, or other official
emergency alerts. The incoming call is an in-app simulation, not a system
CallKit/Telecom call.

## Requirements

- Node.js 22+
- A physical iOS or Android device with offline English speech recognition
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

## Demo flow

1. Complete the privacy notice.
2. Pick a caller, sensitivity, and delay.
3. Start listening and grant microphone/speech permissions.
4. Speak at least 70 words so two overlapping windows can be evaluated.
5. Wait for two positive checks, or hold the manual escape control.
6. Accept the simulated call to hear the configured script.

If the device reports that on-device recognition is unavailable, install an
offline English speech model in the operating system settings. Android 12 and
older may not support continuous on-device recognition through the selected
speech service.

## Privacy and safety

- Recognition is foreground-only and starts only after an explicit tap.
- The recognizer is configured not to persist audio.
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

Unit and API tests cover rolling-window overlap, transcript clearing,
consecutive classifications, stale responses, cooldowns, request validation,
and provider error redaction. Microphone permissions, vibration, speech
recognition, and call audio still require physical-device testing.
