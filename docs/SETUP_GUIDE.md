# Setup & Deployment Guide — Fusion Space Decor

Written for someone who hasn't done this before. Follow the parts in order.
Every command below is typed into a terminal — in VS Code that's **View → Terminal**,
or the terminal panel Claude Code already runs commands in for you.

---

## Part 1 — Connect VS Code + Claude Code

1. Install [VS Code](https://code.visualstudio.com/) if you don't have it.
2. Open the `Fusion Space Decor` folder in VS Code: **File → Open Folder…**
3. Install the **Claude Code** extension from the VS Code Extensions panel
   (search "Claude Code"), then sign in with your Anthropic account when prompted.
   Once installed, a Claude Code panel opens inside VS Code and you can chat with it
   right there — every change it makes shows up as a diff you approve before it saves.
4. Claude Code automatically reads `CLAUDE.md` at the start of each session, so it
   always knows the brand rules, tech stack and build order.

You're already set up this way if you're reading this inside the VS Code extension.

---

## Part 2 — Git & GitHub (version control + where the code lives)

Git tracks every change you make so nothing is ever lost, and GitHub is where the
code is stored online (and where Firebase Hosting can auto-deploy from).

### 2.1 One-time setup

1. Install [Git for Windows](https://git-scm.com/download/win) if `git --version`
   in a terminal doesn't print a version.
2. Set your name/email (used to label your commits):
   ```
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```
3. Create a free account at [github.com](https://github.com) if you don't have one.

### 2.2 Create the repository

1. On github.com click **New repository**. Name it `fusion-space-decor`, keep it
   **Private** for now (you can make it public later), don't add a README/gitignore
   (we already have them) → **Create repository**.
2. GitHub will show you a URL like `https://github.com/yourname/fusion-space-decor.git`.
   Copy it.
3. Back in the terminal, inside the `Fusion Space Decor` folder:
   ```
   git init
   git add .
   git commit -m "Initial project scaffold"
   git branch -M main
   git remote add origin https://github.com/yourname/fusion-space-decor.git
   git push -u origin main
   ```
   The first push may open a browser window asking you to log into GitHub — that's normal.

### 2.3 The everyday workflow

Every time Claude Code (or you) makes a working change worth saving:

```
git add .
git commit -m "short description of what changed"
git push
```

- `git status` — see what's changed since your last commit.
- `git log --oneline` — see your commit history.
- You never need to touch `git pull` unless you're working from a second computer.

**What never gets committed** (see `.gitignore`): the `reference/` folder (resume &
portfolio PDFs — personal, not meant to be public), any `.env` or service-account key
files, and Firebase's local cache/log files.

---

## Part 3 — Firebase (the backend)

Firebase was chosen over a self-managed server because: no server to patch or secure
yourself, a free tier that comfortably covers a single business's traffic, and
Firestore + Storage + Auth all live in one place with one login.

> **Note on hosting.** The live site is served by **GitHub Pages**, not Firebase
> Hosting — see Part 2. Firebase is used only for the *data*: project records, images,
> the admin login and enquiries. The two work together fine; the browser loads the
> pages from GitHub and then talks to Firebase for the content.

### 3.1 Create the Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign
   in with a Google account (create one dedicated to the business if you prefer).
2. **Add project** → name it `fusion-space-decor` → you can disable Google Analytics
   for now (not needed yet) → **Create project**.
3. In the project, click the **</> (Web)** icon to register a web app → name it
   `fusion-space-decor-web` → **do not** check "Firebase Hosting" in this step (we'll
   do that from the CLI) → **Register app**. Firebase shows you a `firebaseConfig`
   object — copy it.
4. Paste those values into `public/js/firebase.js` in this project, replacing the
   `REPLACE_ME` placeholders. This is safe to commit — it's not a secret, it just
   tells the browser which Firebase project to talk to.

### 3.2 Turn on the products we need

Still in the Firebase console, left sidebar:

**Firestore** (free — stores all text and project records)
**Build → Firestore Database** → Create database → start in **production mode** →
location **`asia-south1` (Mumbai)**. *Location cannot be changed later.*

**Authentication** (free — the admin login)
**Build → Authentication** → Get started → **Sign-in method** tab → enable
**Email/Password**. Then **Users** tab → **Add user**: the owner's email + a strong
password. This is the login for `/admin.html`. Only add accounts you trust with full
content control — anyone with a write permission in `firestore.rules` can edit or
delete anything.

Then **Authentication → Settings → Authorized domains → Add domain** and add
`amaanshaikh1105.github.io`. Email/password login works without this, but password
reset emails and any future Google sign-in need it, and it costs nothing to do now.

**Storage** (requires a card — stores project images)
**Build → Storage** → Get started. Firebase will require an upgrade to the
**Blaze (pay-as-you-go)** plan and ask for a card. Same region, `asia-south1`.

Blaze includes a monthly no-cost allowance (several GB of storage and transfer) that a
portfolio site of this size stays well inside — but it *is* a metered plan, so set a
guard immediately after upgrading:

> **Set a budget alert.** Firebase console → the **gear icon → Usage and billing →
> Details & settings → Modify budget alerts**. Set the budget to a small amount you'd
> notice (e.g. ₹500) with email alerts at 50% / 90% / 100%.
>
> A budget alert **emails you** — it does not cap spending or shut anything off. For a
> hard stop you'd set a billing-account budget with an automated cap in the Google
> Cloud console. For this site's traffic the alert is enough warning.

### 3.2b Keeping the image bill at zero

The one thing that actually runs up cost on an image-heavy site is **serving large
files repeatedly**. Two habits prevent it:

- Compress and resize every image **before** upload — max ~1600px wide, WebP where
  possible (CLAUDE.md §8). A 4 MB camera photo becomes ~200 KB with no visible loss.
- Never upload the original camera file straight from a phone.

The admin panel resizes images in the browser before upload for exactly this reason.

### 3.3 Install the Firebase CLI and connect this folder

In the terminal, inside the project folder:

```
npm install -g firebase-tools
firebase login
```

This opens a browser to log into the same Google account used above.

Then edit `.firebaserc` in this project and replace
`REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID` with the actual Project ID shown at the top
of the Firebase console (Project settings → General).

### 3.4 Deploy security rules

The rules in `firestore.rules` and `storage.rules` are already written to match
CLAUDE.md §8 (public can read published projects/site copy and submit enquiries;
only a logged-in admin can write). Push them to Firebase:

```
firebase deploy --only firestore:rules,storage:rules
```

Rules are the *only* thing deployed to Firebase — the site itself goes to GitHub Pages
(Part 2). Re-run the command above any time `firestore.rules` or `storage.rules`
changes; nothing else needs it.

### 3.5 Deploy the site

Nothing to do — this is automatic. Pushing to `main` triggers
`.github/workflows/deploy.yml`, which publishes `public/` to GitHub Pages:

```
git add .
git commit -m "describe the change"
git push
```

Live at **https://amaanshaikh1105.github.io/FusionSpaceDecor/** about a minute later.
Progress and failures show under the repo's **Actions** tab.

### 3.6 Connect your custom domain

Once you've bought a domain:

1. Repo → **Settings → Pages → Custom domain** → enter the domain → **Save**.
2. GitHub shows you the DNS records to add. Log into wherever you bought the domain,
   find **DNS settings**, and add exactly what GitHub shows — usually four `A` records
   for the root domain, or one `CNAME` record for a `www.` subdomain.
3. Back in Settings → Pages, tick **Enforce HTTPS** once it becomes available.

DNS can take anywhere from a few minutes to 24 hours. GitHub also writes a `CNAME`
file into the repo when you save the domain — leave it there, the deploy needs it.

---

## Part 4 — Ongoing workflow, once everything above is done

For every future change (new page section, new feature, style tweak):

1. Tell Claude Code what you want changed (in plain language — no need to know code).
2. Review the diff it proposes, approve it.
3. Preview locally: `npx serve public` and open the printed `localhost` URL.
4. If it looks right:
   ```
   git add .
   git commit -m "describe the change"
   git push
   ```
   The push publishes the site by itself. Only if `firestore.rules` or `storage.rules`
   changed, also run `firebase deploy --only firestore:rules,storage:rules`.

Adding new projects, editing copy, or reading enquiries day-to-day happens through
`/admin.html` once Build order step 5 (in CLAUDE.md) is complete — no git or
terminal needed for that part at all.

---

## Quick reference — what needs *you* specifically

Claude Code cannot do these for you; they need your own accounts/decisions:

- [x] Create the GitHub account + repository, and authenticate `git push` once.
- [x] Turn on GitHub Pages (Settings → Pages → Source: GitHub Actions).
- [ ] Create the Firebase project and enable Firestore / Authentication.
- [ ] Upgrade to the Blaze plan to enable Storage, **and set a budget alert**.
- [ ] Add the admin login (email + password) in Firebase Authentication.
- [ ] Add `amaanshaikh1105.github.io` to Authentication → Settings → Authorized domains.
- [ ] Paste the `firebaseConfig` values into `public/js/firebase.js` (or hand them to
      Claude Code to fill in) and the Project ID into `.firebaserc`.
- [ ] Run `firebase login` once on your machine.
- [ ] Add the DNS records at your domain registrar to connect the custom domain.

Everything else — building pages, writing the Firestore-reading code, the admin
panel, security rules, image handling — Claude Code does directly in this repo.
