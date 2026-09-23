// Builds growher.html and little-agroecology-explorers.html from
// content/pages/growher.md and content/pages/lae.md, so EWA admins can edit
// these two programme pages through the CMS instead of asking a developer
// for every small text/image change (Part A2 of the Scope of Work).
//
// Run via `npm run build` (see package.json) — Vercel runs this automatically
// on every deploy, and it also runs whenever Decap CMS commits a change to
// content/pages/*.md.

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT = path.join(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'content', 'pages');

// GA4 measurement ID for EWA (provided by Simeon, 23 Sept 2026).
const GA_ID = 'G-8C0PW1PDX9';

const NAV_ITEMS = [
  ['/index.html', 'Home'],
  ['/about.html', 'About'],
  ['/growher.html', 'GrowHer Urban'],
  ['/little-agroecology-explorers.html', 'Little Explorers'],
  ['/get-involved.html', 'Get Involved'],
  ['/blog/index.html', 'Updates'],
  ['/contact.html', 'Contact']
];

function nav(activeHref) {
  return NAV_ITEMS.map(([href, label]) =>
    `      <a href="${href}"${href === activeHref ? ' class="active"' : ''}>${label}</a>`
  ).join('\n');
}

function shell({ title, description, activeHref, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} | Elevate Women in Agroecology (EWA)</title>
<meta name="description" content="${description}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Source+Sans+3:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
<!-- Google Analytics (GA4) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA_ID}');
</script>
</head>
<body>
<header>
  <div class="nav">
    <a href="/index.html" class="brand">
      <img src="/images/logo.jpg" alt="EWA logo">
      Elevate Women in Agroecology
    </a>
    <button class="nav-toggle" aria-label="Toggle menu" onclick="document.querySelector('nav.links').classList.toggle('open')">&#9776;</button>
    <nav class="links">
${nav(activeHref)}
    </nav>
  </div>
</header>
${bodyHtml}
<footer>
  &copy; 2026 Elevate Women in Agroecology (EWA) &mdash; Zambia. All rights reserved.<br>
  Built and maintained by <a href="https://nexus-digital-solution.vercel.app" target="_blank" rel="noopener">Nexus Digital Solutions</a>
</footer>

<a class="floating-whatsapp" href="https://wa.me/260976634650" target="_blank" rel="noopener" aria-label="Message EWA on WhatsApp">
  <svg viewBox="0 0 32 32" fill="#fff" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 3C9.4 3 4 8.4 4 15c0 2.3.6 4.4 1.7 6.3L4 29l7.9-1.6c1.8.9 3.9 1.4 6.1 1.4 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.7c-2 0-3.9-.5-5.5-1.5l-.4-.2-4.7 1 1-4.6-.2-.4C5.3 17.1 4.9 16 4.9 15c0-6.1 5-11.1 11.1-11.1S27.1 8.9 27.1 15 22.1 24.7 16 24.7zm6.1-8.3c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.7-1.7-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.7.1-.1.3-.4.5-.5.2-.2.2-.3.3-.5.1-.2 0-.4 0-.6 0-.2-.8-1.9-1.1-2.6-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8 0 1.7 1.2 3.3 1.4 3.5.2.2 2.4 3.7 5.8 5.1.8.3 1.4.5 1.9.7.8.2 1.5.2 2.1.1.6-.1 2-.8 2.3-1.6.3-.8.3-1.4.2-1.6-.1-.1-.3-.2-.6-.4z"/>
  </svg>
</a>
</body>
</html>`;
}

function checklist(items, strokeColor) {
  return items.map(it => `
      <li>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="${strokeColor}" stroke-width="1.6"/><path d="M6 10l2.5 2.5L14 7" stroke="${strokeColor}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span><span class="label">${it.label}</span><br><span class="desc">${it.desc}</span></span>
      </li>`).join('');
}

function loadPage(file) {
  const raw = fs.readFileSync(path.join(PAGES_DIR, file), 'utf8');
  return matter(raw).data;
}

function buildGrowher() {
  const d = loadPage('growher.md');

  const body = `
<section class="page-banner-photo" style="--banner-img:url('${d.banner_image}');">
  <div class="page-banner-inner">
    <h1>GrowHer Urban Initiative</h1>
    <p>Urban farming through sack gardening — growing food where space is tight and need is real.</p>
  </div>
</section>

<section class="section-cream">
  <div class="wrap about-grid">
    <div>
      <div class="kicker-rule"></div>
      <h2 class="section-title">${d.intro_heading}</h2>
      <p class="lede">${d.intro_text}</p>
      <p class="lede" style="margin-top:16px;">${d.intro_text_2}</p>
    </div>
    <div class="figure-frame"><img src="${d.intro_image}" alt="Women tending sack gardens"></div>
  </div>
</section>

<section class="section-green">
  <div class="wrap">
    <div class="kicker-rule" style="background:var(--gold-soft);"></div>
    <h2 class="section-title" style="color:#fff;">${d.who_heading}</h2>
    <ul class="check-list">${checklist(d.who_items, '#C9A06B')}
    </ul>
  </div>
</section>

<section class="section-cream">
  <div class="wrap">
    <div class="kicker-rule"></div>
    <h2 class="section-title">${d.involve_heading}</h2>
    <p class="lede">${d.involve_text}</p>
    <div class="photo-strip">
      <div class="figure-frame"><img src="${d.photo_1}" alt="Sack garden harvest"></div>
      <div class="figure-frame"><img src="${d.photo_2}" alt="Produce grown by GrowHer participants at market"></div>
    </div>
    <div style="margin-top:32px;">
      <a href="/get-involved.html" class="btn btn-green">Get Involved</a>
      <a href="https://wa.me/260976634650" class="btn btn-gold" target="_blank" rel="noopener" style="margin-left:14px;">WhatsApp Us</a>
    </div>
  </div>
</section>`;

  fs.writeFileSync(path.join(ROOT, 'growher.html'), shell({
    title: 'GrowHer Urban Initiative',
    description: "GrowHer Urban Initiative — urban farming through sack gardening. What it is, who it's for, and how to get involved.",
    activeHref: '/growher.html',
    bodyHtml: body
  }));
}

function buildLae() {
  const d = loadPage('lae.md');
  const badge = d.status ? `<span class="coming-soon-badge">${d.status}</span>\n    ` : '';

  const body = `
<section class="page-banner-photo" style="--banner-img:url('${d.banner_image}');">
  <div class="page-banner-inner">
    ${badge}<h1>Little Agroecology Explorers</h1>
    <p>Animated stories of learning &amp; adventure that shape how children see agriculture, agribusiness, and environmental protection.</p>
  </div>
</section>

<section class="section-cream">
  <div class="wrap about-grid reverse">
    <div>
      <div class="kicker-rule"></div>
      <h2 class="section-title">${d.intro_heading}</h2>
      <p class="lede">${d.intro_text}</p>
      <p class="lede" style="margin-top:16px;">${marked.parseInline(d.intro_text_2 || '')}</p>
      <ul class="check-list" style="margin-top:28px;">${checklist(
        (d.features || []).map(f => ({ label: f.label, desc: f.desc })), '#8A5A2B'
      ).replace(/class="label"/g, 'class="label" style="color:var(--green-deep);"')
       .replace(/class="desc"/g, 'class="desc" style="color:#444;"')}
      </ul>
    </div>
    <div class="figure-frame"><img src="${d.intro_image}" alt="Little Agroecology Explorers Stories & Activity Book"></div>
  </div>
</section>

<section class="section-green">
  <div class="wrap" style="text-align:center;">
    <div class="kicker-rule" style="background:var(--gold-soft); margin-left:auto; margin-right:auto;"></div>
    <h2 class="section-title" style="color:#fff; margin-left:auto; margin-right:auto;">${d.waitlist_heading}</h2>
    <p class="lede" style="margin-left:auto; margin-right:auto;">${d.waitlist_text}</p>
    <div style="margin-top:28px;">
      <a href="https://wa.me/260976634650" class="btn btn-gold" target="_blank" rel="noopener">Join the Waitlist on WhatsApp</a>
    </div>
  </div>
</section>`;

  fs.writeFileSync(path.join(ROOT, 'little-agroecology-explorers.html'), shell({
    title: 'Little Agroecology Explorers',
    description: 'Little Agroecology Explorers — animated learning stories for children about agriculture, agribusiness, and environmental protection. Coming soon.',
    activeHref: '/little-agroecology-explorers.html',
    bodyHtml: body
  }));
}

function main() {
  buildGrowher();
  buildLae();
  console.log('Built growher.html and little-agroecology-explorers.html from content/pages/*.md');
}

main();
