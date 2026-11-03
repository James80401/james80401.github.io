// Editorial pages shown in the full-screen dialog. Every string from data.js is escaped.
import {AREAS, AREA} from './areas.js';
import {PROJECTS, VENTURES} from './data.js';
import {CONTACT} from './contact.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const heading = (kicker, title, lead) => `<div class="editorial-heading"><span class="eyebrow">${kicker}</span><h2>${title}</h2><p class="page-lead">${lead}</p></div>`;
const footer = `<footer class="page-footer"><span>Independent by design.</span><span>Richmond, Virginia / Working remotely</span></footer>`;
const statusChip = s => `<span class="status" data-status="${esc(s)}">${esc(s)}</span>`;
export const mediaLabel = m => ({screenshot: 'Screenshot', diagram: 'Diagram', cover: 'Cover art', promotional: 'Promotional image', illustration: 'Generated illustration'}[m.kind] || 'Project image');
export const mediaCaption = m => m.kind === 'illustration' ? 'Generated illustration, not a screenshot' : `${mediaLabel(m)}${m.caption ? ' · ' + m.caption : ''}`;
export const count = id => (PROJECTS[id] || []).length;
const img = (m, alt, cls = '') => `<img ${cls ? `class="${cls}" ` : ''}src="${esc(m.file)}" alt="${esc(alt === '' ? '' : m.alt || alt)}" loading="lazy" decoding="async"${m.w ? ` width="${m.w}" height="${m.h}"` : ''}>`;
const cardArt = (p, area) => p.media?.[0]
  ? img(p.media[0], `${p.title}: ${p.media[0].caption || 'project image'}`)
  : `<span class="card-placeholder" style="--accent:${area.accent}"><span>${esc(area.short)}</span><strong>${esc(p.title)}</strong></span>`;

function card(p, area) {
  const portrait = area.theme === 'reading';
  return `<article class="card${portrait ? ' portrait' : ''}"><button class="card-art" data-route="area/${area.id}/${esc(p.id)}" aria-label="Open ${esc(p.title)}${p.media?.[0]?.kind === 'illustration' ? ', generated illustration' : ''}">${cardArt(p, area)}${p.media?.[0]?.kind === 'illustration' ? '<span class="art-label" aria-hidden="true">Concept illustration</span>' : ''}</button>
  <div class="card-body"><div class="card-meta">${statusChip(p.status)}${p.year ? `<span>${esc(p.year)}</span>` : ''}</div><h3>${esc(p.title)}</h3><p>${esc(p.tagline)}</p>
  <button data-route="area/${area.id}/${esc(p.id)}">Inside the project ↗</button></div></article>`;
}

function areaPage(id) {
  const a = AREA[id]; if (!a) return null; const items = PROJECTS[id] || [];
  return heading(`${a.kicker} / ${items.length} PROJECTS`, a.h2, esc(a.lead)) +
    `<div class="area-actions"><button data-visit="${a.id}">Walk through the building ↗</button><span class="legend">${statusChip('Live')} public now · ${statusChip('Playable')} a working build exists · ${statusChip('In progress')} ${statusChip('Prototype')} being built · ${statusChip('Concept')} a plan on paper</span></div>` +
    `<div class="card-grid${a.theme === 'reading' ? ' books' : ''}">${items.map(p => card(p, a)).join('')}</div>` + footer;
}

function projectPage(areaId, pid) {
  const a = AREA[areaId], items = PROJECTS[areaId] || [], i = items.findIndex(p => p.id === pid); if (!a || i < 0) return null;
  const p = items[i], prev = items[(i - 1 + items.length) % items.length], next = items[(i + 1) % items.length];
  const media = p.media || [];
  const portrait = a.theme === 'reading' || (media[0] && media[0].h > media[0].w * 1.1);
  const gallery = media.length
    ? `<figure class="gallery${portrait ? ' portrait' : ''}" data-title="${esc(p.title)}">${img(media[0], `${p.title}: ${media[0].caption || mediaLabel(media[0])}`, 'gallery-main')}<figcaption><span class="gallery-caption">${esc(mediaCaption(media[0]))}</span><a class="gallery-open" href="${esc(media[0].file)}" target="_blank" rel="noopener noreferrer" aria-label="Open full-size image: ${esc(p.title)}, ${esc(mediaCaption(media[0]))}">Open full-size image ↗</a></figcaption></figure>` +
      (media.length > 1 ? `<div class="thumbs" role="group" aria-label="Project images">${media.map((m, k) => `<button class="thumb${k ? '' : ' active'}" data-thumb="${k}" aria-pressed="${k === 0}" aria-label="Show ${esc(mediaLabel(m).toLowerCase())} ${k + 1}: ${esc(m.caption || p.title)}">${img(m, '')}</button>`).join('')}</div>` : '')
    : `<div class="gallery-empty" style="--accent:${a.accent}"><span>${esc(a.name)}</span><em>${p.status === 'Concept' ? 'Still a plan on paper, so no pictures yet.' : 'No public project images yet.'}</em></div>`;
  const links = (p.links || []).filter(l => /^https:\/\//.test(l.url));
  const mediaTypes = [...new Set(media.map(mediaLabel))].join(' and ');
  const evidence = `<section class="project-evidence" aria-label="Project evidence"><div><span class="eyebrow">WHAT YOU CAN INSPECT</span><p>${media.length ? `${media.length} ${media.length === 1 ? 'image' : 'images'} on this page: ${esc(mediaTypes)}.` : 'No public project images yet.'}${p.status === 'Playable' && !links.length ? ' A working build exists, but no public demo or download is linked here.' : ''}</p></div>${links.length ? `<div class="evidence-links">${links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)} ↗</a>`).join('')}</div>` : ''}</section>`;
  return heading(`${esc(a.name.toUpperCase())} / ${esc(p.status.toUpperCase())}${p.year ? ' / ' + esc(p.year) : ''}`, esc(p.title), esc(p.tagline)) +
    evidence + gallery +
    `<div class="case-columns"><div><span class="eyebrow">THE PROJECT</span><p class="summary">${esc(p.summary)}</p>${statusChip(p.status)}</div>` +
    `<div>${p.highlights?.length ? `<span class="eyebrow">WHAT'S INSIDE</span><ul class="highlights">${p.highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}` +
    `${p.tech?.length ? `<p class="factline">${p.tech.map(esc).join(' / ')}</p>` : ''}` +
    `</div></div>` +
    `<nav class="project-nav" aria-label="More in ${esc(a.name)}"><button data-route="area/${a.id}/${esc(prev.id)}">← ${esc(prev.title)}</button><button data-route="area/${a.id}">All of ${esc(a.name)}</button><button data-route="area/${a.id}/${esc(next.id)}">${esc(next.title)} →</button></nav>` + footer;
}

function venturePage(id) {
  const v = VENTURES[id]; if (!v) return null;
  const m = v.media || [];
  const links = (v.links || []).filter(l => /^https:\/\//.test(l.url));
  return heading(`${esc(v.kicker || 'OWN VENTURE')} / ${esc((v.status || '').toUpperCase())}`, esc(v.title) + (v.em ? `.<br><em>${esc(v.em)}</em>` : ''), esc(v.tagline)) +
    (m[0] ? `<figure class="gallery" data-title="${esc(v.title)}">${img(m[0], `${v.title}: ${m[0].caption || mediaLabel(m[0])}`, 'gallery-main')}<figcaption><span class="gallery-caption">${esc(mediaCaption(m[0]))}</span><a class="gallery-open" href="${esc(m[0].file)}" target="_blank" rel="noopener noreferrer" aria-label="Open full-size image: ${esc(v.title)}, ${esc(mediaCaption(m[0]))}">Open full-size image ↗</a></figcaption></figure>` : '') +
    (m.length > 1 ? `<div class="thumbs" role="group" aria-label="Venture images">${m.map((x, k) => `<button class="thumb${k ? '' : ' active'}" data-thumb="${k}" aria-pressed="${k === 0}" aria-label="Show ${esc(mediaLabel(x).toLowerCase())} ${k + 1}: ${esc(x.caption || v.title)}">${img(x, '')}</button>`).join('')}</div>` : '') +
    `<div class="case-columns"><div><span class="eyebrow">THE BUSINESS</span><p class="summary">${esc(v.summary)}</p></div><div>${v.highlights?.length ? `<span class="eyebrow">MY INVOLVEMENT</span><ul class="highlights">${v.highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}${v.tech?.length ? `<p class="factline">${v.tech.map(esc).join(' / ')}</p>` : ''}${links.length ? `<div class="links">${links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}</div>` : ''}</div></div>` + footer;
}

function workPage() {
  const rows = AREAS.map((a, i) => {
    const items = PROJECTS[a.id] || [], lead = items.find(p => p.media?.length);
    return `<article class="work-entry"><div class="work-caption"><span class="folio">0${i + 1} / ${esc(a.kicker)}</span><h3>${esc(a.name)}</h3><p>${esc(a.lead)}</p><p class="factline">${items.length} projects: ${items.slice(0, 4).map(p => esc(p.title)).join(', ')}${items.length > 4 ? ' and more' : ''}</p><div class="row-actions"><button data-route="area/${a.id}">See the list ↗</button><button data-visit="${a.id}">Walk through it ↗</button></div></div>` +
      `<button class="work-image" data-route="area/${a.id}" aria-label="See ${esc(a.name)}">${lead ? img(lead.media[0], `${lead.title} from ${a.name}`) : `<span class="card-placeholder" style="--accent:${a.accent}"><strong>${esc(a.name)}</strong></span>`}</button></article>`;
  }).join('');
  const ventures = Object.entries(VENTURES).map(([id, v]) => `<button data-route="venture/${id}"><span>${esc(v.kicker || 'OWN VENTURE')}</span>${esc(v.title)}<span>↗</span></button>`).join('');
  const featured = [
    ['websites', 'spinebound-storefront', 'Live storefront', 'Visit a public storefront, then compare its project notes and captured screen.'],
    ['websites', 'managed-website-platform', 'Product screens', 'See the page editor, phone canvas, release history and local concept.'],
    ['games', 'winter-quarters', 'Game screens', 'See the combat and campaign screens from a working build.'],
  ].map(([area, id, label, description]) => {
    const p = PROJECTS[area].find(item => item.id === id);
    const proof = p.media.find(m => m.kind === 'screenshot') || p.media[0];
    return `<article class="featured-proof"><button class="featured-image" data-route="area/${area}/${id}" aria-label="Inspect ${esc(p.title)} screenshots">${img(proof, `${p.title}: ${proof.caption || 'captured project screen'}`)}</button><div class="featured-copy"><span class="eyebrow">${esc(label)}</span><h3>${esc(p.title)}</h3><p>${esc(description)}</p><button data-route="area/${area}/${id}">Inspect this project ↗</button></div></article>`;
  }).join('');
  return heading('THE RIVERFRONT ROW / EVERYTHING IN ONE PLACE', 'Built with purpose.<br><em>And a point of view.</em>', 'Five buildings of work, two businesses of my own, and the workshop where it all starts. Pick a building, or read straight through.') +
    `<section class="featured-section" aria-label="Selected work with evidence"><div class="featured-intro"><span class="eyebrow">START WITH THE EVIDENCE</span><p>Three projects with work you can inspect now.</p></div><div class="featured-grid">${featured}</div></section>` +
    `<div class="work-index">${rows}</div><span class="eyebrow">OWN VENTURES</span><div class="direct-links">${ventures}</div>` + footer;
}

function simplePage() {
  const total = AREAS.reduce((s, a) => s + count(a.id), 0);
  return heading('INDEPENDENT DEVELOPMENT / RICHMOND, VA', 'James Shields.<br><em>Everything, no driving.</em>', `The full portfolio as a plain list: ${total} projects across five areas, plus two businesses of my own.`) +
    AREAS.map(a => `<section class="simple-area"><h3><button data-route="area/${a.id}">${esc(a.name)} <span>${count(a.id)}</span></button></h3><ul>${(PROJECTS[a.id] || []).map(p => `<li><button data-route="area/${a.id}/${esc(p.id)}"><strong>${esc(p.title)}</strong><span>${esc(p.tagline)}</span>${statusChip(p.status)}</button></li>`).join('')}</ul></section>`).join('') +
    `<section class="simple-area"><h3>Own ventures</h3><ul>${Object.entries(VENTURES).map(([id, v]) => `<li><button data-route="venture/${id}"><strong>${esc(v.title)}</strong><span>${esc(v.tagline)}</span>${statusChip(v.status)}</button></li>`).join('')}</ul></section>` +
    `<div class="direct-links">${[['services', 'What I can help with'], ['about', 'A little about James'], ['contact', 'Discuss a project']].map(([id, t], i) => `<button data-route="${id}"><span>0${i + 1}</span>${t}<span>↗</span></button>`).join('')}</div>` + footer;
}

function contactPage() {
  const links = [CONTACT.email && `<a class="contact-link" href="mailto:${esc(CONTACT.email)}"><span>Email</span>${esc(CONTACT.email)}</a>`,
    CONTACT.linkedin && `<a class="contact-link" href="${esc(CONTACT.linkedin)}" target="_blank" rel="noopener"><span>LinkedIn</span>${esc(CONTACT.linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))} ↗</a>`,
    CONTACT.github && `<a class="contact-link" href="${esc(CONTACT.github)}" target="_blank" rel="noopener"><span>GitHub</span>${esc(CONTACT.github.replace(/^https?:\/\//, ''))} ↗</a>`].filter(Boolean).join('');
  const canSend = CONTACT.formEndpoint || CONTACT.email;
  const form = canSend ? `<form id="contact-form" class="contact-form" novalidate><label>Your name<input name="name" autocomplete="name" required></label><label>Your email<input name="email" type="email" autocomplete="email" required></label><label>What would you like to build or fix?<textarea name="message" rows="6" required></textarea></label><button type="submit">Send ↗</button><p class="form-status" role="status" aria-live="polite"></p></form>` : '';
  return heading('YOUR NEXT PROJECT', 'Got something<br><em>worth building?</em>', 'A new idea, an existing website, or a stubborn process. Start with what you want to make better.') +
    `<div class="contact-editorial"><div><h3>A good first conversation starts simply.</h3><p>What’s the business? What isn’t working? What would you like to happen instead? An address for your current site and a rough timeline are useful, too.</p>${links ? `<div class="contact-links">${links}</div>` : ''}<span class="eyebrow">RICHMOND, VA · REMOTE COLLABORATION</span></div><div>${form || '<p class="contact-pending">A contact form will appear here before public launch.</p>'}</div></div>` + footer;
}

const STATIC = {
  services: () => heading('WHAT WE CAN MAKE TOGETHER', 'A better website.<br>A useful tool.<br><em>One less headache.</em>', 'Bring the business problem. We’ll work out what needs building, what needs fixing, and where to start.') + `<div class="services-editorial">${[['01', 'Websites that earn their place.', 'A new business site, a focused landing page, or a thoughtful rebuild of what you already have. Clear information and a sensible route to the next step.', 'BUSINESS SITES / LANDING PAGES / REDESIGNS'], ['02', 'Fix the thing that keeps breaking.', 'Mobile layouts, awkward navigation, unfinished features, and software that gets in the way. Start with a clear diagnosis and a defined piece of work.', 'SITE REPAIRS / USABILITY / BUG FIXES'], ['03', 'Make the tools work together.', 'Custom applications, SQL and database work, integrations, and automation for the repetitive jobs that keep landing on your desk.', 'WEB APPS / DATABASES / AUTOMATION'], ['04', 'Keep moving after launch.', 'Content changes, maintenance, fixes, and continued development as your business changes. A direct relationship with the person doing the work.', 'MAINTENANCE / SUPPORT / IMPROVEMENTS']].map(([n, t, d, tag]) => `<article><span class="service-number">${n}</span><div><h3>${t}</h3><p>${d}</p></div><span class="service-tag">${tag}</span></article>`).join('')}</div><div class="page-invitation"><p>Something in mind?</p><button data-route="contact">Let’s talk it through ↗</button></div>` + footer,
  about: () => heading('JAMES SHIELDS / DEVELOPER', 'A builder’s mindset.<br><em>A Richmond address.</em>', 'Software and application development, with an interest in the businesses and people on the other side of the screen.') + `<div class="about-layout"><img src="assets/workshop_detail.jpg" alt="James’s brick workshop on the riverfront row"><div><span class="eyebrow">THE PERSON BEHIND THE WORKSHOP</span><p>I’m James, a software and application developer based in Richmond, Virginia. I work across websites, applications, SQL, and databases.</p><p>I build things of my own, too: games, tools, books, and two small businesses, Hollow Harbor Press and Spinebound Books. They keep the practical side of this work close: presenting a business clearly, keeping a storefront running, and making everyday processes easier.</p><p>My approach is simple: understand the need, agree on the work, build it, and review it together.</p><div class="row-actions"><button data-route="work">See the work ↗</button><button data-route="services">How I can help ↗</button></div></div></div><div class="background-note"><div><span class="eyebrow">BACKGROUND</span><p>About eight years of professional work as a SQL and application developer: billing and reporting systems, ETL on high-volume data, stored-procedure design and tuning, and internal ASP.NET MVC and Angular applications on SQL Server. Certified Scrum Master and Product Owner (PSM, PSPO).</p></div><div><span class="eyebrow">WORKS WITH</span><ul class="skills">${['C#, .NET and ASP.NET MVC', 'T-SQL and SQL Server', 'Oracle and PL/SQL', 'TypeScript and Node.js', 'Angular and React', 'Python and PowerShell', 'REST and GraphQL', 'Three.js and Blender'].map(x => `<li>${x}</li>`).join('')}</ul></div></div><div class="local-note"><span class="eyebrow">WHY A RIVERFRONT ROW?</span><p>Brick warehouses, iron bridges, river rocks, and a little room to make things. Each building holds a different kind of work. The row is an imagined corner of Richmond, shaped by the city around it.</p></div>` + footer,
  contact: contactPage,
  work: workPage, simple: simplePage,
};

// route -> {html, title} or null
export function render(route) {
  const parts = route.split('/').filter(Boolean);
  if (parts[0] === 'area' && parts.length === 2) { const html = areaPage(parts[1]); return html && {html, title: AREA[parts[1]].name}; }
  if (parts[0] === 'area' && parts.length === 3) { const html = projectPage(parts[1], parts[2]); const p = (PROJECTS[parts[1]] || []).find(x => x.id === parts[2]); return html && {html, title: p.title}; }
  if (parts[0] === 'venture') { const html = venturePage(parts[1]); return html && {html, title: VENTURES[parts[1]].title}; }
  if (STATIC[parts[0]]) return {html: STATIC[parts[0]](), title: {services: 'Services', about: 'About', contact: 'Contact', work: 'Work', simple: 'Simple view'}[parts[0]]};
  return null;
}
export function mediaFor(route) {
  const parts = route.split('/').filter(Boolean);
  if (parts[0] === 'area' && parts.length === 3) return (PROJECTS[parts[1]] || []).find(x => x.id === parts[2])?.media || [];
  if (parts[0] === 'venture') return VENTURES[parts[1]]?.media || [];
  return [];
}
