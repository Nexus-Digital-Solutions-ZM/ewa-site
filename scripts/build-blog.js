const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const CONTENT_DIR = path.join(__dirname, '..', 'content', 'blog');
const OUT_DIR = path.join(__dirname, '..', 'blog');
const POSTS_DIR = path.join(OUT_DIR, 'posts');

function slugify(filename) {
  return filename.replace(/\.md$/, '');
}

function readPosts() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  const posts = files.map(file => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const { data, content } = matter(raw);
    return {
      slug: slugify(file),
      title: data.title || 'Untitled',
      date: data.date ? new Date(data.date).toISOString().slice(0, 10) : '',
      image: data.image || '',
      excerpt: data.excerpt || '',
      body: marked.parse(content || '')
    };
  });
  posts.sort((a, b) => (a.date < b.date ? 1 : -1));
  return posts;
}

function pageShell(title, bodyHtml, description) {
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
<script async src="https://www.googletagmanager.com/gtag/js?id=G-8C0PW1PDX9"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-8C0PW1PDX9');
</script>
<style>
  .post-body{max-width:720px; margin:0 auto; font-size:1.05rem; color:#333;}
  .post-body h1,.post-body h2,.post-body h3{color:var(--green-deep); margin:28px 0 14px;}
  .post-body p{margin-bottom:16px;}
  .post-body img{margin:20px 0; border:1px solid var(--line);}
  .post-body a{color:var(--green); text-decoration:underline;}
  .post-meta{color:#8a7a4a; font-size:0.85rem; margin-bottom:10px;}
  .post-hero{width:100%; max-height:420px; object-fit:cover; margin-bottom:32px; border:1px solid var(--line);}
  .blog-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:22px; margin-top:36px;}
  .blog-card{background:#fff; border-left:3px solid var(--gold); text-decoration:none; color:inherit; display:block; padding:20px;}
  .blog-card .d{font-size:0.78rem; color:#8a7a4a; margin-bottom:8px;}
  .blog-card h3{color:var(--green-deep); font-size:1.2rem; margin-bottom:8px;}
  .blog-card p{color:#444; font-size:0.92rem;}
  @media (max-width:820px){.blog-grid{grid-template-columns:1fr 1fr;}}
  @media (max-width:560px){.blog-grid{grid-template-columns:1fr;}}
</style>
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
      <a href="/index.html">Home</a>
      <a href="/about.html">About</a>
      <a href="/growher.html">GrowHer Urban</a>
      <a href="/little-agroecology-explorers.html">Little Explorers</a>
      <a href="/get-involved.html">Get Involved</a>
      <a href="/blog/index.html" class="active">Updates</a>
      <a href="/contact.html">Contact</a>
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

function buildIndex(posts) {
  const cards = posts.map(p => `
    <a class="blog-card" href="/blog/posts/${p.slug}.html">
      <div class="d">${p.date}</div>
      <h3>${p.title}</h3>
      <p>${p.excerpt}</p>
    </a>`).join('');

  const body = `
<section class="page-banner">
  <div class="page-banner-inner">
    <h1>Updates</h1>
    <p>News and reflections from Elevate Women in Agroecology.</p>
  </div>
</section>
<section class="section-cream">
  <div class="wrap">
    <div class="kicker-rule"></div>
    <h2 class="section-title">Latest posts</h2>
    ${posts.length ? `<div class="blog-grid">${cards}</div>` : '<p class="lede">No posts yet &mdash; check back soon.</p>'}
  </div>
</section>`;

  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), pageShell('Updates', body, "News and reflections from Elevate Women in Agroecology (EWA)."));
}

function buildPost(post) {
  const body = `
<section class="section-cream" style="padding-top:150px;">
  <div class="wrap post-body">
    ${post.image ? `<img class="post-hero" src="${post.image}" alt="${post.title}">` : ''}
    <div class="post-meta">${post.date}</div>
    <h1 style="color:var(--green-deep); font-size:2.2rem; margin-bottom:20px;">${post.title}</h1>
    ${post.body}
    <div style="margin-top:40px;"><a href="/blog/index.html" class="btn btn-green">&larr; Back to Updates</a></div>
  </div>
</section>`;
  fs.writeFileSync(path.join(POSTS_DIR, `${post.slug}.html`), pageShell(post.title, body, post.excerpt || post.title));
}

function buildLatestJson(posts) {
  const latest = posts.slice(0, 3).map(p => ({ slug: p.slug, title: p.title, date: p.date, excerpt: p.excerpt }));
  fs.writeFileSync(path.join(OUT_DIR, 'latest.json'), JSON.stringify(latest, null, 2));
}

function main() {
  if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });
  const posts = readPosts();
  buildIndex(posts);
  posts.forEach(buildPost);
  buildLatestJson(posts);
  console.log(`Built ${posts.length} blog post(s).`);
}

main();
