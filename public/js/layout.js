// Shared header/footer, injected into every page.
// Edit navigation here once — every page picks it up automatically.

function renderHeader() {
  return `
    <header data-site-header>
      <a href="/index.html" aria-label="Fusion Space Decor home">
        <img src="/logo.png" alt="Fusion Space Decor" height="48" width="48" loading="lazy">
      </a>
      <nav aria-label="Main">
        <a href="/index.html">Home</a>
        <a href="/about.html">About</a>
        <a href="/services.html">Services</a>
        <a href="/projects.html">Projects</a>
        <a href="/contact.html">Contact</a>
      </nav>
    </header>
  `;
}

function renderFooter() {
  return `
    <footer data-site-footer>
      <p>&copy; ${new Date().getFullYear()} Fusion Space Decor. Interior &middot; Civil Works &middot; Design.</p>
    </footer>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const headerMount = document.querySelector("#site-header");
  const footerMount = document.querySelector("#site-footer");
  if (headerMount) headerMount.outerHTML = renderHeader();
  if (footerMount) footerMount.outerHTML = renderFooter();
});
