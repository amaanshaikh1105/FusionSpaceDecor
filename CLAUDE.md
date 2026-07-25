# Fusion Space Decor — Project Brief for Claude Code

This file tells Claude Code what we're building and the rules to follow. Claude Code
reads `CLAUDE.md` automatically at the start of every session, so keep it up to date.

---

## 1. What we're building

A multi-page marketing + portfolio website for **Fusion Space Decor**, a Mumbai
interior design, civil works and design studio led by **Attiulla Mirza** (21+ years'
experience). All project images and text must be **manageable from a backend** so the
owner can add/edit projects and content without touching code.

**Goals**
- Look premium and trustworthy (this is a luxury interiors brand).
- Be fast on mobile (image-heavy, so images must be optimised).
- Let a non-technical owner add projects, edit copy, and read enquiries.

---

## 2. Brand identity (use these exact values)

**Palette**
| Token        | Hex       | Use                                   |
|--------------|-----------|----------------------------------------|
| Ink          | `#14110F` | Page background (warm charcoal)       |
| Charcoal     | `#1E1A17` | Alt sections / surfaces               |
| Gold         | `#C6A15B` | Accent (antique brass, from the logo) |
| Gold soft    | `#E4CE9A` | Highlights                            |
| Bone         | `#F5F1EA` | Primary text / light sections         |
| Stone        | `#A79B87` | Secondary text                        |

**Type**
- Display: **Cinzel** (used with restraint — logo, headings, eyebrows)
- Accent: **Cormorant Garamond** italic (pull quotes, hero subline)
- Body/UI: **Outfit**

**Tagline:** `Interior · Civil Works · Design`
**Logo:** gold/charcoal hexagonal "FSD" monogram + serif wordmark
(place the supplied logo file at `/public/logo.png` and use it in the header/footer).

The starter `index.html` in this repo already encodes this identity — match it.

---

## 3. Tech stack (decided — don't switch without asking)

- **Frontend:** static multi-page site — plain HTML, CSS, vanilla JavaScript.
  No framework, no build step. Easiest to preview and deploy for a first project.
- **Backend / data:** **Firebase**
  - **Firestore** — all text content and project records
  - **Firebase Storage** (or Cloudinary) — project images
  - **Firebase Authentication** (email/password) — protects the admin panel
  - **Firebase Hosting** — serves the site, with the custom domain
- **Admin panel:** a password-protected `/admin` page (built with the same stack)
  where the owner adds/edits/deletes projects, edits site copy, and views enquiries.

> If we later outgrow static, the upgrade path is Vite + React — but not yet.

---

## 4. Site map (pages to build)

| Page            | Path                  | Purpose                                                        |
|-----------------|-----------------------|------------------------------------------------------------------|
| Home            | `/index.html`         | Hero, stats, services, featured projects, studio, clients, CTA |
| About / Studio  | `/about.html`         | Attiulla Mirza's story, experience, credentials, approach      |
| Services        | `/services.html`      | Interior · Civil Works · Design · Project Management (detail) |
| Portfolio       | `/portfolio.html`     | Gallery of all projects                                        |
| Sketches        | `/sketches.html`      | Hand sketches / concept drawings                               |
| Contact         | `/contact.html`       | Enquiry form + details + map                                    |
| Admin           | `/admin.html`         | Login-protected content manager                                |

Shared header/footer: put them in `/js/layout.js` and inject on each page so we edit
navigation in one place.

---

## 5. Data model (Firestore collections)

```
projects (collection)
  └── {autoId} (document)
       title:        string   e.g. "Show Villa, Kalpataru Amoda"
       category:     string   "Residential" | "Commercial" | "Institutional" | "Retail" | "Hospitality"
       location:     string   e.g. "Lonavala"
       areaSqft:     number    3300
       year:         number    2016
       client:       string   "Kalpataru Limited"
       description:  string   (long text)
       coverImage:   string   (URL — mirrors the gallery entry marked as cover)
       gallery:      array<{url, path}>  url = public download URL,
                                         path = Storage path, needed to delete the
                                         file when an image is removed
       featured:     boolean  (show on homepage)
       order:        number   (sort order)
       published:    boolean  (hide drafts from the public site)

siteContent (collection)  — single editable copy blocks
  ├── home     { heroHeading, heroSub, stats:[{num,label}] }
  ├── about    { bio, quote, credentials:[...] }
  └── contact  { email, phone, address, mapUrl }

services (collection)
  └── {autoId} { title, description, order }

enquiries (collection)  — created by the contact form, read in admin
  └── {autoId} { name, email, phone, message, createdAt }
```

---

## 6. Content already gathered (seed data)

Use these to seed Firestore so the site isn't empty. Full details are in the owner's
resume + portfolio PDF (in `/reference/`).

**Founder:** Attiulla Mirza — Interior Designer, Project Manager & Site Executor.
21+ years. Gold Medallist, Advance Diploma in Interior Designing & Decoration,
L.S. Raheja School of Architecture (2004). B.Com, National College, Bandra (1996).
Software: AutoCAD, SketchUp. Languages: English, Hindi, Urdu.

**Contact:** mirzaatti@hotmail.com · +91 98691 57571 · Mumbai.

**Flagship projects (title — area — client/location):**
- Metro Junction Mall refurbishment — 400,000 sq ft — West Pioneer, Kalyan
- NMMC municipal office — 400,000 sq ft — Navi Mumbai
- Accenture office renovations — 42,000 & 35,000 sq ft — Godrej, Vikhroli
- High-end residential tower — 80,000 sq ft — Churchgate
- Bungalow — 45,000 sq ft — Daman
- Show villas & flats — Kalpataru Amoda (Lonavala), Avana (Lower Parel),
  Yashodhan (Andheri), Jade & Serenity (Pune), Elite (Thane)
- Clubhouses — Kalpataru Solitaire (Juhu), Hills/Goenka (Thane), Splendor/Harmony (Pune)
- Co-working — Westport (Baner), Sai Radhe (Pune), Pentagon (Magarpatta)
- Aditya Birla Memorial Hospital (Pune); Aditya Birla Clinic & Health Store
- DRDO Dr. APJ Abdul Kalam Golden Jubilee Auditorium
- Retail — Silk Museum, saree & jewellery showrooms; Corporate offices in Kolkata, BKC, Andheri

**Categories to seed:** Residential, Commercial, Institutional, Retail, Hospitality.

---

## 7. Build order (work through these in sessions)

1. **Static frontend first.** Build all pages with hard-coded placeholder content so
   the design and navigation are solid before adding a backend. (Home already started.)
2. **Firebase setup.** Add the Firebase Web SDK; create `/js/firebase.js` with the
   project config; connect Firestore.
3. **Make the public site read from Firestore** (projects grid, project detail, copy).
4. **Contact form** writes to the `enquiries` collection.
5. **Admin panel** (`/admin.html`): Firebase Auth login, then CRUD for projects,
   image upload to Storage, edit site copy, list enquiries.
6. **Security rules** (see §8). **Seed data.** **Optimise images.** **Deploy.**

Tackle one numbered step per session where possible. After each step, commit.

---

## 8. Rules & conventions

- **Security:** Firestore rules must allow public **read** of `published` projects and
  `siteContent`, allow public **create** on `enquiries` only, and require
  authentication for all **writes** to `projects`/`siteContent` and all reads of
  `enquiries`. Never commit secrets — the Firebase web config is public by design, but
  service-account keys and `.env` files must be git-ignored.
- **Images:** compress + resize before upload (max ~1600px wide, WebP where possible).
  Always set width/height and `loading="lazy"`. This site is image-heavy.
- **Accessibility:** semantic HTML, visible keyboard focus, alt text on every image,
  respect `prefers-reduced-motion` (the starter already does).
- **No inline secrets, no localStorage for critical data, mobile-first responsive.**
- **Ask before** adding a framework, a paid service, or a new dependency.

---

## 9. How I (the owner) will work with Claude Code

- I'm not a developer. Explain what each change does in plain language.
- Prefer small, reviewable steps. Show me the plan before large changes (Plan mode).
- After a working change, commit with a clear message and tell me how to preview it.
- If something needs an account, key, or a decision only I can make, stop and tell me
  exactly what to click.
