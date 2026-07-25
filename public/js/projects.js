// Renders the portfolio grid from the `projects` Firestore collection.
//
// If Firestore has no published projects yet — or is unreachable — the
// hard-coded placeholder tiles already in the page are left exactly as they
// are. The page degrades to how it looked before rather than going blank.

import { db } from "./firebase.js";
import {
  collection, getDocs, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// Repeating shape pattern that keeps the editorial rhythm of the static grid.
const SHAPES = ["big r169", "sq", "sq", "r43", "r43", "r43"];

const grid = document.querySelector(".gal .grid-gal");
const filterBar = document.querySelector(".gal .filters");
const placeholderNote = document.querySelector(".gal .wrap > p.fade");

let projects = [];
let activeCategory = "All";

function tile(project, i) {
  const cell = document.createElement("div");
  cell.className = `frame ${SHAPES[i % SHAPES.length]} fade in`;

  if (project.coverImage) {
    const img = document.createElement("img");
    img.src = project.coverImage;
    // Alt text carries the project identity — this is the only description a
    // screen-reader user gets for the tile.
    img.alt = [project.title, project.location].filter(Boolean).join(", ");
    img.loading = "lazy";
    img.decoding = "async";
    cell.appendChild(img);
  } else {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = "Image to follow";
    cell.appendChild(tag);
  }

  const cap = document.createElement("span");
  cap.className = "cap";
  cap.textContent = [project.category, project.title].filter(Boolean).join(" · ");
  cell.appendChild(cap);

  return cell;
}

function draw() {
  const shown = activeCategory === "All"
    ? projects
    : projects.filter((p) => p.category === activeCategory);

  grid.innerHTML = "";
  shown.forEach((project, i) => grid.appendChild(tile(project, i)));
}

// Build the filter row from the categories actually present, so it never
// offers a category with nothing behind it.
function drawFilters() {
  const categories = ["All", ...new Set(projects.map((p) => p.category).filter(Boolean))];
  if (categories.length <= 2) { filterBar.hidden = true; return; }

  filterBar.removeAttribute("aria-hidden");
  filterBar.hidden = false;
  filterBar.innerHTML = "";

  categories.forEach((category) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (category === activeCategory ? " on" : "");
    chip.textContent = category;
    chip.setAttribute("aria-pressed", String(category === activeCategory));
    chip.onclick = () => {
      activeCategory = category;
      filterBar.querySelectorAll(".chip").forEach((c) => {
        const on = c.textContent === category;
        c.classList.toggle("on", on);
        c.setAttribute("aria-pressed", String(on));
      });
      draw();
    };
    filterBar.appendChild(chip);
  });
}

async function load() {
  if (!grid) return;
  try {
    // The published filter is required, not just desired: firestore.rules
    // evaluates reads against the query, so an unfiltered list is refused
    // outright for anonymous visitors.
    const snap = await getDocs(query(
      collection(db, "projects"),
      where("published", "==", true),
      orderBy("order")
    ));

    if (snap.empty) return;   // keep the placeholders

    projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    drawFilters();
    draw();
    if (placeholderNote) placeholderNote.hidden = true;
  } catch (err) {
    // Never blank the page on a backend problem — leave the placeholders up
    // and leave a trace for whoever is debugging.
    console.error("Could not load projects from Firestore:", err);
  }
}

load();
