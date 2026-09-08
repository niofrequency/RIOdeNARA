/*
 * RiO de NARA — Firebase configuration
 * ======================================
 * This file connects the site's Order, Reservation and Admin pages to a
 * real database (Firebase Firestore) and login system (Firebase
 * Authentication), so orders/reservations placed by customers show up
 * on the /admin page from any device.
 *
 * You MUST replace the placeholder values below with your own Firebase
 * project's values before ordering/reservations/admin will work.
 * Full step-by-step setup instructions are in SETUP.md at the root of
 * this repository — it takes about 5 minutes and is free.
 *
 * These values (apiKey, projectId, etc.) are NOT secret — Firebase's
 * web config is meant to be public/client-side. Real protection comes
 * from the Firestore security rules in firestore.rules, which must be
 * pasted into your Firebase project as described in SETUP.md.
 *
 * Deploying on Vercel? You don't need to edit this file at all — set
 * the matching environment variables in your Vercel project settings
 * instead, and Vercel's build step (scripts/generate-config.js) writes
 * them in here automatically on every deploy. See SETUP.md → "Deploying
 * on Vercel" for the exact variable names. Editing this file directly
 * still works for any other static host (GitHub Pages, Netlify, etc.)
 * that doesn't run a build step.
 */

window.RDN_FIREBASE_CONFIG = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_PROJECT.firebaseapp.com",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_PROJECT.appspot.com",
  messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID"
};

/*
 * Your restaurant's WhatsApp number, in international format with NO
 * leading zero, no spaces, no "+" — e.g. an Indonesian number
 * 0812-3456-7890 becomes "6281234567890".
 * Orders and reservations open a pre-filled WhatsApp message to this
 * number in addition to saving to the database.
 */
window.RDN_WHATSAPP_NUMBER = "REPLACE_WITH_YOUR_WHATSAPP_NUMBER";
