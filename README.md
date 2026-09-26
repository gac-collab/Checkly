# GAC Fleet Maintenance Checklist — Self-Hosted (Free)

Two pages:
- `index.html` — what the site team opens. Just a form, no login, no admin link anywhere in it.
- `admin.html` — the dashboard. Not linked from index.html. Protected by a PIN you set yourself.

Data is stored in **Firebase Firestore** (Google's free tier — no credit card required for
this scale of use), so submissions from every phone sync into one place the admin page reads.

---
