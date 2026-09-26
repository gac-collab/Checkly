# GAC Fleet Maintenance Checklist — Self-Hosted (Free)

Two pages:
- `index.html` — what the site team opens. Just a form, no login, no admin link anywhere in it.
- `admin.html` — the dashboard. Not linked from index.html. Protected by a PIN you set yourself.

Data is stored in **Firebase Firestore** (Google's free tier — no credit card required for
this scale of use), so submissions from every phone sync into one place the admin page reads.

---

## 1. Create a free Firebase project

1. Go to https://console.firebase.google.com and sign in with any Google account.
2. Click **Add project** → give it a name (e.g. `gac-fleet-checklist`) → skip Google Analytics → Create.
3. On the project home page, click the **`</>`** (web app) icon to register a web app.
   Give it a nickname, click **Register app**. Firebase Hosting checkbox: leave unchecked.
4. It shows you a `firebaseConfig` object. Copy it.
5. In this folder, open **`firebase-config.js`** and replace the placeholder object with the one
   you copied. Save.

## 2. Turn on Firestore (the database)

1. In the Firebase console left menu: **Build → Firestore Database → Create database**.
2. Choose a location close to Qatar (e.g. `eur3` or `me-central1` if offered), then
   **Start in test mode** (fine for a trial — see the security note below).
3. Click **Create**.

### Security note (read this)
"Test mode" rules let anyone with your Firebase web config read/write the database while
active (they auto-expire after 30 days and lock everything after that — you'll need to
extend or replace them before then). Because the app now supports edit/delete from both the
site team (their own submissions) and admin, with no real user login, the rules can't
distinguish "the person who submitted this" from anyone else — that distinction only lives
in each browser's local storage, which is a UX convenience, not a security boundary.

For a private trial with your own crew, once test mode is close to expiring, replace the
rules with this (still no login required, but at least scoped to one collection and never
lets anyone touch other Firestore data if you add more later):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /checklists/{doc} {
      allow read, create, update, delete: if true;
    }
    match /{document=**} { allow read, write: if false; }
  }
}
```

This is honest about where the app currently stands: fine for an internal trial on a link
you control, not something to leave running indefinitely or hand out publicly. The real fix
for production is Firebase Authentication (free tier available) so rules can check
`request.auth.uid` and each person only edits their own data — worth doing before this
becomes daily-use rather than a trial.

## 3. Set your own admin PIN

Open `admin.html`, find this line near the top of the script:
```js
const ADMIN_PIN = "2468";
```
Change `2468` to something only you and other admins know, then save.

## 4. Put it on GitHub

```bash
cd gac-checklist-app
git init
git add .
git commit -m "GAC fleet checklist app"
git branch -M main
git remote add origin https://github.com/<your-username>/gac-fleet-checklist.git
git push -u origin main
```
(Create the empty repo on github.com first — "New repository", don't initialize with a README.)

## 5. Turn on GitHub Pages (free hosting)

1. On your repo on github.com: **Settings → Pages**.
2. Under "Build and deployment", Source: **Deploy from a branch**.
3. Branch: `main`, folder: `/ (root)` → **Save**.
4. Wait ~1 minute. Your site team link will be:
   ```
   https://<your-username>.github.io/gac-fleet-checklist/
   ```
   And the admin dashboard:
   ```
   https://<your-username>.github.io/gac-fleet-checklist/admin.html
   ```

That's it — no sign-in screen, works on any phone or laptop browser, free indefinitely at this
scale (Firebase's free Spark plan covers roughly 50,000 document reads and 20,000 writes a day,
far beyond what a fleet checklist trial needs).

## Customizing checklists

All equipment/checklist data lives in `templates.js` as one `TEMPLATES` object — add new
equipment types or intervals there; both pages read from it automatically.

## What's in this version

- **Branding** — GA logo embedded (`logo.js`), navy/red theme pulled from the logo's own colors.
- **Validation** — Equipment/Plate No. and KMR/HMR must be numbers; names letters only; date
  required. Invalid fields turn red with an inline message and block submission.
- **Edit / Delete** — Site team gets a "My Submissions" tab (tracked per-browser, no login) to
  edit or delete their own entries. Admin can edit or delete any submission from the dashboard.
- **XSS fix** — all user-entered text (names, findings, remarks) is now escaped before being
  displayed, so someone typing `<script>` or similar into a field can't break the page for
  other viewers. This was a real gap in the previous version and has been closed.
- **Shared files** — `theme.css` and `shared.js` hold the styling and logic used by both pages,
  so future changes (colors, validation rules, item rendering) only need to happen once.

## Known limitations (by design, for a no-login trial)

- "My Submissions" is tied to the browser/device, not a person — clearing browser data loses
  that list (the checklist itself stays in Firestore; only the personal shortcut is lost).
- Anyone with the site link can technically edit/delete any record via direct API calls, not
  just their own — the UI only shows people their own submissions, it doesn't enforce it
  server-side. See the security note above.
