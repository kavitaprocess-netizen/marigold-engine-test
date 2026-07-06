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

// ?? Brand CSS (single source of truth ? edit here to update all pages) ??
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

// ?? Landing page ??
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

// ?? Questionnaire UI ? served as static file at /advisor-review/questionnaire.html ??


// ?? Advisor review interface ??
const ADVISOR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Marigold ? Cultural Advisor Review</title>
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
      <h1>Marigold ? Advisor Review</h1>
      <p id="sidebar-count">Loading?</p>
    </div>
    <div id="tradition-list"></div>
  </aside>
  <main class="main" id="main-content">
    <div class="empty">
      <div style="font-size:32px;margin-bottom:12px">?</div>
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
var TRAD_LABELS = {'sri-lankan-buddhist':'Buddhist ? Sri Lankan','thai-buddhist':'Buddhist ? Thai','chinese-taiwanese':'Chinese / Taiwanese','catholic':'Christian ? Catholic','filipino-catholic':'Christian ? Filipino Catholic','greek-orthodox':'Christian ? Greek Orthodox','latin-american-catholic':'Christian ? Latin American Catholic','mexican-catholic':'Christian ? Mexican Catholic','christian-western':'Christian ? Western','cuban':'Cuban','andhra-telugu':'Hindu ? Andhra / Telugu','arya-samaj':'Hindu ? Arya Samaj','assamese-hindu':'Hindu ? Assamese','bengali-hindu':'Hindu ? Bengali','bihari-hindu':'Hindu ? Bihari','gujarati':'Hindu ? Gujarati','kashmiri-pandit':'Hindu ? Kashmiri Pandit','kerala-nair':'Hindu ? Kerala / Nair','manipuri-vaishnavite':'Hindu ? Manipuri (Vaishnavite)','marathi':'Hindu ? Marathi','hindu-north-indian-punjabi':'Hindu ? North Indian / Punjabi','odia-hindu':'Hindu ? Odia','rajasthani-marwari':'Hindu ? Rajasthani (Marwari)','rajasthani-rajput':'Hindu ? Rajasthani (Rajput)','tamil-hindu':'Hindu ? Tamil','vedic-general':'Hindu ? Vedic (General)','jain-shwetambar':'Jain ? Shwetambar','jewish-reform-conservative':'Jewish ? Reform / Conservative','khasi':'Khasi','korean':'Korean','dawoodi-bohra':'Muslim ? Dawoodi Bohra','muslim-nikah':'Muslim ? Nikah','hausa-muslim':'Muslim ? West African (Hausa)','yoruba-nigerian':'Nigerian ? Yoruba','sikh':'Sikh'};
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
    // Default to the approved current version ? not just the most recent,
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
      <span>\${currentTradition.slug}</span><span>?</span><span>\${currentTradition.region||'?'}</span><span>?</span>
      \${v?\`<span class="badge badge-\${v.status}">\${v.status.replace('_',' ')}</span><span style="color:var(--muted)">v\${v.version_number}</span>\`:'<span class="badge badge-draft">no content yet</span>'}
    </div>
    <div class="action-bar">
      <div class="action-group">
        <button class="btn btn-gold" onclick="createEditingCopy()">?? Create editing copy</button>
        <span class="action-hint">Makes a copy to edit ? live content stays unchanged</span>
      </div>
      \${canEdit?\`<button class="btn btn-outline" onclick="cancelEditing()">? Cancel editing</button>\`:''}
      <button class="btn btn-warning" onclick="submitForReview()" \${canSubmit?'':'disabled'}>? Submit for review</button>
      <button class="btn btn-success" onclick="approveVersion()" \${canApprove?'':'disabled'}>? Approve</button>
      <button class="btn btn-outline" onclick="rejectVersion()" \${canApprove?'':'disabled'}>? Reject</button>
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
  if(!v)return\`<div class="empty"><div style="font-size:32px;margin-bottom:12px">?</div><p>No content yet. Content is seeded by developers, then you review and approve it here.</p></div>\`;
  const dis=canEdit?'':'disabled';
  const banner=canEdit
    ?\`<div class="banner banner-editing"><span style="font-size:18px">??</span><div><div class="banner-title">Editing copy ? version \${v.version_number}</div><div class="banner-sub">The live approved version is untouched. Your changes only go live once you approve this copy.</div></div></div>\`
    :\`<div class="banner banner-locked"><span style="font-size:18px">?</span><div><div class="banner-title">Live approved version (v\${v.version_number}) ? read only</div><div class="banner-sub">Click "Create editing copy" to make an editable copy.</div></div></div>\`;
  return banner+\`
    <div class="section">
      <div class="section-title">Overview</div>
      <div class="field-group">
        <div class="field"><label>Average budget ? low ($)</label><input type="number" value="\${workingData.avg_budget_low}" \${dis} oninput="workingData.avg_budget_low=this.value"></div>
        <div class="field"><label>Average budget ? high ($)</label><input type="number" value="\${workingData.avg_budget_high}" \${dis} oninput="workingData.avg_budget_high=this.value"></div>
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
      <div class="section-sub">Notes for other reviewers ? what you changed, questions, things to verify. These appear in the audit trail.</div>
      <div class="field"><textarea rows="3" oninput="workingData.review_notes=this.value">\${workingData.review_notes}</textarea></div>
    </div>
    <div class="save-bar">
      <button class="btn btn-primary" onclick="saveEdits()">Save changes</button>
      <button class="btn btn-outline" onclick="cancelEditing()">Cancel</button>
      <span class="save-bar-hint">Changes are not saved automatically</span>
    </div>\`:''}\`;
}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// ?? Rich text editor helpers ??
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

// ?? Diff engine ? word-level diff between two plain text strings ??
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
  return text.split(/(\\s+|\\*\\*|[.,!?;:??])/).filter(t => t !== undefined);
}

function lcs(a, b) {
  // Simple LCS-based diff ? produces array of {type, text} ops
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
    
    // Bold heading ? line that is mostly or entirely bold
    const escaped = escHtml(line);
    if (/^\\*\\*[^*]+\\*\\*[:\\s]*$/.test(line)) {
      html += '<p class="notes-heading">' + applyBold(escaped) + '</p>';
      i++;
      continue;
    }
    
    // Regular paragraph ? accumulate until blank line or new section
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
        <span class="item-row-meta">\${esc(item.milestone||'')} ? \${item.type||''}</span>
        <span style="color:var(--muted);font-size:11px">?</span>
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
        <span style="color:var(--muted);font-size:11px">?</span>
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
            <label>Vendor categories <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--muted)">? tick all that apply to this ceremony</span></label>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
              \${'["Venue hire","Catering & bar","Photography & video","Music & entertainment","Florals & d?cor","Hair & makeup (bride)","Officiant / pandit / priest","Mehndi artist","Horse & procession","Dhol & band","Bridal wear & styling","Menswear & styling","Invitations & stationery","Lighting & AV","Cake & desserts","Transport (couple)","Guest accommodation","Henna for guests"]'.split(',').map(c=>c.replace(/[\\[\\]"]/g,'')).filter(c=>c).map(cat => {
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
        <span class="item-row-meta">\${item.priority||''} ? \${item.typical_spend_pct_low||0}?\${item.typical_spend_pct_high||0}% of budget</span>
        <span style="color:var(--muted);font-size:11px">?</span>
      </div>
      <div class="item-row-body" id="v\${i}">
        <div class="item-fields">
          <div class="item-field"><label>Vendor type</label><input value="\${esc(item.category||'')}" \${canEdit?\`oninput="workingData.vendor_categories[\${i}].category=this.value"\`:' disabled'}></div>
          <div class="item-field"><label>Priority</label><select \${canEdit?\`onchange="workingData.vendor_categories[\${i}].priority=this.value"\`:' disabled'}>\${['Required','Traditional','Optional'].map(t=>\`<option \${item.priority===t?'selected':''}>\${t}</option>\`).join('')}</select></div>
          <div class="item-field"><label>Typical spend % ? low</label><input type="number" value="\${item.typical_spend_pct_low||''}" \${canEdit?\`oninput="workingData.vendor_categories[\${i}].typical_spend_pct_low=parseFloat(this.value)"\`:' disabled'}></div>
          <div class="item-field"><label>Typical spend % ? high</label><input type="number" value="\${item.typical_spend_pct_high||''}" \${canEdit?\`oninput="workingData.vendor_categories[\${i}].typical_spend_pct_high=parseFloat(this.value)"\`:' disabled'}></div>
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
        <span class="item-row-meta">\${item.pct_low||0}?\${item.pct_high||0}% of total budget</span>
        <span style="color:var(--muted);font-size:11px">?</span>
      </div>
      <div class="item-row-body" id="b\${i}">
        <div class="item-fields three">
          <div class="item-field"><label>Category name</label><input value="\${esc(item.category||'')}" \${canEdit?\`oninput="workingData.budget_allocation[\${i}].category=this.value"\`:' disabled'}></div>
          <div class="item-field"><label>% of budget ? low</label><input type="number" value="\${item.pct_low||''}" \${canEdit?\`oninput="workingData.budget_allocation[\${i}].pct_low=parseFloat(this.value)"\`:' disabled'}></div>
          <div class="item-field"><label>% of budget ? high</label><input type="number" value="\${item.pct_high||''}" \${canEdit?\`oninput="workingData.budget_allocation[\${i}].pct_high=parseFloat(this.value)"\`:' disabled'}></div>
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
// CUSTOM MODAL ? replaces browser confirm() and prompt()
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
      This is the first version ? no approved version to compare against.
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
  try{currentVersion=await api('/versions/'+currentVersion.id+'/approve','POST',{notes:finalNotes});toast('Version approved ? now live','success');allVersions=await api('/traditions/'+currentTradition.id+'/versions');await loadTraditions();renderMain();}
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


// ?? Routes: brand CSS (single source of truth) ??
app.get('/brand.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(BRAND_CSS);
});

// ?? Routes: pages ??
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(LANDING_HTML);
});

// /questionnaire is served as a static file by Vercel (see vercel.json)
// This route is a fallback for local development only
app.get('/questionnaire', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  try {
    const html = fs.readFileSync(path.join(__dirname, 'advisor-review', 'questionnaire.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch(e) {
    res.status(500).send('Questionnaire not found: ' + e.message);
  }
});
app.get('/advisor', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(ADVISOR_HTML);
});

// ?? Routes: health ??
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

// ?? Routes: traditions list ??
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

// ?? Routes: generate plan ??
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

// ?? Advisor API ??
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
