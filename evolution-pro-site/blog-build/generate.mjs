/*
 * Generatore statico del Blog Evolution PRO.
 * Produce HTML statico SEO-friendly in public/blog/ (indicizzabile da Google e leggibile dalle AI senza JS).
 * Uso:  node blog-build/generate.mjs
 * I contenuti articolo stanno in blog-build/content.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SITE, CATEGORIES, ARTICLES } from './content.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'public', 'blog');
mkdirSync(OUT, { recursive: true });

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const fmt = (iso) => { const d = new Date(iso); return `${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`; };
const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// solo articoli con corpo scritto = pubblicati (niente pagine "sottili")
const LIVE = ARTICLES.filter(a => a.body && a.body.trim()).sort((a,b)=> new Date(b.date)-new Date(a.date));

const ILL = {
  steps:'<svg viewBox="0 0 200 150" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" preserveAspectRatio="xMidYMid slice"><rect x="34" y="96" width="30" height="28"/><rect x="72" y="74" width="30" height="50"/><rect x="110" y="50" width="30" height="74"/><path d="M40 80 L86 58 L124 42 L166 30"/><path d="M150 30 L166 30 L166 46"/></svg>',
  funnel:'<svg viewBox="0 0 200 150" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" preserveAspectRatio="xMidYMid slice"><path d="M42 42 L158 42 L120 86 L120 118 L80 106 L80 86 Z"/><circle cx="72" cy="30" r="4" fill="currentColor" stroke="none"/><circle cx="100" cy="26" r="4" fill="currentColor" stroke="none"/><circle cx="128" cy="30" r="4" fill="currentColor" stroke="none"/><circle cx="100" cy="134" r="5" fill="currentColor" stroke="none"/></svg>',
  target:'<svg viewBox="0 0 200 150" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" preserveAspectRatio="xMidYMid slice"><circle cx="92" cy="78" r="46"/><circle cx="92" cy="78" r="27"/><circle cx="92" cy="78" r="8" fill="currentColor" stroke="none"/><path d="M92 78 L158 30"/><path d="M158 30 L142 32 M158 30 L156 46"/></svg>',
  bulb:'<svg viewBox="0 0 200 150" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" preserveAspectRatio="xMidYMid slice"><path d="M100 34 a34 34 0 0 1 22 60 c-6 5 -8 9 -8 16 l-28 0 c0 -7 -2 -11 -8 -16 a34 34 0 0 1 22 -60 Z"/><path d="M86 122 L114 122 M90 134 L110 134"/><path d="M100 18 L100 8 M148 42 L156 36 M52 42 L44 36"/></svg>',
  check:'<svg viewBox="0 0 200 150" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" preserveAspectRatio="xMidYMid slice"><rect x="52" y="32" width="96" height="86" rx="8"/><path d="M66 60 l8 8 l16 -18"/><path d="M104 62 L134 62"/><path d="M66 90 l8 8 l16 -18"/><path d="M104 92 L134 92"/></svg>'
};
const catIll = (c) => ILL[(CATEGORIES.find(x=>x.name===c)||{}).ill || 'steps'];

const CSS = `
:root{--navy:#0F172A;--slate:#64748B;--line:#E5E7EB;--yellow:#FACC15;--bg:#fff;--bg-soft:#F8FAFC;--ink:#334155;--radius:14px;--maxw:1200px;--read:740px;--shadow-sm:0 1px 2px rgba(15,23,42,.06);--shadow-md:0 12px 30px -12px rgba(15,23,42,.22)}
*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}
body{font-family:'Poppins',system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--navy);background:var(--bg);line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}img{max-width:100%;display:block}.wrap{max-width:var(--maxw);margin:0 auto;padding:0 24px}
#progress{position:fixed;top:0;left:0;height:3px;width:0;background:var(--yellow);z-index:60;transition:width .1s linear}
header.nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.93);backdrop-filter:saturate(180%) blur(10px);border-bottom:1px solid var(--line)}
.nav-in{display:flex;align-items:center;justify-content:space-between;height:74px}
.logo img{height:34px;width:auto;display:block}
nav.menu{display:flex;gap:34px;align-items:center}
nav.menu a{font-size:16px;font-weight:500;color:#101326;transition:color .2s}
nav.menu a:hover{color:var(--slate)}
nav.menu a.active{position:relative;color:#101326;font-weight:600}
nav.menu a.active::after{content:"";position:absolute;left:0;right:0;bottom:-26px;height:3px;background:var(--yellow);border-radius:3px 3px 0 0}
.btn-cta{background:var(--yellow);color:var(--navy);font-weight:600;font-size:15px;padding:11px 22px;border-radius:999px;transition:transform .15s,box-shadow .2s;box-shadow:var(--shadow-sm);white-space:nowrap}
.btn-cta:hover{transform:translateY(-2px);box-shadow:0 10px 20px -8px rgba(250,204,21,.6)}
.burger{display:none}
footer{background:var(--navy);color:#CBD5E1;padding:56px 0 30px;margin-top:64px}
.foot-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px}
.logo-chip{display:inline-block;background:#fff;padding:9px 14px;border-radius:12px}.logo-chip img{height:26px;width:auto;display:block}
.foot-grid p{font-size:14px;color:#94A3B8;margin-top:16px;max-width:34ch;font-weight:300}
.foot-grid h5{color:#fff;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:14px;font-weight:600}
.foot-grid a{display:block;font-size:14px;color:#94A3B8;padding:5px 0;transition:color .2s}.foot-grid a:hover{color:var(--yellow)}
.foot-bottom{border-top:1px solid rgba(255,255,255,.1);margin-top:44px;padding-top:22px;display:flex;justify-content:space-between;font-size:12.5px;color:#64748B;flex-wrap:wrap;gap:10px}
/* index */
.hero{background:var(--navy);color:#fff;padding:60px 0 130px;position:relative;overflow:hidden}
.hero::before,.hero::after{content:"";position:absolute;top:50%;right:-3%;width:min(600px,76vw);aspect-ratio:800/879;transform:translateY(-50%);background:center/contain no-repeat;pointer-events:none}
.hero::before{background-image:url('/brand/evolution-globe-ghost.webp');opacity:.3}
.hero::after{background-image:url('/brand/evolution-globe-yellow.webp');opacity:.42}
.hero .wrap{position:relative;z-index:1}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--yellow);margin-bottom:18px}
.eyebrow::before{content:"";width:26px;height:2px;background:var(--yellow)}
.hero h1{font-size:clamp(30px,4.6vw,50px);line-height:1.08;font-weight:800;letter-spacing:-.025em;max-width:16ch}
.hero p.sub{margin-top:20px;font-size:18px;color:#CBD5E1;max-width:56ch;font-weight:300}
.main{display:grid;grid-template-columns:1fr 320px;gap:56px;padding:72px 0 90px}
.river-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px}
.river-head h2{font-size:22px;font-weight:700;letter-spacing:-.01em}.river-head .count{color:var(--slate);font-size:13.5px}
article.post{display:grid;grid-template-columns:120px 1fr;gap:24px;padding:28px 0;border-bottom:1px solid var(--line)}
article.post:hover .p-title{color:var(--navy)}
.thumb{border-radius:12px;height:112px;position:relative;overflow:hidden;background:linear-gradient(140deg,#1e293b,#0F172A);color:rgba(255,255,255,.9)}
.thumb.y{background:linear-gradient(140deg,#f0c400,#FACC15);color:var(--navy)}
.thumb:not(.y)::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 80% 20%,rgba(250,204,21,.20),transparent 55%)}
.thumb svg{position:absolute;inset:0;width:100%;height:100%;transition:transform .3s ease}
article.post:hover .thumb svg{transform:scale(1.06)}
.p-cat{display:inline-block;font-size:11.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--slate)}.p-cat b{color:var(--navy)}
.p-title{font-size:20px;font-weight:600;line-height:1.28;letter-spacing:-.015em;margin:8px 0 8px;transition:color .2s;color:#1f2a44}
.p-exc{color:var(--slate);font-size:14.5px}.p-meta{margin-top:12px;color:var(--slate);font-size:12.5px;display:flex;gap:12px;align-items:center}
aside{position:sticky;top:100px;align-self:start;display:flex;flex-direction:column;gap:28px}
.card{border:1px solid var(--line);border-radius:var(--radius);padding:22px;background:#fff}
.card h3{font-size:12.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--navy);margin-bottom:16px}
.cat-row{display:block;margin-bottom:14px}.cat-row .top{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:500;margin-bottom:6px}
.cat-row .top .n{color:var(--slate);font-size:12.5px;font-weight:600}.cat-row:hover .top{color:var(--navy)}
.bar{height:6px;border-radius:999px;background:var(--line);overflow:hidden}.bar span{display:block;height:100%;background:var(--navy);border-radius:999px}.cat-row:hover .bar span{background:var(--yellow)}
.news{background:var(--navy);border:0;color:#fff}.news h3{color:var(--yellow)}.news p{color:#CBD5E1;font-size:14px;margin-bottom:16px}
.news input{width:100%;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff;padding:12px 14px;border-radius:10px;font-family:inherit;font-size:14px;outline:0;margin-bottom:10px}
.news button{width:100%;background:var(--yellow);color:var(--navy);border:0;font-family:inherit;font-weight:600;padding:12px;border-radius:10px;cursor:pointer;font-size:14px}
.news small{display:block;margin-top:10px;color:#94A3B8;font-size:11.5px}
.subForm{margin:0}.subMsg{font-size:12.5px;margin-top:8px;font-weight:500}
/* article */
.a-hero{background:var(--navy);color:#fff;position:relative;overflow:hidden}
.a-hero::before,.a-hero::after{content:"";position:absolute;top:50%;right:-4%;width:min(500px,70vw);aspect-ratio:800/879;transform:translateY(-50%);background:center/contain no-repeat;pointer-events:none}
.a-hero::before{background-image:url('/brand/evolution-globe-ghost.webp');opacity:.26}
.a-hero::after{background-image:url('/brand/evolution-globe-yellow.webp');opacity:.3}
.a-hero .inner{position:relative;z-index:1;max-width:var(--read);margin:0 auto;padding:34px 24px 46px}
@media(max-width:700px){.hero::before,.hero::after{right:-32%}.hero::before{opacity:.2}.hero::after{opacity:.26}.a-hero::before,.a-hero::after{right:-36%}.a-hero::before{opacity:.18}.a-hero::after{opacity:.2}}
.crumbs{font-size:13px;color:#94A3B8;margin-bottom:22px}.crumbs a:hover{color:var(--yellow)}
.a-cat{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--navy);background:var(--yellow);padding:6px 13px;border-radius:999px;margin-bottom:18px}
.a-hero h1{font-size:clamp(28px,4.2vw,42px);line-height:1.14;font-weight:800;letter-spacing:-.02em}
.a-meta{display:flex;align-items:center;gap:12px;margin-top:22px;color:#CBD5E1;font-size:14px;flex-wrap:wrap}
.a-meta .who{display:flex;align-items:center;gap:10px}.a-meta .who .av{width:34px;height:34px;border-radius:50%;background:linear-gradient(140deg,#f0c400,#FACC15);color:var(--navy);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px}
.article{max-width:var(--read);margin:0 auto;padding:52px 24px 20px}
.lede{font-size:20px;line-height:1.6;color:var(--navy);font-weight:400;margin-bottom:30px}
.article p{font-size:17.5px;line-height:1.78;color:var(--ink);margin:0 0 22px}
.article h2{font-size:23px;line-height:1.3;font-weight:700;letter-spacing:-.01em;color:var(--navy);margin:42px 0 14px;display:flex;gap:14px;align-items:baseline}
.article h2 .lv{flex:none;font-size:13px;font-weight:800;color:var(--navy);background:var(--yellow);border-radius:8px;padding:3px 9px;transform:translateY(-2px)}
.article strong{color:var(--navy);font-weight:600}
blockquote{margin:30px 0;padding:6px 0 6px 24px;border-left:4px solid var(--yellow);font-size:20px;line-height:1.55;font-weight:500;color:var(--navy)}
.cta-box{background:var(--navy);color:#fff;border-radius:18px;padding:32px 34px;margin:40px 0}
.cta-box h3{font-size:21px;font-weight:700;line-height:1.3;margin-bottom:10px}.cta-box p{font-size:15.5px;color:#CBD5E1;margin-bottom:20px}
.cta-box a{display:inline-flex;align-items:center;gap:9px;background:var(--yellow);color:var(--navy);font-weight:600;font-size:15px;padding:13px 24px;border-radius:999px}
.author{max-width:var(--read);margin:28px auto 0;padding:26px 24px;display:flex;gap:18px;align-items:flex-start;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.author .av{width:56px;height:56px;flex:none;border-radius:50%;background:linear-gradient(140deg,#111c33,#1e293b);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px}
.author .n{font-weight:700;font-size:16px}.author .r{color:var(--slate);font-size:13px;margin:2px 0 8px}.author .b{color:var(--ink);font-size:14.5px;line-height:1.6}
.related{max-width:var(--maxw);margin:60px auto 0;padding:0 24px}.related h2{font-size:12.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--navy);margin-bottom:20px}
.rel-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.rel{border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;transition:transform .2s,box-shadow .2s}.rel:hover{transform:translateY(-4px);box-shadow:var(--shadow-md)}
.rel .cover{height:120px;position:relative;background:linear-gradient(140deg,#1e293b,#0F172A);color:rgba(255,255,255,.9)}.rel .cover.y{background:linear-gradient(140deg,#f0c400,#FACC15);color:var(--navy)}
.rel .cover svg{position:absolute;inset:0;width:100%;height:100%}.rel .c{padding:18px}.rel .rc{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--slate)}
.rel .rt{font-size:16px;font-weight:600;line-height:1.32;margin:7px 0 0;color:#1f2a44}.rel:hover .rt{color:var(--navy)}.rel .rm{color:var(--slate);font-size:12px;margin-top:10px}
@media(max-width:960px){.main{grid-template-columns:1fr;gap:44px}aside{position:static}nav.menu{display:none}.burger{display:flex;flex-direction:column;gap:5px;background:none;border:0;cursor:pointer;padding:6px}.burger span{width:24px;height:2px;background:var(--navy);border-radius:2px}.rel-grid{grid-template-columns:1fr}.foot-grid{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.btn-cta{font-size:13px;padding:10px 16px}article.post{grid-template-columns:1fr}.thumb{height:150px}.foot-grid{grid-template-columns:1fr}}
`;

const HEAD_FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">`;

const navHeader = (activeBlog=true) => `
<header class="nav"><div class="wrap nav-in">
  <a href="${SITE.origin}" class="logo"><img src="/brand/evolution-pro-logo-transparent.webp" alt="Evolution PRO"></a>
  <nav class="menu">
    <a href="${SITE.origin}/#metodo-evo">Metodo EVO</a>
    <a href="${SITE.origin}/#ciak">Piattaforma</a>
    <a href="${SITE.origin}/#testimonianze">Testimonianze</a>
    <a href="${SITE.origin}/#faq">FAQ</a>
    <a href="/blog/"${activeBlog?' class="active"':''}>Blog</a>
  </nav>
  <a href="${SITE.cta.href}" class="btn-cta">${SITE.cta.label}</a>
  <button class="burger" aria-label="Menu"><span></span><span></span><span></span></button>
</div></header>`;

const footer = () => `
<footer><div class="wrap"><div class="foot-grid">
  <div><span class="logo-chip"><img src="/brand/evolution-pro-logo-transparent.webp" alt="Evolution PRO"></span>
    <p>Il sistema che trasforma una competenza in un'accademia di videocorsi che acquisisce, eroga e scala.</p></div>
  <div><h5>Blog</h5><a href="/blog/">Ultimi articoli</a><a href="${SITE.origin}/#metodo-evo">Metodo EVO</a><a href="/blog/">Più letti</a></div>
  <div><h5>Evolution PRO</h5><a href="${SITE.origin}/#metodo-evo">Il metodo</a><a href="${SITE.origin}/#ciak">Piattaforma</a><a href="${SITE.cta.href}">Fai la tua analisi</a><a href="${SITE.origin}/#faq">FAQ</a></div>
  <div><h5>Legale</h5><a href="${SITE.origin}/privacy">Privacy Policy</a><a href="${SITE.origin}/cookie">Cookie Policy</a></div>
</div><div class="foot-bottom"><span>© ${new Date().getFullYear()} Evolution PRO. Tutti i diritti riservati.</span><span>Online dal 2025 · Costruito con il Metodo EVO.</span></div></div></footer>`;

const SUBSCRIBE_JS = `
document.querySelectorAll('form.subForm').forEach(function(f){
  f.addEventListener('submit', async function(e){
    e.preventDefault();
    var input=f.querySelector('input[type=email]'), msg=f.querySelector('.subMsg'), btn=f.querySelector('button');
    var email=(input.value||'').trim();
    if(!email){ return; }
    var old=btn.textContent; btn.disabled=true; btn.textContent='Invio…';
    function show(t,ok){ if(msg){ msg.textContent=t; msg.hidden=false; msg.style.color=ok?'#FACC15':'#fca5a5'; } }
    try{
      var r=await fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email})});
      if(r.ok){ f.reset(); show('Fatto! Controlla la tua casella email.',true); }
      else if(r.status===400){ show('Controlla l'+String.fromCharCode(39)+'indirizzo email.',false); }
      else { show('Ops, riprova tra poco.',false); }
    }catch(err){ show('Ops, riprova tra poco.',false); }
    btn.disabled=false; btn.textContent=old;
  });
});`;

const shell = ({title, headExtra='', bodyClass='', body}) => `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>${HEAD_FONTS}${headExtra}<style>${CSS}</style></head>
<body class="${bodyClass}">${body}<script>${SUBSCRIBE_JS}</script></body></html>`;

const KW_BASE = 'videocorsi, creare videocorsi, vendere videocorsi, accademia di videocorsi, piattaforma videocorsi, corso online';

function articlePage(a){
  const url = `${SITE.origin}/blog/${a.slug}.html`;
  const desc = a.desc || (a.excerpt + ' ' + (a.kw ? `Guida pratica su ${a.kw}.` : ''));
  const kws = KW_BASE + (a.kw ? ', ' + a.kw : '');
  const rel = LIVE.filter(x=>x.slug!==a.slug).slice(0,3);
  const jsonld = {
    "@context":"https://schema.org","@type":"BlogPosting",
    headline:a.title, description:desc, inLanguage:"it-IT", keywords:kws, articleSection:a.cat,
    datePublished:a.date, dateModified:a.date,
    author:{"@type":"Person",name:SITE.author,jobTitle:"Fondatore di Evolution PRO",url:SITE.origin},
    publisher:{"@type":"Organization",name:"Evolution PRO",url:SITE.origin,logo:{"@type":"ImageObject",url:SITE.logo}},
    mainEntityOfPage:{"@type":"WebPage","@id":url}
  };
  const crumbs = {"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[
    {"@type":"ListItem",position:1,name:"Home",item:SITE.origin},
    {"@type":"ListItem",position:2,name:"Blog",item:`${SITE.origin}/blog`},
    {"@type":"ListItem",position:3,name:a.title}]};
  const headExtra = `
<meta name="description" content="${esc(desc)}">
<meta name="keywords" content="${esc(kws)}">
<meta name="author" content="${SITE.author}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:locale" content="it_IT"><meta property="og:site_name" content="Evolution PRO">
<meta property="og:title" content="${esc(a.title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${SITE.logo}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(a.title)}"><meta name="twitter:description" content="${esc(desc)}">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<script type="application/ld+json">${JSON.stringify(crumbs)}</script>`;
  const relCards = rel.map((r,i)=>`<a class="rel" href="/blog/${r.slug}.html"><div class="cover${i%2===1?' y':''}">${catIll(r.cat)}</div><div class="c"><div class="rc">${esc(r.cat)}</div><div class="rt">${esc(r.title)}</div><div class="rm">⏱ ${r.read} min</div></div></a>`).join('');
  const ctaBox = `<div class="cta-box"><h3>Vuoi capire a che punto è la tua accademia di videocorsi?</h3><p>Nell'analisi gratuita guardiamo dove sei bloccato oggi e qual è il prossimo passo concreto per creare e vendere i tuoi videocorsi.</p><a href="${SITE.cta.href}">Fai la tua analisi gratuita →</a></div>`;
  const body = `<div id="progress"></div>${navHeader(true)}
<section class="a-hero"><div class="inner">
  <div class="crumbs"><a href="/blog/">Blog</a> &nbsp;›&nbsp; ${esc(a.cat)}</div>
  <span class="a-cat">${esc(a.cat)}</span>
  <h1>${esc(a.title)}</h1>
  <div class="a-meta"><span class="who"><span class="av">CB</span> ${SITE.author}</span><span>·</span><span>${fmt(a.date)}</span><span>·</span><span>⏱ ${a.read} min di lettura</span></div>
</div></section>
<article class="article">${a.body}${a.body.includes('cta-box')?'':ctaBox}</article>
<div class="author"><div class="av">CB</div><div><div class="n">${SITE.author}</div><div class="r">Fondatore di Evolution PRO</div><div class="b">Aiuta consulenti, coach e professionisti a trasformare la propria competenza in un'accademia di videocorsi che acquisisce, eroga e scala — con il Metodo EVO: Esamina, Valida, Ottimizza.</div></div></div>
${rel.length?`<section class="related"><h2>Continua a leggere</h2><div class="rel-grid">${relCards}</div></section>`:''}
<section class="related" style="margin-top:40px"><div class="card news" style="max-width:var(--read);margin:0 auto"><h3>Ricevi il prossimo articolo</h3><p>Un'analisi concreta ogni due settimane su come creare e vendere videocorsi. Niente spam.</p><form class="subForm"><input type="email" name="email" placeholder="La tua email" aria-label="Email" required><button type="submit">Iscrivimi</button><p class="subMsg" hidden></p></form></div></section>
${footer()}
<script>const b=document.getElementById('progress');function u(){const h=document.documentElement,s=h.scrollTop||document.body.scrollTop,m=h.scrollHeight-h.clientHeight;b.style.width=(m>0?s/m*100:0)+'%'}document.addEventListener('scroll',u,{passive:true});u();</script>`;
  return shell({title:`${a.title} | Evolution PRO`, headExtra, body});
}

function indexPage(){
  const maxCat = Math.max(...CATEGORIES.map(c=>LIVE.filter(a=>a.cat===c.name).length),1);
  const catRows = CATEGORIES.map(c=>{const n=LIVE.filter(a=>a.cat===c.name).length; if(!n) return ''; return `<a href="/blog/" class="cat-row"><div class="top"><span>${esc(c.name)}</span><span class="n">${n}</span></div><div class="bar"><span style="width:${Math.round(n/maxCat*100)}%"></span></div></a>`;}).filter(Boolean).join('');
  const posts = LIVE.map((a,i)=>`<article class="post"><div class="thumb${i%4===1?' y':''}">${catIll(a.cat)}</div><div><span class="p-cat"><b>${esc(a.cat)}</b></span><h3 class="p-title"><a href="/blog/${a.slug}.html">${esc(a.title)}</a></h3><p class="p-exc">${esc(a.excerpt)}</p><div class="p-meta"><span>${fmt(a.date)}</span><span>·</span><span>⏱ ${a.read} min</span></div></div></article>`).join('');
  const headExtra = `
<meta name="description" content="Il blog di Evolution PRO: guide e analisi su come creare, lanciare e vendere videocorsi e costruire un'accademia di videocorsi che vende. Metodo EVO.">
<meta name="keywords" content="${KW_BASE}, come creare videocorsi, come vendere videocorsi, blog videocorsi">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${SITE.origin}/blog/">
<meta property="og:type" content="website"><meta property="og:locale" content="it_IT"><meta property="og:site_name" content="Evolution PRO">
<meta property="og:title" content="Blog Videocorsi — Evolution PRO"><meta property="og:description" content="Guide e analisi su come creare e vendere videocorsi. Il Metodo EVO passo per passo.">
<meta property="og:url" content="${SITE.origin}/blog/"><meta property="og:image" content="${SITE.logo}">
<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"Blog",name:"Blog Evolution PRO",description:"Come creare e vendere videocorsi: metodo, funnel e posizionamento.",url:`${SITE.origin}/blog/`,inLanguage:"it-IT",publisher:{"@type":"Organization",name:"Evolution PRO",url:SITE.origin,logo:{"@type":"ImageObject",url:SITE.logo}}})}</script>`;
  const body = `${navHeader(true)}
<section class="hero"><div class="wrap"><span class="eyebrow">Il blog di Evolution PRO</span>
<h1>Come creare e vendere videocorsi: metodo, funnel e posizionamento.</h1>
<p class="sub">Guide e analisi per chi trasforma la propria competenza in un'accademia di videocorsi che vende. Un nuovo articolo ogni due settimane, dal 2025.</p></div></section>
<div class="wrap"><div class="main">
<div class="river"><div class="river-head"><h2>Ultimi articoli</h2><span class="count">${LIVE.length} articoli</span></div>${posts||'<p style="color:var(--slate);padding:24px 0">Primi articoli in arrivo.</p>'}</div>
<aside>
  <div class="card"><h3>Categorie</h3>${catRows}</div>
  <div class="card news"><h3>Il report</h3><p>Un'analisi concreta ogni due settimane su come creare e vendere videocorsi.</p><form class="subForm"><input type="email" name="email" placeholder="La tua email" aria-label="Email" required><button type="submit">Ricevi il report</button><p class="subMsg" hidden></p></form><small>Iscrizione gratuita · disiscrizione con un clic.</small></div>
</aside>
</div></div>${footer()}`;
  return shell({title:'Blog Videocorsi — Come creare e vendere videocorsi | Evolution PRO', headExtra, body});
}

// write files
writeFileSync(resolve(OUT,'index.html'), indexPage());
let n=0;
for(const a of LIVE){ writeFileSync(resolve(OUT, `${a.slug}.html`), articlePage(a)); n++; }

// sitemap + robots (in public root)
const PUB = resolve(__dirname,'..','public');
const sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">
<url><loc>${SITE.origin}/blog/</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
${LIVE.map(a=>`<url><loc>${SITE.origin}/blog/${a.slug}.html</loc><lastmod>${a.date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`).join('\n')}
</urlset>`;
writeFileSync(resolve(OUT,'sitemap.xml'), sm);
writeFileSync(resolve(PUB,'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.origin}/blog/sitemap.xml\n`);

console.log(`Blog generato: index + ${n} articoli in public/blog/  (LIVE=${LIVE.length}, totali definiti=${ARTICLES.length})`);
