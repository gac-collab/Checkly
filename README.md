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
"Test mode" rules allow anyone with your Firebase project's web config to read/write the
database while it's active (they expire after 30 days and lock everything by default after
that). That's acceptable for a short trial since the config isn't advertised anywhere public,
but before a real rollout, go to **Firestore → Rules** and replace them with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /checklists/{doc} {
      allow read: if false;   // nobody can read directly — admin.html should use
                                // a server function instead of direct client reads
                                // once you're past the trial stage
      allow create: if true;  // anyone can submit a checklist
      allow update, delete: if false;
    }
  }
}
```
This still lets `admin.html` break unless you add real authentication (Firebase Auth has a
free tier too). For a trial with your own crew on a private link, the default test-mode rules
are the pragmatic choice — just don't leave the project in test mode indefinitely.

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
