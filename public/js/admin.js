// Admin panel: Firebase Auth login, then CRUD for projects + enquiries.
// Every read/write here relies on firestore.rules / storage.rules to enforce
// access — the UI hiding a button is convenience, not security.

import { auth, db, storage } from "./firebase.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";

const MAX_EDGE = 1600;      // px — matches CLAUDE.md §8
const WEBP_QUALITY = 0.82;  // visually lossless for photography at this size

const $ = (id) => document.getElementById(id);

// Working copy of the project being edited. `images` is the ordered gallery;
// `coverIndex` marks which one is the cover.
let editing = null;

/* ---------------------------------------------------------------- helpers */

function show(el, on = true) { el.hidden = !on; }

function say(el, text, kind = "") {
  el.textContent = text;
  el.className = "msg" + (kind ? " " + kind : "");
  show(el, Boolean(text));
}

// Firebase error codes are not readable by a non-developer. Translate the ones
// that actually come up, and fall back to the raw message for the rest.
function humanError(err) {
  const map = {
    "auth/invalid-email": "That doesn't look like a valid email address.",
    "auth/invalid-credential": "Wrong email or password.",
    "auth/wrong-password": "Wrong email or password.",
    "auth/user-not-found": "No admin account exists with that email.",
    "auth/too-many-requests": "Too many failed attempts. Wait a few minutes and try again.",
    "auth/network-request-failed": "No connection to Firebase. Check your internet.",
    "permission-denied": "Firebase refused that. The security rules may not be deployed yet.",
    "storage/unauthorized": "Storage refused the upload. Check storage.rules is deployed.",
    "storage/retry-limit-exceeded": "Upload timed out. Check your connection and try again.",
    "unavailable": "Can't reach Firestore right now. Check your internet."
  };
  return map[err?.code] || err?.message || String(err);
}

/* ------------------------------------------------------- image processing */

// Draw the file onto a canvas at a bounded size and re-encode. A 4 MB phone
// photo lands around 200 KB, which is what keeps both page speed and the
// Storage bill sane. Falls back to JPEG if the browser can't encode WebP.
function compress(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Could not process that image.")),
        "image/webp",
        WEBP_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`"${file.name}" isn't an image this browser can read.`));
    };
    img.src = url;
  });
}

async function uploadImages(files) {
  const bar = $("prog-bar"), hint = $("upload-hint");
  show($("prog"), true); show(hint, true);
  const urls = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    hint.textContent = `Processing ${i + 1} of ${files.length} — ${file.name}`;
    bar.style.width = `${(i / files.length) * 100}%`;

    const blob = await compress(file);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const path = `projects/${editing.id || "unsaved"}/${name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType: "image/webp" });
    urls.push({ url: await getDownloadURL(storageRef), path });

    const saved = Math.max(0, file.size - blob.size);
    hint.textContent = `Uploaded ${file.name} — ${(blob.size / 1024).toFixed(0)} KB ` +
                       `(saved ${(saved / 1024 / 1024).toFixed(1)} MB)`;
  }

  bar.style.width = "100%";
  setTimeout(() => { show($("prog"), false); show(hint, false); bar.style.width = "0"; }, 1800);
  return urls;
}

/* ------------------------------------------------------------- image UI */

function renderShelf() {
  const shelf = $("shelf");
  shelf.innerHTML = "";
  editing.images.forEach((image, i) => {
    const cell = document.createElement("div");
    cell.className = "shot";

    const img = document.createElement("img");
    img.src = image.url;
    img.alt = "";
    img.loading = "lazy";
    cell.appendChild(img);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "x";
    remove.textContent = "×";
    remove.title = "Remove this image";
    remove.setAttribute("aria-label", "Remove image");
    remove.onclick = () => removeImage(i);
    cell.appendChild(remove);

    if (i === editing.coverIndex) {
      const tag = document.createElement("span");
      tag.className = "cover-tag";
      tag.textContent = "Cover";
      cell.appendChild(tag);
    } else {
      const set = document.createElement("button");
      set.type = "button";
      set.className = "ghost sm setcover";
      set.textContent = "Set cover";
      set.onclick = () => { editing.coverIndex = i; renderShelf(); };
      cell.appendChild(set);
    }
    shelf.appendChild(cell);
  });
}

async function removeImage(i) {
  const image = editing.images[i];
  // Delete the file too, so removed images don't sit in Storage costing money.
  // A missing object isn't an error worth surfacing — the goal is it's gone.
  if (image.path) {
    try { await deleteObject(ref(storage, image.path)); } catch { /* already gone */ }
  }
  editing.images.splice(i, 1);
  if (editing.coverIndex >= editing.images.length) editing.coverIndex = 0;
  renderShelf();
}

async function handleFiles(fileList) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
  if (!files.length) return;
  try {
    const uploaded = await uploadImages(files);
    editing.images.push(...uploaded);
    renderShelf();
    say($("edit-msg"), `Added ${uploaded.length} image${uploaded.length > 1 ? "s" : ""}.`, "ok");
  } catch (err) {
    say($("edit-msg"), humanError(err), "err");
    show($("prog"), false); show($("upload-hint"), false);
  }
}

/* ------------------------------------------------------------- projects */

async function loadProjects() {
  const listEl = $("plist");
  say($("list-msg"), "Loading…");
  try {
    const snap = await getDocs(query(collection(db, "projects"), orderBy("order")));
    listEl.innerHTML = "";
    show($("plist-empty"), snap.empty);
    say($("list-msg"), "");

    snap.forEach((docSnap) => {
      const p = { id: docSnap.id, ...docSnap.data() };
      const row = document.createElement("div");
      row.className = "pitem";

      const thumb = document.createElement("img");
      thumb.className = "thumb";
      thumb.alt = "";
      thumb.loading = "lazy";
      if (p.coverImage) thumb.src = p.coverImage;
      row.appendChild(thumb);

      const meta = document.createElement("div");
      const title = document.createElement("div");
      title.className = "t";
      title.textContent = p.title || "(untitled)";
      const pill = document.createElement("span");
      pill.className = "pill " + (p.published ? "live" : "draft");
      pill.textContent = p.published ? "Live" : "Draft";
      title.appendChild(pill);
      meta.appendChild(title);

      const sub = document.createElement("div");
      sub.className = "m";
      sub.textContent = [p.category, p.location, p.areaSqft ? `${p.areaSqft} sq ft` : null, p.year]
        .filter(Boolean).join(" · ");
      meta.appendChild(sub);
      row.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "actions";
      const edit = document.createElement("button");
      edit.className = "ghost sm";
      edit.textContent = "Edit";
      edit.onclick = () => openEditor(p);
      actions.appendChild(edit);
      row.appendChild(actions);

      listEl.appendChild(row);
    });
  } catch (err) {
    say($("list-msg"), humanError(err), "err");
  }
}

function openEditor(project) {
  const images = Array.isArray(project?.gallery)
    ? project.gallery.map((g) => (typeof g === "string" ? { url: g, path: "" } : g))
    : [];
  const coverIndex = Math.max(0, images.findIndex((i) => i.url === project?.coverImage));

  editing = { id: project?.id || null, images, coverIndex };

  $("edit-title").textContent = project ? "Edit project" : "New project";
  $("f-title").value = project?.title || "";
  $("f-category").value = project?.category || "Residential";
  $("f-location").value = project?.location || "";
  $("f-client").value = project?.client || "";
  $("f-area").value = project?.areaSqft ?? "";
  $("f-year").value = project?.year ?? "";
  $("f-order").value = project?.order ?? 0;
  $("f-description").value = project?.description || "";
  $("f-featured").checked = Boolean(project?.featured);
  $("f-published").checked = Boolean(project?.published);

  show($("delete-btn"), Boolean(project?.id));
  say($("edit-msg"), "");
  renderShelf();
  show($("list-panel"), false);
  show($("edit-panel"), true);
  window.scrollTo(0, 0);
}

function closeEditor() {
  editing = null;
  show($("edit-panel"), false);
  show($("list-panel"), true);
  loadProjects();
}

function numberOrNull(value) {
  const n = Number(value);
  return value === "" || Number.isNaN(n) ? null : n;
}

async function saveProject(event) {
  event.preventDefault();
  const btn = $("save-btn");
  btn.disabled = true;
  say($("edit-msg"), "Saving…");

  const data = {
    title: $("f-title").value.trim(),
    category: $("f-category").value,
    location: $("f-location").value.trim(),
    client: $("f-client").value.trim(),
    areaSqft: numberOrNull($("f-area").value),
    year: numberOrNull($("f-year").value),
    order: numberOrNull($("f-order").value) ?? 0,
    description: $("f-description").value.trim(),
    gallery: editing.images,
    coverImage: editing.images[editing.coverIndex]?.url || "",
    featured: $("f-featured").checked,
    published: $("f-published").checked,
    updatedAt: serverTimestamp()
  };

  try {
    if (editing.id) {
      await updateDoc(doc(db, "projects", editing.id), data);
    } else {
      const created = await addDoc(collection(db, "projects"), { ...data, createdAt: serverTimestamp() });
      editing.id = created.id;
      show($("delete-btn"), true);
    }
    say($("edit-msg"), "Saved.", "ok");
  } catch (err) {
    say($("edit-msg"), humanError(err), "err");
  } finally {
    btn.disabled = false;
  }
}

async function deleteProject() {
  if (!editing?.id) return;
  const title = $("f-title").value.trim() || "this project";
  if (!confirm(`Delete "${title}" and its images? This cannot be undone.`)) return;

  const btn = $("delete-btn");
  btn.disabled = true;
  say($("edit-msg"), "Deleting…");
  try {
    for (const image of editing.images) {
      if (image.path) {
        try { await deleteObject(ref(storage, image.path)); } catch { /* already gone */ }
      }
    }
    await deleteDoc(doc(db, "projects", editing.id));
    closeEditor();
  } catch (err) {
    say($("edit-msg"), humanError(err), "err");
  } finally {
    btn.disabled = false;
  }
}

/* ------------------------------------------------------------ enquiries */

async function loadEnquiries() {
  const listEl = $("enq-list");
  say($("enq-msg"), "Loading…");
  try {
    const snap = await getDocs(query(collection(db, "enquiries"), orderBy("createdAt", "desc")));
    listEl.innerHTML = "";
    show($("enq-empty"), snap.empty);
    say($("enq-msg"), "");

    snap.forEach((docSnap) => {
      const e = docSnap.data();
      const card = document.createElement("div");
      card.className = "enq";

      const head = document.createElement("div");
      head.className = "h";
      const name = document.createElement("span");
      name.className = "n";
      name.textContent = e.name || "(no name)";
      const when = document.createElement("span");
      when.className = "d";
      when.textContent = e.createdAt?.toDate
        ? e.createdAt.toDate().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
        : "";
      head.append(name, when);
      card.appendChild(head);

      const contact = document.createElement("div");
      contact.className = "c";
      contact.textContent = [e.email, e.phone].filter(Boolean).join(" · ");
      card.appendChild(contact);

      const body = document.createElement("div");
      body.className = "body";
      body.textContent = e.message || "";
      card.appendChild(body);

      listEl.appendChild(card);
    });
  } catch (err) {
    say($("enq-msg"), humanError(err), "err");
  }
}

/* ------------------------------------------------------------------ auth */

async function login(event) {
  event.preventDefault();
  const btn = $("login-btn");
  btn.disabled = true;
  say($("login-msg"), "");
  try {
    await signInWithEmailAndPassword(auth, $("admin-email").value.trim(), $("admin-password").value);
  } catch (err) {
    say($("login-msg"), humanError(err), "err");
  } finally {
    btn.disabled = false;
  }
}

onAuthStateChanged(auth, (user) => {
  show($("login-view"), !user);
  show($("admin-view"), Boolean(user));
  if (user) {
    $("who").textContent = user.email;
    $("admin-password").value = "";
    loadProjects();
  }
});

/* --------------------------------------------------------------- wiring */

$("login-form").addEventListener("submit", login);
$("logout-btn").addEventListener("click", () => signOut(auth));
$("new-btn").addEventListener("click", () => openEditor(null));
$("back-btn").addEventListener("click", closeEditor);
$("refresh-btn").addEventListener("click", loadProjects);
$("refresh-enq").addEventListener("click", loadEnquiries);
$("project-form").addEventListener("submit", saveProject);
$("delete-btn").addEventListener("click", deleteProject);

document.querySelectorAll(".tabs button").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tabs button")
      .forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    const which = tab.dataset.tab;
    show($("tab-projects"), which === "projects");
    show($("tab-enquiries"), which === "enquiries");
    if (which === "enquiries") loadEnquiries();
  });
});

// Drop zone: click, keyboard and drag-and-drop all reach the same handler.
const drop = $("drop"), fileInput = $("file-input");
drop.addEventListener("click", () => fileInput.click());
drop.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
});
fileInput.addEventListener("change", () => { handleFiles(fileInput.files); fileInput.value = ""; });
["dragenter", "dragover"].forEach((type) =>
  drop.addEventListener(type, (e) => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach((type) =>
  drop.addEventListener(type, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));
