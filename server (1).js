// ============================================================================
// MARIGOLD ENGINE TEST SERVER v3.0
// Landing / Questionnaire / Advisor / brand.css / API
// ============================================================================
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { generatePlan } = require('./engine/index');

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Brand CSS (single source of truth — edit here to update all pages) ──
const BRAND_CSS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
:root{--cream:#FDFAF0;--warm:#F5F0E8;--deep:#3C3010;--tx:#2A2010;--muted:#9A8A6A;--bdr:#E0D4B0;--g:#F7D44C;--gd:#C8A820;--gk:#9A7E10;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{background:var(--cream);color:var(--tx);font-family:'Playfair Display',Georgia,serif;font-size:15px;line-height:1.7;}
/* BRAND NAME: edit .bname to change style (italic/bold/uppercase/letter-spacing) */
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;cursor:pointer;}
.bname{font-size:13px;letter-spacing:3px;color:var(--deep);font-style:italic;font-weight:400;font-family:'Playfair Display',Georgia,serif;}
.site-header{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:1px solid var(--bdr);background:var(--cream);position:sticky;top:0;z-index:100;}
.nav-pill{font-size:11px;letter-spacing:1px;color:var(--muted);text-decoration:none;padding:5px 14px;border:1px solid var(--bdr);border-radius:100px;font-family:'Playfair Display',serif;font-style:italic;transition:all 0.2s;background:transparent;cursor:pointer;display:inline-block;}
.nav-pill:hover{border-color:var(--gd);background:var(--warm);color:var(--deep);}
.cta{display:inline-flex;align-items:center;gap:10px;padding:12px 28px;background:var(--deep);color:var(--cream);border:none;border-radius:100px;font-size:12px;letter-spacing:2px;cursor:pointer;font-family:'Playfair Display',Georgia,serif;font-style:italic;transition:background 0.2s;}
.cta:hover{background:var(--gk);}
.cta:disabled{opacity:0.4;cursor:not-allowed;}
.progress-bar{position:fixed;top:0;left:0;right:0;height:2px;background:var(--bdr);z-index:200;}
.progress-fill{height:100%;background:var(--gd);transition:width 0.5s ease;}
.ql{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;font-family:'Playfair Display',serif;}
@keyframes marigold-spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
.marigold-spin{animation:marigold-spin 2.5s linear infinite;}
.out-tabs{display:flex;border-bottom:1px solid var(--bdr);margin-bottom:32px;overflow-x:auto;}
.out-tab{padding:10px 0;margin-right:24px;font-size:11px;letter-spacing:1.5px;color:var(--muted);cursor:pointer;border:none;border-bottom:2px solid transparent;background:transparent;font-family:'Playfair Display',serif;font-style:italic;transition:all 0.2s;white-space:nowrap;flex-shrink:0;}
.out-tab:hover{color:var(--deep);}
.out-tab.on{color:var(--deep);border-bottom-color:var(--deep);}
.out-ey{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;display:flex;align-items:center;gap:8px;}
.out-ey::after{content:'';flex:1;height:1px;background:var(--bdr);}
.back-link{background:none;border:none;color:var(--muted);font-size:11px;letter-spacing:1px;cursor:pointer;font-family:'Playfair Display',Georgia,serif;font-style:italic;text-decoration:underline;}`;

// ── Landing page ──
const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Marigold Weddings</title>
<link rel="stylesheet" href="/brand.css">
<style>
html,body{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;}
.tagline{font-size:15px;color:var(--muted);font-style:italic;margin-bottom:56px;text-align:center;line-height:1.6;max-width:360px;}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:540px;width:100%;margin-bottom:48px;}
@media(max-width:480px){.cards{grid-template-columns:1fr;}}
.card{background:white;border:1px solid var(--bdr);border-radius:14px;padding:26px 22px;text-decoration:none;color:var(--tx);transition:border-color 0.2s,transform 0.15s;display:flex;flex-direction:column;gap:6px;}
.card:hover{border-color:var(--gd);transform:translateY(-2px);}
.card.primary{border-color:var(--gd);background:#FFFAEA;}
.card-ey{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);font-style:italic;}
.card-title{font-size:17px;font-style:italic;color:var(--deep);margin-top:2px;}
.card-desc{font-size:12px;color:var(--muted);font-style:italic;line-height:1.6;margin-top:4px;}
.card-cta{font-size:11px;color:var(--gk);font-style:italic;margin-top:10px;}
.footer{font-size:11px;color:var(--bdr);font-style:italic;text-align:center;line-height:1.8;}
.status-dot{display:inline-block;width:6px;height:6px;background:#27AE60;border-radius:50%;margin-right:4px;vertical-align:middle;}
h1{font-size:28px;font-weight:400;font-style:italic;color:var(--deep);letter-spacing:0.5px;margin-bottom:10px;}
</style>
</head>
<body>
<svg width="52" height="52" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg" style="margin-bottom:28px">
<g fill="#E0B030" stroke="#C8941A" stroke-width="0.4"><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(0 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(25.7 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(51.4 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(77.1 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(102.8 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(128.5 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(154.2 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(180 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(205.7 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(231.4 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(257.1 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(282.8 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(308.5 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(334.2 17 17)"/></g>
<g fill="#F2C53D" stroke="#D9A828" stroke-width="0.35"><ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(12.9 17 17)"/><ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(38.6 17 17)"/><ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(64.3 17 17)"/><ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(90 17 17)"/><ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(115.7 17 17)"/><ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(141.4 17 17)"/><ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(167.1 17 17)"/><ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(192.8 17 17)"/><ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(218.5 17 17)"/><ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(244.2 17 17)"/><ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(270 17 17)"/><ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(295.7 17 17)"/><ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(321.4 17 17)"/><ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(347.1 17 17)"/></g>
<g fill="#F7D44C" stroke="#E0B030" stroke-width="0.3"><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(0 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(20 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(40 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(60 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(80 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(100 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(120 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(140 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(160 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(180 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(200 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(220 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(240 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(260 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(280 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(300 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(320 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(340 17 17)"/></g>
<circle cx="17" cy="17" r="4.1" fill="#6B5318" stroke="#5A4512" stroke-width="0.3"/>
<circle cx="15.5" cy="15.8" r="0.45" fill="#3C3010"/>
<circle cx="18.5" cy="15.8" r="0.45" fill="#3C3010"/>
<circle cx="17" cy="18.4" r="0.45" fill="#3C3010"/>
</svg>
<h1>marigold</h1>
<p class="tagline">Your wedding, your traditions. Planning that actually gets it.</p>
<div class="cards">
  <a href="/questionnaire" class="card primary">
    <div class="card-ey">For couples</div>
    <div class="card-title">Build your wedding plan</div>
    <div class="card-desc">Answer 6 questions. Get a personalised plan built from our cultural taxonomy.</div>
    <div class="card-cta">Start now &rarr;</div>
  </a>
  <a href="/advisor" class="card">
    <div class="card-ey">For advisors</div>
    <div class="card-title">Review cultural content</div>
    <div class="card-desc">Review, edit, and approve taxonomy entries. Changes go live in the engine immediately.</div>
    <div class="card-cta">Open advisor review &rarr;</div>
  </a>
</div>
<div class="footer">
  <span class="status-dot"></span>Engine live &middot; 35 traditions &middot; Supabase connected<br>
  Confidential &mdash; internal build &middot; June 2026
</div>
</body>
</html>`;

// ── Questionnaire UI — served as static file at /advisor-review/questionnaire.html ──


// ── Advisor review interface ──
const ADVISOR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Marigold — Cultural Advisor Review</title>
<style>
  :root {
    --bg: #FDFAF0; --surface: #FFFFFF; --border: #E0D4B0; --text: #2A2010;
    --muted: #9A8A6A; --gold: #C8A820; --gold-dark: #9A7E10; --gold-light: #FDF8E8;
    --deep: #3C3010; --warm: #F5F0E8; --red: #C0392B; --red-light: #FDECEA;
    --green: #1E7C4E; --green-light: #E8F5EE; --orange: #D4550A; --orange-light: #FDF0E8;
    --radius: 6px; --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--font); background: var(--bg); color: var(--text); font-size: 14px; line-height: 1.5; }
  .layout { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh; }
  .sidebar { background: var(--surface); border-right: 1px solid var(--border); position: sticky; top: 0; height: 100vh; overflow-y: auto; }
  .main { padding: 32px; max-width: 860px; }
  .sidebar-header { padding: 18px 20px 14px; border-bottom: 1px solid var(--border); }
  .sidebar-header h1 { font-size: 14px; font-weight: 700; color: var(--deep); }
  .sidebar-header p { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .tradition-item { display: flex; align-items: center; justify-content: space-between; padding: 9px 20px; cursor: pointer; border-left: 3px solid transparent; }
  .tradition-item:hover { background: var(--warm); }
  .tradition-item.active { background: var(--gold-light); border-left-color: var(--gold); }
  .t-name { font-size: 13px; font-weight: 500; }
  .t-status { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 10px; }
  .s-approved { background: var(--green-light); color: var(--green); }
  .s-draft { background: var(--gold-light); color: var(--gold-dark); }
  .s-in_review { background: var(--orange-light); color: var(--orange); }
  .action-bar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: flex-start; }
  .action-group { display: flex; flex-direction: column; gap: 3px; }
  .action-hint { font-size: 11px; color: var(--muted); }
  .btn { display: inline-flex; align-items: center; gap: 5px; padding: 8px 14px; border-radius: var(--radius); font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid transparent; white-space: nowrap; }
  .btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .btn-primary { background: var(--deep); color: white; }
  .btn-gold { background: var(--gold); color: var(--deep); border-color: var(--gold); font-weight: 600; }
  .btn-gold:hover:not(:disabled) { background: var(--gold-dark); color: white; }
  .btn-success { background: var(--green); color: white; }
  .btn-warning { background: var(--orange); color: white; }
  .btn-outline { background: white; color: var(--text); border-color: var(--border); }
  .btn-outline:hover:not(:disabled) { background: var(--warm); }
  .btn-danger { background: var(--red); color: white; }
  .btn-sm { padding: 5px 10px; font-size: 12px; }
  .page-title { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 4px; color: var(--deep); }
  .page-meta { font-size: 13px; color: var(--muted); margin-bottom: 24px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .badge { display: inline-flex; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
  .badge-approved { background: var(--green-light); color: var(--green); }
  .badge-draft { background: var(--gold-light); color: var(--gold-dark); }
  .badge-in_review { background: var(--orange-light); color: var(--orange); }
  .badge-retired { background: var(--border); color: var(--muted); }
  .banner { padding: 12px 16px; border-radius: var(--radius); margin-bottom: 20px; display: flex; align-items: flex-start; gap: 10px; border-left: 4px solid; }
  .banner-editing { background: var(--gold-light); border-color: var(--gold); }
  .banner-locked { background: var(--warm); border-color: var(--border); }
  .banner-title { font-size: 13px; font-weight: 600; }
  .banner-editing .banner-title { color: var(--gold-dark); }
  .banner-locked .banner-title { color: var(--muted); }
  .banner-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .tabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 24px; }
  .tab { padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; color: var(--muted); }
  .tab.active { color: var(--deep); border-bottom-color: var(--gold); }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 12px; font-weight: 700; color: var(--deep); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
  .section-sub { font-size: 12px; color: var(--muted); margin-bottom: 12px; }
  /* Diff / tracked changes */
  .diff-wrap { font-size: 13px; line-height: 1.8; }
  .diff-wrap p { margin-bottom: 10px; }
  .diff-wrap strong { font-weight: 700; }
  .diff-wrap ol { margin: 6px 0 12px 20px; }
  .diff-wrap li { margin-bottom: 6px; }
  ins.diff-add { background: #D4EDDA; color: #155724; text-decoration: none; border-radius: 2px; padding: 0 2px; }
  del.diff-del { background: #F8D7DA; color: #721C24; text-decoration: line-through; border-radius: 2px; padding: 0 2px; }
  .diff-legend { display: flex; gap: 16px; margin-bottom: 12px; font-size: 11px; font-family: -apple-system, sans-serif; }
  .diff-legend span { display: flex; align-items: center; gap: 4px; }
  .diff-dot-add { width: 10px; height: 10px; border-radius: 2px; background: #D4EDDA; border: 1px solid #28a745; }
  .diff-dot-del { width: 10px; height: 10px; border-radius: 2px; background: #F8D7DA; border: 1px solid #dc3545; }
  .diff-no-change { color: var(--muted); font-size: 12px; font-style: italic; padding: 12px 0; }
  /* Rich text editor */
  .rich-editor-wrap { border: 1.5px solid var(--border); border-radius: 6px; overflow: hidden; }
  .rich-editor-toolbar { display: flex; gap: 4px; padding: 6px 8px; background: #FDFAF0; border-bottom: 1px solid var(--border); }
  .rich-editor-toolbar button { padding: 3px 8px; border: 1px solid var(--border); border-radius: 4px; background: white; font-size: 12px; cursor: pointer; color: var(--deep); font-family: Georgia, serif; }
  .rich-editor-toolbar button:hover { background: #F7D44C; border-color: #C8A820; }
  .rich-editor-toolbar button.active { background: #F7D44C; border-color: #C8A820; font-weight: 700; }
  .rich-editor-content { min-height: 160px; padding: 12px; font-size: 13px; line-height: 1.7; color: var(--deep); outline: none; background: white; }
  .rich-editor-content:focus { background: #FFFDF8; }
  .rich-editor-content strong { font-weight: 700; }
  .rich-editor-content ol { margin: 6px 0 12px 20px; }
  .rich-editor-content li { margin-bottom: 6px; }
  /* Rendered view */
  .cultural-notes-rendered {
    font-size: 13px; line-height: 1.8; color: #3C3010;
    background: var(--gold-pale, #FDFAF0);
    border: 1px solid var(--border, #E0D4B0);
    border-left: 3px solid var(--gold, #C8A820);
    border-radius: 0 6px 6px 0;
    padding: 14px 16px;
  }
  .cultural-notes-rendered p { margin-bottom: 10px; }
  .cultural-notes-rendered p.notes-heading { font-weight: 700; color: #2C2408; margin-top: 16px; margin-bottom: 6px; }
  .cultural-notes-rendered .notes-list { margin: 6px 0 14px 20px; }
  .cultural-notes-rendered .notes-list li { margin-bottom: 8px; line-height: 1.6; }
  .cultural-notes-rendered p { margin-bottom: 12px; }
  .cultural-notes-rendered strong { font-weight: 700; color: #2C2408; }
  .cultural-notes-rendered ol { margin: 8px 0 16px 20px; }
  .cultural-notes-rendered li { margin-bottom: 10px; line-height: 1.6; }
  .field-group { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .field { margin-bottom: 12px; }
  .field label { display: block; font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 5px; }
  .field input, .field textarea, .field select { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius); font-family: var(--font); font-size: 13px; background: white; color: var(--text); }
  .field input:focus, .field textarea:focus { outline: none; border-color: var(--gold); }
  .field textarea { resize: vertical; }
  .item-list { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; margin-bottom: 8px; }
  .item-row { border-bottom: 1px solid var(--border); }
  .item-row:last-child { border-bottom: none; }
  .item-row-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; cursor: pointer; background: var(--surface); }
  .item-row-header:hover { background: var(--warm); }
  .item-row-label { font-size: 13px; font-weight: 500; flex: 1; padding-right: 8px; }
  .item-row-meta { font-size: 11px; color: var(--muted); margin-right: 8px; white-space: nowrap; }
  .item-row-body { padding: 14px; background: var(--bg); border-top: 1px solid var(--border); display: none; }
  .item-row-body.open { display: block; }
  .item-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .item-fields.three { grid-template-columns: 1fr 1fr 1fr; }
  .item-fields .full { grid-column: 1 / -1; }
  .item-field label { display: block; font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px; }
  .item-field input, .item-field textarea, .item-field select { width: 100%; padding: 6px 8px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 12px; font-family: var(--font); background: white; color: var(--text); }
  .item-field input:focus, .item-field textarea:focus { outline: none; border-color: var(--gold); }
  .item-field textarea { min-height: 60px; resize: vertical; }
  .item-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 10px; }
  .add-item-btn { width: 100%; padding: 10px; text-align: center; font-size: 13px; color: var(--gold-dark); font-weight: 500; cursor: pointer; background: var(--gold-light); border: 1px dashed var(--gold); border-radius: var(--radius); margin-top: 4px; }
  .add-item-btn:hover { background: var(--warm); }
  .save-bar { position: sticky; bottom: 0; background: var(--surface); border-top: 1px solid var(--border); padding: 14px 0; margin-top: 32px; display: flex; gap: 8px; align-items: center; }
  .save-bar-hint { font-size: 12px; color: var(--muted); margin-left: auto; }
  .version-item { padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; }
  .version-item.current { border-color: var(--gold); background: var(--gold-light); }
  .audit-item { padding: 12px 0; border-bottom: 1px solid var(--border); display: flex; gap: 12px; }
  .audit-item:last-child { border-bottom: none; }
  .audit-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); margin-top: 5px; flex-shrink: 0; }
  .audit-dot.approved { background: var(--green); }
  .audit-dot.created { background: var(--gold); }
  .audit-dot.submitted_for_review { background: var(--orange); }
  .audit-dot.rejected { background: var(--red); }
  .audit-action { font-size: 12px; font-weight: 600; }
  .audit-meta { font-size: 11px; color: var(--muted); }
  .audit-notes { font-size: 12px; margin-top: 2px; font-style: italic; }
  .toast {
    position:fixed;bottom:20px;right:20px;
    display:flex;align-items:center;gap:8px;
    padding:10px 16px;border-radius:8px;
    background:var(--deep,#3C3010);color:#fff;
    font-size:13px;font-style:italic;
    font-family:'Playfair Display',Georgia,serif;
    opacity:0;pointer-events:none;
    transition:opacity 0.3s;z-index:999;
  }
  .toast.visible{opacity:1;}
  .toast.error{background:#c0392b;}
  .toast.success{background:#1e7c4e;}
  .toast-flower{font-size:14px;}
  .modal-backdrop { position: fixed; inset: 0; background: rgba(60,48,16,0.4); z-index: 200; display: flex; align-items: center; justify-content: center; }
  .modal-box { background: #FDFAF5; border-radius: 16px; padding: 32px; width: 380px; max-width:90vw; box-shadow: 0 8px 32px rgba(60,48,16,0.2); text-align:center; }
  .modal-flower { margin-bottom:16px; }
  .modal-title { font-size: 18px; font-weight: 400; font-style:italic; font-family:'Playfair Display',Georgia,serif; color: var(--deep); margin-bottom: 8px; }
  .modal-body { font-size:13px; color:var(--muted); font-style:italic; line-height:1.6; margin-bottom:20px; }
  .modal-input { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 13px; font-family: var(--font); margin-bottom: 16px; }
  .modal-input:focus { outline: none; border-color: var(--gold); }
  .modal-actions { display:flex; gap:12px; justify-content:center; margin-top:4px; }
  .toast.visible { opacity: 1; }
  .toast.error { background: var(--red); }
  .toast.success { background: var(--green); }
  .empty { text-align: center; padding: 60px 20px; color: var(--muted); }
  .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid var(--border); border-top-color: var(--gold); border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<div class="layout">
  <aside class="sidebar">
    <div class="sidebar-header">
      <a href="/" style="display:flex;align-items:center;gap:8px;text-decoration:none;margin-bottom:16px;">
        <svg width="26" height="26" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
      <g fill="#E0B030" stroke="#C8941A" stroke-width="0.4">
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(0 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(25.7 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(51.4 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(77.1 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(102.8 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(128.5 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(154.2 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(180 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(205.7 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(231.4 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(257.1 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(282.8 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(308.5 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(334.2 17 17)"/>
      </g>
      <g fill="#F2C53D" stroke="#D9A828" stroke-width="0.35">
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(12.9 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(38.6 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(64.3 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(90 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(115.7 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(141.4 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(167.1 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(192.8 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(218.5 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(244.2 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(270 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(295.7 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(321.4 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(347.1 17 17)"/>
      </g>
      <g fill="#F7D44C" stroke="#E0B030" stroke-width="0.3">
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(0 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(20 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(40 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(60 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(80 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(100 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(120 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(140 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(160 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(180 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(200 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(220 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(240 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(260 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(280 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(300 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(320 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(340 17 17)"/>
      </g>
      <circle cx="17" cy="17" r="4.1" fill="#6B5318" stroke="#5A4512" stroke-width="0.3"/>
      <circle cx="15.5" cy="15.8" r="0.45" fill="#3C3010"/>
      <circle cx="18.5" cy="15.8" r="0.45" fill="#3C3010"/>
      <circle cx="17" cy="18.4" r="0.45" fill="#3C3010"/>
    </svg>
        <span style="font-size:13px;letter-spacing:3px;color:var(--deep);font-style:italic;font-family:'Playfair Display',Georgia,serif">marigold</span>
      </a>
      <h1>Marigold · Advisor Review</h1>
      <p id="sidebar-count">Loading…</p>
    </div>
    <div id="tradition-list"></div>
  </aside>
  <main class="main" id="main-content">
    <div class="empty">
      <div style="font-size:32px;margin-bottom:12px">📋</div>
      <p>Select a tradition from the sidebar to begin reviewing.</p>
    </div>
  </main>
</div>
<div class="toast" id="toast"></div>
<div id="custom-modal" class="modal-backdrop" style="display:none">
  <div class="modal-box">
    <div class="modal-flower" id="modal-flower-adv"></div>
    <div class="modal-title" id="modal-title"></div>
    <div class="modal-body" id="modal-body"></div>
    <input type="text" class="modal-input" id="modal-input" style="display:none" placeholder="">
    <div class="modal-actions" id="modal-actions"></div>
  </div>
</div>
<script>
var TRAD_LABELS = {'sri-lankan-buddhist':'Buddhist · Sri Lankan','thai-buddhist':'Buddhist · Thai','chinese-taiwanese':'Chinese / Taiwanese','catholic':'Christian · Catholic','filipino-catholic':'Christian · Filipino Catholic','greek-orthodox':'Christian · Greek Orthodox','latin-american-catholic':'Christian · Latin American Catholic','mexican-catholic':'Christian · Mexican Catholic','christian-western':'Christian · Western','cuban':'Cuban','andhra-telugu':'Hindu · Andhra / Telugu','arya-samaj':'Hindu · Arya Samaj','assamese-hindu':'Hindu · Assamese','bengali-hindu':'Hindu · Bengali','bihari-hindu':'Hindu · Bihari','gujarati':'Hindu · Gujarati','kashmiri-pandit':'Hindu · Kashmiri Pandit','kerala-nair':'Hindu · Kerala / Nair','manipuri-vaishnavite':'Hindu · Manipuri (Vaishnavite)','marathi':'Hindu · Marathi','hindu-north-indian-punjabi':'Hindu · North Indian / Punjabi','odia-hindu':'Hindu · Odia','rajasthani-marwari':'Hindu · Rajasthani (Marwari)','rajasthani-rajput':'Hindu · Rajasthani (Rajput)','tamil-hindu':'Hindu · Tamil','vedic-general':'Hindu · Vedic (General)','jain-shwetambar':'Jain · Shwetambar','jewish-reform-conservative':'Jewish · Reform / Conservative','khasi':'Khasi','korean':'Korean','dawoodi-bohra':'Muslim · Dawoodi Bohra','muslim-nikah':'Muslim · Nikah','hausa-muslim':'Muslim · West African (Hausa)','yoruba-nigerian':'Nigerian · Yoruba','sikh':'Sikh'};
const API='/api/advisor';
let traditions=[],currentTradition=null,currentVersion=null,allVersions=[],activeTab='content',workingData={};
window.onload=()=>loadTraditions();
async function api(path,method='GET',body=null){
  const opts={method,headers:{'Content-Type':'application/json'}};
  if(body)opts.body=JSON.stringify(body);
  const res=await fetch(API+path,opts);
  if(!res.ok){const err=await res.json().catch(()=>({error:res.statusText}));throw new Error(err.error||res.statusText);}
  return res.json();
}
async function loadTraditions(){
  try{traditions=await api('/traditions');renderSidebar();}
  catch(e){toast('Failed to load: '+e.message,'error');}
}
function renderSidebar(){
  document.getElementById('sidebar-count').textContent=traditions.length+' traditions';
  const sorted=[...traditions].sort((a,b)=>(TRAD_LABELS[a.slug]||a.name||"").localeCompare(TRAD_LABELS[b.slug]||b.name||""));
  document.getElementById('tradition-list').innerHTML=sorted.map(t=>{
    const versions=t.tradition_versions||[];
    const current=versions.find(v=>v.is_current);
    const latest=[...versions].sort((a,b)=>b.version_number-a.version_number)[0];
    const sv=current||latest;
    const status=sv?.status||'no versions';
    return \`<div class="tradition-item \${currentTradition?.id===t.id?'active':''}" onclick="selectTradition('\${t.id}')">
      <span class="t-name">\${TRAD_LABELS[t.slug]||t.name}</span>
      <span class="t-status s-\${status.replace('_','-')}">\${status.replace('_',' ')}</span>
    </div>\`;
  }).join('');
}
async function selectTradition(id){
  currentTradition=traditions.find(t=>t.id===id);
  renderSidebar();
  document.getElementById('main-content').innerHTML='<div class="empty"><div class="spinner"></div></div>';
  try{
    allVersions=await api('/traditions/'+id+'/versions');
    // Default to the approved current version — not just the most recent,
    // which could be a draft from a previous session
    const approvedCurrent = allVersions.find(v => v.is_current && v.status === 'approved');
    currentVersion = approvedCurrent || allVersions[0] || null;
    initWorkingData();activeTab='content';renderMain();
  }catch(e){toast('Failed to load: '+e.message,'error');}
}
function initWorkingData(){
  if(!currentVersion){workingData={};return;}
  workingData={
    avg_budget_low:currentVersion.avg_budget_low||'',
    avg_budget_high:currentVersion.avg_budget_high||'',
    budget_currency:currentVersion.budget_currency||'USD',
    typical_event_count:currentVersion.typical_event_count||'',
    cultural_notes:currentVersion.cultural_notes||'',
    lgbtq_notes:currentVersion.lgbtq_notes||'',
    sources:currentVersion.sources||'',
    review_notes:currentVersion.review_notes||'',
    checklist_template:JSON.parse(JSON.stringify(currentVersion.checklist_template||[])),
    ceremony_sequence:JSON.parse(JSON.stringify(currentVersion.ceremony_sequence||[])),
    vendor_categories:JSON.parse(JSON.stringify(currentVersion.vendor_categories||[])),
    budget_allocation:JSON.parse(JSON.stringify(currentVersion.budget_allocation||[])),
  };
}
function renderMain(){
  const v=currentVersion;
  const canSubmit=v?.status==='draft';
  const canApprove=v?.status==='in_review';
  const canEdit=v?.status==='draft'||v?.status==='in_review';
  document.getElementById('main-content').innerHTML=\`
    <div class="page-title">\${TRAD_LABELS[currentTradition.slug]||currentTradition.name}</div>
    <div class="page-meta">
      <span>\${currentTradition.slug}</span><span>·</span><span>\${currentTradition.region||'—'}</span><span>·</span>
      \${v?\`<span class="badge badge-\${v.status}">\${v.status.replace('_',' ')}</span><span style="color:var(--muted)">v\${v.version_number}</span>\`:'<span class="badge badge-draft">no content yet</span>'}
    </div>
    <div class="action-bar">
      <div class="action-group">
        <button class="btn btn-gold" onclick="createEditingCopy()">✏️ Create editing copy</button>
        <span class="action-hint">Makes a copy to edit — live content stays unchanged</span>
      </div>
      \${canEdit?\`<button class="btn btn-outline" onclick="cancelEditing()">✕ Cancel editing</button>\`:''}
      <button class="btn btn-warning" onclick="submitForReview()" \${canSubmit?'':'disabled'}>📤 Submit for review</button>
      <button class="btn btn-success" onclick="approveVersion()" \${canApprove?'':'disabled'}>✅ Approve</button>
      <button class="btn btn-outline" onclick="rejectVersion()" \${canApprove?'':'disabled'}>❌ Reject</button>
    </div>
    <div class="tabs">
      <div class="tab \${activeTab==='content'?'active':''}" onclick="switchTab('content')">Content</div>
      <div class="tab \${activeTab==='versions'?'active':''}" onclick="switchTab('versions')">Version history</div>
      <div class="tab \${activeTab==='audit'?'active':''}" onclick="switchTab('audit')">Audit trail</div>
    </div>
    <div id="tab-content">
      \${activeTab==='content'?renderContentTab(v,canEdit):''}
      \${activeTab==='versions'?renderVersionsTab():''}
      \${activeTab==='audit'?'<div class="empty"><div class="spinner"></div></div>':''}
    </div>\`;
  if(activeTab==='audit')loadAuditTrail();
}
function switchTab(tab){activeTab=tab;renderMain();}
function renderContentTab(v,canEdit){
  if(!v)return\`<div class="empty"><div style="font-size:32px;margin-bottom:12px">📭</div><p>No content yet. Content is seeded by developers, then you review and approve it here.</p></div>\`;
  const dis=canEdit?'':'disabled';
  const banner=canEdit
    ?\`<div class="banner banner-editing"><span style="font-size:18px">✏️</span><div><div class="banner-title">Editing copy — version \${v.version_number}</div><div class="banner-sub">The live approved version is untouched. Your changes only go live once you approve this copy.</div></div></div>\`
    :\`<div class="banner banner-locked"><span style="font-size:18px">🔒</span><div><div class="banner-title">Live approved version (v\${v.version_number}) — read only</div><div class="banner-sub">Click "Create editing copy" to make an editable copy.</div></div></div>\`;
  return banner+\`
    <div class="section">
      <div class="section-title">Overview</div>
      <div class="field-group">
        <div class="field"><label>Average budget — low ($)</label><input type="number" value="\${workingData.avg_budget_low}" \${dis} oninput="workingData.avg_budget_low=this.value"></div>
        <div class="field"><label>Average budget — high ($)</label><input type="number" value="\${workingData.avg_budget_high}" \${dis} oninput="workingData.avg_budget_high=this.value"></div>
        <div class="field"><label>Currency</label><input type="text" value="\${workingData.budget_currency}" \${dis} oninput="workingData.budget_currency=this.value"></div>
        <div class="field"><label>Typical number of events</label><input type="number" value="\${workingData.typical_event_count}" \${dis} oninput="workingData.typical_event_count=this.value"></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Cultural notes</div>
      <div class="field">
        \${canEdit
          ? \`<div class="rich-editor-wrap">
              <div class="rich-editor-toolbar">
                <button onclick="execCmd('bold')" title="Bold"><b>B</b></button>
                <button onclick="execCmd('insertOrderedList')" title="Numbered list">1. List</button>
                <button onclick="execCmd('insertUnorderedList')" title="Bullet list">&#8226; List</button>
                <button onclick="execCmd('removeFormat')" title="Clear">Clear</button>
              </div>
              <div class="rich-editor-content" id="cultural-notes-editor" contenteditable="true"
                oninput="syncCulturalNotes()"
                onpaste="handlePaste(event)">\${htmlToEditor(workingData.cultural_notes)}</div>
            </div>\`
          : \`<div class="cultural-notes-rendered">\${renderCulturalNotes(workingData.cultural_notes)}</div>\`
        }
      </div>
    </div>
    <div class="section">
      <div class="section-title">Checklist (\${workingData.checklist_template.length} items)</div>
      <div class="section-sub">Tasks the couple or their family need to complete, with suggested timelines. Click any item to expand and edit it.</div>
      <div class="item-list" id="checklist-list">\${renderChecklistItems(canEdit)}</div>
      \${canEdit?\`<div class="add-item-btn" onclick="addChecklistItem()">+ Add checklist item</div>\`:''}
    </div>
    <div class="section">
      <div class="section-title">Ceremony sequence (\${workingData.ceremony_sequence.length} events)</div>
      <div class="section-sub">The events in this tradition, in order. Click any event to expand and edit it.</div>
      <div class="item-list" id="ceremony-list">\${renderCeremonyItems(canEdit)}</div>
      \${canEdit?\`<div class="add-item-btn" onclick="addCeremonyItem()">+ Add ceremony event</div>\`:''}
    </div>
    <div class="section">
      <div class="section-title">Vendor priorities (\${workingData.vendor_categories.length} categories)</div>
      <div class="section-sub">Vendors the couple will need to book, with budget guidance. Click any vendor to expand and edit.</div>
      <div class="item-list" id="vendor-list">\${renderVendorItems(canEdit)}</div>
      \${canEdit?\`<div class="add-item-btn" onclick="addVendorItem()">+ Add vendor category</div>\`:''}
    </div>
    <div class="section">
      <div class="section-title">Budget allocation (\${workingData.budget_allocation.length} categories)</div>
      <div class="section-sub">How the total wedding budget is typically split, shown as percentage ranges.</div>
      <div class="item-list" id="budget-list">\${renderBudgetItems(canEdit)}</div>
      \${canEdit?\`<div class="add-item-btn" onclick="addBudgetItem()">+ Add budget category</div>\`:''}
    </div>
    <div class="section">
      <div class="section-title">Same-sex &amp; LGBTQ+ adaptation notes</div>
      <div class="section-sub">How does this tradition adapt for same-sex couples? Which ceremonies change, which are gender-neutral, what terminology differs?</div>
      <div class="field">
        \${canEdit
          ? \`<div class="rich-editor-wrap">
              <div class="rich-editor-toolbar">
                <button onclick="execCmd('bold')"><b>B</b></button>
                <button onclick="execCmd('insertOrderedList')">1. List</button>
                <button onclick="execCmd('removeFormat')">Clear</button>
              </div>
              <div class="rich-editor-content" contenteditable="true"
                oninput="workingData.lgbtq_notes=editorToText(this)"
                onpaste="handlePaste(event)">\${htmlToEditor(workingData.lgbtq_notes||'')}</div>
            </div>\`
          : renderCulturalNotes(workingData.lgbtq_notes || '')
        }
      </div>
    </div>
    <div class="section">
      <div class="section-title">Sources &amp; verification notes</div>
      <div class="section-sub">Where this information came from, and what still needs to be verified by someone from this community.</div>
      <div class="field"><textarea rows="4" \${dis} oninput="workingData.sources=this.value">\${workingData.sources}</textarea></div>
    </div>
    \${canEdit?\`
    <div class="section">
      <div class="section-title">Review notes</div>
      <div class="section-sub">Notes for other reviewers — what you changed, questions, things to verify. These appear in the audit trail.</div>
      <div class="field"><textarea rows="3" oninput="workingData.review_notes=this.value">\${workingData.review_notes}</textarea></div>
    </div>
    <div class="save-bar">
      <button class="btn btn-primary" onclick="saveEdits()">Save changes</button>
      <button class="btn btn-outline" onclick="cancelEditing()">Cancel</button>
      <span class="save-bar-hint">Changes are not saved automatically</span>
    </div>\`:''}\`;
}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// ── Rich text editor helpers ──
function execCmd(cmd) {
  document.getElementById('cultural-notes-editor')?.focus();
  document.execCommand(cmd, false, null);
}

function handlePaste(e) {
  e.preventDefault();
  const text = e.clipboardData.getData('text/plain');
  document.execCommand('insertText', false, text);
}

function syncCulturalNotes() {
  const el = document.getElementById('cultural-notes-editor');
  if (!el) return;
  workingData.cultural_notes = editorToText(el);
}

// Convert stored plain text (with **bold** markers) to contenteditable HTML
function htmlToEditor(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
    .replace(/((?:^|\\n)\\d+\\. .+)+/gm, match => {
      const items = match.trim().split('\\n').map(l => '<li>' + l.replace(/^\\d+\\. /, '') + '</li>').join('');
      return '<ol>' + items + '</ol>';
    })
    .split('\\n\\n').map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<ol>')) return p;
      return '<p>' + p.replace(/\\n/g, '<br>') + '</p>';
    }).join('');
}

// Convert contenteditable HTML back to plain text with **bold** markers
function editorToText(el) {
  function nodeToText(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    const tag = node.tagName?.toLowerCase();
    const inner = Array.from(node.childNodes).map(nodeToText).join('');
    if (tag === 'strong' || tag === 'b') return '**' + inner + '**';
    if (tag === 'p' || tag === 'div') return inner + '\\n\\n';
    if (tag === 'br') return '\\n';
    if (tag === 'ol' || tag === 'ul') {
      let i = 0;
      return Array.from(node.childNodes).filter(n=>n.tagName?.toLowerCase()==='li').map(li => {
        i++;
        return i + '. ' + Array.from(li.childNodes).map(nodeToText).join('').trim();
      }).join('\\n') + '\\n\\n';
    }
    if (tag === 'li') return inner;
    return inner;
  }
  return Array.from(el.childNodes).map(nodeToText).join('').replace(/\\n{3,}/g, '\\n\\n').trim();
}

// ── Diff engine — word-level diff between two plain text strings ──
function diffText(oldText, newText) {
  if (!oldText && !newText) return '<div class="diff-no-change">No content in either version.</div>';
  if (!oldText) return '<div class="diff-wrap">' + renderCulturalNotes(newText).replace(/<p>/g, '<p><ins class="diff-add">').replace(/<\\/p>/g, '</ins></p>') + '</div>';
  if (!newText) return '<div class="diff-wrap">' + renderCulturalNotes(oldText).replace(/<p>/g, '<p><del class="diff-del">').replace(/<\\/p>/g, '</del></p>') + '</div>';
  if (oldText === newText) return '<div class="diff-no-change">No changes to cultural notes in this draft.</div>';

  // Word-level diff using LCS
  const oldWords = tokenize(oldText);
  const newWords = tokenize(newText);
  const ops = lcs(oldWords, newWords);

  let html = '';
  let paraBuffer = '';

  ops.forEach(op => {
    const word = escHtml(op.text);
    if (op.type === 'equal') paraBuffer += word;
    else if (op.type === 'insert') paraBuffer += '<ins class="diff-add">' + word + '</ins>';
    else if (op.type === 'delete') paraBuffer += '<del class="diff-del">' + word + '</del>';
    if (op.text === '\\n\\n') { html += '<p>' + paraBuffer + '</p>'; paraBuffer = ''; }
  });
  if (paraBuffer.trim()) html += '<p>' + paraBuffer + '</p>';

  // Apply bold formatting
  html = html.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');

  return '<div class="diff-wrap">' + (html || '<div class="diff-no-change">No visible changes.</div>') + '</div>';
}

function escHtml(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function tokenize(text) {
  // Split into words + punctuation + newlines, keeping delimiters
  return text.split(/(\\s+|\\*\\*|[.,!?;:—–])/).filter(t => t !== undefined);
}

function lcs(a, b) {
  // Simple LCS-based diff — produces array of {type, text} ops
  const m = a.length, n = b.length;
  // For performance cap at 300 tokens each
  if (m > 300 || n > 300) {
    // Fall back to paragraph-level diff
    return paragraphDiff(a.join(''), b.join(''));
  }
  const dp = Array.from({length:m+1}, ()=>new Array(n+1).fill(0));
  for(let i=m-1;i>=0;i--) for(let j=n-1;j>=0;j--)
    dp[i][j] = a[i]===b[j] ? dp[i+1][j+1]+1 : Math.max(dp[i+1][j],dp[i][j+1]);

  const ops = []; let i=0,j=0;
  while(i<m||j<n){
    if(i<m&&j<n&&a[i]===b[j]){ops.push({type:'equal',text:a[i]});i++;j++;}
    else if(j<n&&(i>=m||dp[i][j+1]>=dp[i+1][j])){ops.push({type:'insert',text:b[j]});j++;}
    else{ops.push({type:'delete',text:a[i]});i++;}
  }
  return ops;
}

function paragraphDiff(oldText, newText) {
  const oldParts = oldText.split('\\n\\n');
  const newParts = newText.split('\\n\\n');
  const ops = [];
  const maxLen = Math.max(oldParts.length, newParts.length);
  for(let i=0;i<maxLen;i++){
    const o = oldParts[i], n = newParts[i];
    if(o===n) ops.push({type:'equal',text:(o||'')+'\\n\\n'});
    else {
      if(o) ops.push({type:'delete',text:o+'\\n\\n'});
      if(n) ops.push({type:'insert',text:n+'\\n\\n'});
    }
  }
  return ops;
}

function renderCulturalNotes(text) {
  if (!text) return '<p style="color:#9A8A6A;font-style:italic;padding:8px 0">No cultural notes added yet.</p>';

  const t = text.trim();
  let html = '';
  
  // Split text into chunks by double newlines first, then single newlines
  // Handle the case where text is one long string with \\n separators
  const rawLines = t.split(/\\n/).map(l => l.trim());
  
  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];
    if (!line) { i++; continue; }
    
    // Numbered list item
    if (/^\\d+\\.\\s/.test(line)) {
      html += '<ol class="notes-list">';
      while (i < rawLines.length && /^\\d+\\.\\s/.test(rawLines[i].trim()) && rawLines[i].trim()) {
        const item = rawLines[i].trim().replace(/^\\d+\\.\\s/, '');
        html += '<li>' + applyBold(escHtml(item)) + '</li>';
        i++;
      }
      html += '</ol>';
      continue;
    }
    
    // Bold heading — line that is mostly or entirely bold
    const escaped = escHtml(line);
    if (/^\\*\\*[^*]+\\*\\*[:\\s]*$/.test(line)) {
      html += '<p class="notes-heading">' + applyBold(escaped) + '</p>';
      i++;
      continue;
    }
    
    // Regular paragraph — accumulate until blank line or new section
    let para = escaped;
    i++;
    while (i < rawLines.length && rawLines[i].trim() && 
           !/^\\d+\\.\\s/.test(rawLines[i]) && 
           !/^\\*\\*[^*]+\\*\\*[:\\s]*$/.test(rawLines[i])) {
      para += ' ' + escHtml(rawLines[i].trim());
      i++;
    }
    html += '<p>' + applyBold(para) + '</p>';
  }
  
  return html || '<p style="color:#9A8A6A;font-style:italic">No cultural notes added yet.</p>';
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function applyBold(s) {
  return s.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
}


function renderChecklistItems(canEdit){
  if(!workingData.checklist_template.length)return'<div style="padding:12px;color:var(--muted);font-size:13px">No items yet.</div>';
  return workingData.checklist_template.map((item,i)=>\`
    <div class="item-row">
      <div class="item-row-header" onclick="toggleItem('c\${i}')">
        <span class="item-row-label">\${esc(item.label)||'(no label)'}</span>
        <span class="item-row-meta">\${esc(item.milestone||'')} · \${item.type||''}</span>
        <span style="color:var(--muted);font-size:11px">▾</span>
      </div>
      <div class="item-row-body" id="c\${i}">
        <div class="item-fields">
          <div class="item-field"><label>When</label><input value="\${esc(item.milestone||'')}" \${canEdit?\`oninput="workingData.checklist_template[\${i}].milestone=this.value"\`:' disabled'} placeholder="e.g. 12 months before"></div>
          <div class="item-field"><label>Type</label><select \${canEdit?\`onchange="workingData.checklist_template[\${i}].type=this.value"\`:' disabled'}>\${['Required','Traditional','Optional','Universal'].map(t=>\`<option \${item.type===t?'selected':''}>\${t}</option>\`).join('')}</select></div>
          <div class="item-field full"><label>Task</label><input value="\${esc(item.label||'')}" \${canEdit?\`oninput="workingData.checklist_template[\${i}].label=this.value"\`:' disabled'}></div>
          <div class="item-field"><label>Who does this</label><input value="\${esc(item.assignee||'')}" \${canEdit?\`oninput="workingData.checklist_template[\${i}].assignee=this.value"\`:' disabled'}></div>
          <div class="item-field full"><label>Notes &amp; constraints</label><textarea \${canEdit?\`oninput="workingData.checklist_template[\${i}].notes=this.value"\`:' disabled'}>\${esc(item.notes||'')}</textarea></div>
        </div>
        \${canEdit?\`<div class="item-actions"><button class="btn btn-sm btn-danger" onclick="removeItem('checklist_template',\${i})">Remove item</button></div>\`:''}
      </div>
    </div>\`).join('');
}
function renderCeremonyItems(canEdit){
  if(!workingData.ceremony_sequence.length)return'<div style="padding:12px;color:var(--muted);font-size:13px">No events yet.</div>';
  return workingData.ceremony_sequence.map((item,i)=>\`
    <div class="item-row">
      <div class="item-row-header" onclick="toggleItem('e\${i}')">
        <span class="item-row-label">\${esc(item.name)||'(unnamed event)'}</span>
        <span class="item-row-meta">\${esc(item.timing||'')}</span>
        <span style="color:var(--muted);font-size:11px">▾</span>
      </div>
      <div class="item-row-body" id="e\${i}">
        <div class="item-fields three">
          <div class="item-field"><label>Event name</label><input value="\${esc(item.name||'')}" \${canEdit?\`oninput="workingData.ceremony_sequence[\${i}].name=this.value"\`:' disabled'}></div>
          <div class="item-field full"><label>Who is this for?</label>
          <div style="display:flex;gap:16px;padding:8px 0;flex-wrap:wrap">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;font-weight:normal;text-transform:none;letter-spacing:0">
              <input type="checkbox" \${!canEdit?'disabled':''} 
                \${item.side==='bride'||item.side==='bride+groom'?'checked':''}
                onchange="setSide(workingData.ceremony_sequence[\${i}], 'bride', this.checked)">
              Bride
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;font-weight:normal;text-transform:none;letter-spacing:0">
              <input type="checkbox" \${!canEdit?'disabled':''} 
                \${item.side==='groom'||item.side==='bride+groom'?'checked':''}
                onchange="setSide(workingData.ceremony_sequence[\${i}], 'groom', this.checked)">
              Groom
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;font-weight:normal;text-transform:none;letter-spacing:0">
              <input type="checkbox" \${!canEdit?'disabled':''} 
                \${item.side==='both'?'checked':''}
                onchange="setSide(workingData.ceremony_sequence[\${i}], 'both', this.checked)">
              Both together
            </label>
          </div></div>
          <div class="item-field"><label>Timing</label><input value="\${esc(item.timing||'')}" \${canEdit?\`oninput="workingData.ceremony_sequence[\${i}].timing=this.value"\`:' disabled'} placeholder="e.g. day before"></div>
          <div class="item-field"><label>Duration</label><input value="\${esc(item.duration||'')}" \${canEdit?\`oninput="workingData.ceremony_sequence[\${i}].duration=this.value"\`:' disabled'}></div>
          <div class="item-field"><label>Typical guest count</label><input value="\${esc(item.typical_size||'')}" \${canEdit?\`oninput="workingData.ceremony_sequence[\${i}].typical_size=this.value"\`:' disabled'}></div>
          <div class="item-field"><label>Location type</label><input value="\${esc(item.location_type||'')}" \${canEdit?\`oninput="workingData.ceremony_sequence[\${i}].location_type=this.value"\`:' disabled'}></div>
          <div class="item-field full"><label>Notes</label><textarea \${canEdit?\`oninput="workingData.ceremony_sequence[\${i}].notes=this.value"\`:' disabled'}>\${esc(item.notes||'')}</textarea></div>
          <div class="item-field full">
            <label>Vendor categories <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--muted)">— tick all that apply to this ceremony</span></label>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
              \${'["Venue hire","Catering & bar","Photography & video","Music & entertainment","Florals & décor","Hair & makeup (bride)","Officiant / pandit / priest","Mehndi artist","Horse & procession","Dhol & band","Bridal wear & styling","Menswear & styling","Invitations & stationery","Lighting & AV","Cake & desserts","Transport (couple)","Guest accommodation","Henna for guests"]'.split(',').map(c=>c.replace(/[\\[\\]"]/g,'')).filter(c=>c).map(cat => {
                const checked = (item.vendor_categories||[]).some(v=>v.category===cat);
                return '<label style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border:1px solid '+(checked?'var(--gold)':'var(--border)')+';border-radius:20px;background:'+(checked?'var(--gold-light)':'white')+';font-size:11px;cursor:'+(canEdit?'pointer':'default')+';white-space:nowrap;margin:2px">'
                  + '<input type="checkbox" '+(checked?'checked ':' ')+(canEdit?'onchange="toggleVc('+i+',\\''+cat+'\\',this.checked)"':'disabled')+' style="accent-color:var(--gold)">'
                  + cat + '</label>';
              }).join('')}
            </div>
                      </div>
        </div>
        \${canEdit?\`<div class="item-actions"><button class="btn btn-sm btn-danger" onclick="removeItem('ceremony_sequence',\${i})">Remove event</button></div>\`:''}
      </div>
    </div>\`).join('');
}
function renderVendorItems(canEdit){
  if(!workingData.vendor_categories.length)return'<div style="padding:12px;color:var(--muted);font-size:13px">No vendor categories yet.</div>';
  return workingData.vendor_categories.map((item,i)=>\`
    <div class="item-row">
      <div class="item-row-header" onclick="toggleItem('v\${i}')">
        <span class="item-row-label">\${esc(item.category)||'(unnamed)'}</span>
        <span class="item-row-meta">\${item.priority||''} · \${item.typical_spend_pct_low||0}–\${item.typical_spend_pct_high||0}% of budget</span>
        <span style="color:var(--muted);font-size:11px">▾</span>
      </div>
      <div class="item-row-body" id="v\${i}">
        <div class="item-fields">
          <div class="item-field"><label>Vendor type</label><input value="\${esc(item.category||'')}" \${canEdit?\`oninput="workingData.vendor_categories[\${i}].category=this.value"\`:' disabled'}></div>
          <div class="item-field"><label>Priority</label><select \${canEdit?\`onchange="workingData.vendor_categories[\${i}].priority=this.value"\`:' disabled'}>\${['Required','Traditional','Optional'].map(t=>\`<option \${item.priority===t?'selected':''}>\${t}</option>\`).join('')}</select></div>
          <div class="item-field"><label>Typical spend % — low</label><input type="number" value="\${item.typical_spend_pct_low||''}" \${canEdit?\`oninput="workingData.vendor_categories[\${i}].typical_spend_pct_low=parseFloat(this.value)"\`:' disabled'}></div>
          <div class="item-field"><label>Typical spend % — high</label><input type="number" value="\${item.typical_spend_pct_high||''}" \${canEdit?\`oninput="workingData.vendor_categories[\${i}].typical_spend_pct_high=parseFloat(this.value)"\`:' disabled'}></div>
          <div class="item-field full"><label>Notes for the couple</label><textarea \${canEdit?\`oninput="workingData.vendor_categories[\${i}].notes=this.value"\`:' disabled'}>\${esc(item.notes||'')}</textarea></div>
        </div>
        \${canEdit?\`<div class="item-actions"><button class="btn btn-sm btn-danger" onclick="removeItem('vendor_categories',\${i})">Remove vendor</button></div>\`:''}
      </div>
    </div>\`).join('');
}
function renderBudgetItems(canEdit){
  if(!workingData.budget_allocation.length)return'<div style="padding:12px;color:var(--muted);font-size:13px">No budget categories yet.</div>';
  return workingData.budget_allocation.map((item,i)=>\`
    <div class="item-row">
      <div class="item-row-header" onclick="toggleItem('b\${i}')">
        <span class="item-row-label">\${esc(item.category)||'(unnamed)'}</span>
        <span class="item-row-meta">\${item.pct_low||0}–\${item.pct_high||0}% of total budget</span>
        <span style="color:var(--muted);font-size:11px">▾</span>
      </div>
      <div class="item-row-body" id="b\${i}">
        <div class="item-fields three">
          <div class="item-field"><label>Category name</label><input value="\${esc(item.category||'')}" \${canEdit?\`oninput="workingData.budget_allocation[\${i}].category=this.value"\`:' disabled'}></div>
          <div class="item-field"><label>% of budget — low</label><input type="number" value="\${item.pct_low||''}" \${canEdit?\`oninput="workingData.budget_allocation[\${i}].pct_low=parseFloat(this.value)"\`:' disabled'}></div>
          <div class="item-field"><label>% of budget — high</label><input type="number" value="\${item.pct_high||''}" \${canEdit?\`oninput="workingData.budget_allocation[\${i}].pct_high=parseFloat(this.value)"\`:' disabled'}></div>
          <div class="item-field full"><label>Notes</label><textarea rows="2" \${canEdit?\`oninput="workingData.budget_allocation[\${i}].notes=this.value"\`:' disabled'}>\${esc(item.notes||'')}</textarea></div>
        </div>
        \${canEdit?\`<div class="item-actions"><button class="btn btn-sm btn-danger" onclick="removeItem('budget_allocation',\${i})">Remove category</button></div>\`:''}
      </div>
    </div>\`).join('');
}
function toggleVc(i, cat, checked) {
  if (!workingData.ceremony_sequence[i].vendor_categories) workingData.ceremony_sequence[i].vendor_categories = [];
  if (checked) {
    // Add if not already present
    if (!workingData.ceremony_sequence[i].vendor_categories.some(function(v){ return v.category === cat; })) {
      workingData.ceremony_sequence[i].vendor_categories.push({category: cat, typical_pct_of_ceremony_budget: 0});
    }
  } else {
    // Remove
    workingData.ceremony_sequence[i].vendor_categories = workingData.ceremony_sequence[i].vendor_categories.filter(function(v){ return v.category !== cat; });
  }
  refreshLists();
}
function toggleItem(id){const el=document.getElementById(id);if(el)el.classList.toggle('open');}
// ============================================================================
// CUSTOM MODAL — replaces browser confirm() and prompt()
// ============================================================================
let _modalResolve = null;

function showModal({ title, body, input = false, inputPlaceholder = '', confirmLabel = 'OK', confirmClass = 'btn-primary', cancelLabel = 'Cancel' }) {
  return new Promise(resolve => {
    _modalResolve = resolve;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').textContent = body;
    const inp = document.getElementById('modal-input');
    if (input) { inp.style.display = 'block'; inp.placeholder = inputPlaceholder; inp.value = ''; setTimeout(() => inp.focus(), 50); }
    else { inp.style.display = 'none'; }
    document.getElementById('modal-actions').innerHTML = \`
      <button class="btn btn-outline" onclick="closeModal(null)">\${cancelLabel}</button>
      <button class="btn \${confirmClass}" onclick="closeModal(\${input ? "'input'" : 'true'})">\${confirmLabel}</button>\`;
    var flAdv = document.getElementById('modal-flower-adv');
    if (flAdv && !flAdv.innerHTML) flAdv.innerHTML = '<svg width="32" height="32" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg"><g fill="#E0B030" stroke="#C8941A" stroke-width="0.4"><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(0 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(25.7 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(51.4 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(77.1 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(102.8 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(128.5 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(154.2 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(180 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(205.7 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(231.4 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(257.1 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(282.8 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(308.5 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(334.2 17 17)"/></g><g fill="#F7D44C" stroke="#E0B030" stroke-width="0.3"><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(0 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(20 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(60 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(120 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(180 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(240 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(300 17 17)"/></g><circle cx="17" cy="17" r="4.1" fill="#6B5318" stroke="#5A4512" stroke-width="0.3"/></svg>';
    document.getElementById('custom-modal').style.display = 'flex';
  });
}

function closeModal(result) {
  const val = result === "'input'" ? document.getElementById('modal-input').value.trim() : result;
  document.getElementById('custom-modal').style.display = 'none';
  if (_modalResolve) { _modalResolve(val); _modalResolve = null; }
}

// Allow Enter key to confirm in input modals
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('custom-modal').style.display !== 'none') {
    const inp = document.getElementById('modal-input');
    if (inp.style.display !== 'none') closeModal("'input'");
    else closeModal(true);
  }
  if (e.key === 'Escape' && document.getElementById('custom-modal').style.display !== 'none') closeModal(null);
});

function removeItem(field,index){
  showModal({ title:'Remove item', body:'Are you sure you want to remove this item?', confirmLabel:'Remove', confirmClass:'btn-danger' })
  .then(ok => { if(ok){ workingData[field].splice(index,1); refreshLists(); } });
}
function addChecklistItem(){workingData.checklist_template.push({milestone:'',label:'',assignee:'',notes:'',type:'Required'});refreshLists();openLast('c',workingData.checklist_template.length-1);}
function addCeremonyItem(){workingData.ceremony_sequence.push({order:workingData.ceremony_sequence.length+1,name:'',timing:'',duration:'',typical_size:'',location_type:'',notes:''});refreshLists();openLast('e',workingData.ceremony_sequence.length-1);}
function addVendorItem(){workingData.vendor_categories.push({category:'',tag:'',priority:'Required',typical_spend_pct_low:0,typical_spend_pct_high:0,notes:''});refreshLists();openLast('v',workingData.vendor_categories.length-1);}
function addBudgetItem(){workingData.budget_allocation.push({category:'',pct_low:0,pct_high:0,notes:''});refreshLists();openLast('b',workingData.budget_allocation.length-1);}
function openLast(prefix,idx){setTimeout(()=>{const el=document.getElementById(prefix+idx);if(el){el.classList.add('open');el.scrollIntoView({behavior:'smooth',block:'center'});}},50);}
function refreshLists(){
  const canEdit=currentVersion?.status==='draft'||currentVersion?.status==='in_review';
  const maps=[['checklist-list',renderChecklistItems],['ceremony-list',renderCeremonyItems],['vendor-list',renderVendorItems],['budget-list',renderBudgetItems]];
  maps.forEach(([id,fn])=>{const el=document.getElementById(id);if(el)el.innerHTML=fn(canEdit);});
}
function renderVersionsTab(){
  if(!allVersions.length)return'<div class="empty">No versions yet.</div>';
  const approved = allVersions.find(v=>v.is_current && v.status==='approved');
  const draft = allVersions.find(v=>v.status==='draft'||v.status==='in_review');
  const list = allVersions.map(v=>\`
    <div class="version-item \${v.is_current?'current':''}">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-weight:600">Version \${v.version_number}</span>
        <span class="badge badge-\${v.status}">\${v.status.replace('_',' ')}</span>
        \${v.is_current?'<span class="badge badge-approved" style="font-size:10px">LIVE</span>':''}
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:12px;color:var(--muted)">\${new Date(v.proposed_at).toLocaleDateString()}</span>
        \${v.id!==currentVersion?.id?\`<button class="btn btn-outline btn-sm" onclick="loadVersion('\${v.id}')">View</button>\`:'<span style="font-size:12px;color:var(--muted)">viewing</span>'}
      </div>
    </div>\`).join('');

  const diffSection = (draft && approved && draft.id !== approved.id) ? \`
    <div style="margin-top:28px">
      <div class="section-title" style="margin-bottom:12px">Changes in draft (v\${draft.version_number}) vs approved (v\${approved.version_number})</div>
      <div class="diff-legend">
        <span><div class="diff-dot-add"></div> Added</span>
        <span><div class="diff-dot-del"></div> Removed</span>
      </div>
      <div style="margin-bottom:20px">
        <div class="section-sub" style="margin-bottom:8px">Cultural notes</div>
        <div class="diff-wrap">\${diffText(approved.cultural_notes||'', draft.cultural_notes||'')}</div>
      </div>
    </div>\` : (draft && !approved ? \`
    <div style="margin-top:28px;padding:12px;background:#FFF8E0;border-radius:6px;font-size:13px;color:var(--muted)">
      This is the first version — no approved version to compare against.
    </div>\` : '');

  return list + diffSection;
}
async function loadVersion(versionId){
  try{currentVersion=await api('/versions/'+versionId);initWorkingData();activeTab='content';renderMain();}
  catch(e){toast('Failed: '+e.message,'error');}
}
async function loadAuditTrail(){
  try{
    const audit=await api('/traditions/'+currentTradition.id+'/audit');
    document.getElementById('tab-content').innerHTML=audit.length
      ?audit.map(a=>\`<div class="audit-item"><div class="audit-dot \${a.action}"></div><div><div class="audit-action">\${a.action.replace(/_/g,' ')}</div><div class="audit-meta">\${new Date(a.created_at).toLocaleString()}</div>\${a.notes?\`<div class="audit-notes">\${esc(a.notes)}</div>\`:''}</div></div>\`).join('')
      :'<div class="empty">No audit entries yet.</div>';
  }catch(e){document.getElementById('tab-content').innerHTML=\`<div class="empty">Failed: \${e.message}</div>\`;}
}
async function createEditingCopy(){
  try{
    const newV=await api('/traditions/'+currentTradition.id+'/draft','POST',{base:currentVersion});
    toast('Editing copy created (version '+newV.version_number+')','success');
    allVersions=await api('/traditions/'+currentTradition.id+'/versions');
    currentVersion=newV;initWorkingData();activeTab='content';renderMain();
  }catch(e){toast('Failed: '+e.message,'error');}
}
async function cancelEditing(){
  const ok = await showModal({ title:'Discard editing copy?', body:'All unsaved changes will be lost. The editing copy will be deleted and the live approved version will be restored.', confirmLabel:'Discard', confirmClass:'btn-danger' });
  if(!ok)return;
  try{
    await api('/versions/'+currentVersion.id+'/cancel','POST');
  }catch(e){}
  allVersions=await api('/traditions/'+currentTradition.id+'/versions');
  const approved=allVersions.find(v=>v.is_current&&v.status==='approved');
  currentVersion=approved||allVersions.find(v=>v.status!=='draft')||allVersions[allVersions.length-1]||null;
  initWorkingData();await loadTraditions();renderMain();
  toast('Editing copy discarded');
}
async function saveEdits(){
  const updates={
    avg_budget_low:parseFloat(workingData.avg_budget_low)||null,
    avg_budget_high:parseFloat(workingData.avg_budget_high)||null,
    budget_currency:workingData.budget_currency||'USD',
    typical_event_count:parseInt(workingData.typical_event_count)||null,
    cultural_notes:workingData.cultural_notes,
        lgbtq_notes:workingData.lgbtq_notes,
    sources:workingData.sources,
    review_notes:workingData.review_notes,
    checklist_template:workingData.checklist_template,
    ceremony_sequence:workingData.ceremony_sequence,
    vendor_categories:workingData.vendor_categories,
    budget_allocation:workingData.budget_allocation,
  };
  try{
    currentVersion=await api('/versions/'+currentVersion.id,'PATCH',updates);
    initWorkingData();toast('Changes saved','success');
    allVersions=await api('/traditions/'+currentTradition.id+'/versions');renderMain();
  }catch(e){toast('Save failed: '+e.message,'error');}
}
async function submitForReview(){
  try{currentVersion=await api('/versions/'+currentVersion.id+'/submit','POST');toast('Submitted for review');allVersions=await api('/traditions/'+currentTradition.id+'/versions');await loadTraditions();renderMain();}
  catch(e){toast('Failed: '+e.message,'error');}
}
async function approveVersion(){
  const notes = await showModal({ title:'Approve this version?', body:'This version will become live immediately. Add any notes for the audit trail (optional).', input:true, inputPlaceholder:'Approval notes (optional)', confirmLabel:'Approve', confirmClass:'btn-success' });
  if(notes === null)return;
  const finalNotes = notes || 'Approved via advisor review interface.';
  try{currentVersion=await api('/versions/'+currentVersion.id+'/approve','POST',{notes:finalNotes});toast('Version approved — now live','success');allVersions=await api('/traditions/'+currentTradition.id+'/versions');await loadTraditions();renderMain();}
  catch(e){toast('Failed: '+e.message,'error');}
}
async function rejectVersion(){
  const notes = await showModal({ title:'Return to draft?', body:'Please explain what needs to be changed. This note will appear in the audit trail.', input:true, inputPlaceholder:'Reason for rejection (required)', confirmLabel:'Return to draft', confirmClass:'btn-warning' });
  if(!notes)return;
  try{currentVersion=await api('/versions/'+currentVersion.id+'/reject','POST',{notes});toast('Returned to draft');allVersions=await api('/traditions/'+currentTradition.id+'/versions');renderMain();}
  catch(e){toast('Failed: '+e.message,'error');}
}
function setSide(item, role, checked) {
  var cur = item.side || 'both';
  if (role === 'both') {
    item.side = checked ? 'both' : 'bride';
  } else if (role === 'bride') {
    if (checked) {
      item.side = (cur === 'groom' || cur === 'bride+groom') ? 'bride+groom' : 'bride';
    } else {
      item.side = (cur === 'bride+groom') ? 'groom' : 'both';
    }
  } else if (role === 'groom') {
    if (checked) {
      item.side = (cur === 'bride' || cur === 'bride+groom') ? 'bride+groom' : 'groom';
    } else {
      item.side = (cur === 'bride+groom') ? 'bride' : 'both';
    }
  }
}
function toast(msg,type='default'){
  const el=document.getElementById('toast');
  const msgEl=document.getElementById('toast-msg');
  if(msgEl) msgEl.textContent=msg; else el.textContent=msg;
  el.className='toast visible'+(type==='error'?' error':type==='success'?' success':'');
  setTimeout(()=>el.className='toast',3000);
}
</script>
</body>
</html>
`;


// ── Routes: brand CSS (single source of truth) ──
app.get('/brand.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(BRAND_CSS);
});

// ── Routes: pages ──
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(LANDING_HTML);
});

// /questionnaire is served as a static file by Vercel (see vercel.json)
// This route is a fallback for local development only
const QUESTIONNAIRE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Marigold — Your wedding plan</title>
<link rel="stylesheet" href="/brand.css">
<style>
  html, body { height: 100%; overflow: hidden; }

  /* ── Progress bar ── */
  #progress-bar {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: var(--bdr);
    z-index: 200;
  }
  #progress-fill {
    height: 100%;
    background: var(--gd);
    transition: width 0.5s ease;
    width: 0%;
  }

  /* ── Screens ── */
  #screens {
    position: fixed;
    inset: 0;
    top: 62px;
    overflow: hidden;
  }
  #results-screen.active {
    position: fixed !important;
    inset: 0 !important;
    top: 62px !important;
    overflow-y: auto !important;
    z-index: 10 !important;
    display: block !important;
    padding: 32px 24px 80px !important;
  }

  .screen {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px 80px;
    opacity: 0;
    pointer-events: none;
    transform: translateX(50px);
    transition: opacity 0.35s ease, transform 0.35s ease;
  }
  .screen.active {
    opacity: 1;
    pointer-events: all;
    transform: translateX(0);
  }
  #q7.active, #q8.active { display: block !important; padding: 0 !important; }
  #q7-scroll::-webkit-scrollbar { width: 5px; }
  #q7-scroll::-webkit-scrollbar-track { background: var(--warm); border-radius: 3px; }
  #q7-scroll::-webkit-scrollbar-thumb { background: var(--bdr); border-radius: 3px; }
  #q7-scroll::-webkit-scrollbar-thumb:hover { background: var(--gd); }
  #q7-scroll { scrollbar-width: thin; scrollbar-color: var(--bdr) var(--warm); }
  /* Q7 and Q8 need block layout for internal scrolling */
  #q7.active, #q8.active {
    display: flex !important;
    flex-direction: column !important;
    padding: 0 !important;
  }
  .screen.exit-left {
    opacity: 0;
    transform: translateX(-50px);
    transition: opacity 0.25s ease, transform 0.25s ease;
  }

  /* ── Question layout ── */
  .q-wrap {
    width: 100%;
    max-width: 580px;
  }
  .q0-choice { display:flex; flex-direction:column; gap:16px; margin-top:32px; width:100%; }
  .q0-option { padding:20px 24px; border:1.5px solid var(--bdr); border-radius:12px; background:white; cursor:pointer; text-align:left; transition:all 0.2s; font-family:'Playfair Display',Georgia,serif; }
  .q0-option:hover { border-color:var(--gd); background:var(--warm); }
  .q0-option-title { font-size:16px; font-style:italic; color:var(--deep); margin-bottom:4px; }
  .q0-option-sub { font-size:12px; color:var(--muted); font-style:italic; }
  .q0-textarea { width:100%; min-height:120px; border:1px solid var(--bdr); border-radius:8px; padding:14px; font-size:14px; font-family:'Playfair Display',Georgia,serif; font-style:italic; color:var(--tx); background:var(--warm); outline:none; resize:vertical; transition:border-color 0.2s; margin-top:8px; box-sizing:border-box; }
  .q0-textarea:focus { border-color:var(--gd); }
  .q0-textarea::placeholder { color:var(--bdr); }
  .ql {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 8px;
  }
  .qt {
    font-size: clamp(20px, 3.5vw, 30px);
    line-height: 1.3;
    color: var(--deep);
    font-style: italic;
    font-weight: 400;
    margin-bottom: 6px;
  }
  .qt em { color: var(--gk); font-style: italic; }
  .qs {
    font-size: 13px;
    color: var(--muted);
    margin-bottom: 24px;
    font-style: normal;
    line-height: 1.6;
  }

  /* ── Inputs ── */
  .name-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 4px;
  }
  @media (max-width: 480px) { .name-row { grid-template-columns: 1fr; } }

  .field-group { display: flex; flex-direction: column; gap: 4px; }
  .field-label {
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted);
    font-style: normal;
    font-family: 'Playfair Display', serif;
  }

  .fi {
    width: 100%;
    border: none;
    border-bottom: 1px solid var(--bdr);
    padding: 10px 0;
    font-size: 18px;
    font-family: 'Playfair Display', Georgia, serif;
    font-style: italic;
    color: var(--tx);
    background: transparent;
    outline: none;
    transition: border-color 0.2s;
  }
  .fi:focus { border-bottom-color: var(--deep); }
  .fi::placeholder { color: var(--bdr); }
  input[type="date"].fi, input[type="date"] {
    font-style: normal;
    font-size: 15px;
    font-family: 'Playfair Display', Georgia, serif;
    color: var(--deep);
    -webkit-appearance: none;
    appearance: none;
  }
  input[type="date"]::-webkit-date-and-time-value { font-family: 'Playfair Display', Georgia, serif; }

  /* ── Option pills ── */
  .options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px; }
  .p {
    padding: 10px 20px;
    border-radius: 100px;
    border: 1px solid var(--bdr);
    font-size: 14px;
    color: var(--tx);
    cursor: pointer;
    background: #fff;
    font-family: 'Playfair Display', Georgia, serif;
    font-style: italic;
    transition: all 0.15s;
    text-align: left;
  }
  .p:hover { border-color: var(--gd); background: var(--warm); }
  .p.on { border-color: var(--gk); background: var(--g); color: var(--deep); font-weight: 500; }

  /* ── Tradition search ── */
  .trad-search {
    width: 100%;
    border: none;
    border-bottom: 1px solid var(--bdr);
    padding: 10px 0;
    font-size: 15px;
    font-family: 'Playfair Display', serif;
    font-style: italic;
    color: var(--tx);
    background: transparent;
    outline: none;
    margin-bottom: 16px;
    transition: border-color 0.2s;
  }
  .trad-search:focus { border-bottom-color: var(--deep); }
  .trad-search::placeholder { color: var(--bdr); }

  .trad-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    max-height: 240px;
    overflow-y: auto;
    padding-right: 4px;
  }
  .trad-grid::-webkit-scrollbar { width: 3px; }
  .trad-grid::-webkit-scrollbar-thumb { background: var(--bdr); border-radius: 2px; }

  .trad-chip {
    padding: 7px 16px;
    border-radius: 100px;
    border: 1px solid var(--bdr);
    font-size: 13px;
    font-family: 'Playfair Display', serif;
    font-style: italic;
    color: var(--tx);
    cursor: pointer;
    background: #fff;
    transition: all 0.15s;
  }
  .trad-chip:hover { border-color: var(--gd); background: var(--warm); }
  .trad-chip.on { border-color: var(--gk); background: var(--g); color: var(--deep); }
  .trad-note {
    font-size: 11px;
    color: var(--muted);
    font-style: italic;
    margin-top: 10px;
  }

  /* ── Budget ── */
  .budget-display {
    font-size: 44px;
    color: var(--deep);
    font-style: italic;
    letter-spacing: -1px;
    margin-bottom: 4px;
  }
  .budget-display sup { font-size: 22px; vertical-align: super; }
  input[type="range"] {
    width: 100%;
    margin: 14px 0 6px;
    accent-color: var(--gd);
    cursor: pointer;
  }
  .budget-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--muted);
    font-style: italic;
  }

  /* ── Guest stepper ── */
  .stepper {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 8px;
  }
  .stepper-btn {
    width: 44px; height: 44px;
    border-radius: 50%;
    border: 1px solid var(--bdr);
    background: #fff;
    font-size: 22px;
    cursor: pointer;
    color: var(--tx);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    font-family: 'Playfair Display', serif;
  }
  .stepper-btn:hover { border-color: var(--gd); background: var(--warm); }
  .stepper-count {
    font-size: 48px;
    color: var(--deep);
    font-style: italic;
    min-width: 80px;
    text-align: center;
    letter-spacing: -2px;
  }

  /* ── CTA ── */
  .cta-row { display: flex; align-items: center; gap: 20px; margin-top: 28px; }
  .cta {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 28px;
    background: var(--deep);
    color: var(--cream);
    border: none;
    border-radius: 100px;
    font-size: 12px;
    letter-spacing: 2px;
    cursor: pointer;
    font-family: 'Playfair Display', Georgia, serif;
    font-style: italic;
    transition: background 0.2s;
  }
  .cta:hover { background: var(--gk); }
  .cta:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-back {
    background: none;
    border: none;
    color: var(--muted);
    font-size: 12px;
    font-family: 'Playfair Display', Georgia, serif;
    font-style: italic;
    cursor: pointer;
    padding: 4px 0;
    letter-spacing: 0.3px;
    transition: color 0.15s;
  }
  .btn-back:hover { color: var(--deep); }
  /* ── Role assignment ── */
  .role-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:4px; }
  @media(max-width:480px){.role-row{grid-template-columns:1fr;}}
  .role-pair { display:flex; flex-direction:column; gap:8px; }
  .role-name { font-size:12px; color:var(--muted); font-style:italic; }
  .role-options { display:flex; gap:8px; }
  .role-btn {
    flex:1; padding:10px 0; border:1px solid var(--bdr); border-radius:100px;
    font-size:13px; font-family:'Playfair Display',serif; font-style:italic;
    color:var(--muted); background:white; cursor:pointer; transition:all 0.15s;
  }
  .role-btn:hover { border-color:var(--gd); color:var(--deep); }
  .role-btn.on { border-color:var(--gk); background:var(--g); color:var(--deep); font-weight:500; }

  /* ── Q4b tradition assignment ── */
  .trad-assign-row { display:flex; align-items:center; justify-content:space-between; padding:14px 0; border-bottom:1px solid var(--warm); }
  .trad-assign-row:last-child { border-bottom:none; }
  .trad-assign-name { font-size:14px; font-style:italic; color:var(--deep); }
  .trad-assign-btns { display:flex; gap:8px; }
  .assign-btn {
    padding:7px 16px; border:1px solid var(--bdr); border-radius:100px;
    font-size:12px; font-family:'Playfair Display',serif; font-style:italic;
    color:var(--muted); background:white; cursor:pointer; transition:all 0.15s;
  }
  .assign-btn:hover { border-color:var(--gd); color:var(--deep); }
  .assign-btn.on { border-color:var(--gk); background:var(--g); color:var(--deep); }

  /* ── Role custom dropdown ── */
  .role-sentences { display:flex; flex-direction:column; gap:16px; }
  .role-sentence { display:flex; align-items:baseline; gap:6px; flex-wrap:wrap; }
  .role-sentence-name { font-size:15px; font-style:italic; color:var(--deep); font-family:'Playfair Display',Georgia,serif; }
  .role-sentence-is { font-size:14px; color:var(--muted); font-style:italic; font-family:'Playfair Display',Georgia,serif; }
  .role-dropdown { position:relative; display:inline-block; }
  .role-dd-value { font-size:15px; font-style:italic; font-family:'Playfair Display',Georgia,serif; color:var(--deep); border-bottom:1.5px solid var(--gd); padding:2px 4px; cursor:pointer; user-select:none; }
  .role-dd-value:hover { color:var(--gk); }
  .role-dd-menu { display:none; position:absolute; top:calc(100% + 4px); left:0; background:white; border:1px solid var(--bdr); border-radius:8px; box-shadow:0 4px 16px rgba(60,48,16,0.08); z-index:50; min-width:100px; overflow:hidden; }
  .role-dd-menu.open { display:block; }
  .role-dd-menu div { padding:8px 14px; font-size:14px; font-style:italic; font-family:'Playfair Display',Georgia,serif; color:var(--deep); cursor:pointer; }
  .role-dd-menu div:hover { background:var(--warm); }
  .back-link {
    background: none;
    border: none;
    color: var(--muted);
    font-size: 11px;
    letter-spacing: 1px;
    cursor: pointer;
    font-family: 'Playfair Display', Georgia, serif;
    font-style: italic;
    text-decoration: underline;
  }

  /* ── Error ── */
  .err {
    font-size: 12px;
    color: #a04a1a;
    font-style: italic;
    margin-top: 8px;
    display: none;
  }
  .err.show { display: block; }

  /* ── Loading ── */
  #loading-screen {
    gap: 20px;
  }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .marigold-spin { animation: spin 2.5s linear infinite; }
  .loading-text { font-size: 18px; font-style: italic; color: var(--muted); }
  .loading-sub { font-size: 12px; color: var(--muted); font-style: italic; letter-spacing: 0.3px; }

  /* ── Results ── */
  #results-screen {
    overflow-y: auto;
    padding: 32px 24px 80px;
    align-items: flex-start;
    justify-content: flex-start;
    top: 57px;
  }
  #results-screen.active {
    position: fixed;
    inset: 0;
    top: 62px;
    overflow-y: auto;
    opacity: 1;
    transform: none;
    z-index: 10;
  }
  .results-wrap { width: 100%; max-width: 720px; margin: 0 auto; }
  .results-hero { margin-bottom: 40px; }
  .results-hero h1 {
    font-size: clamp(22px, 4vw, 36px);
    font-weight: 400;
    font-style: italic;
    color: var(--deep);
    line-height: 1.2;
    margin-bottom: 8px;
  }
  .results-hero h1 em { color: var(--gk); }
  .results-hero p { font-size: 13px; color: var(--muted); font-style: italic; }

  .out-tabs {
    display: flex;
    border-bottom: 1px solid var(--bdr);
    margin-bottom: 32px;
    overflow-x: auto;
  }
  .out-tab {
    padding: 10px 0;
    margin-right: 24px;
    font-size: 11px;
    letter-spacing: 1.5px;
    color: var(--muted);
    cursor: pointer;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    font-family: 'Playfair Display', serif;
    font-style: italic;
    transition: all 0.2s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .out-tab:hover { color: var(--deep); }
  .out-tab.on { color: var(--deep); border-bottom-color: var(--deep); }

  .tab-panel { display: none; }
  .tab-panel.on { display: block; }

  /* ── Checklist ── */
  .out-ey {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .out-ey::after { content: ''; flex: 1; height: 1px; background: var(--bdr); }

  .checklist-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 11px 0;
    border-bottom: 1px solid var(--warm);
  }
  .checklist-item:last-child { border-bottom: none; }
  .check-box {
    width: 18px; height: 18px;
    border: 1px solid var(--bdr);
    border-radius: 3px;
    flex-shrink: 0;
    margin-top: 3px;
    cursor: pointer;
    transition: all 0.15s;
    background: #fff;
  }
  .check-box:hover { border-color: var(--gd); }
  .check-box.checked { background: var(--deep); border-color: var(--deep); }
  .check-label {
    font-size: 14px;
    color: var(--tx);
    font-style: normal;
    line-height: 1.5;
    font-family: 'Playfair Display', serif;
  }
  .trad-tag {
    display: inline-block;
    font-size: 10px;
    padding: 1px 8px;
    border-radius: 100px;
    margin-left: 6px;
    font-style: italic;
    vertical-align: middle;
    border: 1px solid var(--bdr);
    color: var(--muted);
    background: var(--warm);
  }

  /* ── Vertical ceremony timeline ── */
  .ceremony-timeline { position: relative; padding-left: 28px; }
  .ceremony-timeline::before {
    content: '';
    position: absolute;
    left: 9px; top: 8px; bottom: 8px;
    width: 1px;
    background: var(--bdr);
  }
  .ceremony-card {
    position: relative;
    margin-bottom: 0;
    cursor: pointer;
  }
  .ceremony-dot {
    position: absolute;
    left: -24px;
    top: 20px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--cream);
    flex-shrink: 0;
    z-index: 1;
    transition: transform 0.2s;
  }
  .ceremony-card:hover .ceremony-dot { transform: scale(1.3); }
  .ceremony-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 0 14px 0;
    border-bottom: 1px solid var(--warm);
  }
  .ceremony-card.open .ceremony-header { border-bottom-color: transparent; }
  .ceremony-meta-wrap { flex: 1; }
  .ceremony-trad-tag {
    display: inline-block;
    font-size: 10px;
    letter-spacing: 0.5px;
    padding: 2px 10px;
    border-radius: 100px;
    font-style: italic;
    margin-bottom: 4px;
  }
  .ceremony-name {
    font-size: 15px;
    color: var(--deep);
    font-style: italic;
    line-height: 1.3;
    margin-bottom: 3px;
  }
  .ceremony-timing {
    font-size: 12px;
    color: var(--muted);
    font-style: italic;
  }
  .ceremony-toggle {
    font-size: 18px;
    color: var(--muted);
    transition: transform 0.25s;
    flex-shrink: 0;
    margin-top: 2px;
    user-select: none;
  }
  .ceremony-card.open .ceremony-toggle { transform: rotate(90deg); }
  .ceremony-body {
    display: none;
    padding: 0 0 16px 0;
    border-bottom: 1px solid var(--warm);
  }
  .ceremony-card.open .ceremony-body { display: block; }
  .ceremony-detail { font-size: 13px; color: var(--tx); line-height: 1.7; font-style: normal; }
  .ceremony-detail-row {
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: 4px 12px;
    margin-bottom: 6px;
    font-size: 12px;
  }
  .ceremony-detail-label { color: var(--muted); font-style: italic; }
  .ceremony-detail-val { color: var(--tx); }
  .ceremony-notes {
    font-size: 12px;
    color: var(--muted);
    font-style: italic;
    line-height: 1.6;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--warm);
  }
  .ceremony-include {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    font-size: 12px;
    color: var(--muted);
    font-style: italic;
  }
  .ceremony-include input { accent-color: var(--gd); }

  /* ── Ceremony selection page ── */
  .ceremony-selection-wrap { width:100%; max-width:860px; margin:0 auto; }
  .cs-tradition-block { margin-bottom:40px; }
  .cs-tradition-label { font-size:11px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin-bottom:16px; padding-bottom:10px; border-bottom:1px solid var(--bdr); font-style:italic; }
  .cs-cols { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
  @media(max-width:580px){ .cs-cols { grid-template-columns:1fr; } }
  .cs-col-header { font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--deep); margin-bottom:10px; font-style:italic; font-weight:500; }
  .cs-item { display:flex; align-items:flex-start; gap:10px; padding:10px 12px; border:1px solid var(--bdr); border-radius:8px; margin-bottom:8px; cursor:pointer; transition:all 0.15s; background:white; }
  .cs-item:hover { border-color:var(--gd); }
  .cs-item.selected { border-color:var(--gk); background:#FFFAEA; }
  .cs-item.deselected { opacity:0.4; }
  .cs-check { width:18px; height:18px; border:1.5px solid var(--bdr); border-radius:4px; flex-shrink:0; margin-top:2px; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
  .cs-item.selected .cs-check { background:var(--deep); border-color:var(--deep); }
  .cs-check-tick { color:white; font-size:11px; display:none; }
  .cs-item.selected .cs-check-tick { display:block; }
  .cs-item-name { font-size:13px; color:var(--tx); font-style:italic; line-height:1.4; }
  .cs-item-timing { font-size:11px; color:var(--muted); font-style:italic; margin-top:2px; }
  .cs-shared-label { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin:20px 0 10px; font-style:italic; display:flex; align-items:center; gap:8px; }
  .cs-shared-label::after { content:''; flex:1; height:1px; background:var(--bdr); }
  .cs-shared-cols { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
  @media(max-width:580px){ .cs-shared-cols { grid-template-columns:1fr; } }

  /* ── Confirmation page ── */
  .conf-wrap { width:100%; max-width:720px; margin:0 auto; }
  .conf-block { margin-bottom:32px; }
  .conf-trad-header { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid var(--bdr); font-style:italic; }
  .conf-cols { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:12px; }
  @media(max-width:580px){ .conf-cols { grid-template-columns:1fr; } }
  .conf-col-header { font-size:11px; color:var(--deep); font-style:italic; font-weight:500; margin-bottom:8px; }
  .conf-item { font-size:13px; color:var(--tx); font-style:italic; padding:6px 0; border-bottom:1px solid var(--warm); line-height:1.4; }
  .conf-item:last-child { border-bottom:none; }
  .conf-item-timing { font-size:11px; color:var(--muted); }
  .conf-shared-header { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin:16px 0 10px; font-style:italic; }
  .conf-budget { background:var(--warm); border-radius:10px; padding:20px 24px; margin-top:28px; }
  .conf-budget-total { font-size:28px; font-style:italic; color:var(--deep); margin-bottom:4px; }
  .conf-budget-sub { font-size:12px; color:var(--muted); font-style:italic; margin-bottom:16px; }
  .conf-budget-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
  .conf-budget-cat { font-size:12px; color:var(--tx); width:150px; flex-shrink:0; font-style:italic; }
  .conf-budget-track { flex:1; background:var(--bdr); border-radius:2px; height:5px; }
  .conf-budget-fill { height:100%; background:var(--gd); border-radius:2px; }
  .conf-budget-amt { font-size:12px; color:var(--muted); min-width:65px; text-align:right; font-style:italic; }

  /* ── Ceremony selection page ── */
  .cs-tradition-block { margin-bottom:40px; }
  .cs-tradition-label { font-size:11px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin-bottom:16px; padding-bottom:10px; border-bottom:1px solid var(--bdr); font-style:italic; }
  .cs-cols { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
  @media(max-width:580px){ .cs-cols { grid-template-columns:1fr; } }
  .cs-col-header { font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--deep); margin-bottom:10px; font-style:italic; font-weight:500; }
  .cs-item { display:flex; align-items:flex-start; gap:10px; padding:10px 12px; border:1px solid var(--bdr); border-radius:8px; margin-bottom:8px; cursor:pointer; transition:all 0.15s; background:white; }
  .cs-item:hover { border-color:var(--gd); }
  .cs-item.selected { border-color:var(--gk); background:#FFFAEA; }
  .cs-item.deselected { opacity:0.4; }
  .cs-check { width:18px; height:18px; border:1.5px solid var(--bdr); border-radius:4px; flex-shrink:0; margin-top:2px; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
  .cs-item.selected .cs-check { background:var(--deep); border-color:var(--deep); }
  .cs-check-tick { color:white; font-size:11px; display:none; }
  .cs-item.selected .cs-check-tick { display:block; }
  .cs-item-name { font-size:13px; color:var(--tx); font-style:italic; line-height:1.4; }
  .cs-item-timing { font-size:11px; color:var(--muted); font-style:italic; margin-top:2px; }
  .cs-shared-label { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin:20px 0 10px; font-style:italic; display:flex; align-items:center; gap:8px; }
  .cs-shared-label::after { content:''; flex:1; height:1px; background:var(--bdr); }
  .cs-shared-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  @media(max-width:580px){ .cs-shared-grid { grid-template-columns:1fr; } }
  /* ── Confirmation page ── */
  .conf-block { margin-bottom:32px; }
  .conf-trad-header { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid var(--bdr); font-style:italic; }
  .conf-cols { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:12px; }
  @media(max-width:580px){ .conf-cols { grid-template-columns:1fr; } }
  .conf-col-header { font-size:11px; color:var(--deep); font-style:italic; font-weight:500; margin-bottom:8px; }
  .conf-item { font-size:13px; color:var(--tx); font-style:italic; padding:6px 0; border-bottom:1px solid var(--warm); line-height:1.4; }
  .conf-item:last-child { border-bottom:none; }
  .conf-item-timing { font-size:11px; color:var(--muted); }
  .conf-shared-header { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin:16px 0 10px; font-style:italic; }
  .conf-budget { background:var(--warm); border-radius:10px; padding:20px 24px; margin-top:28px; }
  .conf-budget-total { font-size:28px; font-style:italic; color:var(--deep); margin-bottom:4px; letter-spacing:-1px; }
  .conf-budget-sub { font-size:12px; color:var(--muted); font-style:italic; margin-bottom:16px; }
  .conf-budget-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
  .conf-budget-cat { font-size:12px; color:var(--tx); width:150px; flex-shrink:0; font-style:italic; }
  .conf-budget-track { flex:1; background:var(--bdr); border-radius:2px; height:5px; }
  .conf-budget-fill { height:100%; background:var(--gd); border-radius:2px; }
  .conf-budget-amt { font-size:12px; color:var(--muted); min-width:65px; text-align:right; font-style:italic; }

  /* ── Ceremony card move/copy menu ── */
  .cs-item { position: relative; }
  .cs-item-menu-btn {
    position: absolute; top: 8px; right: 8px;
    background: none; border: none; cursor: pointer;
    font-size: 16px; color: var(--muted); padding: 2px 6px;
    border-radius: 4px; line-height: 1; opacity: 0;
    transition: opacity 0.15s;
  }
  .cs-item:hover .cs-item-menu-btn { opacity: 1; }
  .cs-item-menu-btn:focus { opacity: 1; outline: none; }
  .cs-item-popover {
    display: none; position: absolute; top: 28px; right: 4px;
    background: white; border: 1px solid var(--bdr);
    border-radius: 8px; box-shadow: 0 4px 16px rgba(60,48,16,0.12);
    z-index: 50; min-width: 160px; overflow: hidden;
  }
  .cs-item-popover.open { display: block; }
  .cs-popover-item {
    padding: 9px 14px; font-size: 12px; font-style: italic;
    font-family: 'Playfair Display', Georgia, serif;
    color: var(--tx); cursor: pointer; display: block;
    border: none; background: none; width: 100%; text-align: left;
    transition: background 0.1s;
  }
  .cs-popover-item:hover { background: var(--warm); }
  .cs-popover-divider { height: 1px; background: var(--bdr); margin: 2px 0; }

  /* ── Budget three sections ── */
  .budget-section { margin-bottom: 24px; }
  .budget-section-header {
    font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--muted); font-style: italic; margin-bottom: 12px;
    padding-bottom: 8px; border-bottom: 1px solid var(--bdr);
  }
  .budget-section-total {
    font-size: 20px; font-style: italic; color: var(--deep);
    margin-bottom: 10px; letter-spacing: -0.5px;
  }

    /* ── Ceremony card move/copy menu ── */
  .cs-item { position: relative; }
  .cs-item-menu-btn { position:absolute;top:8px;right:8px;background:none;border:none;cursor:pointer;font-size:16px;color:var(--muted);padding:2px 6px;border-radius:4px;line-height:1;opacity:0;transition:opacity 0.15s; }
  .cs-item:hover .cs-item-menu-btn, .cs-item-menu-btn:focus { opacity:1;outline:none; }
  .cs-item-popover { display:none;position:absolute;top:28px;right:4px;background:white;border:1px solid var(--bdr);border-radius:8px;box-shadow:0 4px 16px rgba(60,48,16,0.12);z-index:50;min-width:160px;overflow:hidden; }
  .cs-item-popover.open { display:block; }
  .cs-popover-item { padding:9px 14px;font-size:12px;font-style:italic;font-family:'Playfair Display',Georgia,serif;color:var(--tx);cursor:pointer;display:block;border:none;background:none;width:100%;text-align:left; }
  .cs-popover-item:hover { background:var(--warm); }
  .cs-popover-divider { height:1px;background:var(--bdr);margin:2px 0; }
  /* ── Budget three sections ── */
  .budget-section { margin-bottom:24px; }
  .budget-section-header { font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);font-style:italic;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--bdr); }
  .budget-section-total { font-size:20px;font-style:italic;color:var(--deep);margin-bottom:10px;letter-spacing:-0.5px; }

  /* ── Ceremony card menu ── */
  .cs-item { position:relative; }
  .cs-item-menu-btn { position:absolute;top:8px;right:8px;background:none;border:none;cursor:pointer;font-size:16px;color:var(--muted);padding:2px 6px;border-radius:4px;line-height:1;opacity:0;transition:opacity 0.15s; }
  .cs-item:hover .cs-item-menu-btn, .cs-item-menu-btn:focus { opacity:1;outline:none; }
  .cs-item-popover { display:none;position:absolute;top:28px;right:4px;background:white;border:1px solid var(--bdr);border-radius:8px;box-shadow:0 4px 16px rgba(60,48,16,0.12);z-index:50;min-width:160px;overflow:hidden; }
  .cs-item-popover.open { display:block; }
  .cs-popover-item { padding:9px 14px;font-size:12px;font-style:italic;font-family:'Playfair Display',Georgia,serif;color:var(--tx);cursor:pointer;display:block;border:none;background:none;width:100%;text-align:left; }
  .cs-popover-item:hover { background:var(--warm); }
  .cs-popover-divider { height:1px;background:var(--bdr);margin:2px 0; }
  /* ── Budget three sections ── */
  .budget-section { margin-bottom:24px; }
  .budget-section-header { font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);font-style:italic;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--bdr); }
  .budget-section-total { font-size:20px;font-style:italic;color:var(--deep);margin-bottom:10px; }

  /* ── Two-column layout (ceremonies + checklist) ── */
  .ceremony-cols, .checklist-cols { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px; }
  @media(max-width:600px){ .ceremony-cols, .checklist-cols { grid-template-columns:1fr; } }
  .ceremony-col-header { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid var(--bdr); font-style:italic; }
  .ceremony-shared-header { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin:20px 0 12px; padding-bottom:8px; border-bottom:1px solid var(--bdr); font-style:italic; }

  /* ── Ceremony selection page ── */
  .ceremony-selection-wrap { width:100%; max-width:860px; margin:0 auto; }
  .cs-tradition-block { margin-bottom:40px; }
  .cs-tradition-label { font-size:11px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin-bottom:16px; padding-bottom:10px; border-bottom:1px solid var(--bdr); font-style:italic; }
  .cs-cols { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
  @media(max-width:580px){ .cs-cols { grid-template-columns:1fr; } }
  .cs-col-header { font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--deep); margin-bottom:10px; font-style:italic; font-weight:500; }
  .cs-item { display:flex; align-items:flex-start; gap:10px; padding:10px 12px; border:1px solid var(--bdr); border-radius:8px; margin-bottom:8px; cursor:pointer; transition:all 0.15s; background:white; }
  .cs-item:hover { border-color:var(--gd); }
  .cs-item.selected { border-color:var(--gk); background:#FFFAEA; }
  .cs-item.deselected { opacity:0.4; }
  .cs-check { width:18px; height:18px; border:1.5px solid var(--bdr); border-radius:4px; flex-shrink:0; margin-top:2px; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
  .cs-item.selected .cs-check { background:var(--deep); border-color:var(--deep); }
  .cs-check-tick { color:white; font-size:11px; display:none; }
  .cs-item.selected .cs-check-tick { display:block; }
  .cs-item-name { font-size:13px; color:var(--tx); font-style:italic; line-height:1.4; }
  .cs-item-timing { font-size:11px; color:var(--muted); font-style:italic; margin-top:2px; }
  .cs-shared-label { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin:20px 0 10px; font-style:italic; display:flex; align-items:center; gap:8px; }
  .cs-shared-label::after { content:''; flex:1; height:1px; background:var(--bdr); }
  .cs-shared-cols { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
  @media(max-width:580px){ .cs-shared-cols { grid-template-columns:1fr; } }

  /* ── Confirmation page ── */
  .conf-wrap { width:100%; max-width:720px; margin:0 auto; }
  .conf-block { margin-bottom:32px; }
  .conf-trad-header { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid var(--bdr); font-style:italic; }
  .conf-cols { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:12px; }
  @media(max-width:580px){ .conf-cols { grid-template-columns:1fr; } }
  .conf-col-header { font-size:11px; color:var(--deep); font-style:italic; font-weight:500; margin-bottom:8px; }
  .conf-item { font-size:13px; color:var(--tx); font-style:italic; padding:6px 0; border-bottom:1px solid var(--warm); line-height:1.4; }
  .conf-item:last-child { border-bottom:none; }
  .conf-item-timing { font-size:11px; color:var(--muted); }
  .conf-shared-header { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin:16px 0 10px; font-style:italic; }
  .conf-budget { background:var(--warm); border-radius:10px; padding:20px 24px; margin-top:28px; }
  .conf-budget-total { font-size:28px; font-style:italic; color:var(--deep); margin-bottom:4px; }
  .conf-budget-sub { font-size:12px; color:var(--muted); font-style:italic; margin-bottom:16px; }
  .conf-budget-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
  .conf-budget-cat { font-size:12px; color:var(--tx); width:150px; flex-shrink:0; font-style:italic; }
  .conf-budget-track { flex:1; background:var(--bdr); border-radius:2px; height:5px; }
  .conf-budget-fill { height:100%; background:var(--gd); border-radius:2px; }
  .conf-budget-amt { font-size:12px; color:var(--muted); min-width:65px; text-align:right; font-style:italic; }

  /* ── Ceremony card move/copy menu ── */
  .cs-item { position: relative; }
  .cs-item-menu-btn {
    position: absolute; top: 8px; right: 8px;
    background: none; border: none; cursor: pointer;
    font-size: 16px; color: var(--muted); padding: 2px 6px;
    border-radius: 4px; line-height: 1; opacity: 0;
    transition: opacity 0.15s;
  }
  .cs-item:hover .cs-item-menu-btn { opacity: 1; }
  .cs-item-menu-btn:focus { opacity: 1; outline: none; }
  .cs-item-popover {
    display: none; position: absolute; top: 28px; right: 4px;
    background: white; border: 1px solid var(--bdr);
    border-radius: 8px; box-shadow: 0 4px 16px rgba(60,48,16,0.12);
    z-index: 50; min-width: 160px; overflow: hidden;
  }
  .cs-item-popover.open { display: block; }
  .cs-popover-item {
    padding: 9px 14px; font-size: 12px; font-style: italic;
    font-family: 'Playfair Display', Georgia, serif;
    color: var(--tx); cursor: pointer; display: block;
    border: none; background: none; width: 100%; text-align: left;
    transition: background 0.1s;
  }
  .cs-popover-item:hover { background: var(--warm); }
  .cs-popover-divider { height: 1px; background: var(--bdr); margin: 2px 0; }

  /* ── Budget three sections ── */
  .budget-section { margin-bottom: 24px; }
  .budget-section-header {
    font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--muted); font-style: italic; margin-bottom: 12px;
    padding-bottom: 8px; border-bottom: 1px solid var(--bdr);
  }
  .budget-section-total {
    font-size: 20px; font-style: italic; color: var(--deep);
    margin-bottom: 10px; letter-spacing: -0.5px;
  }

  /* ── Ceremony card menu ── */
  .cs-item { position:relative; }
  .cs-item-menu-btn { position:absolute;top:8px;right:8px;background:none;border:none;cursor:pointer;font-size:16px;color:var(--muted);padding:2px 6px;border-radius:4px;line-height:1;opacity:0;transition:opacity 0.15s; }
  .cs-item:hover .cs-item-menu-btn, .cs-item-menu-btn:focus { opacity:1;outline:none; }
  .cs-item-popover { display:none;position:absolute;top:28px;right:4px;background:white;border:1px solid var(--bdr);border-radius:8px;box-shadow:0 4px 16px rgba(60,48,16,0.12);z-index:50;min-width:160px;overflow:hidden; }
  .cs-item-popover.open { display:block; }
  .cs-popover-item { padding:9px 14px;font-size:12px;font-style:italic;font-family:'Playfair Display',Georgia,serif;color:var(--tx);cursor:pointer;display:block;border:none;background:none;width:100%;text-align:left; }
  .cs-popover-item:hover { background:var(--warm); }
  .cs-popover-divider { height:1px;background:var(--bdr);margin:2px 0; }
  /* ── Budget three sections ── */
  .budget-section { margin-bottom:24px; }
  .budget-section-header { font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);font-style:italic;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--bdr); }
  .budget-section-total { font-size:20px;font-style:italic;color:var(--deep);margin-bottom:10px; }

  /* ── Two-column layout (ceremonies + checklist) ── */
  .ceremony-cols, .checklist-cols { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px; }
  @media(max-width:600px){ .ceremony-cols, .checklist-cols { grid-template-columns:1fr; } }
  .ceremony-col-header { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid var(--bdr); font-style:italic; }
  .ceremony-shared-header { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin:20px 0 12px; padding-bottom:8px; border-bottom:1px solid var(--bdr); font-style:italic; }

  
  /* ── Budget ── */
  .budget-total-display {
    font-size: 32px;
    font-style: italic;
    color: var(--deep);
    margin-bottom: 4px;
    letter-spacing: -1px;
  }
  .budget-sub { font-size: 13px; color: var(--muted); font-style: italic; margin-bottom: 28px; }
  .budget-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }
  .budget-cat { font-size: 13px; color: var(--tx); width: 160px; flex-shrink: 0; font-style: italic; }
  .budget-track { flex: 1; background: var(--warm); border-radius: 2px; height: 6px; overflow: hidden; }
  .budget-fill { height: 100%; background: var(--gd); border-radius: 2px; }
  .budget-amt { font-size: 13px; color: var(--muted); min-width: 70px; text-align: right; font-style: italic; }

  /* ── Conflict banner ── */
  .conflict-banner {
    background: var(--warm);
    border-left: 3px solid var(--gd);
    padding: 10px 14px;
    margin-bottom: 12px;
    font-size: 12px;
    font-style: italic;
    color: var(--deep);
    line-height: 1.6;
    border-radius: 0 6px 6px 0;
  }
</style>
</head>
<body>

<div id="progress-bar"><div id="progress-fill"></div></div>

<div id="header">
  <a class="brand" href="/" title="Back to Marigold">
    <svg class="flower-mark" width="22" height="22" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
      <g fill="#E0B030" stroke="#C8941A" stroke-width="0.4">
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(0 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(25.7 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(51.4 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(77.1 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(102.8 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(128.5 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(154.2 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(180 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(205.7 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(231.4 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(257.1 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(282.8 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(308.5 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(334.2 17 17)"/>
      </g>
      <g fill="#F2C53D" stroke="#D9A828" stroke-width="0.35">
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(12.9 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(38.6 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(64.3 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(90 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(115.7 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(141.4 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(167.1 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(192.8 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(218.5 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(244.2 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(270 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(295.7 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(321.4 17 17)"/>
        <ellipse cx="17" cy="7.8" rx="1.55" ry="3.4" transform="rotate(347.1 17 17)"/>
      </g>
      <g fill="#F7D44C" stroke="#E0B030" stroke-width="0.3">
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(0 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(20 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(40 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(60 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(80 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(100 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(120 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(140 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(160 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(180 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(200 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(220 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(240 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(260 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(280 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(300 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(320 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(340 17 17)"/>
      </g>
      <circle cx="17" cy="17" r="4.1" fill="#6B5318" stroke="#5A4512" stroke-width="0.3"/>
      <circle cx="15.5" cy="15.8" r="0.45" fill="#3C3010"/>
      <circle cx="18.5" cy="15.8" r="0.45" fill="#3C3010"/>
      <circle cx="17" cy="18.4" r="0.45" fill="#3C3010"/>
    </svg>
    <span class="bname">marigold</span>
  </a>
  <div id="header-right">
    <span id="step-indicator"></span>
  </div>
</div>

<div id="screens">

  <!-- Q0: Entry choice -->
  <div class="screen active" id="q0">
    <div class="q-wrap">
      <div id="q0-flower" style="margin-bottom:20px"></div>
      <div class="ql">Welcome</div>
      <div class="qt">Let's plan your wedding</div>
      <div class="qs" style="margin-bottom:32px">Tell us about your wedding in your own words, or step through a few quick questions.</div>
      <div class="q0-choice">
        <button class="q0-option" onclick="showParagraphEntry()">
          <div class="q0-option-title">&#9998;&nbsp;&nbsp;Write a few sentences</div>
          <div class="q0-option-sub">Tell us about your wedding &mdash; we'll pick up the details and only ask what's missing</div>
        </button>
        <button class="q0-option" onclick="startQuestionnaire()">
          <div class="q0-option-title">&#128172;&nbsp;&nbsp;Answer a few questions</div>
          <div class="q0-option-sub">Step by step &mdash; takes about 2 minutes</div>
        </button>
      </div>
    </div>
  </div>

  <!-- Q0b: Paragraph entry -->
  <div class="screen" id="q0b">
    <div class="q-wrap">
      <div class="ql">Your wedding</div>
      <div class="qt">Tell us about your wedding</div>
      <div class="qs" style="margin-bottom:20px">Write a sentence or two &mdash; names, traditions, where and when, budget, guests.</div>
      <textarea class="q0-textarea" id="wedding-paragraph"
        placeholder="e.g. Priya and James are having a Hindu-Jewish wedding in New Jersey in October 2026, around $80,000 and 150 guests..."
        oninput="var btn=document.getElementById('q0b-btn');if(btn)btn.disabled=this.value.trim().length<5;"
        style="width:100%"
      ></textarea>
      <div class="err" id="err-q0b">Please write a few words about your wedding.</div>
      <div class="cta-row" style="margin-top:24px">
        <button class="btn-back" onclick="transitionTo('q0b','q0');currentQ=0;updateProgress();">&larr; back</button>
        <button class="cta" id="q0b-btn" onclick="parseParagraph()" disabled>Build my plan &rarr;</button>
      </div>
    </div>
  </div>

  <!-- Q1: Names + roles -->
  <div class="screen" id="q1">
    <div class="q-wrap">
      <div class="ql">Let's begin</div>
      <div class="qt">What are your names?</div>
      <div class="qs">We'll use these throughout your plan — and to personalise your ceremony plan.</div>
      <div class="name-row">
        <div class="field-group">
          <label class="field-label">Partner one</label>
          <input type="text" class="fi" id="name1" placeholder="e.g. Priya" autocomplete="given-name" autofocus oninput="updateRoleLabels();updateQ1Continue();">
        </div>
        <div class="field-group">
          <label class="field-label">Partner two</label>
          <input type="text" class="fi" id="name2" placeholder="e.g. James" autocomplete="given-name" oninput="updateRoleLabels();updateQ1Continue();">
        </div>
      </div>
      <div style="margin-top:28px">
        <div class="ql" style="margin-bottom:16px">How do you refer to each other?</div>
        <div class="role-sentences">
          <div class="role-sentence">
            <span class="role-sentence-name" id="role-name1">Partner one</span>
            <span class="role-sentence-is">&nbsp;is the&nbsp;</span>
            <span class="role-dropdown" id="role-dd1">
              <span class="role-dd-value" id="role-val1" onclick="toggleRoleDD(1,event)">Select &#9662;</span>
              <div class="role-dd-menu" id="role-menu1">
                <div onclick="pickRole(1,'partner',event)">Partner</div>
                <div onclick="pickRole(1,'bride',event)">Bride</div>
                <div onclick="pickRole(1,'groom',event)">Groom</div>
              </div>
            </span>
          </div>
          <div class="role-sentence">
            <span class="role-sentence-name" id="role-name2">Partner two</span>
            <span class="role-sentence-is">&nbsp;is the&nbsp;</span>
            <span class="role-dropdown" id="role-dd2">
              <span class="role-dd-value" id="role-val2" onclick="toggleRoleDD(2,event)">Select &#9662;</span>
              <div class="role-dd-menu" id="role-menu2">
                <div onclick="pickRole(2,'partner',event)">Partner</div>
                <div onclick="pickRole(2,'bride',event)">Bride</div>
                <div onclick="pickRole(2,'groom',event)">Groom</div>
              </div>
            </span>
          </div>
        </div>
      </div>
      <div class="err" id="err-q1">Please enter both names to continue.</div>
      <div class="cta-row">
        <button class="cta" id="q1-continue" onclick="goNext(1)" disabled>Continue</button>
      </div>
    </div>
  </div>

  <!-- Q2: Date -->
  <div class="screen" id="q2">
    <div class="q-wrap">
      <div class="ql">Your wedding</div>
      <div class="qt" id="q2-text">When is the wedding?</div>
      <div class="qs">Pick a date or tick "not decided yet" — either works.</div>
      <input type="date" class="fi" id="wedding-date" 
        style="max-width:280px;font-family:'Playfair Display',Georgia,serif;font-style:italic;color:var(--deep);" 
        onchange="onDateChange()">
      <div style="margin-top:14px;display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="date-undecided" style="accent-color:var(--gd);width:16px;height:16px;cursor:pointer" onchange="onDateUndecided()">
        <label for="date-undecided" style="font-size:13px;color:var(--muted);font-style:italic;cursor:pointer">Not decided yet</label>
      </div>
      <div class="cta-row">
        <button class="btn-back" onclick="goBack()">← back</button>
        <button class="cta" id="q2-continue" onclick="goNext(2)" disabled>Continue</button>
      </div>
    </div>
  </div>

  <!-- Q3: Location -->
  <div class="screen" id="q3">
    <div class="q-wrap">
      <div class="ql">Where</div>
      <div class="qt" id="q3-text">Where are you getting married?</div>
      <div class="qs">City and state or country — or tick "not decided yet".</div>
      <input type="text" class="fi" id="location" placeholder="e.g. New Jersey, US" style="max-width:380px" oninput="onLocationChange()">
      <div style="margin-top:14px;display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="location-undecided" style="accent-color:var(--gd);width:16px;height:16px;cursor:pointer" onchange="onLocationUndecided()">
        <label for="location-undecided" style="font-size:13px;color:var(--muted);font-style:italic;cursor:pointer">Not decided yet</label>
      </div>
      <div class="cta-row">
        <button class="btn-back" onclick="goBack()">← back</button>
        <button class="cta" id="q3-continue" onclick="goNext(3)" disabled>Continue</button>
      </div>
    </div>
  </div>

  <!-- Q4: Traditions -->
  <div class="screen" id="q4">
    <div class="q-wrap">
      <div class="ql">Traditions</div>
      <div class="qt" id="q4-text">Which traditions will your wedding honour?</div>
      <div class="qs">Select up to two. If yours isn't listed, choose the closest.</div>
      <input type="text" class="trad-search" id="trad-search" placeholder="Search traditions…" oninput="filterTrads()">
      <div class="trad-grid" id="trad-grid"></div>
      <div class="trad-note" id="trad-note">0 selected — select 1 or 2</div>
      <div class="err" id="err-q4">Please select at least one tradition.</div>
      <div class="cta-row">
        <button class="btn-back" onclick="goBack()">← back</button>
        <button class="cta" onclick="goNext(4)">Continue</button>
      </div>
    </div>
  </div>

  <!-- Q4b: Tradition assignment (interfaith only — shown dynamically) -->
  <div class="screen" id="q4b">
    <div class="q-wrap">
      <div class="ql">Your traditions</div>
      <div class="qt" id="q4b-text">Which tradition belongs to whom?</div>
      <div class="qs" id="q4b-sub">This helps us assign ceremonies to the right column in your plan.</div>
      <div id="q4b-assignment" style="margin-top:8px"></div>
      <div class="cta-row">
        <button class="btn-back" onclick="goBack()">← back</button>
        <button class="cta" onclick="goNext('4b')">Continue</button>
      </div>
    </div>
  </div>

  <!-- Q5: Budget -->
  <div class="screen" id="q5">
    <div class="q-wrap">
      <div class="ql">Budget</div>
      <div class="qt" id="q5-text">What's your estimated total budget?</div>
      <div class="qs">We'll allocate this across your full wedding based on your traditions.</div>
      <div class="budget-display"><sup>$</sup><span id="budget-val">50,000</span></div>
      <input type="range" id="budget-slider" min="10000" max="500000" step="5000" value="50000" oninput="updateBudget()">
      <div class="budget-labels"><span>$10k</span><span>$500k+</span></div>
      <div class="cta-row">
        <button class="btn-back" onclick="goBack()">← back</button>
        <button class="cta" onclick="goNext(5)">Continue</button>
        <button class="back-link" onclick="goNext(5, true)">Not sure yet</button>
      </div>
    </div>
  </div>

  <!-- Q6: Guests -->
  <div class="screen" id="q6">
    <div class="q-wrap">
      <div class="ql">Guests</div>
      <div class="qt" id="q6-text">How many guests are you expecting?</div>
      <div class="qs">A rough number is fine — helps us size your venue and catering guidance.</div>
      <div class="stepper">
        <button class="stepper-btn" onclick="adjGuests(-25)">−</button>
        <div class="stepper-count" id="guest-count">100</div>
        <button class="stepper-btn" onclick="adjGuests(25)">+</button>
      </div>
      <div style="font-size:13px;color:var(--muted);font-style:italic">guests across all events</div>
      <div class="cta-row">
        <button class="btn-back" onclick="goBack()">← back</button>
        <button class="cta" onclick="goNext(6)">Build my plan</button>
        <button class="back-link" onclick="goNext(6, true)">Not sure yet</button>
      </div>
    </div>
  </div>
  <!-- Q6b: Review before generating plan -->
  <div class="screen" id="q6b">
    <div class="q-wrap" style="max-width:520px">
      <div class="ql">Before we build your plan</div>
      <div class="qt">Here's what we have</div>
      <div class="qs" style="margin-bottom:24px">Quick check — tap any line to go back and adjust it.</div>
      <div id="review-summary" style="display:flex;flex-direction:column;gap:0"></div>
      <div class="cta-row" style="margin-top:28px">
        <button class="btn-back" onclick="goBack()">← back</button>
        <button class="cta" onclick="submitPlan()">Build my plan →</button>
      </div>
    </div>
  </div>

  <!-- Q7: Ceremony selection -->
  <!-- Q7: Ceremony selection -->
  <div class="screen" id="q7" style="display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:flex-start!important;padding:0!important;overflow:hidden!important;">
    <!-- Scrollable content area -->
    <div id="q7-scroll" style="flex:1;overflow-y:auto;overflow-x:hidden;padding:24px 24px 16px;box-sizing:border-box;min-height:0;">
    <div style="width:100%;max-width:900px;margin:0 auto">
      <div class="ql" style="margin-bottom:2px">Your ceremony plan</div>
      <div class="qt" id="q7-title">Choose your ceremonies</div>
      <div class="qs" id="q7-sub" style="margin-bottom:4px">Select the ceremonies you want — adjust anything that isn't right for you.</div>
      <div id="cs-container" style="margin-top:16px;padding-bottom:20px"></div>
    </div>
    </div>
    <div style="flex-shrink:0;padding:16px 24px 24px;">
      <div style="width:100%;max-width:900px;margin:0 auto;padding-top:16px;border-top:1px solid var(--bdr);display:flex;justify-content:space-between;align-items:center;">
        <button class="btn-back" onclick="goBack()">← back</button>
        <button class="cta" onclick="goToConfirmation()">Review my plan →</button>
      </div>
    </div>
  </div>

  <!-- Q8: Confirmation -->
  <div class="screen" id="q8" style="overflow:hidden;display:block!important;padding:0!important;">
    <div style="height:calc(100vh - 62px);overflow-y:auto;overflow-x:hidden;padding:32px 24px 80px;box-sizing:border-box;">
    <div style="width:100%;max-width:720px;margin:0 auto">
      <div class="ql">Your wedding plan</div>
      <div class="qt" id="q8-title">Here's what you've chosen</div>
      <div class="qs" id="q8-sub"></div>
      <div id="conf-container" style="margin-top:28px"></div>
      <div class="cta-row" style="margin-top:32px">
        <button class="btn-back" onclick="goBackFromConf()">← adjust selections</button>
        <button class="cta" onclick="buildFinalPlan()">Build my full plan →</button>
      </div>
    </div>
  </div>
  </div>

  <!-- Loading -->
  <div class="screen" id="loading-screen">
    <svg class="marigold-spin" width="44" height="44" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
      <g fill="#E0B030" stroke="#C8941A" stroke-width="0.4">
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(0 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(51.4 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(102.8 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(154.2 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(205.7 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(257.1 17 17)"/>
        <ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(308.5 17 17)"/>
      </g>
      <g fill="#F7D44C" stroke="#E0B030" stroke-width="0.3">
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(0 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(60 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(120 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(180 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(240 17 17)"/>
        <ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(300 17 17)"/>
      </g>
      <circle cx="17" cy="17" r="4.1" fill="#6B5318" stroke="#5A4512" stroke-width="0.3"/>
    </svg>
    <div class="loading-text" id="loading-text">Building your plan…</div>
    <div class="loading-sub" id="loading-sub">Reading your traditions</div>
  </div>

  <!-- Results -->
  <div class="screen" id="results-screen">
    <div class="results-wrap">
      <div class="results-hero">
        <h1 id="results-title">Your wedding plan</h1>
        <p id="results-subtitle"></p>
      </div>
      <div id="conflicts-wrap"></div>
      <div class="out-tabs">
        <button class="out-tab on" onclick="switchTab('checklist', this)">Checklist</button>
        <button class="out-tab" onclick="switchTab('ceremonies', this)">Ceremony journey</button>
        <button class="out-tab" onclick="switchTab('budget', this)">Budget</button>
      </div>
      <div class="tab-panel on" id="tab-checklist"></div>
      <div class="tab-panel" id="tab-ceremonies"></div>
      <div class="tab-panel" id="tab-budget"></div>
      <div style="margin-top:48px;padding-top:32px;border-top:1px solid var(--bdr);text-align:center">
        <div style="font-size:13px;color:var(--muted);font-style:italic;margin-bottom:16px">Your plan is ready. A Marigold advisor will be in touch to review it with you.</div>
        <button class="cta" style="margin-bottom:20px" onclick="alert('Save and share — coming soon')">Save my plan →</button>
        <div style="display:flex;justify-content:center;gap:20px;margin-top:12px">
          <button class="btn-back" onclick="transitionTo('results-screen','q8');currentQ=8;updateProgress();">← back to selections</button>
          <button style="background:none;border:none;color:var(--muted);font-size:12px;font-family:'Playfair Display',serif;font-style:italic;cursor:pointer;" onclick="if(confirm('Start a new plan?'))location.reload()">Start again</button>
        </div>
      </div>
    </div>
  </div>

<script>
// ── State ──
function pos(n) { return n + "’s"; }

var FLOWER_SVG_20 = '<svg width="20" height="20" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg"><g fill="#E0B030" stroke="#C8941A" stroke-width="0.4"><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(0 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(25.7 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(51.4 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(77.1 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(102.8 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(128.5 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(154.2 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(180 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(205.7 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(231.4 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(257.1 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(282.8 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(308.5 17 17)"/><ellipse cx="17" cy="5.8" rx="1.9" ry="4.4" transform="rotate(334.2 17 17)"/></g><g fill="#F7D44C" stroke="#E0B030" stroke-width="0.3"><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(0 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(20 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(60 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(120 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(180 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(240 17 17)"/><ellipse cx="17" cy="10.2" rx="1.3" ry="2.4" transform="rotate(300 17 17)"/></g><circle cx="17" cy="17" r="4.1" fill="#6B5318" stroke="#5A4512" stroke-width="0.3"/></svg>'; // possessive helper avoids quote escaping issues

const S = { name1:'', name2:'', role1:'', role2:'', userRole:'couple', dateSure:false, locationSure:false, date:'', location:'', traditions:[], traditionAssignment:{}, budget:50000, guests:100, plan:null };
let guests = 100;
let currentQ = 0;
const TOTAL_Q = 6;

// ── Role assignment ──
function pickRole(partner, role) {
  S['role' + partner] = role;
  var val = document.getElementById('role-val' + partner);
  if (val) val.innerHTML = (role === 'bride' ? 'Bride' : role === 'groom' ? 'Groom' : 'Partner') + ' &#9662;';
  var menu = document.getElementById('role-menu' + partner);
  updateQ1Continue();
  updateRoleLabels();
  if (menu) menu.classList.remove('open');
}

function updateQ1Continue() {
  var n1 = (document.getElementById('name1')||{}).value||'';
  var n2 = (document.getElementById('name2')||{}).value||'';
  var btn = document.getElementById('q1-continue');
  if (btn) btn.disabled = !(n1.trim() && n2.trim() && S.role1 && S.role2);
}
function toggleRoleDD(partner) {
  var menu = document.getElementById('role-menu' + partner);
  if (!menu) return;
  var other = document.getElementById('role-menu' + (partner === 1 ? 2 : 1));
  if (other) other.classList.remove('open');
  menu.classList.toggle('open');
}

function setRole(partner, role) { pickRole(partner, role); }

document.addEventListener('click', function(e) {
  if (!e.target.closest('.role-dropdown')) {
    document.querySelectorAll('.role-dd-menu').forEach(function(m){ m.classList.remove('open'); });
  }
});

function updateRoleLabels() {
  var n1 = document.getElementById('name1').value.trim() || 'Partner one';
  var n2 = document.getElementById('name2').value.trim() || 'Partner two';
  var el1 = document.getElementById('role-name1');
  var el2 = document.getElementById('role-name2');
  if (el1) el1.textContent = n1;
  if (el2) el2.textContent = n2;
}

// ── Date / location gating ──
function onDateChange() {
  var val = document.getElementById('wedding-date').value;
  if (val) {
    document.getElementById('date-undecided').checked = false;
    S.dateSure = true;
  }
  updateQ2Continue();
}

function onDateTextInput(val) {
  // Accept DD/MM/YYYY or DD MM YYYY
  val = val.trim();
  if (val.length >= 8) {
    // Try to parse
    var clean = val.replace(/[^0-9]/g,'/').replace(/\\/+/g,'/');
    var parts = clean.split('/');
    if (parts.length >= 3 && parts[0].length >= 2 && parts[1].length >= 2 && parts[2].length >= 4) {
      var d = parts[0], m = parts[1], y = parts[2];
      var dateVal = y + '-' + m + '-' + d;
      S.date = dateVal;
      S.dateSure = true;
      document.getElementById('date-undecided').checked = false;
      updateQ2Continue();
    }
  }
  if (!val) { S.date = ''; S.dateSure = false; updateQ2Continue(); }
}

function onDateUndecided() {
  const checked = document.getElementById('date-undecided').checked;
  if (checked) {
    document.getElementById('wedding-date').value = '';
    S.dateSure = false;
  }
  updateQ2Continue();
}

function updateQ2Continue() {
  const hasDate = document.getElementById('wedding-date').value !== '';
  const undecided = document.getElementById('date-undecided').checked;
  const btn = document.getElementById('q2-continue');
  if (btn) btn.disabled = !(hasDate || undecided);
}

function onLocationChange() {
  const val = document.getElementById('location').value.trim();
  if (val) document.getElementById('location-undecided').checked = false;
  updateQ3Continue();
}

function onLocationUndecided() {
  const checked = document.getElementById('location-undecided').checked;
  if (checked) document.getElementById('location').value = '';
  updateQ3Continue();
}

function updateQ3Continue() {
  const hasLoc = document.getElementById('location').value.trim() !== '';
  const undecided = document.getElementById('location-undecided').checked;
  const btn = document.getElementById('q3-continue');
  if (btn) btn.disabled = !(hasLoc || undecided);
}

// ── Q4b: Tradition assignment ──
function buildQ4b() {
  if (S.traditions.length < 2) return; // single tradition — skip Q4b
  const n1 = S.name1 || 'Partner one';
  const n2 = S.name2 || 'Partner two';
  document.getElementById('q4b-text').innerHTML = 'Which tradition belongs to whom, <em>' + n1 + '</em> and <em>' + n2 + '</em>?';
  
  // Default: first tradition to name1, second to name2
  if (!S.traditionAssignment[S.traditions[0]]) {
    S.traditionAssignment[S.traditions[0]] = 'name1';
    S.traditionAssignment[S.traditions[1]] = 'name2';
  }

  const container = document.getElementById('q4b-assignment');
  container.innerHTML = S.traditions.map(function(slug) {
    const trad = TRADS.find(function(t){return t.slug===slug;});
    const label = trad ? trad.label : slug;
    const assigned = S.traditionAssignment[slug] || 'name1';
    return '<div class="trad-assign-row">' +
      '<div class="trad-assign-name">' + label + '</div>' +
      '<div class="trad-assign-btns">' +
        '<button class="assign-btn ' + (assigned==='name1'?'on':'') + '" data-slug="' + slug + '" data-partner="name1" onclick="assignTrad(this)">' + n1 + '</button>' +
        '<button class="assign-btn ' + (assigned==='name2'?'on':'') + '" data-slug="' + slug + '" data-partner="name2" onclick="assignTrad(this)">' + n2 + '</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function assignTrad(btn) {
  var slug = btn.dataset.slug;
  var partner = btn.dataset.partner;
  S.traditionAssignment[slug] = partner;
  var row = btn.closest('.trad-assign-row');
  row.querySelectorAll('.assign-btn').forEach(function(b) { b.classList.remove('on'); });
  btn.classList.add('on');
}

// ── Traditions ──
const TRADS = [
  {slug:'sri-lankan-buddhist',label:'Buddhist · Sri Lankan',region:'Buddhist'},
  {slug:'thai-buddhist',label:'Buddhist · Thai',region:'Buddhist'},
  {slug:'chinese-taiwanese',label:'Chinese / Taiwanese',region:'East Asian'},
  {slug:'catholic',label:'Christian · Catholic',region:'Christian'},
  {slug:'filipino-catholic',label:'Christian · Filipino Catholic',region:'Southeast Asian'},
  {slug:'greek-orthodox',label:'Christian · Greek Orthodox',region:'Christian'},
  {slug:'latin-american-catholic',label:'Christian · Latin American Catholic',region:'Latin American'},
  {slug:'mexican-catholic',label:'Christian · Mexican Catholic',region:'Latin American'},
  {slug:'christian-western',label:'Christian · Western',region:'Christian'},
  {slug:'cuban',label:'Cuban',region:'Caribbean'},
  {slug:'andhra-telugu',label:'Hindu · Andhra / Telugu',region:'South Asian'},
  {slug:'arya-samaj',label:'Hindu · Arya Samaj',region:'South Asian'},
  {slug:'assamese-hindu',label:'Hindu · Assamese',region:'South Asian'},
  {slug:'bengali-hindu',label:'Hindu · Bengali',region:'South Asian'},
  {slug:'bihari-hindu',label:'Hindu · Bihari',region:'South Asian'},
  {slug:'gujarati',label:'Hindu · Gujarati',region:'South Asian'},
  {slug:'kashmiri-pandit',label:'Hindu · Kashmiri Pandit',region:'South Asian'},
  {slug:'kerala-nair',label:'Hindu · Kerala / Nair',region:'South Asian'},
  {slug:'manipuri-vaishnavite',label:'Hindu · Manipuri (Vaishnavite)',region:'South Asian'},
  {slug:'marathi',label:'Hindu · Marathi',region:'South Asian'},
  {slug:'north-indian-punjabi',label:'Hindu · North Indian / Punjabi',region:'South Asian'},
  {slug:'odia-hindu',label:'Hindu · Odia',region:'South Asian'},
  {slug:'rajasthani-marwari',label:'Hindu · Rajasthani (Marwari)',region:'South Asian'},
  {slug:'rajasthani-rajput',label:'Hindu · Rajasthani (Rajput)',region:'South Asian'},
  {slug:'tamil-hindu',label:'Hindu · Tamil',region:'South Asian'},
  {slug:'vedic-general',label:'Hindu · Vedic (General)',region:'South Asian'},
  {slug:'jain-shwetambar',label:'Jain · Shwetambar',region:'South Asian'},
  {slug:'jewish-reform-conservative',label:'Jewish · Reform / Conservative',region:'Jewish'},
  {slug:'khasi',label:'Khasi',region:'South Asian'},
  {slug:'korean',label:'Korean',region:'East Asian'},
  {slug:'dawoodi-bohra',label:'Muslim · Dawoodi Bohra',region:'Muslim'},
  {slug:'muslim-nikah',label:'Muslim · Nikah',region:'Muslim'},
  {slug:'hausa-muslim',label:'Muslim · West African (Hausa)',region:'Muslim'},
  {slug:'yoruba-nigerian',label:'Nigerian · Yoruba',region:'West African'},
  {slug:'sikh',label:'Sikh',region:'South Asian'},
];

const REGION_COLORS = {
  'South Asian':{bg:'#EEF0FF',color:'#3C3489'},
  'Muslim':{bg:'#E6F4EF',color:'#1A5C43'},
  'Jewish':{bg:'#E8F1FB',color:'#0D4A87'},
  'Christian':{bg:'#FBF0EC',color:'#7A2E18'},
  'West African':{bg:'#FBE8F0',color:'#5C1A35'},
  'East Asian':{bg:'#FBF8E0',color:'#6B5A00'},
  'Buddhist':{bg:'#EAF4DC',color:'#2D5C0A'},
  'Latin American':{bg:'#FBE8E8',color:'#6B1515'},
  'Caribbean':{bg:'#FBF3E0',color:'#5C3800'},
  'Southeast Asian':{bg:'#E6F4EF',color:'#1A5C43'},
};

function tradColor(slug) {
  const t = TRADS.find(x=>x.slug===slug);
  return REGION_COLORS[t?.region] || {bg:'#F5F0E8',color:'#6B5A20'};
}

// ── Build tradition grid ──
function buildGrid() {
  document.getElementById('trad-grid').innerHTML = TRADS.map(t =>
    \`<button class="trad-chip" data-slug="\${t.slug}" onclick="toggleTrad('\${t.slug}')">\${t.label}</button>\`
  ).join('');
}

function filterTrads() {
  const q = document.getElementById('trad-search').value.toLowerCase();
  document.querySelectorAll('.trad-chip').forEach(c => {
    c.style.display = c.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function toggleTrad(slug) {
  const idx = S.traditions.indexOf(slug);
  if (idx > -1) { S.traditions.splice(idx,1); }
  else {
    if (S.traditions.length >= 2) {
      const old = S.traditions.shift();
      document.querySelector(\`.trad-chip[data-slug="\${old}"]\`)?.classList.remove('on');
    }
    S.traditions.push(slug);
  }
  document.querySelectorAll('.trad-chip').forEach(c =>
    c.classList.toggle('on', S.traditions.includes(c.dataset.slug))
  );
  const n = S.traditions.length;
  document.getElementById('trad-note').textContent = n===0
    ? '0 selected — select 1 or 2'
    : n===1 ? '1 selected — add a second for an interfaith plan'
    : '2 traditions selected';
}

// ── Budget ──
function updateBudget() {
  S.budget = parseInt(document.getElementById('budget-slider').value);
  document.getElementById('budget-val').textContent = S.budget.toLocaleString();
}
function onBudgetChange() {
  updateBudget();
}

// ── Guests ──
function adjGuests(d) {
  guests = Math.max(10, Math.min(1000, guests + d));
  document.getElementById('guest-count').textContent = guests;
  S.guests = guests;
}

// ── Personalise questions ──
function personalise() {
  var n1 = S.name1 || 'you';
  var names = S.name2 ? (S.name1 + ' and ' + S.name2) : n1;
  var el;
  el = document.getElementById('q2-text'); if(el) el.innerHTML = 'When is <em>'+n1+'</em>’s wedding?';
  el = document.getElementById('q3-text'); if(el) el.innerHTML = 'Where are <em>'+names+'</em> getting married?';
  el = document.getElementById('q4-text'); if(el) el.innerHTML = 'Which traditions will <em>'+names+'</em> honour?';
  el = document.getElementById('q5-text'); if(el) el.innerHTML = 'What’s your estimated budget, <em>'+n1+'</em>?';
  el = document.getElementById('q6-text'); if(el) el.innerHTML = 'How many guests are you expecting?';
}

// ── Navigation ──
function goNext(from, skip=false) {
  if (from===1) {
    const n1 = document.getElementById('name1').value.trim();
    const n2 = document.getElementById('name2').value.trim();
    if (!n1||!n2) { document.getElementById('err-q1').classList.add('show'); return; }
    if (!S.role1||!S.role2) { document.getElementById('err-q1').classList.add('show'); return; }
    document.getElementById('err-q1').classList.remove('show');
    S.name1=n1; S.name2=n2;
    personalise();
  }
  if (from===2) {
    S.date = document.getElementById('wedding-date').value || '';
    S.dateSure = S.date !== '';
  }
  if (from===3) {
    S.location = document.getElementById('location').value.trim() || '';
  }
  if (from===4) {
    if (!S.traditions.length) { document.getElementById('err-q4').classList.add('show'); return; }
    document.getElementById('err-q4').classList.remove('show');
    // If interfaith, show Q4b; otherwise skip to Q5
    if (S.traditions.length >= 2) {
      buildQ4b();
      // Transition to q4b
      const cur = document.getElementById('q' + currentQ);
      const next = document.getElementById('q4b');
      if (window._editingFromReview) {
        window._editingFromReview = false;
        transitionTo('q4', 'q6b');
        currentQ = '6b';
        updateProgress();
        setTimeout(buildReviewSummary, 270);
        return;
      }
      cur.classList.add('exit-left'); cur.classList.remove('active');
      setTimeout(function() {
        cur.classList.remove('exit-left');
        next.classList.add('active');
      }, 260);
      currentQ = '4b';
      updateProgress();
      return;
    }
  }
  if (from==='4b') {
    if (window._editingFromReview) {
      window._editingFromReview = false;
      transitionTo('q4b', 'q6b');
      currentQ = '6b';
      updateProgress();
      setTimeout(buildReviewSummary, 270);
      return;
    }
    // Go to Q5
    const cur = document.getElementById('q4b');
    const next = document.getElementById('q5');
    cur.classList.add('exit-left'); cur.classList.remove('active');
    setTimeout(function() { cur.classList.remove('exit-left'); next.classList.add('active'); }, 260);
    currentQ = 5;
    updateProgress();
    return;
  }
  if (from===5 && !skip) S.budget = parseInt(document.getElementById('budget-slider').value);
  if (from===6) { S.guests=guests; showReviewScreen(); return; }

  // If editing a single field from the review screen, go straight back to review
  if (window._editingFromReview) {
    window._editingFromReview = false;
    transitionTo('q'+from, 'q6b');
    currentQ = '6b';
    updateProgress();
    setTimeout(buildReviewSummary, 270);
    return;
  }

  // If coming from the paragraph-entry flow, skip any screen whose field was already extracted
  var ex = window._extracted;
  var next = from + 1;
  if (ex) {
    while (
      (next===2 && ex.date) ||
      (next===3 && ex.location) ||
      (next===4 && ex.traditions) ||
      (next===5 && ex.budget) ||
      (next===6 && ex.guests)
    ) {
      next++;
    }
    if (next === 7 && ex.guests) { S.guests = S.guests || guests; showReviewScreen(); return; }
  }

  doTransition(currentQ, next);
  currentQ = next;
  updateProgress();
}

function doTransition(from, to) {
  const a = document.getElementById('q' + from);
  const b = document.getElementById('q' + to);
  a.classList.add('exit-left'); a.classList.remove('active');
  setTimeout(()=>{ a.classList.remove('exit-left'); b.classList.add('active'); }, 260);
}

const TOTAL_STEPS = 9;
function updateProgress() {
  if (currentQ === 0 || currentQ === '0b') {
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('step-indicator').textContent = '';
    return;
  }
  const step = currentQ === '4b' ? 4.5 : currentQ === '6b' ? 6.5 : (currentQ === 7 ? 7 : currentQ === 8 ? 8 : currentQ);
  document.getElementById('progress-fill').style.width = (step/TOTAL_STEPS*100)+'%';
  const label = currentQ === '4b' ? '4 of '+TOTAL_STEPS : currentQ === '6b' ? 'Review' : currentQ + ' of ' + TOTAL_STEPS;
  document.getElementById('step-indicator').textContent = label;
}

function goBack() {
  if (currentQ === 1 || currentQ === '1') return;
  if (currentQ === 7 || currentQ === 8) window._editingFromReview = false;
  if (window._editingFromReview) {
    window._editingFromReview = false;
    transitionTo('q'+currentQ, 'q6b');
    currentQ = '6b'; updateProgress();
    setTimeout(buildReviewSummary, 270);
    return;
  }
  if (currentQ === 7) {
    transitionTo('q7', 'q6');
    currentQ = 6; updateProgress(); return;
  }
  // Determine previous screen
  let prevId, prevQ;
  if (currentQ === '4b') { prevId = 'q4'; prevQ = 4; }
  else if (currentQ === 5) {
    if (S.traditions.length >= 2) { prevId = 'q4b'; prevQ = '4b'; }
    else { prevId = 'q4'; prevQ = 4; }
  }
  else if (currentQ === '6b') { prevId = 'q6'; prevQ = 6; }
  else { prevQ = currentQ - 1; prevId = 'q' + prevQ; }

  const cur = document.getElementById('q' + currentQ);
  const prev = document.getElementById(prevId);
  if (!cur || !prev) return;
  cur.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
  cur.style.opacity = '0';
  cur.style.transform = 'translateX(50px)';
  setTimeout(function() {
    cur.classList.remove('active');
    cur.style.transition = '';
    cur.style.opacity = '';
    cur.style.transform = '';
    prev.classList.add('active');
  }, 250);
  currentQ = prevQ;
  updateProgress();
}

// ── Submit ──
const LOADING_MSGS = [
  ['Building your plan…','Reading your traditions from the cultural taxonomy'],
  ['Merging traditions…','Combining checklists and resolving any conflicts'],
  ['Allocating your budget…','Distributing across ceremony and vendor categories'],
  ['Almost ready…','Finalising your personalised wedding plan'],
];

async function submitPlan() {
  window._editingFromReview = false;
  var activeScreen = document.querySelector('.screen.active');
  if (activeScreen) { activeScreen.classList.add('exit-left'); activeScreen.classList.remove('active'); }
  setTimeout(function(){ if(activeScreen) activeScreen.classList.remove('exit-left'); document.getElementById('loading-screen').classList.add('active'); }, 260);
  document.getElementById('progress-fill').style.width='90%';
  document.getElementById('step-indicator').textContent='';

  var mi=0;
  var iv = setInterval(function(){
    mi=(mi+1)%LOADING_MSGS.length;
    document.getElementById('loading-text').textContent=LOADING_MSGS[mi][0];
    document.getElementById('loading-sub').textContent=LOADING_MSGS[mi][1];
  },1800);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch('/api/generate-plan',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({slugs:S.traditions, budget:S.budget, jurisdiction:S.location||'US'}),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    clearInterval(iv);
    if (!data.success) { showErr(data.error||'Something went wrong generating your plan.'); return; }
    S.plan=data.plan;
    // Go to ceremony selection (Q7) instead of results directly
    planCeremonies = S.plan.ceremonySequence || S.plan.ceremonies || [];
    ceremonySelections = {}; // reset selections
    const ls = document.getElementById('loading-screen');
    ls.classList.add('exit-left'); ls.classList.remove('active');
    setTimeout(function() {
      ls.classList.remove('exit-left');
      try {
        showCeremonySelection(planCeremonies);
      } catch(e) {
        console.error('Q7 error:', e);
        var cont = document.getElementById('cs-container');
        if (cont) cont.innerHTML = '<p style="color:var(--muted);font-style:italic;padding:20px 0">Could not load ceremonies — ' + e.message + '</p>';
      }
      const q7 = document.getElementById('q7');
      if (q7) q7.classList.add('active');
      currentQ = 7;
      updateProgress();
    }, 260);
  } catch(e) {
    clearInterval(iv);
    if (e.name === 'AbortError') {
      showErr('The plan is taking longer than expected. Please try again.');
    } else {
      showErr('Could not generate your plan. Please check your connection and try again.');
    }
  }
}

function showErr(msg) {
  var loadingEl = document.getElementById('loading-screen');
  loadingEl.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:16px;max-width:380px;text-align:center;padding:0 24px">' +
    FLOWER_SVG_20 +
    '<div style="font-size:16px;font-style:italic;color:var(--deep)">Something went wrong</div>' +
    '<div style="font-size:13px;color:var(--muted);font-style:italic;line-height:1.6">' + msg + '</div>' +
    '<button class="cta" onclick="location.reload()" style="margin-top:8px">Start again</button>' +
  '</div>';
}

// ── Results ──
function transitionTo(fromId, toId) {
  // Deactivate ALL screens
  document.querySelectorAll('.screen').forEach(function(s) {
    if (s.id === fromId) {
      s.classList.add('exit-left');
    }
    s.classList.remove('active');
  });
  setTimeout(function() {
    document.querySelectorAll('.screen').forEach(function(s) {
      s.classList.remove('exit-left');
    });
    var target = document.getElementById(toId);
    if (target) {
      target.classList.add('active');
    }
  }, 260);
}

function showReviewScreen() {
  transitionTo(document.getElementById('q6').classList.contains('active') ? 'q6' : 'q0b', 'q6b');
  currentQ = '6b';
  updateProgress();
  setTimeout(buildReviewSummary, 270);
}
function buildReviewSummary() {
  var n1 = S.name1 || 'Partner one';
  var n2 = S.name2 || 'Partner two';
  var roleLabel = function(r) { return r==='bride'?'Bride':r==='groom'?'Groom':'Partner'; };
  var dateStr = S.dateSure && S.date ? new Date(S.date).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : 'Not decided yet';
  var locStr = S.location || 'Not decided yet';
  var tradStr = (S.traditions||[]).map(function(slug){
    var t = TRADS.find(function(x){return x.slug===slug;});
    return t ? t.label : slug;
  }).join(' + ') || 'None selected';
  var budgetStr = S.budget ? S.budget.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}) : 'Not decided yet';
  var guestStr = (S.guests||guests) + ' guests';
  function row(label, value, q) {
    return '<div onclick="jumpToReview(\''+q+'\')" style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid var(--warm);cursor:pointer">'
      +'<div><div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);font-style:italic;margin-bottom:3px">'+label+'</div>'
      +'<div style="font-size:14px;font-style:italic;color:var(--deep)">'+value+'</div></div>'
      +'<span style="color:var(--muted);font-size:14px">edit ›</span></div>';
  }
  var html = row('Names', n1+' ('+roleLabel(S.role1)+') &amp; '+n2+' ('+roleLabel(S.role2)+')', 1)
    + row('Date', dateStr, 2)
    + row('Location', locStr, 3)
    + row('Traditions', tradStr, 4)
    + row('Budget', budgetStr, 5)
    + row('Guests', guestStr, 6);
  var el = document.getElementById('review-summary');
  if (el) el.innerHTML = html;
}
function jumpToReview(qnum) {
  window._editingFromReview = true;
  transitionTo('q6b', 'q' + qnum);
  currentQ = qnum;
  updateProgress();
}
function showResults() {
  transitionTo('loading-screen', 'results-screen');
  document.getElementById('progress-fill').style.width='100%';
  setTimeout(function() { populateResults(); }, 300);
}

function populateResults() {
  if (!S.plan) { console.error('populateResults: S.plan is null'); return; }
  var p = S.plan;
  var names = S.name2 ? (S.name1 + ' & ' + S.name2) : S.name1;
  var tradNames = S.traditions.map(function(s){
    var t = TRADS.find(function(t){ return t.slug===s; });
    return t ? t.label : s;
  }).join(' + ');

  document.getElementById('results-title').innerHTML = '<em>' + names + '</em> — your wedding plan';
  var dateStr = S.date
    ? new Date(S.date).toLocaleDateString('en-US',{month:'long',year:'numeric'})
    : 'Date to be confirmed';
  var budgetStr = (S.budget||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
  document.getElementById('results-subtitle').textContent = tradNames + ' · ' + budgetStr + ' · ' + S.guests + ' guests · ' + dateStr;

  document.getElementById('conflicts-wrap').innerHTML = '';
  if (!S.dateSure) {
    var dateNote = document.createElement('div');
    dateNote.className = 'conflict-banner';
    dateNote.innerHTML = '<em>Wedding date not yet confirmed</em> — checklist milestones are shown relative to your wedding date. Add your date any time to get calendar-specific guidance.';
    document.getElementById('conflicts-wrap').appendChild(dateNote);
  }

  if (p.conflicts && p.conflicts.length) {
    p.conflicts.forEach(function(c) {
      var div = document.createElement('div');
      div.className = 'conflict-banner';
      div.textContent = 'Note — ' + (c.description||c.message||'');
      document.getElementById('conflicts-wrap').appendChild(div);
    });
  }

  try { renderChecklist(p.checklist||[]); } catch(e) { console.error('renderChecklist:', e); }
  try { renderCeremonies(p.ceremonySequence||p.ceremonies||[]); } catch(e) { console.error('renderCeremonies:', e); }
  try { renderBudget(p.budget||p.budgetBreakdown||{}); } catch(e) { console.error('renderBudget:', e); }
}

function switchTab(name, btn) {
  document.querySelectorAll('.out-tab').forEach(function(t){t.classList.remove('on');});
  document.querySelectorAll('.tab-panel').forEach(function(p){p.classList.remove('on');});
  btn.classList.add('on');
  document.getElementById('tab-'+name).classList.add('on');
}

// ── Render checklist ──
function milestoneToDate(milestone, weddingDate) {
  if (!weddingDate) return milestone;
  const d = new Date(weddingDate);
  if (isNaN(d)) return milestone;
  const ml = milestone.toLowerCase();
  const monthMap = {
    '18 months': 18, '12 months': 12, '10 months': 10,
    '8 months': 8, '6 months': 6, '4 months': 4,
    '3 months': 3, '2 months': 2, '1 month': 1,
  };
  for (const [key, months] of Object.entries(monthMap)) {
    if (ml.includes(key.toLowerCase())) {
      const target = new Date(d);
      target.setMonth(target.getMonth() - months);
      const label = target.toLocaleDateString('en-US', {month:'short', year:'numeric'});
      return \`\${label} <span style="font-style:italic;opacity:0.6;font-size:10px">(\${milestone})</span>\`;
    }
  }
  if (ml.includes('day of') || ml.includes('day-of')) {
    return d.toLocaleDateString('en-US', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  }
  return milestone;
}

function renderChecklist(items) {
  const el = document.getElementById('tab-checklist');
  if (!items.length) {
    el.innerHTML='<p style="color:var(--muted);font-style:italic;font-size:13px;padding:20px 0">No checklist items found.</p>';
    return;
  }

  const trad1 = S.traditions[0];
  const trad2 = S.traditions[1];

  function checkItem(item, i) {
    const label = item.label||item.task||item.description||'';
    const trad = item.tradition||item.source||item._sourceTradition||'';
    const col = trad ? tradColor(trad) : null;
    const tradName = col ? (TRADS.find(t=>t.slug===trad)||{label:trad}).label.split('·')[0].trim() : '';
    return '<div class="checklist-item">' +
      '<div class="check-box" onclick="this.classList.toggle(\\'checked\\')"></div>' +
      '<div class="check-label">' + label +
        (col ? '<span class="trad-tag" style="background:' + col.bg + ';color:' + col.color + ';border-color:' + col.bg + '">' + tradName + '</span>' : '') +
      '</div>' +
    '</div>';
  }

  // Split items by tradition
  const side1 = items.filter(function(i) {
    const src = i.tradition||i.source||i._sourceTradition||'';
    return src && src !== 'Universal' && src === trad1;
  });
  const side2 = items.filter(function(i) {
    const src = i.tradition||i.source||i._sourceTradition||'';
    return trad2 && src && src !== 'Universal' && src === trad2;
  });
  const shared = items.filter(function(i) {
    const src = i.tradition||i.source||i._sourceTradition||'';
    return !src || src === 'Universal' || src === 'both' || src === 'Interfaith' ||
           (!side1.includes(i) && !side2.includes(i));
  });

  function groupByMilestone(list) {
    const groups = {};
    list.forEach(function(item) {
      const m = item.milestone||item.timeframe||'General';
      if (!groups[m]) groups[m] = [];
      groups[m].push(item);
    });
    return groups;
  }

  function renderGroup(list) {
    const groups = groupByMilestone(list);
    return Object.entries(groups).map(function(entry) {
      const m = entry[0], its = entry[1];
      return '<div class="out-ey">' + milestoneToDate(m, S.date) + '</div>' +
        its.map(checkItem).join('');
    }).join('');
  }

  // If no meaningful split, show as grouped list
  if (side1.length === 0 && side2.length === 0) {
    el.innerHTML = renderGroup(items);
    return;
  }

  const name1 = S.name1 || (TRADS.find(function(t){return t.slug===trad1;})||{label:'Partner 1'}).label.split('·')[0].trim();
  const name2 = S.name2 || (trad2 ? (TRADS.find(function(t){return t.slug===trad2;})||{label:'Partner 2'}).label.split('·')[0].trim() : 'Partner 2');

  el.innerHTML =
    '<div class="checklist-cols">' +
      '<div>' +
        '<div class="ceremony-col-header">' + name1 + '\\'s checklist</div>' +
        (side1.length ? renderGroup(side1) : '<p style="font-size:12px;color:var(--muted);font-style:italic;padding:8px 0">No specific items</p>') +
      '</div>' +
      (trad2 ? '<div>' +
        '<div class="ceremony-col-header">' + name2 + '\\'s checklist</div>' +
        (side2.length ? renderGroup(side2) : '<p style="font-size:12px;color:var(--muted);font-style:italic;padding:8px 0">No specific items</p>') +
      '</div>' : '<div></div>') +
    '</div>' +
    (shared.length ?
      '<div class="ceremony-shared-header">Shared tasks</div>' +
      renderGroup(shared)
    : '');
}

// ── Render ceremony gantt chart ──
function renderCeremonies(items) {
  var el = document.getElementById('tab-ceremonies');
  if (!el) return;
  if (!items || !items.length) {
    el.innerHTML = '<p style="color:var(--muted);font-style:italic;padding:20px 0">No ceremony sequence found.</p>';
    return;
  }
  var n1 = S.name1 || 'Partner one';
  var n2 = S.name2 || 'Partner two';
  var n1Role = S.role1 || 'bride';
  var n2Role = S.role2 || 'groom';
  var BUCKETS = ['12+ mo','6–12 mo','3–6 mo','1–3 mo','Weeks before','Day before','Wedding day','After'];
  function getBucket(timing) {
    if (!timing) return 4;
    var t = timing.toLowerCase();
    if (t.includes('12') || t.includes('year')) return 0;
    if (t.includes('6') || t.includes('8') || t.includes('9') || t.includes('10')) return 1;
    if (t.includes('3') || t.includes('4') || t.includes('5')) return 2;
    if (t.includes('1') || t.includes('2') || t.includes('month')) return 3;
    if (t.includes('week')) return 4;
    if (t.includes('day before') || t.includes('eve')) return 5;
    if (t.includes('day of') || t.includes('morning')) return 6;
    if (t.includes('after') || t.includes('post') || t.includes('homecoming')) return 7;
    return 4;
  }
  var COLORS = {side1:'#C8941A', side2:'#3949AB', both:'#4A7C59'};
  var side1=[], side2=[], both=[];
  var seenS1={}, seenS2={}, seenBoth={};
  items.forEach(function(item) {
    var side = item.side || 'both';
    var nm = item.name || item.event || '';
    var sameRole = (n1Role === n2Role);
    if (side === 'bride+groom' || (sameRole && (side === n1Role))) {
      // Same role or explicitly both — appears on both sides
      if (!seenS1[nm]) { seenS1[nm]=true; side1.push(item); }
      if (!seenS2[nm]) { seenS2[nm]=true; side2.push(item); }
    } else if (side === n1Role) {
      if (!seenS1[nm]) { seenS1[nm]=true; side1.push(item); }
    } else if (side === n2Role) {
      if (!seenS2[nm]) { seenS2[nm]=true; side2.push(item); }
    } else {
      if (!seenBoth[nm]) { seenBoth[nm]=true; both.push(item); }
    }
  });
  var colW = (100/BUCKETS.length).toFixed(2);
  function ganttRow(item, color) {
    var b = getBucket(item.timing);
    var name = item.name || item.event || '';
    var timing = item.timing || '';
    return '<div style="display:flex;align-items:center;margin-bottom:5px;gap:6px">'
      +'<div style="width:160px;flex-shrink:0;font-size:11px;font-style:italic;color:var(--tx);text-align:right;padding-right:8px;line-height:1.3;position:sticky;left:0;background:var(--cream);z-index:2">'+name+'</div>'
      +'<div style="flex:1;height:28px;position:relative">'
        +'<div title="'+name+(timing?' — '+timing:'')+'" style="position:absolute;left:'+(b*(100/BUCKETS.length)).toFixed(1)+'%;width:'+colW+'%;height:100%;background:'+color+';border-radius:4px;box-sizing:border-box;overflow:hidden;cursor:default">'
          +'<div style="position:absolute;top:2px;left:4px;right:2px;font-size:9px;color:white;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><b>'+name+'</b>'+(timing?' — '+timing:'')+'</div>'
        +'</div>'
      +'</div>'
    +'</div>';
  }
  function section(title, arr, color) {
    if (!arr.length) return '';
    return '<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin:16px 0 8px;font-style:italic">'+title+'</div>'
      +arr.map(function(i){ return ganttRow(i,color); }).join('');
  }
  var header='<div style="display:flex;align-items:center;margin-bottom:8px;position:sticky;top:0;background:#FDFAF5;padding:4px 0 6px;z-index:10;box-shadow:0 2px 0 #FDFAF5">'
    +'<div style="width:160px;flex-shrink:0;position:sticky;left:0;background:var(--cream);z-index:6"></div>'
    +'<div style="flex:1;display:flex">'
    +BUCKETS.map(function(b){ return '<div style="flex:1;font-size:9px;color:var(--muted);font-style:italic;text-align:center;border-left:1px solid var(--bdr);padding:2px 0">'+b+'</div>'; }).join('')
    +'</div></div>';
  var ganttHtml='<div style="overflow-x:auto"><div style="min-width:600px">'+header
    +section(n1+'’s ceremonies',side1,COLORS.side1)
    +section(n2+'’s ceremonies',side2,COLORS.side2)
    +section('Common ceremonies',both,COLORS.both)
    +'</div></div>';

  function toggleListCard(id) {
    var b = document.getElementById(id);
    if (!b) return;
    var open = b.style.display === 'block';
    b.style.display = open ? 'none' : 'block';
    var tog = document.querySelector('[data-ltog="' + id + '"]');
    if (tog) tog.style.transform = open ? '' : 'rotate(90deg)';
  }
  function listSection(title, arr) {
    if (!arr.length) return '';
    return '<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin:16px 0 8px;font-style:italic;display:flex;align-items:center;gap:8px">' + title + '<div style="flex:1;height:1px;background:var(--bdr)"></div></div>'
      + arr.map(function(item, i) {
        var name = item.name || item.event || '';
        var timing = item.timing || '';
        var notes = item.notes || '';
        var duration = item.duration || '';
        var lid = 'lc' + Math.random().toString(36).slice(2,7);
        return '<div style="border-bottom:1px solid var(--warm)">'
          + '<div data-lid="' + lid + '" onclick="toggleListCard(this.dataset.lid)" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;cursor:pointer">'
            + '<div style="display:flex;align-items:center;gap:8px">'
              + '<span data-ltog="' + lid + '" style="color:var(--muted);font-size:12px;display:inline-block;transition:transform 0.2s">›</span>'
              + '<span style="font-size:14px;font-style:italic;color:var(--deep)">' + name + '</span>'
            + '</div>'
            + '<span style="font-size:11px;color:var(--muted);font-style:italic;flex-shrink:0;margin-left:12px">' + timing + '</span>'
          + '</div>'
          + '<div id="' + lid + '" style="display:none;padding:0 0 12px 22px">'
            + (duration ? '<div style="font-size:11px;color:var(--muted);font-style:italic;margin-bottom:6px">⏱ ' + duration + '</div>' : '')
            + (notes ? '<div style="font-size:12px;color:var(--tx);line-height:1.6">' + notes + '</div>' : '<div style="font-size:12px;color:var(--muted);font-style:italic">No additional details</div>')
          + '</div>'
        + '</div>';
      }).join('');
  }

  var ganttHtml='<div style="overflow-x:auto"><div style="min-width:600px">'+header
    +section(n1+'’s ceremonies',side1,COLORS.side1)
    +section(n2+'’s ceremonies',side2,COLORS.side2)
    +section('Common ceremonies',both,COLORS.both)
    +'</div></div>';

  var listHtml=listSection(n1+'’s ceremonies',side1)
    +listSection(n2+'’s ceremonies',side2)
    +listSection('Common ceremonies',both);

  var av=window._ceremonyView||'gantt';
  var subTabs='<div style="display:flex;border-bottom:1px solid var(--bdr);margin-bottom:16px">'
    +'<button data-view="gantt" onclick="window._ceremonyView=this.dataset.view;renderCeremonies(S.plan.selectedCeremonies||S.plan.ceremonySequence||[])" style="padding:6px 16px;border:none;background:none;font-size:11px;letter-spacing:1px;font-style:italic;cursor:pointer;border-bottom:2px solid '+(av==='gantt'?'var(--deep)':'transparent')+';color:'+(av==='gantt'?'var(--deep)':'var(--muted)')+'">Timeline</button>'
    +'<button data-view="list" onclick="window._ceremonyView=this.dataset.view;renderCeremonies(S.plan.selectedCeremonies||S.plan.ceremonySequence||[])" style="padding:6px 16px;border:none;background:none;font-size:11px;letter-spacing:1px;font-style:italic;cursor:pointer;border-bottom:2px solid '+(av==='list'?'var(--deep)':'transparent')+';color:'+(av==='list'?'var(--deep)':'var(--muted)')+'">List</button>'
    +'</div>';

  el.innerHTML=subTabs+(av==='gantt'?ganttHtml:listHtml);
}


window.toggleCard = function(i) {
  document.getElementById(\`cc-\${i}\`)?.classList.toggle('open');
};

window.toggleCeremony = function(i, e) {
  e.stopPropagation();
  if (window.selectedCeremonies.has(i)) window.selectedCeremonies.delete(i);
  else window.selectedCeremonies.add(i);
  if (S.plan) renderCeremonies(S.plan.ceremonySequence||S.plan.ceremonies||[]);
};

// ── Render budget ──
  function officiantLabelForSlug(slug) {
    var s = slug || '';
    var has = function(k){ return s.includes(k); };
    if (has('hindu')||has('vedic')||has('jain')||has('rajasthani')||has('gujarati')||has('marathi')||has('tamil')||has('bengali')||has('assamese')||has('bihari')||has('odia')||has('kerala')||has('kashmiri')||has('manipuri')||has('andhra')||has('arya')||has('punjabi')||has('north-indian')) return 'Pandit';
    if (has('sikh')) return 'Granthi';
    if (has('muslim')||has('nikah')||has('bohra')||has('hausa')) return 'Imam';
    if (has('jewish')) return 'Rabbi';
    if (has('catholic')||has('christian')||has('greek')||has('filipino')||has('latin')||has('mexican')) return 'Priest';
    if (has('buddhist')||has('sri-lankan')||has('thai')) return 'Monk';
    return 'Officiant';
  }
  function officiantLabel(slug) {
    if (slug) return officiantLabelForSlug(slug);
    var slugs = S.traditions || [];
    var seen = {};
    var labels = slugs.map(function(s){ return officiantLabelForSlug(s); }).filter(function(l){ if(seen[l])return false; seen[l]=true; return true; });
    return labels.length ? labels.join(' / ') : 'Officiant';
  }

  var VENDOR_PCT = {
    'Venue hire':0.28, 'Catering & bar':0.25, 'Photography & video':0.10,
    'Music & entertainment':0.05, 'Florals & décor':0.08,
    'Hair & makeup (bride)':0.03,
    'Officiant / pandit / priest':0.02, 'Pandit':0.02, 'Priest':0.02,
    'Rabbi':0.02, 'Imam':0.02, 'Granthi':0.02, 'Monk':0.02, 'Officiant':0.02,
    '__OFFICIANT__':0.02,
    'Mehndi artist':0.01, 'Henna for guests':0.005,
    'Horse & procession':0.02, 'Dhol':0.01, 'Dhol & band':0.015,
    'Bridal wear & styling':0.04, 'Menswear & styling':0.02,
    'Invitations & stationery':0.015, 'Lighting & AV':0.02,
    'Cake & desserts':0.01, 'Transport (couple)':0.01,
    'Guest accommodation & transport':0.02,
  };

function renderBudget(budgetData) {
  var el = document.getElementById('tab-budget');
  if (!el) return;
  if (S.userRole === 'advisor') {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);font-style:italic">Budget not available in advisor view.</div>';
    return;
  }
  var totalBudget = S.budget || 50000;
  var n1 = S.name1||'Partner one', n2 = S.name2||'Partner two';
  if (!window.budgetExclusions) window.budgetExclusions = {};

  function getCersForSection(sectionType) {
    var cers=[]; var seen={};
    Object.entries(ceremonySelections).forEach(function(e) {
      var slug=e[0]; var sel=e[1]||{};
      Object.entries(sel[sectionType]||{}).forEach(function(f) {
        if (f[1]===false) return;
        var cidx=parseInt(f[0]);
        var item=planCeremonies[cidx]||(cidx>=10000?planCeremonies[cidx-10000]:null);
        if (!item) return;
        var nm=item.name||item.event||'';
        if (!seen[nm]) { seen[nm]=true; cers.push({item:item,slug:slug,order:item.order||cidx}); }
      });
    });
    cers.sort(function(a,b){return (a.order||0)-(b.order||0);});
    return cers;
  }

  var s1=getCersForSection('side1'), s2=getCersForSection('side2'), sb=getCersForSection('both');
  var total=s1.length+s2.length+sb.length||1;
  var s1B=Math.round(totalBudget*s1.length/total);
  var s2B=Math.round(totalBudget*s2.length/total);
  var sbB=Math.round(totalBudget*sb.length/total);

  function vendorAmt(cat,cats,cerBudget) {
    var w=VENDOR_PCT[cat]||0.01;
    var tw=cats.reduce(function(s,c){return s+(VENDOR_PCT[c]||0.01);},0);
    return Math.round(cerBudget*w/tw);
  }
  function cerSubtotal(item,cerBudget) {
    var cats=item.vendor_categories&&item.vendor_categories.length?item.vendor_categories.map(function(v){return v.category;}):null;
    if (!cats) return cerBudget;
    return cats.reduce(function(s,cat){
      var excKey='cer::'+(item.name||'')+'::'+cat;
      return s+(window.budgetExclusions[excKey]?0:vendorAmt(cat,cats,cerBudget));
    },0);
  }

  function donutChart(segments) {
    var tot=segments.reduce(function(s,x){return s+x.value;},0)||1;
    var r=40,cx=50,cy=50,sw=18,offset=0,paths='',legend='';
    var cols=['#C8941A','#3949AB','#4A7C59','#B7410E','#6A4C9C','#1565C0','#2E7D32'];
    segments.forEach(function(seg,i){
      var pct=seg.value/tot;
      var dash=pct*2*Math.PI*r, gap=(1-pct)*2*Math.PI*r;
      var col=cols[i%cols.length];
      paths+='<circle r="'+r+'" cx="'+cx+'" cy="'+cy+'" fill="none" stroke="'+col+'" stroke-width="'+sw+'" stroke-dasharray="'+dash.toFixed(2)+' '+gap.toFixed(2)+'" stroke-dashoffset="'+(-offset*2*Math.PI*r).toFixed(2)+'" transform="rotate(-90 '+cx+' '+cy+')"/>';
      legend+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><div style="width:10px;height:10px;border-radius:50%;background:'+col+';flex-shrink:0"></div><span style="font-size:11px;color:var(--muted);font-style:italic;flex:1">'+seg.label+'</span><span style="font-size:11px;color:var(--deep);min-width:60px;text-align:right">'+seg.value.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})+'</span></div>';
      offset+=pct;
    });
    return '<div style="display:flex;align-items:center;gap:20px;margin-bottom:20px"><svg width="100" height="100" viewBox="0 0 100 100" style="flex-shrink:0">'+paths+'<text x="50" y="53" text-anchor="middle" font-size="8" fill="var(--muted)" font-style="italic" font-family="serif">budget</text></svg><div style="flex:1">'+legend+'</div></div>';
  }

  function cerAccordion(entry,perCer,sectionType,idx,prevSlug) {
    var item=entry.item, slug=entry.slug;
    var name=item.name||item.event||'';
    var cats=item.vendor_categories&&item.vendor_categories.length?item.vendor_categories.map(function(v){return v.category;}):null;
    var offLabel=officiantLabelForSlug(slug);
    var subtotal=cerSubtotal(item,perCer);
    var accId='bacc-'+sectionType+'-'+idx;
    var divider=(prevSlug&&prevSlug!==slug&&S.traditions&&S.traditions.length>1)
      ?'<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);padding:8px 4px 4px;font-style:italic;border-top:1px solid var(--warm)">'+slug+'</div>':'';
    var rows=cats?cats.map(function(cat){
      var dc=(cat==='Officiant / pandit / priest')?offLabel:cat;
      var amt=vendorAmt(cat,cats,perCer);
      var excKey='cer::'+name+'::'+cat;
      var excl=!!window.budgetExclusions[excKey];
      var barPct=perCer>0?Math.min(Math.round(amt/perCer*100),100):0;
      return '<div style="display:flex;align-items:center;gap:8px;padding:5px 12px;border-bottom:1px solid var(--warm);'+(excl?'opacity:0.4':'')+'">'
        +'<input type="checkbox" '+(excl?'':'checked')+' data-exckey="'+excKey+'" onchange="toggleBudgetCat(this)" style="accent-color:var(--gd);cursor:pointer;flex-shrink:0">'
        +'<span style="flex:1;font-size:12px;font-style:italic;color:var(--muted);'+(excl?'text-decoration:line-through':'')+'">'+(dc||cat)+'</span>'
        +'<div style="width:60px;background:var(--warm);border-radius:2px;height:4px;overflow:hidden;flex-shrink:0"><div style="width:'+barPct+'%;height:100%;background:'+(excl?'var(--bdr)':'var(--gd)')+';border-radius:2px"></div></div>'
        +'<span style="font-size:12px;color:var(--muted);min-width:65px;text-align:right;font-style:italic">'+amt.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})+'</span>'
        +'</div>';
    }).join(''):'<div style="font-size:11px;color:var(--bdr);font-style:italic;padding:6px 12px">Vendor categories not yet set</div>';
    return divider+'<div style="border:1px solid var(--bdr);border-radius:8px;margin-bottom:8px;overflow:hidden">'
      +'<div data-accid="'+accId+'" onclick="toggleBudgetAcc(this.dataset.accid)" style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;background:var(--cream)">'
        +'<span id="'+accId+'-arrow" style="font-size:10px;color:var(--muted)">&#9658;</span>'
        +'<div style="flex:1"><div style="font-size:13px;font-style:italic;color:var(--deep)">'+name+'</div>'
        +(item.timing?'<div style="font-size:11px;color:var(--muted)">'+item.timing+'</div>':'')+'</div>'
        +'<div style="font-size:13px;font-style:italic;color:var(--deep);min-width:70px;text-align:right">'+subtotal.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})+'</div>'
      +'</div>'
      +'<div id="'+accId+'" style="display:none;border-top:1px solid var(--bdr)">'+rows+'</div>'
      +'</div>';
  }

  function sectionTab(cers,sectionBudget,sectionType) {
    if (!cers.length) return '<div style="padding:24px;text-align:center;color:var(--muted);font-style:italic">No ceremonies</div>';
    var perCer=cers.length?Math.round(sectionBudget/cers.length):0;
    var catTotals={};
    cers.forEach(function(entry){
      var item=entry.item;
      var cats=item.vendor_categories&&item.vendor_categories.length?item.vendor_categories.map(function(v){return v.category;}):null;
      if (!cats) return;
      cats.forEach(function(cat){
        var excKey='cer::'+(item.name||'')+'::'+cat;
        if (!window.budgetExclusions[excKey]) {
          var dc=(cat==='Officiant / pandit / priest')?officiantLabelForSlug(cers[0].slug):cat;
          catTotals[dc]=(catTotals[dc]||0)+vendorAmt(cat,cats,perCer);
        }
      });
    });
    var segs=Object.entries(catTotals).sort(function(a,b){return b[1]-a[1];}).slice(0,6).map(function(e){return {label:e[0],value:e[1]};});
    var sectionTotal=cers.reduce(function(s,e){return s+cerSubtotal(e.item,perCer);},0);
    var html=segs.length?donutChart(segs):'';
    cers.forEach(function(entry,i){ html+=cerAccordion(entry,perCer,sectionType,i,i>0?cers[i-1].slug:null); });
    html+='<div style="display:flex;justify-content:space-between;padding:10px 14px;background:var(--warm);border-radius:8px;margin-top:4px"><span style="font-size:13px;font-style:italic;color:var(--deep)">Section total</span><span style="font-size:14px;font-style:italic;color:var(--deep)">'+sectionTotal.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})+'</span></div>';
    return html;
  }

  var sections=[
    {id:'s1',label:n1+"’s ceremonies",cers:s1,budget:s1B,type:'side1'},
    {id:'s2',label:n2+"’s ceremonies",cers:s2,budget:s2B,type:'side2'},
    {id:'sb',label:'Common ceremonies',cers:sb,budget:sbB,type:'both'},
  ].filter(function(s){return s.cers.length>0;});
  if (!sections.length){el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted);font-style:italic">No ceremonies selected.</div>';return;}
  var activeTab=window._budgetTab||sections[0].id;
  if (!sections.find(function(s){return s.id===activeTab;})) activeTab=sections[0].id;
  var tabBar='<div style="display:flex;border-bottom:1px solid var(--bdr);margin-bottom:20px;overflow-x:auto">'+
    sections.map(function(s){
      var active=s.id===activeTab;
      var st='padding:8px 16px;border:none;background:none;font-size:11px;letter-spacing:1px;font-style:italic;cursor:pointer;border-bottom:2px solid '+(active?'var(--deep)':'transparent')+';color:'+(active?'var(--deep)':'var(--muted)')+';white-space:nowrap;flex-shrink:0';
      return '<button data-tabid="'+s.id+'" onclick="switchBudgetTab(this.dataset.tabid)" style="'+st+'">'+s.label+'</button>';
    }).join('')+'</div>';
  var activeSection=sections.find(function(s){return s.id===activeTab;});
  el.innerHTML='<div style="text-align:center;margin-bottom:20px"><div class="budget-total-display">'+totalBudget.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})+'</div><div class="budget-sub">total budget &middot; '+total+' ceremonies</div></div>'+tabBar+'<div id="budget-tab-content">'+sectionTab(activeSection.cers,activeSection.budget,activeSection.type)+'</div>';
}
function switchBudgetTab(id){window._budgetTab=id;renderBudget({});}
function toggleBudgetAcc(id){var el=document.getElementById(id);var arrow=document.getElementById(id+'-arrow');if(!el)return;var open=el.style.display!=='none';el.style.display=open?'none':'block';if(arrow)arrow.style.transform=open?'':'rotate(90deg)';}
function toggleBudgetCat(cb){var excKey=cb.dataset.exckey;if(!window.budgetExclusions)window.budgetExclusions={};window.budgetExclusions[excKey]=!cb.checked;renderBudget({});}





// ── Ceremony selection state ──
var ceremonySelections = {};
var planCeremonies = [];

function showCeremonySelection(ceremonies) {
  planCeremonies = ceremonies;
  var container = document.getElementById('cs-container');
  if (!ceremonies || !ceremonies.length) {
    if (container) container.innerHTML = '<p style="color:var(--muted);font-style:italic;padding:20px 0">No ceremonies found.</p>';
    return;
  }
  var n1 = S.name1 || 'Partner one';
  var n2 = S.name2 || 'Partner two';
  var trad1 = S.traditions[0];
  var trad2 = S.traditions[1] || null;
  var n1Role = S.role1;
  var n2Role = S.role2;
  var allTradSlugs = trad2 ? [trad1, trad2] : [trad1];
  ceremonySelections = {};

  var tradBlocks = allTradSlugs.map(function(tradSlug) {
    var tradInfo = TRADS.find(function(t){ return t.slug===tradSlug; }) || {label:tradSlug};
    var tradCeremonies = ceremonies.filter(function(item) {
      var src = item._sourceTraditionSlug || item.tradition || item.source || '';
      if (!trad2) return true;
      return src === tradSlug;
    });
    var side1 = [], side2 = [], both = [];
    var seenS1={}, seenS2={}, seenBoth={};
    tradCeremonies.forEach(function(item) {
      var globalIdx = ceremonies.indexOf(item);
      var side = item.side || 'both';
      var nm = item.name || item.event || '';
      if (side === 'bride+groom') {
        if (!seenS1[nm]) { seenS1[nm]=true; side1.push({item:item,idx:globalIdx}); }
        if (!seenS2[nm]) { seenS2[nm]=true; side2.push({item:item,idx:globalIdx+10000}); }
      } else if (side === n1Role) {
        if (!seenS1[nm]) { seenS1[nm]=true; side1.push({item:item,idx:globalIdx}); }
      } else if (side === n2Role) {
        if (!seenS2[nm]) { seenS2[nm]=true; side2.push({item:item,idx:globalIdx}); }
      } else {
        if (!seenBoth[nm]) { seenBoth[nm]=true; both.push({item:item,idx:globalIdx}); }
      }
    });
    ceremonySelections[tradSlug] = {side1:{},side2:{},both:{}};
    side1.forEach(function(ci){ ceremonySelections[tradSlug].side1[ci.idx]=true; });
    side2.forEach(function(ci){ ceremonySelections[tradSlug].side2[ci.idx]=true; });
    both.forEach(function(ci){ ceremonySelections[tradSlug].both[ci.idx]=true; });
    return {tradSlug:tradSlug,tradLabel:tradInfo.label,side1:side1,side2:side2,both:both};
  });

  function csItemHtml(ci, tradSlug, group) {
    var sel = ceremonySelections[tradSlug] && ceremonySelections[tradSlug][group][ci.idx] !== false;
    var name = ci.item.name || ci.item.event || '';
    var timing = ci.item.timing || '';
    var ds = 'data-slug="' + tradSlug + '" data-from="' + group + '" data-idx="' + ci.idx + '"';
    var menuItems = '';
    if (group !== 'side1') menuItems += '<button class="cs-popover-item cs-move" ' + ds + ' data-to="side1">Move to ' + n1 + '</button>';
    if (group !== 'side2') menuItems += '<button class="cs-popover-item cs-move" ' + ds + ' data-to="side2">Move to ' + n2 + '</button>';
    if (group !== 'both')  menuItems += '<button class="cs-popover-item cs-move" ' + ds + ' data-to="both">Move to Both</button>';
    menuItems += '<div class="cs-popover-divider"></div>';
    if (group !== 'side1') menuItems += '<button class="cs-popover-item cs-copy" ' + ds + ' data-to="side1">Copy to ' + n1 + '</button>';
    if (group !== 'side2') menuItems += '<button class="cs-popover-item cs-copy" ' + ds + ' data-to="side2">Copy to ' + n2 + '</button>';
    if (group !== 'both')  menuItems += '<button class="cs-popover-item cs-copy" ' + ds + ' data-to="both">Copy to Both</button>';
    return '<div class="cs-item ' + (sel ? 'selected' : 'deselected') +
      '" data-slug="' + tradSlug + '" data-group="' + group + '" data-idx="' + ci.idx + '" onclick="toggleCs(this)">' +
      '<div class="cs-check"><span class="cs-check-tick">&#10003;</span></div>' +
      '<div style="flex:1"><div class="cs-item-name">' + name + '</div>' +
      (timing ? '<div class="cs-item-timing">' + timing + '</div>' : '') + '</div>' +
      '<button class="cs-item-menu-btn" onclick="toggleCsMenu(event,this)">&#8943;</button>' +
      '<div class="cs-item-popover">' + menuItems + '</div>' +
    '</div>';
  }

  var noItems = '<p style="font-size:12px;color:var(--muted);font-style:italic;padding:8px 0">None</p>';

  container.innerHTML = tradBlocks.map(function(block) {
    var s1h = block.side1.map(function(ci){ return csItemHtml(ci,block.tradSlug,'side1'); }).join('');
    var s2h = block.side2.map(function(ci){ return csItemHtml(ci,block.tradSlug,'side2'); }).join('');
    var bh  = block.both.map(function(ci){ return csItemHtml(ci,block.tradSlug,'both'); }).join('');
    return '<div class="cs-tradition-block">' +
      (trad2 ? '<div class="cs-tradition-label">' + block.tradLabel + '</div>' : '') +
      '<div class="cs-cols">' +
        '<div><div class="cs-col-header">' + pos(n1) + ' ceremonies</div>' + (s1h||noItems) + '</div>' +
        '<div><div class="cs-col-header">' + pos(n2) + ' ceremonies</div>' + (s2h||noItems) + '</div>' +
      '</div>' +
      (bh ? '<div class="cs-shared-label">For both of you</div><div class="cs-shared-grid">' + bh + '</div>' : '') +
    '</div>';
  }).join('');
}

function toggleCs(el) {
  var tradSlug = el.dataset.slug;
  var group = el.dataset.group;
  var idx = parseInt(el.dataset.idx);
  if (!ceremonySelections[tradSlug] || !ceremonySelections[tradSlug][group]) return;
  var cur = ceremonySelections[tradSlug][group][idx] !== false;
  ceremonySelections[tradSlug][group][idx] = !cur;
  el.classList.toggle('selected', !cur);
  el.classList.toggle('deselected', cur);
}

function toggleCsMenu(e, btn) {
  e.stopPropagation();
  document.querySelectorAll('.cs-item-popover.open').forEach(function(p){
    if (p !== btn.nextElementSibling) p.classList.remove('open');
  });
  btn.nextElementSibling.classList.toggle('open');
}

function moveCs(e) {
  e.stopPropagation();
  var btn = e.currentTarget;
  var tradSlug = btn.dataset.slug;
  var fromGroup = btn.dataset.from;
  var idx = parseInt(btn.dataset.idx);
  var toGroup = btn.dataset.to;
  document.querySelectorAll('.cs-item-popover.open').forEach(function(p){ p.classList.remove('open'); });
  if (!ceremonySelections[tradSlug]) return;
  delete ceremonySelections[tradSlug][fromGroup][idx];
  if (!ceremonySelections[tradSlug][toGroup]) ceremonySelections[tradSlug][toGroup] = {};
  ceremonySelections[tradSlug][toGroup][idx] = true;
  showCeremonySelection(planCeremonies);
}

function copyCs(e) {
  e.stopPropagation();
  var btn = e.currentTarget;
  var tradSlug = btn.dataset.slug;
  var idx = parseInt(btn.dataset.idx);
  var toGroup = btn.dataset.to;
  document.querySelectorAll('.cs-item-popover.open').forEach(function(p){ p.classList.remove('open'); });
  if (!ceremonySelections[tradSlug]) return;
  var copy = Object.assign({}, planCeremonies[idx]);
  var newIdx = planCeremonies.length;
  planCeremonies.push(copy);
  if (!ceremonySelections[tradSlug][toGroup]) ceremonySelections[tradSlug][toGroup] = {};
  ceremonySelections[tradSlug][toGroup][newIdx] = true;
  showCeremonySelection(planCeremonies);
}

function getSelectedCeremonies() {
  var selected = [];
  var seen = new Set();
  Object.values(ceremonySelections).forEach(function(groups) {
    ['side1','side2','both'].forEach(function(g) {
      Object.entries(groups[g] || {}).forEach(function(e) {
        var idx = parseInt(e[0]);
        if (e[1] !== false && !seen.has(idx)) {
          seen.add(idx);
          if (planCeremonies[idx]) selected.push({item:planCeremonies[idx],idx:idx});
        }
      });
    });
  });
  selected.sort(function(a,b){ return a.idx-b.idx; });
  return selected.map(function(s){ return s.item; });
}

function goToConfirmation() {
  window._editingFromReview = false;
  buildConfirmation();
  transitionTo('q7','q8');
  currentQ = 8;
  updateProgress();
}

function goBackFromConf() {
  window._editingFromReview = false;
  transitionTo('q8','q7');
  currentQ = 7;
  updateProgress();
}

function buildConfirmation() {
  var n1 = S.name1 || 'Partner one';
  var n2 = S.name2 || 'Partner two';
  var trad1 = S.traditions[0];
  var trad2 = S.traditions[1] || null;
  var allTradSlugs = trad2 ? [trad1, trad2] : [trad1];
  var totalSelected = 0;
  Object.values(ceremonySelections).forEach(function(groups) {
    ['side1','side2','both'].forEach(function(g) {
      Object.values(groups[g]||{}).forEach(function(v){ if(v!==false) totalSelected++; });
    });
  });
  var dateStr = S.date ? new Date(S.date).toLocaleDateString('en-US',{month:'long',year:'numeric'}) : 'Date TBC';
  document.getElementById('q8-title').innerHTML = '<em>' + n1 + ' & ' + n2 + '</em>';
  document.getElementById('q8-sub').textContent = totalSelected + ' ceremonies · ' +
    S.budget.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}) +
    ' · ' + S.guests + ' guests · ' + dateStr;

  var html = '';
  allTradSlugs.forEach(function(tradSlug) {
    var tradInfo = TRADS.find(function(t){ return t.slug===tradSlug; }) || {label:tradSlug};
    var sel = ceremonySelections[tradSlug] || {side1:{},side2:{},both:{}};
    function getSel(g) {
      return Object.entries(sel[g]||{}).filter(function(e){ return e[1]!==false; })
        .map(function(e){
          var idx = parseInt(e[0]);
          return planCeremonies[idx] || (idx>=10000 ? planCeremonies[idx-10000] : null);
        }).filter(Boolean);
    }
    var s1=getSel('side1'), s2=getSel('side2'), sb=getSel('both');
    if (!s1.length && !s2.length && !sb.length) return;
    function ci(item){ return '<div class="conf-item">'+(item.name||item.event||'')+'</div>'; }
    var ni = '<div class="conf-item" style="opacity:0.4">None selected</div>';
    html += '<div class="conf-block">' +
      (trad2 ? '<div class="conf-trad-header">'+tradInfo.label+'</div>' : '') +
      '<div class="conf-cols">' +
        '<div><div class="conf-col-header">'+pos(n1)+' ceremonies</div>'+(s1.length?s1.map(ci).join(''):ni)+'</div>' +
        '<div><div class="conf-col-header">'+pos(n2)+' ceremonies</div>'+(s2.length?s2.map(ci).join(''):ni)+'</div>' +
      '</div>' +
      (sb.length ? '<div class="conf-shared-header">For both of you</div>'+sb.map(ci).join('') : '') +
    '</div>';
  });

  var ratio = Math.max(0.5, totalSelected / Math.max(planCeremonies.length,1));
  var adj = Math.round(S.budget * ratio);
  html += '<div class="conf-budget"><div class="conf-budget-total">' +
    adj.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}) +
    '</div><div class="conf-budget-sub">estimated for '+totalSelected+' ceremonies</div></div>';
  document.getElementById('conf-container').innerHTML = html;
  if (S.plan) S.plan.adjustedBudget = adj;
}

function buildFinalPlan() {
  window.budgetExclusions = {};
  window._budgetTab = null;
  window._ceremonyView = null;
  var selected = getSelectedCeremonies();
  if (S.plan) {
    S.plan.selectedCeremonies = selected;
    S.plan.ceremonySequence = selected;
    S.plan.adjustedBudget = Math.round(S.budget * Math.max(0.5, selected.length/(planCeremonies.length||1)));
  }
  transitionTo('q8','results-screen');
  currentQ = 9;
  updateProgress();
  setTimeout(function(){ populateResults(); }, 300);
}

document.addEventListener('click', function(e) {
  // Handle move/copy buttons via delegation
  if (e.target.classList.contains('cs-move')) { moveCs(e); return; }
  if (e.target.classList.contains('cs-copy')) { copyCs(e); return; }
  // Close menus
  document.querySelectorAll('.cs-item-popover.open').forEach(function(p){ p.classList.remove('open'); });
  if (!e.target.closest('.role-dropdown')) {
    document.querySelectorAll('.role-dd-menu.open').forEach(function(m){ m.classList.remove('open'); });
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && typeof currentQ !== 'undefined' && currentQ >= 1 && currentQ <= 6) {
    var btn = document.querySelector('.screen.active .cta');
    if (btn) btn.click();
  }
});

function showParagraphEntry() {
  transitionTo('q0','q0b'); currentQ='0b'; updateProgress();
}
function startQuestionnaire() {
  transitionTo('q0','q1'); currentQ=1; updateProgress();
}
async function parseParagraph() {
  var text = document.getElementById('wedding-paragraph').value.trim();
  if (text.length < 5) { document.getElementById('err-q0b').classList.add('show'); return; }
  document.getElementById('err-q0b').classList.remove('show');
  var btn = document.getElementById('q0b-btn');
  if (btn) { btn.disabled=true; btn.textContent='Reading your wedding...'; }
  try {
    var res = await fetch('/api/parse-wedding', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({text:text})
    });
    var data = await res.json();
    var parsed = data.parsed || data;
    var p = parsed;
    var pname1 = p.name1||p.partner1_name||'';
    var pname2 = p.name2||p.partner2_name||'';
    var prole1 = p.role1||p.partner1_role||'';
    var prole2 = p.role2||p.partner2_role||'';
    if (pname1) { S.name1=pname1; var el=document.getElementById('name1'); if(el) el.value=pname1; }
    if (pname2) { S.name2=pname2; var el=document.getElementById('name2'); if(el) el.value=pname2; }
    if (pname1 || pname2) updateRoleLabels();
    if (prole1) { S.role1=prole1; pickRole(1,prole1); }
    if (prole2) { S.role2=prole2; pickRole(2,prole2); }
    if (parsed.traditions && parsed.traditions.length) {
      S.traditions=parsed.traditions.slice(0,2);
      document.querySelectorAll('.trad-chip').forEach(function(c){ c.classList.toggle('on', S.traditions.includes(c.dataset.slug)); });
    }
    if (parsed.date) { S.date=parsed.date; S.dateSure=true; var el=document.getElementById('wedding-date'); if(el){el.value=parsed.date; updateQ2Continue();} }
    if (parsed.location) { S.location=parsed.location; var el=document.getElementById('location'); if(el){el.value=parsed.location; onLocationChange();} }
    if (parsed.budget) { S.budget=parsed.budget; var sl=document.getElementById('budget-slider'); if(sl){sl.value=parsed.budget; onBudgetChange();} }
    if (parsed.guests) { guests=parsed.guests; S.guests=parsed.guests; var el=document.getElementById('guest-count'); if(el) el.textContent=parsed.guests; }
    personalise();
    // Determine first missing field and jump to it — skip all answered ones
    var hasNames = pname1 && pname2;
    var hasRoles = prole1 && prole2;
    var hasDate  = !!(parsed.date && parsed.date.length > 4);
    var hasLoc   = !!(parsed.location && parsed.location.length > 1);
    var hasTrads = !!(parsed.traditions && parsed.traditions.length);
    var hasBudget= !!(parsed.budget && parsed.budget > 0);
    var hasGuests= !!(parsed.guests && parsed.guests > 0);
    // Remember what was extracted so goNext() can skip pre-filled screens
    window._extracted = { date: hasDate, location: hasLoc, traditions: hasTrads, budget: hasBudget, guests: hasGuests };

    if (!hasNames || !hasRoles) {
      transitionTo('q0b','q1'); currentQ=1; updateProgress();
      setTimeout(function(){ updateRoleLabels(); updateQ1Continue(); }, 270);
    } else if (!hasDate) {
      transitionTo('q0b','q2'); currentQ=2; updateProgress();
    } else if (!hasLoc) {
      transitionTo('q0b','q3'); currentQ=3; updateProgress();
    } else if (!hasTrads) {
      transitionTo('q0b','q4'); currentQ=4; updateProgress();
    } else if (!hasBudget) {
      transitionTo('q0b','q5'); currentQ=5; updateProgress();
    } else if (!hasGuests) {
      transitionTo('q0b','q6'); currentQ=6; updateProgress();
    } else {
      // Everything extracted — show review screen
      transitionTo('q0b','q6b');
      currentQ='6b'; updateProgress();
      setTimeout(showReviewScreen, 270);
    }
  } catch(err) {
    console.error('Parse error:',err);
    transitionTo('q0b','q1'); currentQ=1; updateProgress();
  } finally {
    if (btn) { btn.disabled=false; btn.textContent='Build my plan →'; }
  }
}
buildGrid();
(function(){ var fl=document.getElementById('q0-flower'); if(fl&&window.FLOWER_SVG_20) fl.innerHTML=FLOWER_SVG_20; })();
updateProgress();
</script>
</body>
</html>`;
app.get('/questionnaire', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(QUESTIONNAIRE_HTML);
});

app.get('/advisor', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(ADVISOR_HTML);
});

// ── Routes: health ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    supabase_url: process.env.SUPABASE_URL ? 'set' : 'missing',
    supabase_key: process.env.SUPABASE_SERVICE_KEY ? 'set' : 'missing',
  });
});

// Debug: check side field values for a tradition
app.get('/api/debug/side/:slug', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('live_taxonomy')
      .select('slug, ceremony_sequence')
      .eq('slug', req.params.slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.json({ error: 'not found' });
    const sides = (data.ceremony_sequence || []).map(c => ({
      name: c.name,
      side: c.side || 'MISSING'
    }));
    res.json({ slug: data.slug, ceremonies: sides });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Routes: traditions list ──
app.get('/api/traditions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('live_taxonomy')
      .select('slug, name, region, priority')
      .order('name');
    if (error) throw error;
    res.json({ success: true, traditions: data });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Routes: generate plan ──
app.post('/api/parse-wedding', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: 'Extract wedding details from this text and return ONLY valid JSON (no markdown, no backticks) with these fields (null if not mentioned): {"name1":"string","name2":"string","role1":"bride|groom|partner|null","role2":"bride|groom|partner|null","traditions":["slug1"],"date":"YYYY-MM-DD|null","location":"string|null","budget":number|null,"guests":number|null}. Valid tradition slugs: sri-lankan-buddhist,thai-buddhist,chinese-taiwanese,catholic,filipino-catholic,greek-orthodox,latin-american-catholic,mexican-catholic,christian-western,cuban,andhra-telugu,arya-samaj,assamese-hindu,bengali-hindu,bihari-hindu,gujarati,kashmiri-pandit,kerala-nair,manipuri-vaishnavite,marathi,hindu-north-indian-punjabi,odia-hindu,rajasthani-marwari,rajasthani-rajput,tamil-hindu,vedic-general,jain-shwetambar,jewish-reform-conservative,khasi,korean,dawoodi-bohra,muslim-nikah,hausa-muslim,yoruba-nigerian,sikh. Text: ' + text
        }]
      })
    });
    const data = await response.json();
    console.log('Anthropic parse response:', JSON.stringify(data).slice(0,300));
    if (!data.content || !data.content[0]) {
      return res.status(500).json({ error: 'Anthropic error: ' + JSON.stringify(data) });
    }
    const raw = data.content[0].text;
    const clean = raw.replace(/```json|```/g,'').trim();
    res.json({ success: true, parsed: JSON.parse(clean) });
  } catch(e) {
    console.error('parse-wedding error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/generate-plan', async (req, res) => {
  const slugs = req.body.slugs || req.body.traditionSlugs;
  const budget = req.body.budget || req.body.totalBudget;
  const jurisdiction = req.body.jurisdiction;

  if (!slugs || !Array.isArray(slugs) || slugs.length === 0)
    return res.status(400).json({ error: 'slugs array required' });
  if (slugs.length > 2)
    return res.status(400).json({ error: 'maximum 2 traditions supported' });

  try {
    const result = await generatePlan({
      traditionSlugs: slugs,
      totalBudget: parseInt(budget) || 50000,
      jurisdiction: jurisdiction || 'US',
    });

    if (!result.success) {
      return res.status(404).json({ error: 'Some traditions not yet available', details: result });
    }

    // Normalise field names for the questionnaire UI
    res.json({
      success: true,
      plan: {
        traditions: result.traditions,
        checklist: result.checklist || [],
        ceremonySequence: result.ceremony_sequence || [],
        vendorCategories: result.vendors || [],
        budget: result.budget || [],
        conflicts: result.conflicts || [],
        culturalNotes: result.cultural_notes || '',
        jurisdiction: jurisdiction || 'US',
        generatedAt: new Date().toISOString(),
      }
    });
  } catch(e) {
    console.error('generate-plan error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Advisor API ──
app.get('/api/advisor/traditions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cultural_traditions')
      .select('id,slug,name,region,priority,tradition_versions(id,version_number,status,is_current,proposed_at,reviewed_at)')
      .order('name');
    if (error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/advisor/traditions/:id/versions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tradition_versions').select('*')
      .eq('tradition_id', req.params.id)
      .order('version_number', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/advisor/versions/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tradition_versions').select('*')
      .eq('id', req.params.id).single();
    if (error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
})

// Update (save edits to) a specific version
app.patch('/api/advisor/versions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    // Only allow updating these fields
    const allowed = [
      'avg_budget_low','avg_budget_high','budget_currency',
      'typical_event_count','cultural_notes','lgbtq_notes',
      'sources','review_notes','checklist_template',
      'ceremony_sequence','vendor_categories','budget_allocation'
    ];
    const filtered = {};
    allowed.forEach(function(k) { if (updates[k] !== undefined) filtered[k] = updates[k]; });
    const { data, error } = await supabase
      .from('tradition_versions')
      .update(filtered)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});;

app.post('/api/advisor/traditions/:id/draft', async (req, res) => {
  try {
    const base = req.body.base || {};
    const { data: versions, error: vErr } = await supabase
      .from('tradition_versions').select('version_number')
      .eq('tradition_id', req.params.id)
      .order('version_number', { ascending: false }).limit(1);
    if (vErr) throw vErr;
    const nextVersion = ((versions[0]?.version_number) || 0) + 1;
    const { data, error } = await supabase.from('tradition_versions').insert({
      tradition_id: req.params.id, version_number: nextVersion, status: 'draft', is_current: false,
      avg_budget_low: base.avg_budget_low, avg_budget_high: base.avg_budget_high,
      budget_currency: base.budget_currency || 'USD', typical_event_count: base.typical_event_count,
      ceremony_sequence: base.ceremony_sequence || [], vendor_categories: base.vendor_categories || [],
      budget_allocation: base.budget_allocation || [], checklist_template: base.checklist_template || [],
      cultural_notes: base.cultural_notes || '', sources: base.sources || '',
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/advisor/versions/:id/submit', async (req, res) => {
  try {
    const { data, error } = await supabase.from('tradition_versions')
      .update({ ...req.body, status: 'in_review', proposed_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/advisor/versions/:id/approve', async (req, res) => {
  try {
    const { data: version, error: vErr } = await supabase
      .from('tradition_versions').select('tradition_id').eq('id', req.params.id).single();
    if (vErr) throw vErr;
    await supabase.from('tradition_versions').update({ is_current: false }).eq('tradition_id', version.tradition_id);
    const { data, error } = await supabase.from('tradition_versions')
      .update({ status: 'approved', is_current: true, reviewed_at: new Date().toISOString(), review_notes: req.body.review_notes || '' })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/advisor/versions/:id/reject', async (req, res) => {
  try {
    const { data, error } = await supabase.from('tradition_versions')
      .update({ status: 'draft', review_notes: req.body.review_notes || '' })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/advisor/versions/:id/cancel', async (req, res) => {
  try {
    const { error } = await supabase.from('tradition_versions')
      .delete().eq('id', req.params.id).eq('status', 'draft');
    if (error) throw error;
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/advisor/traditions/:id/audit', async (req, res) => {
  try {
    const { data, error } = await supabase.from('tradition_version_audit')
      .select('*').eq('tradition_id', req.params.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Marigold engine test running on port ${PORT}`));
module.exports = app;
