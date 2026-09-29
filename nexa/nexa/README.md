# Nexa

This one folder is the whole app.

- **Quick update:** drag this folder onto Netlify → Deploys. Everything works except quick login, calls between different networks and notifications when Nexa is closed.
- **Everything on:** put this folder on GitHub and link it to Netlify (it reads `netlify.toml`). Then add these in Netlify → Site configuration → Environment variables:
  - `FIREBASE_SERVICE_ACCOUNT` — your Firebase service account key (notifications + quick login). Never put this file on GitHub.
  - `TURN_KEY_ID` and `TURN_KEY_API_TOKEN` — from Cloudflare → Realtime → TURN Server (calls on any network).
- `firestore.rules` — paste into Firebase → Firestore → Rules → Publish whenever it changes.
