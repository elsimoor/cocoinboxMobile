## Cocoinbox Mobile (Expo) Guide

### Prerequisites
- Node.js 18+
- `npm` or `yarn`
- Expo CLI (`npm install -g expo-cli`) – optional but recommended
- iOS Simulator or Android Emulator / Expo Go on device

### Install dependencies
```bash
cd cocoinboxMobile
npm install
# or
yarn install
```

### Environment
The API base URL is injected via `app.json` (`expo.extra.apiUrl`).  
For local development point Expo to your tunnel/lan URL:
```bash
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:4000 expo start
```
or edit `app.json` while developing.

### Development commands
- `npm run start` – interactive CLI (choose iOS / Android / Web)
- `npm run android` / `npm run ios` – build & run native app
- `npm run web` – run in the browser

### Feature parity
The mobile app mirrors the web frontend:
- **Authentication** – register, login, logout with persistent sessions.
- **Dashboard** – displays Cocoinbox stats.
- **Ephemeral Emails** – list/create/delete addresses, open inbox with pagination and send emails via Mailchimp.
- **SMS** – assign or release Twilio numbers, read inbound messages.
- **Settings** – view profile, sign out.

Backend endpoints are the same as the web client, so no additional APIs are required. Make sure the backend is reachable from your device/emulator (use HTTPS tunnel such as Expo tunnel or ngrok when running locally).
