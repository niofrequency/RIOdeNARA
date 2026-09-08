/*
 * Build-time config generator for Vercel (or any host that runs
 * `npm run build` with environment variables set).
 *
 * Reads Firebase + WhatsApp settings from environment variables and
 * writes them into js/firebase-config.js, overwriting the placeholder
 * values committed to the repo. This lets you keep real values out of
 * git and set them instead in your hosting provider's dashboard.
 *
 * If an environment variable isn't set, the existing placeholder for
 * that field is kept as-is, so a partial setup still deploys (it just
 * falls back to WhatsApp-only ordering / an admin setup notice, exactly
 * like running with no build step at all — see SETUP.md).
 */

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'js', 'firebase-config.js');

const FIELDS = [
  ['apiKey', 'FIREBASE_API_KEY', 'REPLACE_WITH_YOUR_API_KEY'],
  ['authDomain', 'FIREBASE_AUTH_DOMAIN', 'REPLACE_WITH_YOUR_PROJECT.firebaseapp.com'],
  ['projectId', 'FIREBASE_PROJECT_ID', 'REPLACE_WITH_YOUR_PROJECT_ID'],
  ['storageBucket', 'FIREBASE_STORAGE_BUCKET', 'REPLACE_WITH_YOUR_PROJECT.appspot.com'],
  ['messagingSenderId', 'FIREBASE_MESSAGING_SENDER_ID', 'REPLACE_WITH_YOUR_SENDER_ID'],
  ['appId', 'FIREBASE_APP_ID', 'REPLACE_WITH_YOUR_APP_ID']
];

const firebaseConfig = {};
let anyFirebaseSet = false;
FIELDS.forEach(function([key, envVar, placeholder]){
  const val = process.env[envVar];
  if(val){ anyFirebaseSet = true; }
  firebaseConfig[key] = val || placeholder;
});

const waNumber = process.env.WHATSAPP_NUMBER || 'REPLACE_WITH_YOUR_WHATSAPP_NUMBER';

const content = `/*
 * RiO de NARA — Firebase configuration
 * ======================================
 * AUTO-GENERATED at build time (scripts/generate-config.js) from
 * environment variables set in your hosting provider's dashboard
 * (e.g. Vercel → Project → Settings → Environment Variables).
 * See SETUP.md for the full list of variable names and values.
 *
 * Running locally without a build step? This file's committed,
 * editable placeholders still work the same way — just edit the
 * values below directly instead of setting env vars.
 */

window.RDN_FIREBASE_CONFIG = ${JSON.stringify(firebaseConfig, null, 2)};

window.RDN_WHATSAPP_NUMBER = ${JSON.stringify(waNumber)};
`;

fs.writeFileSync(OUT_PATH, content);

console.log('[generate-config] Wrote js/firebase-config.js');
console.log('[generate-config] Firebase env vars detected: ' + (anyFirebaseSet ? 'yes' : 'no (using placeholders)'));
console.log('[generate-config] WhatsApp number env var detected: ' + (process.env.WHATSAPP_NUMBER ? 'yes' : 'no (using placeholder)'));
