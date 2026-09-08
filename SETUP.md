# Setting up Online Ordering, Reservations & Admin

This site can take real orders and table reservations and show them on a
password-protected `/admin` page — but it needs two things connected
first, both free:

1. **A Firebase project** (Google) — stores orders, reservations and your
   menu, and handles your admin login. Takes about 5 minutes.
2. **Your WhatsApp number** — orders and reservations also open a
   pre-filled WhatsApp message to you, so you get an instant ping.

Until you connect these, `order.html` and `reserve.html` still work in a
**WhatsApp-only** mode once you've set your number (messages land in your
WhatsApp, but won't appear on `/admin`). The `/admin` page itself needs
Firebase connected to work at all.

---

## 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com/) and sign in with any Google account.
2. Click **Add project**, give it a name (e.g. `rio-de-nara`), and finish the wizard (you can turn off Google Analytics — not needed).
3. Once created, click the **`</>`  (Web)** icon on the project overview page to register a web app. Give it a nickname (e.g. `website`) and click **Register app**. You do **not** need Firebase Hosting.
4. Firebase shows you a `firebaseConfig` object like this:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "rio-de-nara.firebaseapp.com",
     projectId: "rio-de-nara",
     storageBucket: "rio-de-nara.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```

5. Open **`js/firebase-config.js`** in this repository and paste those values in, replacing the `REPLACE_WITH_...` placeholders. Save the file.

These values are safe to be public/visible in your site's code — that's how Firebase's web SDK is designed to work. Real protection comes from step 3 below.

## 2. Turn on Firestore (the database)

1. In the Firebase console, left sidebar → **Build → Firestore Database**.
2. Click **Create database**. Choose a location close to Indonesia (e.g. `asia-southeast2 (Jakarta)`), and start in **production mode**.
3. Once created, go to the **Rules** tab, delete everything there, and paste in the entire contents of **`firestore.rules`** from this repository. Click **Publish**.

This makes sure customers can place orders/reservations and see the menu, but only you (once logged into `/admin`) can view, edit or delete them.

## 3. Turn on your admin login

1. Left sidebar → **Build → Authentication** → **Get started**.
2. Under **Sign-in method**, enable **Email/Password**.
3. Go to the **Users** tab → **Add user**. Enter the email and password you want to use to log into `/admin`. That's your login — there is no public sign-up page.

## 4. Set your WhatsApp number

Open **`js/firebase-config.js`** and set:

```js
window.RDN_WHATSAPP_NUMBER = "6281234567890";
```

Use international format: country code first, no leading `0`, no spaces, no `+`. An Indonesian number written locally as `0812-3456-7890` becomes `6281234567890`.

## 5. Load your menu

Go to `your-site-url/admin/`, sign in, open the **Menu** tab, and click **Load starter menu** to add 12 sample items you can immediately edit — rename them, change prices, mark items unavailable, delete what you don't need, or add your own from scratch with the form at the bottom of that tab. Changes appear on `order.html` right away.

## 6. Try it

- Visit `order.html`, add a few items, and submit a test order with your own phone number.
- Visit `reserve.html` and submit a test reservation.
- Open `/admin/`, sign in, and confirm both appear under the **Orders** and **Reservations** tabs, and that changing their status updates instantly.

---

### Notes

- `/admin` is not linked from the public site navigation and is marked `noindex` for search engines, but it is still reachable by anyone who guesses the URL until Firebase Authentication is connected — **do this setup before sharing your site's link widely**, so the page is actually login-protected rather than blank.
- This site is fully static (no server) — Firebase's client SDK talks directly to Google's servers from the visitor's browser, so it works on GitHub Pages or any static host with no extra deployment steps.
- If you ever want to reset the starter menu, just delete the items in the Menu tab and click **Load starter menu** again.
