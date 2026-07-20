# Fusion Space Decor — Website

Marketing + portfolio site for Fusion Space Decor, with a Firebase backend so the
owner can manage projects, copy and enquiries without touching code.

- **What this is / how it's built:** see [CLAUDE.md](CLAUDE.md)
- **How to set everything up (git, GitHub, VS Code, Firebase, deploy):** see
  [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)

## Folder structure

```
Fusion Space Decor/
├── CLAUDE.md              Project brief Claude Code reads every session
├── README.md              This file
├── firebase.json          Tells Firebase which folder to host + where rules live
├── .firebaserc            Which Firebase project this repo deploys to
├── firestore.rules        Who can read/write Firestore data
├── firestore.indexes.json Firestore composite indexes (empty until needed)
├── storage.rules          Who can read/write uploaded images
├── .gitignore             Files git should never track (secrets, PDFs, logs)
├── docs/
│   └── SETUP_GUIDE.md     Step-by-step setup & deployment guide
├── reference/             Resume + portfolio PDFs (local only — never committed)
└── public/                Everything that actually gets deployed (Hosting root)
    ├── index.html
    ├── about.html
    ├── services.html
    ├── projects.html
    ├── project.html
    ├── contact.html
    ├── admin.html
    ├── logo.png            ← place the supplied logo file here
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── layout.js       shared header/footer
    │   ├── firebase.js     Firebase project connection
    │   ├── main.js         home page / shared behaviour
    │   ├── projects.js     projects grid + project detail
    │   ├── contact.js      enquiry form → Firestore
    │   └── admin.js        admin login + CRUD
    └── images/             any static images not managed via the admin panel
```

## Local preview

No build step — just serve the `public/` folder and open it in a browser:

```
npx serve public
```

(or, once the Firebase CLI is installed — see the setup guide — `firebase emulators:start`)
