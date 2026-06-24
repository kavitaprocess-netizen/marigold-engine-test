// ============================================================================
// MARIGOLD ENGINE TEST SERVER
// A minimal Express app to prove the deterministic CIE works end-to-end
// against real Supabase data. Completely separate from the demo (server.js).
// ============================================================================
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { calculateBudget } = require('./engine/budgetCalculator');
const { mergeTraditions } = require('./engine/interfaithMerge');
const UNIVERSAL_CHECKLIST = require('./engine/universalChecklist.json');


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
    top: 57px;
    overflow: hidden;
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
  input[type="date"].fi { font-style: normal; font-size: 15px; }

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
    <svg class="flower-mark" width="26" height="26" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
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
    <a href="/advisor" class="nav-pill">Advisor review</a>
  </div>
</div>

<div id="screens">

  <!-- Q1: Names -->
  <div class="screen active" id="q1">
    <div class="q-wrap">
      <div class="ql">Let's begin</div>
      <div class="qt">What are your names?</div>
      <div class="qs">We'll weave these through your plan — so it feels personal, not like a template.</div>
      <div class="name-row">
        <div class="field-group">
          <label class="field-label">Partner one</label>
          <input type="text" class="fi" id="name1" placeholder="e.g. Priya" autocomplete="given-name" autofocus>
        </div>
        <div class="field-group">
          <label class="field-label">Partner two</label>
          <input type="text" class="fi" id="name2" placeholder="e.g. James" autocomplete="given-name">
        </div>
      </div>
      <div class="err" id="err-q1">Please enter both names to continue.</div>
      <div class="cta-row">
        <button class="cta" onclick="goNext(1)">Continue</button>
      </div>
    </div>
  </div>

  <!-- Q2: Date -->
  <div class="screen" id="q2">
    <div class="q-wrap">
      <div class="ql">Your wedding</div>
      <div class="qt" id="q2-text">When is the wedding?</div>
      <div class="qs">Approximate is absolutely fine — you can always refine this later.</div>
      <input type="date" class="fi" id="wedding-date" style="max-width:280px">
      <div class="cta-row">
        <button class="cta" onclick="goNext(2)">Continue</button>
        <button class="back-link" onclick="goNext(2, true)">Not sure yet</button>
      </div>
    </div>
  </div>

  <!-- Q3: Location -->
  <div class="screen" id="q3">
    <div class="q-wrap">
      <div class="ql">Where</div>
      <div class="qt" id="q3-text">Where are you getting married?</div>
      <div class="qs">City and state or country is enough — we use this for vendor recommendations.</div>
      <input type="text" class="fi" id="location" placeholder="e.g. New Jersey, US" style="max-width:380px">
      <div class="cta-row">
        <button class="cta" onclick="goNext(3)">Continue</button>
        <button class="back-link" onclick="goNext(3, true)">Not decided yet</button>
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
        <button class="cta" onclick="goNext(4)">Continue</button>
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
        <button class="cta" onclick="goNext(6)">Build my plan</button>
        <button class="back-link" onclick="goNext(6, true)">Not sure yet</button>
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
    </div>
  </div>

</div>

<script>
// ── State ──
const S = { name1:'', name2:'', date:'', location:'', traditions:[], budget:50000, guests:100, plan:null };
let guests = 100;
let currentQ = 1;
const TOTAL_Q = 6;

// ── Traditions ──
const TRADS = [
  {slug:'sikh',label:'Sikh',region:'South Asian'},
  {slug:'north-indian-punjabi',label:'Hindu · North Indian / Punjabi',region:'South Asian'},
  {slug:'bengali-hindu',label:'Hindu · Bengali',region:'South Asian'},
  {slug:'gujarati',label:'Hindu · Gujarati',region:'South Asian'},
  {slug:'marathi',label:'Hindu · Marathi',region:'South Asian'},
  {slug:'tamil-hindu',label:'Hindu · Tamil',region:'South Asian'},
  {slug:'kashmiri-pandit',label:'Hindu · Kashmiri Pandit',region:'South Asian'},
  {slug:'kerala-nair',label:'Hindu · Kerala / Nair',region:'South Asian'},
  {slug:'andhra-telugu',label:'Hindu · Andhra / Telugu',region:'South Asian'},
  {slug:'assamese-hindu',label:'Hindu · Assamese',region:'South Asian'},
  {slug:'bihari-hindu',label:'Hindu · Bihari',region:'South Asian'},
  {slug:'odia-hindu',label:'Hindu · Odia',region:'South Asian'},
  {slug:'rajasthani-marwari',label:'Rajasthani (Marwari)',region:'South Asian'},
  {slug:'rajasthani-rajput',label:'Rajasthani (Rajput)',region:'South Asian'},
  {slug:'vedic-general',label:'Vedic (General)',region:'South Asian'},
  {slug:'arya-samaj',label:'Arya Samaj',region:'South Asian'},
  {slug:'jain-shwetambar',label:'Jain (Shwetambar)',region:'South Asian'},
  {slug:'dawoodi-bohra',label:'Dawoodi Bohra',region:'South Asian'},
  {slug:'manipuri-vaishnavite',label:'Manipuri (Vaishnavite)',region:'South Asian'},
  {slug:'khasi',label:'Khasi',region:'South Asian'},
  {slug:'muslim-nikah',label:'Muslim · Nikah',region:'Muslim'},
  {slug:'hausa-muslim',label:'Muslim · West African (Hausa)',region:'Muslim'},
  {slug:'jewish-reform-conservative',label:'Jewish · Reform / Conservative',region:'Jewish'},
  {slug:'christian-western',label:'Christian / Western',region:'Christian'},
  {slug:'catholic',label:'Catholic',region:'Christian'},
  {slug:'greek-orthodox',label:'Greek Orthodox',region:'Christian'},
  {slug:'mexican-catholic',label:'Mexican Catholic',region:'Latin American'},
  {slug:'latin-american-catholic',label:'Latin American Catholic',region:'Latin American'},
  {slug:'cuban',label:'Cuban',region:'Caribbean'},
  {slug:'yoruba-nigerian',label:'Nigerian · Yoruba',region:'West African'},
  {slug:'chinese-taiwanese',label:'Chinese / Taiwanese',region:'East Asian'},
  {slug:'korean',label:'Korean',region:'East Asian'},
  {slug:'thai-buddhist',label:'Thai Buddhist',region:'Buddhist'},
  {slug:'sri-lankan-buddhist',label:'Sri Lankan Buddhist',region:'Buddhist'},
  {slug:'filipino-catholic',label:'Filipino Catholic',region:'Southeast Asian'},
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

// ── Guests ──
function adjGuests(d) {
  guests = Math.max(10, Math.min(1000, guests + d));
  document.getElementById('guest-count').textContent = guests;
  S.guests = guests;
}

// ── Personalise questions ──
function personalise() {
  const n1 = S.name1 || 'you';
  const names = S.name2 ? \`\${S.name1} and \${S.name2}\` : n1;
  document.getElementById('q2-text').innerHTML = \`When is <em>\${n1}</em>'s wedding?\`;
  document.getElementById('q3-text').innerHTML = \`Where are <em>\${names}</em> getting married?\`;
  document.getElementById('q4-text').innerHTML = \`Which traditions will <em>\${names}</em> honour?\`;
  document.getElementById('q5-text').innerHTML = \`What's your estimated budget, <em>\${n1}</em>?\`;
  document.getElementById('q6-text').innerHTML = \`How many guests are you expecting?\`;
}

// ── Navigation ──
function goNext(from, skip=false) {
  if (from===1) {
    const n1 = document.getElementById('name1').value.trim();
    const n2 = document.getElementById('name2').value.trim();
    if (!n1||!n2) { document.getElementById('err-q1').classList.add('show'); return; }
    document.getElementById('err-q1').classList.remove('show');
    S.name1=n1; S.name2=n2; personalise();
  }
  if (from===2 && !skip) S.date = document.getElementById('wedding-date').value;
  if (from===3 && !skip) S.location = document.getElementById('location').value.trim();
  if (from===4) {
    if (!S.traditions.length) { document.getElementById('err-q4').classList.add('show'); return; }
    document.getElementById('err-q4').classList.remove('show');
  }
  if (from===5 && !skip) S.budget = parseInt(document.getElementById('budget-slider').value);
  if (from===6) { S.guests=guests; submitPlan(); return; }

  doTransition(currentQ, from+1);
  currentQ = from+1;
  updateProgress();
}

function doTransition(from, to) {
  const a = document.getElementById(\`q\${from}\`);
  const b = document.getElementById(\`q\${to}\`);
  a.classList.add('exit-left'); a.classList.remove('active');
  setTimeout(()=>{ a.classList.remove('exit-left'); b.classList.add('active'); }, 260);
}

function updateProgress() {
  document.getElementById('progress-fill').style.width = ((currentQ-1)/TOTAL_Q*100)+'%';
  document.getElementById('step-indicator').textContent = \`\${currentQ} of \${TOTAL_Q}\`;
}

// ── Submit ──
const LOADING_MSGS = [
  ['Building your plan…','Reading your traditions from the cultural taxonomy'],
  ['Merging traditions…','Combining checklists and resolving any conflicts'],
  ['Allocating your budget…','Distributing across ceremony and vendor categories'],
  ['Almost ready…','Finalising your personalised wedding plan'],
];

async function submitPlan() {
  const q6 = document.getElementById('q6');
  q6.classList.add('exit-left'); q6.classList.remove('active');
  setTimeout(()=>{ q6.classList.remove('exit-left'); document.getElementById('loading-screen').classList.add('active'); }, 260);
  document.getElementById('progress-fill').style.width='90%';
  document.getElementById('step-indicator').textContent='';

  let mi=0;
  const iv = setInterval(()=>{
    mi=(mi+1)%LOADING_MSGS.length;
    document.getElementById('loading-text').textContent=LOADING_MSGS[mi][0];
    document.getElementById('loading-sub').textContent=LOADING_MSGS[mi][1];
  },1800);

  try {
    const res = await fetch('https://marigold-engine-test.vercel.app/api/generate-plan',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({slugs:S.traditions, budget:S.budget, jurisdiction:S.location||'US'}),
    });
    const data = await res.json();
    clearInterval(iv);
    if (!data.success) { showErr(data.error||'Something went wrong.'); return; }
    S.plan=data.plan; showResults();
  } catch(e) {
    clearInterval(iv); showErr('Could not connect to the plan engine. Please try again.');
  }
}

function showErr(msg) {
  document.getElementById('loading-text').textContent='Something went wrong';
  document.getElementById('loading-sub').textContent=msg;
}

// ── Results ──
function showResults() {
  const ls = document.getElementById('loading-screen');
  ls.classList.add('exit-left'); ls.classList.remove('active');
  setTimeout(()=>{ ls.classList.remove('exit-left'); document.getElementById('results-screen').classList.add('active'); },260);
  document.getElementById('progress-fill').style.width='100%';

  const p = S.plan;
  const names = S.name2?\`\${S.name1} & \${S.name2}\`:S.name1;
  const tradNames = S.traditions.map(s=>TRADS.find(t=>t.slug===s)?.label||s).join(' + ');

  document.getElementById('results-title').innerHTML = \`<em>\${names}</em> — your wedding plan\`;
  document.getElementById('results-subtitle').textContent = \`\${tradNames} · \${S.budget.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})} · \${S.guests} guests\`;

  if (p.conflicts?.length) {
    document.getElementById('conflicts-wrap').innerHTML = p.conflicts.map(c=>
      \`<div class="conflict-banner">Note — \${c.description||c.message||JSON.stringify(c)}</div>\`
    ).join('');
  }

  renderChecklist(p.checklist||[]);
  renderCeremonies(p.ceremonySequence||p.ceremonies||[]);
  renderBudget(p.budget||p.budgetBreakdown||[]);
}

function switchTab(name, btn) {
  document.querySelectorAll('.out-tab').forEach(t=>t.classList.remove('on'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById(\`tab-\${name}\`).classList.add('on');
}

// ── Render checklist ──
function renderChecklist(items) {
  const el = document.getElementById('tab-checklist');
  if (!items.length) { el.innerHTML='<p style="color:var(--muted);font-style:italic;font-size:13px;padding:20px 0">No checklist items found.</p>'; return; }
  const groups={};
  items.forEach(item=>{ const m=item.milestone||item.timeframe||'General'; if(!groups[m])groups[m]=[]; groups[m].push(item); });
  el.innerHTML = Object.entries(groups).map(([m,its])=>\`
    <div class="out-ey">\${m}</div>
    \${its.map(item=>{
      const label = item.label||item.task||item.description||'';
      const trad = item.tradition||item.source;
      const col = trad?tradColor(trad):null;
      return \`<div class="checklist-item">
        <div class="check-box" onclick="this.classList.toggle('checked')"></div>
        <div class="check-label">\${label}\${col?\`<span class="trad-tag" style="background:\${col.bg};color:\${col.color};border-color:\${col.bg}">\${TRADS.find(t=>t.slug===trad)?.label?.split('·')[0]?.trim()||trad}</span>\`:''}</div>
      </div>\`;
    }).join('')}\`
  ).join('');
}

// ── Render ceremony vertical timeline ──
function renderCeremonies(items) {
  const el = document.getElementById('tab-ceremonies');
  if (!items.length) { el.innerHTML='<p style="color:var(--muted);font-style:italic;font-size:13px;padding:20px 0">No ceremony sequence found.</p>'; return; }

  if (!window.selectedCeremonies) window.selectedCeremonies = new Set(items.map((_,i)=>i));

  el.innerHTML = \`
    <p style="font-size:12px;color:var(--muted);font-style:italic;margin-bottom:20px">
      Click any ceremony to expand details. Uncheck ceremonies you don't want included.
    </p>
    <div class="ceremony-timeline">
      \${items.map((item,i)=>{
        const name = item.name||item.event||item.ceremony||'';
        const timing = item.timing||item.timeframe||'';
        const duration = item.duration||'';
        const size = item.typical_size||item.guestSize||'';
        const loc = item.location_type||item.locationType||'';
        const notes = item.notes||'';
        const trad = item.tradition||item.source||'';
        const col = tradColor(trad);
        const tradLabel = trad?(TRADS.find(t=>t.slug===trad)?.label||trad):'';
        const selected = window.selectedCeremonies.has(i);

        return \`<div class="ceremony-card" id="cc-\${i}" onclick="toggleCard(\${i})" style="opacity:\${selected?1:0.4}">
          <div class="ceremony-dot" style="background:\${col.color};border-color:var(--cream)"></div>
          <div class="ceremony-header">
            <div class="ceremony-meta-wrap">
              \${tradLabel?\`<div class="ceremony-trad-tag" style="background:\${col.bg};color:\${col.color}">\${tradLabel.split('·')[0].trim()}</div>\`:''}
              <div class="ceremony-name">\${name}</div>
              <div class="ceremony-timing">\${timing}\${duration?' · '+duration:''}</div>
            </div>
            <div class="ceremony-toggle">›</div>
          </div>
          <div class="ceremony-body" onclick="event.stopPropagation()">
            <div style="margin-bottom:10px">
              \${size?\`<div class="ceremony-detail-row"><span class="ceremony-detail-label">Guest size</span><span class="ceremony-detail-val">\${size}</span></div>\`:''}
              \${loc?\`<div class="ceremony-detail-row"><span class="ceremony-detail-label">Location</span><span class="ceremony-detail-val">\${loc}</span></div>\`:''}
            </div>
            \${notes?\`<div class="ceremony-notes">\${notes}</div>\`:''}
            <div class="ceremony-include">
              <input type="checkbox" \${selected?'checked':''} onchange="toggleCeremony(\${i},event)">
              Include this ceremony in my plan
            </div>
          </div>
        </div>\`;
      }).join('')}
    </div>
    <p style="font-size:11px;color:var(--muted);font-style:italic;margin-top:16px">
      \${window.selectedCeremonies.size} of \${items.length} ceremonies included
    </p>\`;
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
function renderBudget(items) {
  const el = document.getElementById('tab-budget');
  if (!items.length) { el.innerHTML='<p style="color:var(--muted);font-style:italic;font-size:13px;padding:20px 0">No budget breakdown found.</p>'; return; }
  const total = S.budget;
  el.innerHTML = \`
    <div class="budget-total-display">\${total.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})}</div>
    <div class="budget-sub">allocated across \${items.length} categories</div>
    \${items.map(item=>{
      const cat = item.category||item.name||'Other';
      const pct = item.pct_mid||item.pct||((item.pct_low||0)+(item.pct_high||0))/2||10;
      const amt = Math.round(total*pct/100);
      return \`<div class="budget-row">
        <div class="budget-cat">\${cat}</div>
        <div class="budget-track"><div class="budget-fill" style="width:\${Math.min(pct*2,100)}%"></div></div>
        <div class="budget-amt">\${amt.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})}</div>
      </div>\`;
    }).join('')}\`;
}

// ── Keyboard ──
document.addEventListener('keydown', e=>{
  if (e.key==='Enter' && currentQ<=TOTAL_Q) {
    const btn = document.querySelector('.screen.active .cta');
    if (btn) btn.click();
  }
});

// ── Init ──
buildGrid();
updateProgress();
updateBudget();
const today = new Date().toISOString().split('T')[0];
document.getElementById('wedding-date').min = today;
</script>
</body>
</html>
`;/ ============================================================================
// MARIGOLD ENGINE TEST SERVER
// A minimal Express app to prove the deterministic CIE works end-to-end
// against real Supabase data. Completely separate from the demo (server.js).
// ============================================================================
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { calculateBudget } = require('./engine/budgetCalculator');
const { mergeTraditions } = require('./engine/interfaithMerge');
const UNIVERSAL_CHECKLIST = require('./engine/universalChecklist.json');


const QUESTIONNAIRE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Marigold — Your wedding plan</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cream:  #FDFAF0;
    --warm:   #F5F0E8;
    --deep:   #3C3010;
    --tx:     #2A2010;
    --muted:  #9A8A6A;
    --bdr:    #E0D4B0;
    --g:      #F7D44C;
    --gd:     #C8A820;
    --gk:     #9A7E10;
  }

  html, body {
    height: 100%;
    background: var(--cream);
    color: var(--tx);
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 15px;
    line-height: 1.7;
    overflow: hidden;
  }

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

  /* ── Header ── */
  #header {
    position: fixed;
    top: 2px; left: 0; right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 24px;
    border-bottom: 1px solid var(--bdr);
    background: var(--cream);
    z-index: 100;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    cursor: pointer;
  }
  .bname {
    font-size: 12px;
    letter-spacing: 3px;
    color: var(--deep);
    font-style: italic;
  }
  #header-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  #step-indicator {
    font-size: 11px;
    color: var(--muted);
    font-style: italic;
  }
  .nav-pill {
    font-size: 11px;
    letter-spacing: 1px;
    color: var(--muted);
    text-decoration: none;
    padding: 5px 14px;
    border: 1px solid var(--bdr);
    border-radius: 100px;
    font-family: 'Playfair Display', serif;
    font-style: italic;
    transition: all 0.2s;
    background: transparent;
    cursor: pointer;
  }
  .nav-pill:hover {
    border-color: var(--gd);
    background: var(--warm);
    color: var(--deep);
  }

  /* ── Flower SVG (reusable) ── */
  .flower-mark { flex-shrink: 0; }

  /* ── Screens ── */
  #screens {
    position: fixed;
    inset: 0;
    top: 57px;
    overflow: hidden;
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
  input[type="date"].fi { font-style: normal; font-size: 15px; }

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
    <svg class="flower-mark" width="26" height="26" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
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
    <a href="/advisor" class="nav-pill">Advisor review</a>
  </div>
</div>

<div id="screens">

  <!-- Q1: Names -->
  <div class="screen active" id="q1">
    <div class="q-wrap">
      <div class="ql">Let's begin</div>
      <div class="qt">What are your names?</div>
      <div class="qs">We'll weave these through your plan — so it feels personal, not like a template.</div>
      <div class="name-row">
        <div class="field-group">
          <label class="field-label">Partner one</label>
          <input type="text" class="fi" id="name1" placeholder="e.g. Priya" autocomplete="given-name" autofocus>
        </div>
        <div class="field-group">
          <label class="field-label">Partner two</label>
          <input type="text" class="fi" id="name2" placeholder="e.g. James" autocomplete="given-name">
        </div>
      </div>
      <div class="err" id="err-q1">Please enter both names to continue.</div>
      <div class="cta-row">
        <button class="cta" onclick="goNext(1)">Continue</button>
      </div>
    </div>
  </div>

  <!-- Q2: Date -->
  <div class="screen" id="q2">
    <div class="q-wrap">
      <div class="ql">Your wedding</div>
      <div class="qt" id="q2-text">When is the wedding?</div>
      <div class="qs">Approximate is absolutely fine — you can always refine this later.</div>
      <input type="date" class="fi" id="wedding-date" style="max-width:280px">
      <div class="cta-row">
        <button class="cta" onclick="goNext(2)">Continue</button>
        <button class="back-link" onclick="goNext(2, true)">Not sure yet</button>
      </div>
    </div>
  </div>

  <!-- Q3: Location -->
  <div class="screen" id="q3">
    <div class="q-wrap">
      <div class="ql">Where</div>
      <div class="qt" id="q3-text">Where are you getting married?</div>
      <div class="qs">City and state or country is enough — we use this for vendor recommendations.</div>
      <input type="text" class="fi" id="location" placeholder="e.g. New Jersey, US" style="max-width:380px">
      <div class="cta-row">
        <button class="cta" onclick="goNext(3)">Continue</button>
        <button class="back-link" onclick="goNext(3, true)">Not decided yet</button>
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
        <button class="cta" onclick="goNext(4)">Continue</button>
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
        <button class="cta" onclick="goNext(6)">Build my plan</button>
        <button class="back-link" onclick="goNext(6, true)">Not sure yet</button>
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
    </div>
  </div>

</div>

<script>
// ── State ──
const S = { name1:'', name2:'', date:'', location:'', traditions:[], budget:50000, guests:100, plan:null };
let guests = 100;
let currentQ = 1;
const TOTAL_Q = 6;

// ── Traditions ──
const TRADS = [
  {slug:'sikh',label:'Sikh',region:'South Asian'},
  {slug:'north-indian-punjabi',label:'Hindu · North Indian / Punjabi',region:'South Asian'},
  {slug:'bengali-hindu',label:'Hindu · Bengali',region:'South Asian'},
  {slug:'gujarati',label:'Hindu · Gujarati',region:'South Asian'},
  {slug:'marathi',label:'Hindu · Marathi',region:'South Asian'},
  {slug:'tamil-hindu',label:'Hindu · Tamil',region:'South Asian'},
  {slug:'kashmiri-pandit',label:'Hindu · Kashmiri Pandit',region:'South Asian'},
  {slug:'kerala-nair',label:'Hindu · Kerala / Nair',region:'South Asian'},
  {slug:'andhra-telugu',label:'Hindu · Andhra / Telugu',region:'South Asian'},
  {slug:'assamese-hindu',label:'Hindu · Assamese',region:'South Asian'},
  {slug:'bihari-hindu',label:'Hindu · Bihari',region:'South Asian'},
  {slug:'odia-hindu',label:'Hindu · Odia',region:'South Asian'},
  {slug:'rajasthani-marwari',label:'Rajasthani (Marwari)',region:'South Asian'},
  {slug:'rajasthani-rajput',label:'Rajasthani (Rajput)',region:'South Asian'},
  {slug:'vedic-general',label:'Vedic (General)',region:'South Asian'},
  {slug:'arya-samaj',label:'Arya Samaj',region:'South Asian'},
  {slug:'jain-shwetambar',label:'Jain (Shwetambar)',region:'South Asian'},
  {slug:'dawoodi-bohra',label:'Dawoodi Bohra',region:'South Asian'},
  {slug:'manipuri-vaishnavite',label:'Manipuri (Vaishnavite)',region:'South Asian'},
  {slug:'khasi',label:'Khasi',region:'South Asian'},
  {slug:'muslim-nikah',label:'Muslim · Nikah',region:'Muslim'},
  {slug:'hausa-muslim',label:'Muslim · West African (Hausa)',region:'Muslim'},
  {slug:'jewish-reform-conservative',label:'Jewish · Reform / Conservative',region:'Jewish'},
  {slug:'christian-western',label:'Christian / Western',region:'Christian'},
  {slug:'catholic',label:'Catholic',region:'Christian'},
  {slug:'greek-orthodox',label:'Greek Orthodox',region:'Christian'},
  {slug:'mexican-catholic',label:'Mexican Catholic',region:'Latin American'},
  {slug:'latin-american-catholic',label:'Latin American Catholic',region:'Latin American'},
  {slug:'cuban',label:'Cuban',region:'Caribbean'},
  {slug:'yoruba-nigerian',label:'Nigerian · Yoruba',region:'West African'},
  {slug:'chinese-taiwanese',label:'Chinese / Taiwanese',region:'East Asian'},
  {slug:'korean',label:'Korean',region:'East Asian'},
  {slug:'thai-buddhist',label:'Thai Buddhist',region:'Buddhist'},
  {slug:'sri-lankan-buddhist',label:'Sri Lankan Buddhist',region:'Buddhist'},
  {slug:'filipino-catholic',label:'Filipino Catholic',region:'Southeast Asian'},
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

// ── Guests ──
function adjGuests(d) {
  guests = Math.max(10, Math.min(1000, guests + d));
  document.getElementById('guest-count').textContent = guests;
  S.guests = guests;
}

// ── Personalise questions ──
function personalise() {
  const n1 = S.name1 || 'you';
  const names = S.name2 ? \`\${S.name1} and \${S.name2}\` : n1;
  document.getElementById('q2-text').innerHTML = \`When is <em>\${n1}</em>'s wedding?\`;
  document.getElementById('q3-text').innerHTML = \`Where are <em>\${names}</em> getting married?\`;
  document.getElementById('q4-text').innerHTML = \`Which traditions will <em>\${names}</em> honour?\`;
  document.getElementById('q5-text').innerHTML = \`What's your estimated budget, <em>\${n1}</em>?\`;
  document.getElementById('q6-text').innerHTML = \`How many guests are you expecting?\`;
}

// ── Navigation ──
function goNext(from, skip=false) {
  if (from===1) {
    const n1 = document.getElementById('name1').value.trim();
    const n2 = document.getElementById('name2').value.trim();
    if (!n1||!n2) { document.getElementById('err-q1').classList.add('show'); return; }
    document.getElementById('err-q1').classList.remove('show');
    S.name1=n1; S.name2=n2; personalise();
  }
  if (from===2 && !skip) S.date = document.getElementById('wedding-date').value;
  if (from===3 && !skip) S.location = document.getElementById('location').value.trim();
  if (from===4) {
    if (!S.traditions.length) { document.getElementById('err-q4').classList.add('show'); return; }
    document.getElementById('err-q4').classList.remove('show');
  }
  if (from===5 && !skip) S.budget = parseInt(document.getElementById('budget-slider').value);
  if (from===6) { S.guests=guests; submitPlan(); return; }

  doTransition(currentQ, from+1);
  currentQ = from+1;
  updateProgress();
}

function doTransition(from, to) {
  const a = document.getElementById(\`q\${from}\`);
  const b = document.getElementById(\`q\${to}\`);
  a.classList.add('exit-left'); a.classList.remove('active');
  setTimeout(()=>{ a.classList.remove('exit-left'); b.classList.add('active'); }, 260);
}

function updateProgress() {
  document.getElementById('progress-fill').style.width = ((currentQ-1)/TOTAL_Q*100)+'%';
  document.getElementById('step-indicator').textContent = \`\${currentQ} of \${TOTAL_Q}\`;
}

// ── Submit ──
const LOADING_MSGS = [
  ['Building your plan…','Reading your traditions from the cultural taxonomy'],
  ['Merging traditions…','Combining checklists and resolving any conflicts'],
  ['Allocating your budget…','Distributing across ceremony and vendor categories'],
  ['Almost ready…','Finalising your personalised wedding plan'],
];

async function submitPlan() {
  const q6 = document.getElementById('q6');
  q6.classList.add('exit-left'); q6.classList.remove('active');
  setTimeout(()=>{ q6.classList.remove('exit-left'); document.getElementById('loading-screen').classList.add('active'); }, 260);
  document.getElementById('progress-fill').style.width='90%';
  document.getElementById('step-indicator').textContent='';

  let mi=0;
  const iv = setInterval(()=>{
    mi=(mi+1)%LOADING_MSGS.length;
    document.getElementById('loading-text').textContent=LOADING_MSGS[mi][0];
    document.getElementById('loading-sub').textContent=LOADING_MSGS[mi][1];
  },1800);

  try {
    const res = await fetch('https://marigold-engine-test.vercel.app/api/generate-plan',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({slugs:S.traditions, budget:S.budget, jurisdiction:S.location||'US'}),
    });
    const data = await res.json();
    clearInterval(iv);
    if (!data.success) { showErr(data.error||'Something went wrong.'); return; }
    S.plan=data.plan; showResults();
  } catch(e) {
    clearInterval(iv); showErr('Could not connect to the plan engine. Please try again.');
  }
}

function showErr(msg) {
  document.getElementById('loading-text').textContent='Something went wrong';
  document.getElementById('loading-sub').textContent=msg;
}

// ── Results ──
function showResults() {
  const ls = document.getElementById('loading-screen');
  ls.classList.add('exit-left'); ls.classList.remove('active');
  setTimeout(()=>{ ls.classList.remove('exit-left'); document.getElementById('results-screen').classList.add('active'); },260);
  document.getElementById('progress-fill').style.width='100%';

  const p = S.plan;
  const names = S.name2?\`\${S.name1} & \${S.name2}\`:S.name1;
  const tradNames = S.traditions.map(s=>TRADS.find(t=>t.slug===s)?.label||s).join(' + ');

  document.getElementById('results-title').innerHTML = \`<em>\${names}</em> — your wedding plan\`;
  document.getElementById('results-subtitle').textContent = \`\${tradNames} · \${S.budget.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})} · \${S.guests} guests\`;

  if (p.conflicts?.length) {
    document.getElementById('conflicts-wrap').innerHTML = p.conflicts.map(c=>
      \`<div class="conflict-banner">Note — \${c.description||c.message||JSON.stringify(c)}</div>\`
    ).join('');
  }

  renderChecklist(p.checklist||[]);
  renderCeremonies(p.ceremonySequence||p.ceremonies||[]);
  renderBudget(p.budget||p.budgetBreakdown||[]);
}

function switchTab(name, btn) {
  document.querySelectorAll('.out-tab').forEach(t=>t.classList.remove('on'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById(\`tab-\${name}\`).classList.add('on');
}

// ── Render checklist ──
function renderChecklist(items) {
  const el = document.getElementById('tab-checklist');
  if (!items.length) { el.innerHTML='<p style="color:var(--muted);font-style:italic;font-size:13px;padding:20px 0">No checklist items found.</p>'; return; }
  const groups={};
  items.forEach(item=>{ const m=item.milestone||item.timeframe||'General'; if(!groups[m])groups[m]=[]; groups[m].push(item); });
  el.innerHTML = Object.entries(groups).map(([m,its])=>\`
    <div class="out-ey">\${m}</div>
    \${its.map(item=>{
      const label = item.label||item.task||item.description||'';
      const trad = item.tradition||item.source;
      const col = trad?tradColor(trad):null;
      return \`<div class="checklist-item">
        <div class="check-box" onclick="this.classList.toggle('checked')"></div>
        <div class="check-label">\${label}\${col?\`<span class="trad-tag" style="background:\${col.bg};color:\${col.color};border-color:\${col.bg}">\${TRADS.find(t=>t.slug===trad)?.label?.split('·')[0]?.trim()||trad}</span>\`:''}</div>
      </div>\`;
    }).join('')}\`
  ).join('');
}

// ── Render ceremony vertical timeline ──
function renderCeremonies(items) {
  const el = document.getElementById('tab-ceremonies');
  if (!items.length) { el.innerHTML='<p style="color:var(--muted);font-style:italic;font-size:13px;padding:20px 0">No ceremony sequence found.</p>'; return; }

  if (!window.selectedCeremonies) window.selectedCeremonies = new Set(items.map((_,i)=>i));

  el.innerHTML = \`
    <p style="font-size:12px;color:var(--muted);font-style:italic;margin-bottom:20px">
      Click any ceremony to expand details. Uncheck ceremonies you don't want included.
    </p>
    <div class="ceremony-timeline">
      \${items.map((item,i)=>{
        const name = item.name||item.event||item.ceremony||'';
        const timing = item.timing||item.timeframe||'';
        const duration = item.duration||'';
        const size = item.typical_size||item.guestSize||'';
        const loc = item.location_type||item.locationType||'';
        const notes = item.notes||'';
        const trad = item.tradition||item.source||'';
        const col = tradColor(trad);
        const tradLabel = trad?(TRADS.find(t=>t.slug===trad)?.label||trad):'';
        const selected = window.selectedCeremonies.has(i);

        return \`<div class="ceremony-card" id="cc-\${i}" onclick="toggleCard(\${i})" style="opacity:\${selected?1:0.4}">
          <div class="ceremony-dot" style="background:\${col.color};border-color:var(--cream)"></div>
          <div class="ceremony-header">
            <div class="ceremony-meta-wrap">
              \${tradLabel?\`<div class="ceremony-trad-tag" style="background:\${col.bg};color:\${col.color}">\${tradLabel.split('·')[0].trim()}</div>\`:''}
              <div class="ceremony-name">\${name}</div>
              <div class="ceremony-timing">\${timing}\${duration?' · '+duration:''}</div>
            </div>
            <div class="ceremony-toggle">›</div>
          </div>
          <div class="ceremony-body" onclick="event.stopPropagation()">
            <div style="margin-bottom:10px">
              \${size?\`<div class="ceremony-detail-row"><span class="ceremony-detail-label">Guest size</span><span class="ceremony-detail-val">\${size}</span></div>\`:''}
              \${loc?\`<div class="ceremony-detail-row"><span class="ceremony-detail-label">Location</span><span class="ceremony-detail-val">\${loc}</span></div>\`:''}
            </div>
            \${notes?\`<div class="ceremony-notes">\${notes}</div>\`:''}
            <div class="ceremony-include">
              <input type="checkbox" \${selected?'checked':''} onchange="toggleCeremony(\${i},event)">
              Include this ceremony in my plan
            </div>
          </div>
        </div>\`;
      }).join('')}
    </div>
    <p style="font-size:11px;color:var(--muted);font-style:italic;margin-top:16px">
      \${window.selectedCeremonies.size} of \${items.length} ceremonies included
    </p>\`;
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
function renderBudget(items) {
  const el = document.getElementById('tab-budget');
  if (!items.length) { el.innerHTML='<p style="color:var(--muted);font-style:italic;font-size:13px;padding:20px 0">No budget breakdown found.</p>'; return; }
  const total = S.budget;
  el.innerHTML = \`
    <div class="budget-total-display">\${total.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})}</div>
    <div class="budget-sub">allocated across \${items.length} categories</div>
    \${items.map(item=>{
      const cat = item.category||item.name||'Other';
      const pct = item.pct_mid||item.pct||((item.pct_low||0)+(item.pct_high||0))/2||10;
      const amt = Math.round(total*pct/100);
      return \`<div class="budget-row">
        <div class="budget-cat">\${cat}</div>
        <div class="budget-track"><div class="budget-fill" style="width:\${Math.min(pct*2,100)}%"></div></div>
        <div class="budget-amt">\${amt.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})}</div>
      </div>\`;
    }).join('')}\`;
}

// ── Keyboard ──
document.addEventListener('keydown', e=>{
  if (e.key==='Enter' && currentQ<=TOTAL_Q) {
    const btn = document.querySelector('.screen.active .cta');
    if (btn) btn.click();
  }
});

// ── Init ──
buildGrid();
updateProgress();
updateBudget();
const today = new Date().toISOString().split('T')[0];
document.getElementById('wedding-date').min = today;
</script>
</body>
</html>
`;/ ============================================================================
// MARIGOLD ENGINE TEST SERVER
// A minimal Express app to prove the deterministic CIE works end-to-end
// against real Supabase data. Completely separate from the demo (server.js).
// ============================================================================
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { calculateBudget } = require('./engine/budgetCalculator');
const { mergeTraditions } = require('./engine/interfaithMerge');
const UNIVERSAL_CHECKLIST = require('./engine/universalChecklist.json');


const QUESTIONNAIRE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Marigold — Your wedding plan</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --gold:       #C8A820;
    --gold-light: #F7D44C;
    --gold-pale:  #FDFAF0;
    --brown-deep: #3C3010;
    --brown-mid:  #6B5A20;
    --brown-mute: #9A8A6A;
    --brown-hint: #D4C8A0;
    --white:      #FFFFFF;
    --danger:     #C0392B;
  }

  html, body {
    height: 100%;
    background: var(--gold-pale);
    color: var(--brown-deep);
    font-family: Georgia, 'Times New Roman', serif;
    overflow: hidden;
  }

  /* ── Progress bar ── */
  #progress-bar {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--brown-hint);
    z-index: 100;
  }
  #progress-fill {
    height: 100%;
    background: var(--gold);
    transition: width 0.5s ease;
    width: 0%;
  }

  /* ── Header ── */
  #header {
    position: fixed;
    top: 12px; left: 0; right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
    z-index: 99;
  }
  #nav-links {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .nav-link {
    font-size: 12px;
    font-family: -apple-system, sans-serif;
    color: var(--brown-mute);
    text-decoration: none;
    padding: 5px 12px;
    border: 1px solid var(--brown-hint);
    border-radius: 6px;
    transition: all 0.2s;
    background: white;
  }
  .nav-link:hover {
    border-color: var(--gold);
    color: var(--brown-mid);
  }
  #logo {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
  }
  #logo svg { width: 28px; height: 28px; }
  #logo-text {
    font-size: 15px;
    font-weight: normal;
    color: var(--brown-mid);
    letter-spacing: 0.5px;
  }
  #step-indicator {
    font-size: 12px;
    color: var(--brown-mute);
    font-family: -apple-system, sans-serif;
    letter-spacing: 0.3px;
  }

  /* ── Screen container ── */
  #screens {
    position: fixed;
    inset: 0;
    overflow: hidden;
  }

  .screen {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 32px 100px;
    opacity: 0;
    pointer-events: none;
    transform: translateX(60px);
    transition: opacity 0.4s ease, transform 0.4s ease;
  }
  .screen.active {
    opacity: 1;
    pointer-events: all;
    transform: translateX(0);
  }
  .screen.exit-left {
    opacity: 0;
    transform: translateX(-60px);
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  /* ── Question content ── */
  .q-wrap {
    width: 100%;
    max-width: 620px;
  }
  .q-eyebrow {
    font-size: 11px;
    font-family: -apple-system, sans-serif;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 16px;
  }
  .q-text {
    font-size: clamp(22px, 4vw, 34px);
    line-height: 1.3;
    color: var(--brown-deep);
    margin-bottom: 8px;
    font-weight: normal;
  }
  .q-text em {
    color: var(--gold);
    font-style: normal;
  }
  .q-hint {
    font-size: 14px;
    color: var(--brown-mute);
    margin-bottom: 36px;
    font-family: -apple-system, sans-serif;
    line-height: 1.6;
  }

  /* ── Text inputs ── */
  .name-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 8px;
  }
  @media (max-width: 500px) {
    .name-row { grid-template-columns: 1fr; }
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .field-label {
    font-size: 11px;
    font-family: -apple-system, sans-serif;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--brown-mute);
  }
  input[type="text"], input[type="date"], input[type="number"] {
    width: 100%;
    padding: 14px 16px;
    font-size: 18px;
    font-family: Georgia, serif;
    color: var(--brown-deep);
    background: var(--white);
    border: 1.5px solid var(--brown-hint);
    border-radius: 8px;
    outline: none;
    transition: border-color 0.2s;
  }
  input:focus {
    border-color: var(--gold);
  }
  input::placeholder {
    color: var(--brown-hint);
  }

  /* ── Option buttons ── */
  .options {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 8px;
  }
  .options.two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  @media (max-width: 500px) {
    .options.two-col { grid-template-columns: 1fr; }
  }

  .option-btn {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 20px;
    background: var(--white);
    border: 1.5px solid var(--brown-hint);
    border-radius: 10px;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.2s, background 0.2s;
    font-family: Georgia, serif;
    font-size: 16px;
    color: var(--brown-deep);
  }
  .option-btn:hover {
    border-color: var(--gold);
    background: #FFFDF5;
  }
  .option-btn.selected {
    border-color: var(--gold);
    background: #FFFAEA;
  }
  .option-btn .opt-key {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1.5px solid var(--brown-hint);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-family: -apple-system, sans-serif;
    color: var(--brown-mute);
    flex-shrink: 0;
    transition: all 0.2s;
  }
  .option-btn.selected .opt-key {
    background: var(--gold);
    border-color: var(--gold);
    color: var(--brown-deep);
  }
  .option-btn .opt-label { flex: 1; line-height: 1.4; }
  .option-btn .opt-sub {
    font-size: 12px;
    color: var(--brown-mute);
    font-family: -apple-system, sans-serif;
    margin-top: 2px;
  }

  /* ── Tradition search ── */
  #tradition-search {
    width: 100%;
    padding: 14px 16px;
    font-size: 16px;
    font-family: -apple-system, sans-serif;
    color: var(--brown-deep);
    background: var(--white);
    border: 1.5px solid var(--brown-hint);
    border-radius: 8px;
    outline: none;
    margin-bottom: 12px;
    transition: border-color 0.2s;
  }
  #tradition-search:focus { border-color: var(--gold); }

  .tradition-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px;
    max-height: 280px;
    overflow-y: auto;
    padding-right: 4px;
  }
  .tradition-grid::-webkit-scrollbar { width: 4px; }
  .tradition-grid::-webkit-scrollbar-track { background: transparent; }
  .tradition-grid::-webkit-scrollbar-thumb { background: var(--brown-hint); border-radius: 2px; }

  .trad-chip {
    padding: 10px 14px;
    background: var(--white);
    border: 1.5px solid var(--brown-hint);
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-family: -apple-system, sans-serif;
    color: var(--brown-deep);
    transition: all 0.15s;
    text-align: left;
    line-height: 1.3;
  }
  .trad-chip:hover { border-color: var(--gold); background: #FFFDF5; }
  .trad-chip.selected {
    border-color: var(--gold);
    background: #FFFAEA;
    color: var(--brown-deep);
  }
  .trad-chip.selected::before {
    content: '✓ ';
    color: var(--gold);
    font-weight: bold;
  }
  .trad-note {
    font-size: 11px;
    color: var(--brown-mute);
    margin-top: 8px;
    font-family: -apple-system, sans-serif;
  }

  /* ── Budget slider ── */
  .budget-display {
    font-size: 42px;
    color: var(--brown-deep);
    margin-bottom: 8px;
    letter-spacing: -1px;
  }
  .budget-display span {
    font-size: 20px;
    color: var(--brown-mute);
    vertical-align: super;
    font-size: 22px;
  }
  input[type="range"] {
    width: 100%;
    margin: 16px 0 8px;
    accent-color: var(--gold);
    height: 6px;
    cursor: pointer;
  }
  .budget-labels {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--brown-mute);
    font-family: -apple-system, sans-serif;
  }

  /* ── Guest count ── */
  .guest-stepper {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 16px;
  }
  .stepper-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 1.5px solid var(--brown-hint);
    background: var(--white);
    font-size: 24px;
    cursor: pointer;
    color: var(--brown-deep);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    font-family: -apple-system, sans-serif;
  }
  .stepper-btn:hover { border-color: var(--gold); background: #FFFDF5; }
  .stepper-count {
    font-size: 52px;
    color: var(--brown-deep);
    min-width: 80px;
    text-align: center;
    letter-spacing: -2px;
  }

  /* ── CTA ── */
  .cta-row {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-top: 28px;
  }
  .btn-next {
    padding: 14px 32px;
    background: var(--gold);
    color: var(--brown-deep);
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-family: Georgia, serif;
    font-style: italic;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
    letter-spacing: 0.3px;
  }
  .btn-next:hover { background: var(--gold-light); }
  .btn-next:active { transform: scale(0.98); }
  .btn-next:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-skip {
    font-size: 13px;
    color: var(--brown-mute);
    background: none;
    border: none;
    cursor: pointer;
    font-family: -apple-system, sans-serif;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .btn-skip:hover { color: var(--brown-mid); }

  /* ── Results screen ── */
  #results-screen {
    overflow-y: auto;
    padding: 100px 32px 80px;
    align-items: flex-start;
    justify-content: flex-start;
  }
  .results-wrap {
    width: 100%;
    max-width: 780px;
    margin: 0 auto;
  }
  .results-hero {
    margin-bottom: 48px;
  }
  .results-hero h1 {
    font-size: clamp(26px, 4vw, 40px);
    font-weight: normal;
    color: var(--brown-deep);
    line-height: 1.2;
    margin-bottom: 12px;
  }
  .results-hero h1 em { color: var(--gold); font-style: normal; }
  .results-hero p {
    font-size: 16px;
    color: var(--brown-mute);
    font-family: -apple-system, sans-serif;
    line-height: 1.6;
  }

  .results-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1.5px solid var(--brown-hint);
    margin-bottom: 32px;
  }
  .results-tab {
    padding: 10px 20px;
    font-size: 14px;
    font-family: -apple-system, sans-serif;
    color: var(--brown-mute);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1.5px;
    transition: all 0.2s;
    background: none;
    border-top: none;
    border-left: none;
    border-right: none;
  }
  .results-tab.active {
    color: var(--brown-deep);
    border-bottom-color: var(--gold);
  }

  .tab-panel { display: none; }
  .tab-panel.active { display: block; }

  /* Checklist */
  .checklist-group { margin-bottom: 32px; }
  .checklist-milestone {
    font-size: 11px;
    font-family: -apple-system, sans-serif;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--brown-hint);
  }
  .checklist-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #F0E8D0;
  }
  .checklist-item:last-child { border-bottom: none; }
  .check-box {
    width: 20px;
    height: 20px;
    border: 1.5px solid var(--brown-hint);
    border-radius: 4px;
    flex-shrink: 0;
    margin-top: 2px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .check-box:hover { border-color: var(--gold); }
  .check-box.checked {
    background: var(--gold);
    border-color: var(--gold);
  }
  .check-label { font-size: 14px; color: var(--brown-deep); font-family: -apple-system, sans-serif; line-height: 1.5; }
  .check-trad {
    display: inline-block;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    margin-left: 6px;
    font-family: -apple-system, sans-serif;
    vertical-align: middle;
  }

  /* Ceremony */
  .ceremony-item {
    display: flex;
    gap: 20px;
    padding: 16px 0;
    border-bottom: 1px solid #F0E8D0;
    align-items: flex-start;
  }
  .ceremony-num {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--gold-pale);
    border: 1.5px solid var(--brown-hint);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--brown-mute);
    flex-shrink: 0;
    font-family: -apple-system, sans-serif;
  }
  .ceremony-content { flex: 1; }
  .ceremony-name { font-size: 16px; color: var(--brown-deep); margin-bottom: 4px; }
  .ceremony-meta { font-size: 12px; color: var(--brown-mute); font-family: -apple-system, sans-serif; line-height: 1.6; }
  .ceremony-trad {
    display: inline-block;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    margin-bottom: 4px;
    font-family: -apple-system, sans-serif;
  }

  /* Budget */
  .budget-total {
    font-size: 36px;
    color: var(--brown-deep);
    margin-bottom: 4px;
    letter-spacing: -1px;
  }
  .budget-subtitle {
    font-size: 14px;
    color: var(--brown-mute);
    font-family: -apple-system, sans-serif;
    margin-bottom: 32px;
  }
  .budget-bar-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }
  .budget-cat { font-size: 13px; color: var(--brown-deep); width: 160px; flex-shrink: 0; font-family: -apple-system, sans-serif; }
  .budget-bar-wrap { flex: 1; background: var(--brown-hint); border-radius: 3px; height: 8px; overflow: hidden; }
  .budget-bar-fill { height: 100%; background: var(--gold); border-radius: 3px; }
  .budget-amt { font-size: 13px; color: var(--brown-mute); font-family: -apple-system, sans-serif; min-width: 70px; text-align: right; }

  /* Conflicts */
  .conflict-banner {
    background: #FFF8E0;
    border: 1px solid var(--gold);
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 16px;
    font-size: 13px;
    font-family: -apple-system, sans-serif;
    color: var(--brown-mid);
    line-height: 1.5;
  }
  .conflict-banner strong { color: var(--brown-deep); }

  /* Loading */
  #loading-screen {
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
  }
  #loading-screen.active { display: flex; }
  .loading-flower {
    animation: spin 2s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .loading-text {
    font-size: 18px;
    color: var(--brown-mid);
    text-align: center;
  }
  .loading-sub {
    font-size: 13px;
    color: var(--brown-mute);
    font-family: -apple-system, sans-serif;
    text-align: center;
  }

  /* Error */
  .error-msg {
    font-size: 13px;
    color: var(--danger);
    font-family: -apple-system, sans-serif;
    margin-top: 8px;
    display: none;
  }
  .error-msg.show { display: block; }
</style>
</head>
<body>

<div id="progress-bar"><div id="progress-fill"></div></div>

<div id="header">
  <a id="logo" href="/">
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="4" fill="#C8A820"/>
      <ellipse cx="16" cy="8" rx="3" ry="5" fill="#F7D44C" opacity="0.9"/>
      <ellipse cx="16" cy="24" rx="3" ry="5" fill="#F7D44C" opacity="0.9"/>
      <ellipse cx="8" cy="16" rx="5" ry="3" fill="#F7D44C" opacity="0.9"/>
      <ellipse cx="24" cy="16" rx="5" ry="3" fill="#F7D44C" opacity="0.9"/>
      <ellipse cx="10.3" cy="10.3" rx="3" ry="5" fill="#E8C020" opacity="0.75" transform="rotate(-45 10.3 10.3)"/>
      <ellipse cx="21.7" cy="21.7" rx="3" ry="5" fill="#E8C020" opacity="0.75" transform="rotate(-45 21.7 21.7)"/>
      <ellipse cx="21.7" cy="10.3" rx="3" ry="5" fill="#E8C020" opacity="0.75" transform="rotate(45 21.7 10.3)"/>
      <ellipse cx="10.3" cy="21.7" rx="3" ry="5" fill="#E8C020" opacity="0.75" transform="rotate(45 10.3 21.7)"/>
    </svg>
    <span id="logo-text">Marigold</span>
  </a>
  <div id="nav-links">
    <span id="step-indicator"></span>
    <a href="/advisor" class="nav-link">Advisor review →</a>
  </div>
</div>

<div id="screens">

  <!-- Q1: Names -->
  <div class="screen active" id="q1">
    <div class="q-wrap">
      <div class="q-eyebrow">Let's begin</div>
      <div class="q-text">What are your names?</div>
      <div class="q-hint">We'll use these throughout your plan — so it feels like yours, not a template.</div>
      <div class="name-row">
        <div class="field-group">
          <label class="field-label">Partner one</label>
          <input type="text" id="name1" placeholder="e.g. Priya" autocomplete="given-name" autofocus>
        </div>
        <div class="field-group">
          <label class="field-label">Partner two</label>
          <input type="text" id="name2" placeholder="e.g. James" autocomplete="given-name">
        </div>
      </div>
      <div class="error-msg" id="err-q1">Please enter both names to continue.</div>
      <div class="cta-row">
        <button class="btn-next" onclick="goNext(1)">Continue →</button>
      </div>
    </div>
  </div>

  <!-- Q2: Date -->
  <div class="screen" id="q2">
    <div class="q-wrap">
      <div class="q-eyebrow">Your wedding</div>
      <div class="q-text" id="q2-text">When is the wedding?</div>
      <div class="q-hint">Approximate is absolutely fine — you can always update this later.</div>
      <input type="date" id="wedding-date" style="max-width:300px">
      <div class="cta-row">
        <button class="btn-next" onclick="goNext(2)">Continue →</button>
        <button class="btn-skip" onclick="goNext(2, true)">Not sure yet</button>
      </div>
    </div>
  </div>

  <!-- Q3: Location -->
  <div class="screen" id="q3">
    <div class="q-wrap">
      <div class="q-eyebrow">Where</div>
      <div class="q-text" id="q3-text">Where are you getting married?</div>
      <div class="q-hint">City and state/country is enough — we'll use this for vendor recommendations.</div>
      <input type="text" id="location" placeholder="e.g. New Jersey, US" style="max-width:400px">
      <div class="cta-row">
        <button class="btn-next" onclick="goNext(3)">Continue →</button>
        <button class="btn-skip" onclick="goNext(3, true)">Not decided yet</button>
      </div>
    </div>
  </div>

  <!-- Q4: Traditions -->
  <div class="screen" id="q4">
    <div class="q-wrap">
      <div class="q-eyebrow">Cultural traditions</div>
      <div class="q-text" id="q4-text">Which traditions will your wedding honour?</div>
      <div class="q-hint">Select up to two. If yours isn't listed, choose the closest and tell us more after.</div>
      <input type="text" id="tradition-search" placeholder="Search traditions…" oninput="filterTraditions()">
      <div class="tradition-grid" id="tradition-grid"></div>
      <div class="trad-note" id="trad-note">0 selected — select 1 or 2</div>
      <div class="error-msg" id="err-q4">Please select at least one tradition.</div>
      <div class="cta-row">
        <button class="btn-next" onclick="goNext(4)">Continue →</button>
      </div>
    </div>
  </div>

  <!-- Q5: Budget -->
  <div class="screen" id="q5">
    <div class="q-wrap">
      <div class="q-eyebrow">Budget</div>
      <div class="q-text" id="q5-text">What's your total estimated budget?</div>
      <div class="q-hint">We'll allocate this across every part of your wedding based on your traditions.</div>
      <div class="budget-display"><span>$</span><span id="budget-val">50,000</span></div>
      <input type="range" id="budget-slider" min="10000" max="500000" step="5000" value="50000" oninput="updateBudget()">
      <div class="budget-labels">
        <span>$10k</span>
        <span>$500k+</span>
      </div>
      <div class="cta-row">
        <button class="btn-next" onclick="goNext(5)">Continue →</button>
        <button class="btn-skip" onclick="goNext(5, true)">Not sure yet</button>
      </div>
    </div>
  </div>

  <!-- Q6: Guest count -->
  <div class="screen" id="q6">
    <div class="q-wrap">
      <div class="q-eyebrow">Guests</div>
      <div class="q-text" id="q6-text">How many guests are you expecting?</div>
      <div class="q-hint">A rough number is fine — this helps us size your venue and catering recommendations.</div>
      <div class="guest-stepper">
        <button class="stepper-btn" onclick="adjustGuests(-25)">−</button>
        <div class="stepper-count" id="guest-count">100</div>
        <button class="stepper-btn" onclick="adjustGuests(25)">+</button>
      </div>
      <div style="font-size:13px;color:var(--brown-mute);font-family:-apple-system,sans-serif">guests across all events</div>
      <div class="cta-row">
        <button class="btn-next" onclick="goNext(6)">Build my plan →</button>
        <button class="btn-skip" onclick="goNext(6, true)">Not sure yet</button>
      </div>
    </div>
  </div>

  <!-- Loading -->
  <div class="screen" id="loading-screen">
    <svg class="loading-flower" width="48" height="48" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="4" fill="#C8A820"/>
      <ellipse cx="16" cy="8" rx="3" ry="5" fill="#F7D44C" opacity="0.9"/>
      <ellipse cx="16" cy="24" rx="3" ry="5" fill="#F7D44C" opacity="0.9"/>
      <ellipse cx="8" cy="16" rx="5" ry="3" fill="#F7D44C" opacity="0.9"/>
      <ellipse cx="24" cy="16" rx="5" ry="3" fill="#F7D44C" opacity="0.9"/>
      <ellipse cx="10.3" cy="10.3" rx="3" ry="5" fill="#E8C020" opacity="0.75" transform="rotate(-45 10.3 10.3)"/>
      <ellipse cx="21.7" cy="21.7" rx="3" ry="5" fill="#E8C020" opacity="0.75" transform="rotate(-45 21.7 21.7)"/>
      <ellipse cx="21.7" cy="10.3" rx="3" ry="5" fill="#E8C020" opacity="0.75" transform="rotate(45 21.7 10.3)"/>
      <ellipse cx="10.3" cy="21.7" rx="3" ry="5" fill="#E8C020" opacity="0.75" transform="rotate(45 10.3 21.7)"/>
    </svg>
    <div class="loading-text" id="loading-text">Building your plan…</div>
    <div class="loading-sub" id="loading-sub">Reading your traditions from the cultural taxonomy</div>
  </div>

  <!-- Results -->
  <div class="screen" id="results-screen">
    <div class="results-wrap">
      <div class="results-hero">
        <h1 id="results-title">Your wedding plan</h1>
        <p id="results-subtitle"></p>
      </div>
      <div id="conflicts-container"></div>
      <div class="results-tabs">
        <button class="results-tab active" onclick="switchTab('checklist')">Checklist</button>
        <button class="results-tab" onclick="switchTab('ceremonies')">Ceremony timeline</button>
        <button class="results-tab" onclick="switchTab('budget')">Budget</button>
      </div>
      <div class="tab-panel active" id="tab-checklist"></div>
      <div class="tab-panel" id="tab-ceremonies"></div>
      <div class="tab-panel" id="tab-budget"></div>
    </div>
  </div>

</div>

<script>
// ── State ──
const state = {
  name1: '', name2: '',
  date: '', location: '',
  traditions: [],
  budget: 50000,
  guests: 100,
  plan: null,
};

// ── Traditions list (from live DB slugs) ──
const TRADITIONS = [
  { slug:'sikh',                  label:'Sikh',                           region:'South Asian' },
  { slug:'north-indian-punjabi',  label:'Hindu · North Indian / Punjabi', region:'South Asian' },
  { slug:'bengali-hindu',         label:'Hindu · Bengali',                region:'South Asian' },
  { slug:'gujarati',              label:'Hindu · Gujarati',               region:'South Asian' },
  { slug:'marathi',               label:'Hindu · Marathi',                region:'South Asian' },
  { slug:'tamil-hindu',           label:'Hindu · Tamil',                  region:'South Asian' },
  { slug:'kashmiri-pandit',       label:'Hindu · Kashmiri Pandit',        region:'South Asian' },
  { slug:'kerala-nair',           label:'Hindu · Kerala / Nair',          region:'South Asian' },
  { slug:'andhra-telugu',         label:'Hindu · Andhra / Telugu',        region:'South Asian' },
  { slug:'assamese-hindu',        label:'Hindu · Assamese',               region:'South Asian' },
  { slug:'bihari-hindu',          label:'Hindu · Bihari',                 region:'South Asian' },
  { slug:'odia-hindu',            label:'Hindu · Odia',                   region:'South Asian' },
  { slug:'rajasthani-marwari',    label:'Rajasthani (Marwari)',           region:'South Asian' },
  { slug:'rajasthani-rajput',     label:'Rajasthani (Rajput)',            region:'South Asian' },
  { slug:'vedic-general',         label:'Vedic (General)',                region:'South Asian' },
  { slug:'arya-samaj',            label:'Arya Samaj',                     region:'South Asian' },
  { slug:'jain-shwetambar',       label:'Jain (Shwetambar)',              region:'South Asian' },
  { slug:'dawoodi-bohra',         label:'Dawoodi Bohra',                  region:'South Asian' },
  { slug:'muslim-nikah',          label:'Muslim · Nikah',                 region:'Muslim' },
  { slug:'hausa-muslim',          label:'Muslim · West African (Hausa)',  region:'Muslim' },
  { slug:'jewish-reform-conservative', label:'Jewish · Reform / Conservative', region:'Jewish' },
  { slug:'christian-western',     label:'Christian / Western',            region:'Christian' },
  { slug:'catholic',              label:'Catholic',                       region:'Christian' },
  { slug:'greek-orthodox',        label:'Greek Orthodox',                 region:'Christian' },
  { slug:'mexican-catholic',      label:'Mexican Catholic',               region:'Latin American' },
  { slug:'latin-american-catholic',label:'Latin American Catholic',       region:'Latin American' },
  { slug:'cuban',                 label:'Cuban',                          region:'Caribbean' },
  { slug:'yoruba-nigerian',       label:'Nigerian · Yoruba',              region:'West African' },
  { slug:'chinese-taiwanese',     label:'Chinese / Taiwanese',            region:'East Asian' },
  { slug:'korean',                label:'Korean',                         region:'East Asian' },
  { slug:'thai-buddhist',         label:'Thai Buddhist',                  region:'Buddhist' },
  { slug:'sri-lankan-buddhist',   label:'Sri Lankan Buddhist',            region:'Buddhist' },
  { slug:'filipino-catholic',     label:'Filipino Catholic',              region:'Southeast Asian' },
  { slug:'manipuri-vaishnavite',  label:'Manipuri (Vaishnavite)',         region:'South Asian' },
  { slug:'khasi',                 label:'Khasi',                          region:'South Asian' },
];

// ── Tradition colours ──
const TRAD_COLORS = {
  'South Asian': { bg:'#EEEDFE', color:'#3C3489' },
  'Muslim':      { bg:'#E1F5EE', color:'#085041' },
  'Jewish':      { bg:'#E6F1FB', color:'#0C447C' },
  'Christian':   { bg:'#FAECE7', color:'#993C1D' },
  'West African':{ bg:'#FBEAF0', color:'#72243E' },
  'East Asian':  { bg:'#FDF8E8', color:'#9A7E10' },
  'Buddhist':    { bg:'#EAF3DE', color:'#27500A' },
  'Latin American':{ bg:'#FCEBEB', color:'#791F1F' },
  'Caribbean':   { bg:'#FAEEDA', color:'#633806' },
  'Southeast Asian':{ bg:'#E1F5EE', color:'#085041' },
};

function tradColor(region) {
  return TRAD_COLORS[region] || { bg:'#F1EFE8', color:'#444441' };
}

// ── Build tradition grid ──
function buildTraditionGrid() {
  const grid = document.getElementById('tradition-grid');
  grid.innerHTML = TRADITIONS.map(t => \`
    <button class="trad-chip" data-slug="\${t.slug}" data-region="\${t.region}" onclick="toggleTradition('\${t.slug}')">
      \${t.label}
    </button>\`).join('');
}

function filterTraditions() {
  const q = document.getElementById('tradition-search').value.toLowerCase();
  document.querySelectorAll('.trad-chip').forEach(chip => {
    const match = chip.textContent.toLowerCase().includes(q);
    chip.style.display = match ? '' : 'none';
  });
}

function toggleTradition(slug) {
  const idx = state.traditions.indexOf(slug);
  if (idx > -1) {
    state.traditions.splice(idx, 1);
  } else {
    if (state.traditions.length >= 2) {
      // deselect first
      const old = state.traditions.shift();
      document.querySelector(\`.trad-chip[data-slug="\${old}"]\`)?.classList.remove('selected');
    }
    state.traditions.push(slug);
  }
  document.querySelectorAll('.trad-chip').forEach(chip => {
    chip.classList.toggle('selected', state.traditions.includes(chip.dataset.slug));
  });
  const n = state.traditions.length;
  document.getElementById('trad-note').textContent =
    n === 0 ? '0 selected — select 1 or 2' :
    n === 1 ? \`1 selected — add a second tradition for an interfaith plan\` :
    \`2 traditions selected\`;
}

// ── Budget ──
function updateBudget() {
  const v = parseInt(document.getElementById('budget-slider').value);
  state.budget = v;
  document.getElementById('budget-val').textContent = v >= 1000
    ? (v >= 1000000 ? (v/1000000).toFixed(1)+'M' : (v/1000).toFixed(0)+'k')
    : v.toLocaleString();
  // Actually show full number nicely
  document.getElementById('budget-val').textContent = v.toLocaleString();
}

// ── Guests ──
let guests = 100;
function adjustGuests(delta) {
  guests = Math.max(10, Math.min(1000, guests + delta));
  document.getElementById('guest-count').textContent = guests;
  state.guests = guests;
}

// ── Personalise questions ──
function personalise() {
  const n1 = state.name1 || 'you';
  const n2 = state.name2;
  const names = n2 ? \`\${n1} and \${n2}\` : n1;
  document.getElementById('q2-text').innerHTML = \`When is your wedding, <em>\${n1}</em>?\`;
  document.getElementById('q3-text').innerHTML = \`Where are <em>\${names}</em> getting married?\`;
  document.getElementById('q4-text').innerHTML = \`Which traditions will <em>\${names + "'s"}</em> wedding honour?\`;
  document.getElementById('q5-text').innerHTML = \`What's your estimated budget, <em>\${n1}</em>?\`;
  document.getElementById('q6-text').innerHTML = \`How many guests are you expecting?\`;
}

// ── Navigation ──
let currentQ = 1;
const TOTAL_Q = 6;

function goNext(from, skip = false) {
  // Validate
  if (from === 1) {
    const n1 = document.getElementById('name1').value.trim();
    const n2 = document.getElementById('name2').value.trim();
    if (!n1 || !n2) {
      document.getElementById('err-q1').classList.add('show');
      return;
    }
    document.getElementById('err-q1').classList.remove('show');
    state.name1 = n1;
    state.name2 = n2;
    personalise();
  }
  if (from === 2 && !skip) {
    state.date = document.getElementById('wedding-date').value;
  }
  if (from === 3 && !skip) {
    state.location = document.getElementById('location').value.trim();
  }
  if (from === 4) {
    if (state.traditions.length === 0) {
      document.getElementById('err-q4').classList.add('show');
      return;
    }
    document.getElementById('err-q4').classList.remove('show');
  }
  if (from === 5 && !skip) {
    state.budget = parseInt(document.getElementById('budget-slider').value);
  }
  if (from === 6) {
    state.guests = guests;
    submitPlan();
    return;
  }

  const next = from + 1;
  transition(currentQ, next);
  currentQ = next;
  updateProgress();
}

function transition(from, to) {
  const fromEl = document.getElementById(\`q\${from}\`);
  const toEl = document.getElementById(\`q\${to}\`);
  fromEl.classList.add('exit-left');
  fromEl.classList.remove('active');
  setTimeout(() => {
    fromEl.classList.remove('exit-left');
    toEl.classList.add('active');
  }, 300);
}

function updateProgress() {
  const pct = ((currentQ - 1) / TOTAL_Q) * 100;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('step-indicator').textContent = \`\${currentQ} of \${TOTAL_Q}\`;
}

// ── Submit to engine ──
async function submitPlan() {
  // Show loading
  const q6 = document.getElementById('q6');
  q6.classList.add('exit-left');
  q6.classList.remove('active');
  setTimeout(() => {
    q6.classList.remove('exit-left');
    const loading = document.getElementById('loading-screen');
    loading.classList.add('active');
  }, 300);

  document.getElementById('progress-fill').style.width = '90%';
  document.getElementById('step-indicator').textContent = '';

  const loadingMessages = [
    ['Building your plan…', 'Reading your traditions from the cultural taxonomy'],
    ['Merging traditions…', 'Combining checklists and resolving conflicts'],
    ['Allocating your budget…', 'Distributing across ceremony and vendor categories'],
    ['Almost ready…', 'Finalising your personalised wedding plan'],
  ];
  let msgIdx = 0;
  const msgInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % loadingMessages.length;
    document.getElementById('loading-text').textContent = loadingMessages[msgIdx][0];
    document.getElementById('loading-sub').textContent = loadingMessages[msgIdx][1];
  }, 1800);

  try {
    const res = await fetch('https://marigold-engine-test.vercel.app/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        traditionSlugs: state.traditions,
        totalBudget: state.budget,
        jurisdiction: state.location || 'US',
      }),
    });

    const data = await res.json();
    clearInterval(msgInterval);

    if (!data.success) {
      showError(data.error || 'Something went wrong generating your plan.');
      return;
    }

    state.plan = data.plan;
    showResults();

  } catch (err) {
    clearInterval(msgInterval);
    showError('Could not connect to the plan engine. Please try again.');
  }
}

function showError(msg) {
  const loading = document.getElementById('loading-screen');
  loading.classList.remove('active');
  document.getElementById('loading-text').textContent = 'Something went wrong';
  document.getElementById('loading-sub').textContent = msg;
  loading.classList.add('active');
  document.getElementById('progress-fill').style.width = '0%';
}

// ── Render results ──
function showResults() {
  const loading = document.getElementById('loading-screen');
  loading.classList.add('exit-left');
  loading.classList.remove('active');

  setTimeout(() => {
    loading.classList.remove('exit-left');
    const results = document.getElementById('results-screen');
    results.classList.add('active');
  }, 300);

  document.getElementById('progress-fill').style.width = '100%';
  document.getElementById('step-indicator').textContent = '';

  const plan = state.plan;
  const names = state.name2 ? \`\${state.name1} & \${state.name2}\` : state.name1;
  const tradNames = state.traditions.map(s =>
    TRADITIONS.find(t => t.slug === s)?.label || s
  ).join(' + ');

  document.getElementById('results-title').innerHTML =
    \`<em>\${names}</em> — your wedding plan\`;
  document.getElementById('results-subtitle').textContent =
    \`\${tradNames} · \${state.budget.toLocaleString('en-US', {style:'currency', currency:'USD', maximumFractionDigits:0})} budget · \${state.guests} guests\`;

  // Conflicts
  const conflictsEl = document.getElementById('conflicts-container');
  if (plan.conflicts && plan.conflicts.length > 0) {
    conflictsEl.innerHTML = plan.conflicts.map(c => \`
      <div class="conflict-banner">
        <strong>⚠ \${c.type?.replace(/_/g,' ') || 'Note'}</strong> — \${c.description || c.message || JSON.stringify(c)}
      </div>\`).join('');
  }

  // Checklist
  renderChecklist(plan.checklist || []);

  // Ceremonies
  renderCeremonies(plan.ceremonySequence || plan.ceremonies || []);

  // Budget
  renderBudget(plan.budget || plan.budgetBreakdown || []);
}

function renderChecklist(items) {
  const el = document.getElementById('tab-checklist');
  if (!items.length) {
    el.innerHTML = '<p style="color:var(--brown-mute);font-family:-apple-system,sans-serif;font-size:14px;padding:20px 0">No checklist items found.</p>';
    return;
  }

  // Group by milestone
  const groups = {};
  items.forEach(item => {
    const m = item.milestone || item.timeframe || 'General';
    if (!groups[m]) groups[m] = [];
    groups[m].push(item);
  });

  el.innerHTML = Object.entries(groups).map(([milestone, its]) => {
    const rows = its.map((item, i) => {
      const label = item.label || item.task || item.description || JSON.stringify(item);
      const trad = item.tradition || item.source;
      const region = trad ? (TRADITIONS.find(t=>t.slug===trad)?.region || 'South Asian') : null;
      const col = region ? tradColor(region) : null;
      return \`<div class="checklist-item">
        <div class="check-box" onclick="this.classList.toggle('checked')"></div>
        <div class="check-label">
          \${label}
          \${col ? \`<span class="check-trad" style="background:\${col.bg};color:\${col.color}">\${TRADITIONS.find(t=>t.slug===trad)?.label?.split('·')[0]?.trim() || trad}</span>\` : ''}
        </div>
      </div>\`;
    }).join('');
    return \`<div class="checklist-group">
      <div class="checklist-milestone">\${milestone}</div>
      \${rows}
    </div>\`;
  }).join('');
}

function renderCeremonies(items) {
  const el = document.getElementById('tab-ceremonies');
  if (!items.length) {
    el.innerHTML = '<p style="color:var(--brown-mute);font-family:-apple-system,sans-serif;font-size:14px;padding:20px 0">No ceremony sequence found.</p>';
    return;
  }

  // Build Gantt-style visual timeline
  const TIMELINE = ['12m','10m','8m','6m','4m','3m','2m','1m','Day','After'];
  const TIMING_MAP = {
    '12 months':0,'10 months':1,'8 months':2,'6 months':3,'4 months':4,
    '3 months':5,'2 months':6,'1 month':7,'day of':8,'day-of':8,'after':9,'following':9
  };

  function timingToCol(t) {
    if (!t) return 8;
    const tl = t.toLowerCase();
    for (const [k,v] of Object.entries(TIMING_MAP)) if (tl.includes(k)) return v;
    return 8;
  }

  // Selected ceremonies state
  if (!window.selectedCeremonies) {
    window.selectedCeremonies = new Set(items.map((_,i)=>i));
  }

  const tradColors = {
    'South Asian': '#534AB7','Muslim':'#0F6E56','Jewish':'#185FA5',
    'Christian':'#993C1D','West African':'#72243E','East Asian':'#9A7E10',
    'Buddhist':'#27500A','Latin American':'#791F1F','Caribbean':'#633806',
    'Southeast Asian':'#085041','Global':'#888780',
  };

  function getTradColor(trad) {
    const t = TRADITIONS.find(x=>x.slug===trad);
    return t ? (tradColors[t.region] || '#888780') : '#888780';
  }

  // Gantt rows
  const ganttRows = items.map((item, i) => {
    const col = timingToCol(item.timing || item.timeframe || '');
    const dur = item.duration ? 1 : 0.5;
    const tradSlug = item.tradition || item.source || '';
    const color = getTradColor(tradSlug);
    const selected = window.selectedCeremonies.has(i);
    const name = item.name || item.event || item.ceremony || '';
    const region = TRADITIONS.find(x=>x.slug===tradSlug)?.region || 'Global';

    return `<div class="gantt-row-q" data-idx="${i}" style="opacity:${selected?1:0.35}">
      <div class="gantt-label-q">
        <input type="checkbox" ${selected?'checked':''} onchange="toggleCeremony(${i})" style="accent-color:var(--gold);margin-right:6px">
        <span style="font-size:12px;color:var(--brown-deep);font-family:-apple-system,sans-serif;line-height:1.3">${name}</span>
      </div>
      <div class="gantt-track-q">
        ${TIMELINE.map((_,ci) => `<div class="gantt-cell-q ${ci===8?'gantt-day-col':''}"></div>`).join('')}
        <div class="gantt-bar-q" style="
          left:calc(${col} * (100% / ${TIMELINE.length}));
          width:calc(${Math.max(dur,0.4)} * (100% / ${TIMELINE.length}));
          background:${color};
        " title="${name} — ${item.timing||''}&#10;${item.notes||''}">
          <span>${name}</span>
        </div>
      </div>
    </div>`;
  }).join('');

  // Legend
  const traditions = [...new Set(items.map(i=>i.tradition||i.source).filter(Boolean))];
  const legend = traditions.map(slug => {
    const t = TRADITIONS.find(x=>x.slug===slug);
    if (!t) return '';
    return `<div style="display:flex;align-items:center;gap:5px;font-size:11px;font-family:-apple-system,sans-serif;color:var(--brown-mute)">
      <div style="width:10px;height:10px;border-radius:2px;background:${getTradColor(slug)};flex-shrink:0"></div>
      ${t.label}
    </div>`;
  }).join('');

  el.innerHTML = `
    <style>
      .gantt-container-q { overflow-x:auto; border:1px solid #E8DDB8; border-radius:10px; margin-bottom:24px; }
      .gantt-header-q { display:flex; border-bottom:1px solid #E8DDB8; background:#FDFAF0; }
      .gantt-label-header-q { width:220px;flex-shrink:0;padding:8px 12px;font-size:10px;font-family:-apple-system,sans-serif;color:var(--brown-mute);border-right:1px solid #E8DDB8; }
      .gantt-months-q { flex:1;display:grid;grid-template-columns:repeat(10,1fr); }
      .gantt-month-q { text-align:center;padding:8px 2px;font-size:10px;font-family:-apple-system,sans-serif;color:var(--brown-mute);border-right:1px solid #F0E8D0; }
      .gantt-month-q.day-col { background:rgba(200,168,32,0.08);color:#9A7E10;font-weight:600; }
      .gantt-row-q { display:flex;align-items:center;border-bottom:1px solid #F0E8D0;min-height:38px;transition:opacity 0.2s; }
      .gantt-row-q:last-child { border-bottom:none; }
      .gantt-row-q:hover { background:#FFFDF5; }
      .gantt-label-q { width:220px;flex-shrink:0;padding:6px 12px;border-right:1px solid #E8DDB8;display:flex;align-items:flex-start; }
      .gantt-track-q { flex:1;position:relative;height:38px;display:grid;grid-template-columns:repeat(10,1fr); }
      .gantt-cell-q { border-right:1px solid #F0E8D0;height:100%; }
      .gantt-day-col { background:rgba(200,168,32,0.06); }
      .gantt-bar-q { position:absolute;top:50%;transform:translateY(-50%);height:22px;border-radius:4px;display:flex;align-items:center;padding:0 8px;font-size:10px;color:white;font-family:-apple-system,sans-serif;white-space:nowrap;overflow:hidden;cursor:default;transition:opacity 0.2s; }
      .gantt-bar-q:hover { opacity:0.85; }
      .gantt-bar-q span { overflow:hidden;text-overflow:ellipsis; }
    </style>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">${legend}</div>
    <p style="font-size:12px;color:var(--brown-mute);font-family:-apple-system,sans-serif;margin-bottom:12px">
      ✓ = included in your plan · uncheck any ceremony you don't want
    </p>
    <div class="gantt-container-q">
      <div class="gantt-header-q">
        <div class="gantt-label-header-q">Ceremony / Event</div>
        <div class="gantt-months-q">
          ${TIMELINE.map((m,i)=>`<div class="gantt-month-q ${i===8?'day-col':''}">${m}</div>`).join('')}
        </div>
      </div>
      ${ganttRows}
    </div>
    <p style="font-size:11px;color:var(--brown-hint);font-family:-apple-system,sans-serif">
      ${window.selectedCeremonies.size} of ${items.length} ceremonies included
    </p>`;
}

window.toggleCeremony = function(idx) {
  if (window.selectedCeremonies.has(idx)) {
    window.selectedCeremonies.delete(idx);
  } else {
    window.selectedCeremonies.add(idx);
  }
  if (state.plan) renderCeremonies(state.plan.ceremonySequence || state.plan.ceremonies || []);
}


function renderBudget(items) {
  const el = document.getElementById('tab-budget');
  if (!items.length) {
    el.innerHTML = '<p style="color:var(--brown-mute);font-family:-apple-system,sans-serif;font-size:14px;padding:20px 0">No budget breakdown found.</p>';
    return;
  }

  const total = state.budget;
  const formatted = total.toLocaleString('en-US', {style:'currency', currency:'USD', maximumFractionDigits:0});

  const bars = items.map(item => {
    const cat = item.category || item.name || 'Other';
    const pct = item.pct_mid || item.pct || ((item.pct_low + item.pct_high) / 2) || 10;
    const amt = Math.round(total * pct / 100);
    const amtFmt = amt.toLocaleString('en-US', {style:'currency', currency:'USD', maximumFractionDigits:0});
    return \`<div class="budget-bar-row">
      <div class="budget-cat">\${cat}</div>
      <div class="budget-bar-wrap"><div class="budget-bar-fill" style="width:\${Math.min(pct*2,100)}%"></div></div>
      <div class="budget-amt">\${amtFmt}</div>
    </div>\`;
  }).join('');

  el.innerHTML = \`
    <div class="budget-total">\${formatted}</div>
    <div class="budget-subtitle">estimated total · allocated across \${items.length} categories</div>
    \${bars}\`;
}

function switchTab(name) {
  document.querySelectorAll('.results-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(\`[onclick="switchTab('\${name}')"]\`).classList.add('active');
  document.getElementById(\`tab-\${name}\`).classList.add('active');
}

// ── Keyboard navigation ──
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && currentQ <= TOTAL_Q) {
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen && !activeScreen.id.includes('results') && !activeScreen.id.includes('loading')) {
      const btn = activeScreen.querySelector('.btn-next');
      if (btn) btn.click();
    }
  }
});

// ── Init ──
buildTraditionGrid();
updateProgress();
updateBudget();

// Set min date to today
const today = new Date().toISOString().split('T')[0];
document.getElementById('wedding-date').min = today;
</script>
</body>
</html>
`;

const app = express();
app.use(express.json());

// Supabase client — server-side only, uses the secret key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Landing page — links to questionnaire (couples) and advisor review (advisors)
const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Marigold Weddings</title>
<link rel="stylesheet" href="/brand.css">
<style>
  html, body {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
  }
  .tagline {
    font-size: 15px;
    color: var(--muted);
    font-style: italic;
    margin-bottom: 56px;
    text-align: center;
    line-height: 1.6;
    max-width: 360px;
  }
  .cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    max-width: 540px;
    width: 100%;
    margin-bottom: 48px;
  }
  @media (max-width: 480px) { .cards { grid-template-columns: 1fr; } }
  .card {
    background: white;
    border: 1px solid var(--bdr);
    border-radius: 14px;
    padding: 26px 22px;
    text-decoration: none;
    color: var(--tx);
    transition: border-color 0.2s, transform 0.15s;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .card:hover { border-color: var(--gd); transform: translateY(-2px); }
  .card.primary { border-color: var(--gd); background: #FFFAEA; }
  .card-ey {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    font-style: italic;
  }
  .card-title {
    font-size: 17px;
    font-style: italic;
    color: var(--deep);
    margin-top: 2px;
  }
  .card-desc {
    font-size: 12px;
    color: var(--muted);
    font-style: italic;
    line-height: 1.6;
    margin-top: 4px;
  }
  .card-cta {
    font-size: 11px;
    color: var(--gk);
    font-style: italic;
    margin-top: 10px;
    letter-spacing: 0.5px;
  }
  .footer {
    font-size: 11px;
    color: var(--bdr);
    font-style: italic;
    text-align: center;
    line-height: 1.8;
  }
  .status-dot {
    display: inline-block;
    width: 6px; height: 6px;
    background: #27AE60;
    border-radius: 50%;
    margin-right: 4px;
    vertical-align: middle;
  }
  .flower-landing {
    margin-bottom: 28px;
  }
  h1 {
    font-size: 28px;
    font-weight: 400;
    font-style: italic;
    color: var(--deep);
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }
</style>
</head>
<body>

<svg class="flower-landing" width="52" height="52" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
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

<h1>marigold</h1>
<p class="tagline">Your wedding, your traditions. Planning that actually gets it.</p>

<div class="cards">
  <a href="/questionnaire" class="card primary">
    <div class="card-ey">For couples</div>
    <div class="card-title">Build your wedding plan</div>
    <div class="card-desc">Answer 6 questions. Get a personalised plan built from our cultural taxonomy — checklist, ceremony journey, and budget.</div>
    <div class="card-cta">Start now →</div>
  </a>
  <a href="/advisor" class="card">
    <div class="card-ey">For advisors</div>
    <div class="card-title">Review cultural content</div>
    <div class="card-desc">Review, edit, and approve taxonomy entries across all traditions. Changes go live immediately in the engine.</div>
    <div class="card-cta">Open advisor review →</div>
  </a>
</div>

<div class="footer">
  <span class="status-dot"></span>Engine live &middot; 35 traditions &middot; Supabase connected<br>
  Confidential &mdash; internal build &middot; June 2026
</div>

</body>
</html>`;/ ============================================================================
// MARIGOLD ENGINE TEST SERVER
// A minimal Express app to prove the deterministic CIE works end-to-end
// against real Supabase data. Completely separate from the demo (server.js).
// ============================================================================
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { calculateBudget } = require('./engine/budgetCalculator');
const { mergeTraditions } = require('./engine/interfaithMerge');
const UNIVERSAL_CHECKLIST = require('./engine/universalChecklist.json');


const QUESTIONNAIRE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Marigold — Your wedding plan</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cream:  #FDFAF0;
    --warm:   #F5F0E8;
    --deep:   #3C3010;
    --tx:     #2A2010;
    --muted:  #9A8A6A;
    --bdr:    #E0D4B0;
    --g:      #F7D44C;
    --gd:     #C8A820;
    --gk:     #9A7E10;
  }

  html, body {
    height: 100%;
    background: var(--cream);
    color: var(--tx);
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 15px;
    line-height: 1.7;
    overflow: hidden;
  }

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

  /* ── Header ── */
  #header {
    position: fixed;
    top: 2px; left: 0; right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 24px;
    border-bottom: 1px solid var(--bdr);
    background: var(--cream);
    z-index: 100;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    cursor: pointer;
  }
  .bname {
    font-size: 12px;
    letter-spacing: 3px;
    color: var(--deep);
    font-style: italic;
  }
  #header-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  #step-indicator {
    font-size: 11px;
    color: var(--muted);
    font-style: italic;
  }
  .nav-pill {
    font-size: 11px;
    letter-spacing: 1px;
    color: var(--muted);
    text-decoration: none;
    padding: 5px 14px;
    border: 1px solid var(--bdr);
    border-radius: 100px;
    font-family: 'Playfair Display', serif;
    font-style: italic;
    transition: all 0.2s;
    background: transparent;
    cursor: pointer;
  }
  .nav-pill:hover {
    border-color: var(--gd);
    background: var(--warm);
    color: var(--deep);
  }

  /* ── Flower SVG (reusable) ── */
  .flower-mark { flex-shrink: 0; }

  /* ── Screens ── */
  #screens {
    position: fixed;
    inset: 0;
    top: 57px;
    overflow: hidden;
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
  input[type="date"].fi { font-style: normal; font-size: 15px; }

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
    <svg class="flower-mark" width="26" height="26" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
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
    <a href="/advisor" class="nav-pill">Advisor review</a>
  </div>
</div>

<div id="screens">

  <!-- Q1: Names -->
  <div class="screen active" id="q1">
    <div class="q-wrap">
      <div class="ql">Let's begin</div>
      <div class="qt">What are your names?</div>
      <div class="qs">We'll weave these through your plan — so it feels personal, not like a template.</div>
      <div class="name-row">
        <div class="field-group">
          <label class="field-label">Partner one</label>
          <input type="text" class="fi" id="name1" placeholder="e.g. Priya" autocomplete="given-name" autofocus>
        </div>
        <div class="field-group">
          <label class="field-label">Partner two</label>
          <input type="text" class="fi" id="name2" placeholder="e.g. James" autocomplete="given-name">
        </div>
      </div>
      <div class="err" id="err-q1">Please enter both names to continue.</div>
      <div class="cta-row">
        <button class="cta" onclick="goNext(1)">Continue</button>
      </div>
    </div>
  </div>

  <!-- Q2: Date -->
  <div class="screen" id="q2">
    <div class="q-wrap">
      <div class="ql">Your wedding</div>
      <div class="qt" id="q2-text">When is the wedding?</div>
      <div class="qs">Approximate is absolutely fine — you can always refine this later.</div>
      <input type="date" class="fi" id="wedding-date" style="max-width:280px">
      <div class="cta-row">
        <button class="cta" onclick="goNext(2)">Continue</button>
        <button class="back-link" onclick="goNext(2, true)">Not sure yet</button>
      </div>
    </div>
  </div>

  <!-- Q3: Location -->
  <div class="screen" id="q3">
    <div class="q-wrap">
      <div class="ql">Where</div>
      <div class="qt" id="q3-text">Where are you getting married?</div>
      <div class="qs">City and state or country is enough — we use this for vendor recommendations.</div>
      <input type="text" class="fi" id="location" placeholder="e.g. New Jersey, US" style="max-width:380px">
      <div class="cta-row">
        <button class="cta" onclick="goNext(3)">Continue</button>
        <button class="back-link" onclick="goNext(3, true)">Not decided yet</button>
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
        <button class="cta" onclick="goNext(4)">Continue</button>
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
        <button class="cta" onclick="goNext(6)">Build my plan</button>
        <button class="back-link" onclick="goNext(6, true)">Not sure yet</button>
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
    </div>
  </div>

</div>

<script>
// ── State ──
const S = { name1:'', name2:'', date:'', location:'', traditions:[], budget:50000, guests:100, plan:null };
let guests = 100;
let currentQ = 1;
const TOTAL_Q = 6;

// ── Traditions ──
const TRADS = [
  {slug:'sikh',label:'Sikh',region:'South Asian'},
  {slug:'north-indian-punjabi',label:'Hindu · North Indian / Punjabi',region:'South Asian'},
  {slug:'bengali-hindu',label:'Hindu · Bengali',region:'South Asian'},
  {slug:'gujarati',label:'Hindu · Gujarati',region:'South Asian'},
  {slug:'marathi',label:'Hindu · Marathi',region:'South Asian'},
  {slug:'tamil-hindu',label:'Hindu · Tamil',region:'South Asian'},
  {slug:'kashmiri-pandit',label:'Hindu · Kashmiri Pandit',region:'South Asian'},
  {slug:'kerala-nair',label:'Hindu · Kerala / Nair',region:'South Asian'},
  {slug:'andhra-telugu',label:'Hindu · Andhra / Telugu',region:'South Asian'},
  {slug:'assamese-hindu',label:'Hindu · Assamese',region:'South Asian'},
  {slug:'bihari-hindu',label:'Hindu · Bihari',region:'South Asian'},
  {slug:'odia-hindu',label:'Hindu · Odia',region:'South Asian'},
  {slug:'rajasthani-marwari',label:'Rajasthani (Marwari)',region:'South Asian'},
  {slug:'rajasthani-rajput',label:'Rajasthani (Rajput)',region:'South Asian'},
  {slug:'vedic-general',label:'Vedic (General)',region:'South Asian'},
  {slug:'arya-samaj',label:'Arya Samaj',region:'South Asian'},
  {slug:'jain-shwetambar',label:'Jain (Shwetambar)',region:'South Asian'},
  {slug:'dawoodi-bohra',label:'Dawoodi Bohra',region:'South Asian'},
  {slug:'manipuri-vaishnavite',label:'Manipuri (Vaishnavite)',region:'South Asian'},
  {slug:'khasi',label:'Khasi',region:'South Asian'},
  {slug:'muslim-nikah',label:'Muslim · Nikah',region:'Muslim'},
  {slug:'hausa-muslim',label:'Muslim · West African (Hausa)',region:'Muslim'},
  {slug:'jewish-reform-conservative',label:'Jewish · Reform / Conservative',region:'Jewish'},
  {slug:'christian-western',label:'Christian / Western',region:'Christian'},
  {slug:'catholic',label:'Catholic',region:'Christian'},
  {slug:'greek-orthodox',label:'Greek Orthodox',region:'Christian'},
  {slug:'mexican-catholic',label:'Mexican Catholic',region:'Latin American'},
  {slug:'latin-american-catholic',label:'Latin American Catholic',region:'Latin American'},
  {slug:'cuban',label:'Cuban',region:'Caribbean'},
  {slug:'yoruba-nigerian',label:'Nigerian · Yoruba',region:'West African'},
  {slug:'chinese-taiwanese',label:'Chinese / Taiwanese',region:'East Asian'},
  {slug:'korean',label:'Korean',region:'East Asian'},
  {slug:'thai-buddhist',label:'Thai Buddhist',region:'Buddhist'},
  {slug:'sri-lankan-buddhist',label:'Sri Lankan Buddhist',region:'Buddhist'},
  {slug:'filipino-catholic',label:'Filipino Catholic',region:'Southeast Asian'},
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

// ── Guests ──
function adjGuests(d) {
  guests = Math.max(10, Math.min(1000, guests + d));
  document.getElementById('guest-count').textContent = guests;
  S.guests = guests;
}

// ── Personalise questions ──
function personalise() {
  const n1 = S.name1 || 'you';
  const names = S.name2 ? \`\${S.name1} and \${S.name2}\` : n1;
  document.getElementById('q2-text').innerHTML = \`When is <em>\${n1}</em>'s wedding?\`;
  document.getElementById('q3-text').innerHTML = \`Where are <em>\${names}</em> getting married?\`;
  document.getElementById('q4-text').innerHTML = \`Which traditions will <em>\${names}</em> honour?\`;
  document.getElementById('q5-text').innerHTML = \`What's your estimated budget, <em>\${n1}</em>?\`;
  document.getElementById('q6-text').innerHTML = \`How many guests are you expecting?\`;
}

// ── Navigation ──
function goNext(from, skip=false) {
  if (from===1) {
    const n1 = document.getElementById('name1').value.trim();
    const n2 = document.getElementById('name2').value.trim();
    if (!n1||!n2) { document.getElementById('err-q1').classList.add('show'); return; }
    document.getElementById('err-q1').classList.remove('show');
    S.name1=n1; S.name2=n2; personalise();
  }
  if (from===2 && !skip) S.date = document.getElementById('wedding-date').value;
  if (from===3 && !skip) S.location = document.getElementById('location').value.trim();
  if (from===4) {
    if (!S.traditions.length) { document.getElementById('err-q4').classList.add('show'); return; }
    document.getElementById('err-q4').classList.remove('show');
  }
  if (from===5 && !skip) S.budget = parseInt(document.getElementById('budget-slider').value);
  if (from===6) { S.guests=guests; submitPlan(); return; }

  doTransition(currentQ, from+1);
  currentQ = from+1;
  updateProgress();
}

function doTransition(from, to) {
  const a = document.getElementById(\`q\${from}\`);
  const b = document.getElementById(\`q\${to}\`);
  a.classList.add('exit-left'); a.classList.remove('active');
  setTimeout(()=>{ a.classList.remove('exit-left'); b.classList.add('active'); }, 260);
}

function updateProgress() {
  document.getElementById('progress-fill').style.width = ((currentQ-1)/TOTAL_Q*100)+'%';
  document.getElementById('step-indicator').textContent = \`\${currentQ} of \${TOTAL_Q}\`;
}

// ── Submit ──
const LOADING_MSGS = [
  ['Building your plan…','Reading your traditions from the cultural taxonomy'],
  ['Merging traditions…','Combining checklists and resolving any conflicts'],
  ['Allocating your budget…','Distributing across ceremony and vendor categories'],
  ['Almost ready…','Finalising your personalised wedding plan'],
];

async function submitPlan() {
  const q6 = document.getElementById('q6');
  q6.classList.add('exit-left'); q6.classList.remove('active');
  setTimeout(()=>{ q6.classList.remove('exit-left'); document.getElementById('loading-screen').classList.add('active'); }, 260);
  document.getElementById('progress-fill').style.width='90%';
  document.getElementById('step-indicator').textContent='';

  let mi=0;
  const iv = setInterval(()=>{
    mi=(mi+1)%LOADING_MSGS.length;
    document.getElementById('loading-text').textContent=LOADING_MSGS[mi][0];
    document.getElementById('loading-sub').textContent=LOADING_MSGS[mi][1];
  },1800);

  try {
    const res = await fetch('https://marigold-engine-test.vercel.app/api/generate-plan',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({slugs:S.traditions, budget:S.budget, jurisdiction:S.location||'US'}),
    });
    const data = await res.json();
    clearInterval(iv);
    if (!data.success) { showErr(data.error||'Something went wrong.'); return; }
    S.plan=data.plan; showResults();
  } catch(e) {
    clearInterval(iv); showErr('Could not connect to the plan engine. Please try again.');
  }
}

function showErr(msg) {
  document.getElementById('loading-text').textContent='Something went wrong';
  document.getElementById('loading-sub').textContent=msg;
}

// ── Results ──
function showResults() {
  const ls = document.getElementById('loading-screen');
  ls.classList.add('exit-left'); ls.classList.remove('active');
  setTimeout(()=>{ ls.classList.remove('exit-left'); document.getElementById('results-screen').classList.add('active'); },260);
  document.getElementById('progress-fill').style.width='100%';

  const p = S.plan;
  const names = S.name2?\`\${S.name1} & \${S.name2}\`:S.name1;
  const tradNames = S.traditions.map(s=>TRADS.find(t=>t.slug===s)?.label||s).join(' + ');

  document.getElementById('results-title').innerHTML = \`<em>\${names}</em> — your wedding plan\`;
  document.getElementById('results-subtitle').textContent = \`\${tradNames} · \${S.budget.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})} · \${S.guests} guests\`;

  if (p.conflicts?.length) {
    document.getElementById('conflicts-wrap').innerHTML = p.conflicts.map(c=>
      \`<div class="conflict-banner">Note — \${c.description||c.message||JSON.stringify(c)}</div>\`
    ).join('');
  }

  renderChecklist(p.checklist||[]);
  renderCeremonies(p.ceremonySequence||p.ceremonies||[]);
  renderBudget(p.budget||p.budgetBreakdown||[]);
}

function switchTab(name, btn) {
  document.querySelectorAll('.out-tab').forEach(t=>t.classList.remove('on'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById(\`tab-\${name}\`).classList.add('on');
}

// ── Render checklist ──
function renderChecklist(items) {
  const el = document.getElementById('tab-checklist');
  if (!items.length) { el.innerHTML='<p style="color:var(--muted);font-style:italic;font-size:13px;padding:20px 0">No checklist items found.</p>'; return; }
  const groups={};
  items.forEach(item=>{ const m=item.milestone||item.timeframe||'General'; if(!groups[m])groups[m]=[]; groups[m].push(item); });
  el.innerHTML = Object.entries(groups).map(([m,its])=>\`
    <div class="out-ey">\${m}</div>
    \${its.map(item=>{
      const label = item.label||item.task||item.description||'';
      const trad = item.tradition||item.source;
      const col = trad?tradColor(trad):null;
      return \`<div class="checklist-item">
        <div class="check-box" onclick="this.classList.toggle('checked')"></div>
        <div class="check-label">\${label}\${col?\`<span class="trad-tag" style="background:\${col.bg};color:\${col.color};border-color:\${col.bg}">\${TRADS.find(t=>t.slug===trad)?.label?.split('·')[0]?.trim()||trad}</span>\`:''}</div>
      </div>\`;
    }).join('')}\`
  ).join('');
}

// ── Render ceremony vertical timeline ──
function renderCeremonies(items) {
  const el = document.getElementById('tab-ceremonies');
  if (!items.length) { el.innerHTML='<p style="color:var(--muted);font-style:italic;font-size:13px;padding:20px 0">No ceremony sequence found.</p>'; return; }

  if (!window.selectedCeremonies) window.selectedCeremonies = new Set(items.map((_,i)=>i));

  el.innerHTML = \`
    <p style="font-size:12px;color:var(--muted);font-style:italic;margin-bottom:20px">
      Click any ceremony to expand details. Uncheck ceremonies you don't want included.
    </p>
    <div class="ceremony-timeline">
      \${items.map((item,i)=>{
        const name = item.name||item.event||item.ceremony||'';
        const timing = item.timing||item.timeframe||'';
        const duration = item.duration||'';
        const size = item.typical_size||item.guestSize||'';
        const loc = item.location_type||item.locationType||'';
        const notes = item.notes||'';
        const trad = item.tradition||item.source||'';
        const col = tradColor(trad);
        const tradLabel = trad?(TRADS.find(t=>t.slug===trad)?.label||trad):'';
        const selected = window.selectedCeremonies.has(i);

        return \`<div class="ceremony-card" id="cc-\${i}" onclick="toggleCard(\${i})" style="opacity:\${selected?1:0.4}">
          <div class="ceremony-dot" style="background:\${col.color};border-color:var(--cream)"></div>
          <div class="ceremony-header">
            <div class="ceremony-meta-wrap">
              \${tradLabel?\`<div class="ceremony-trad-tag" style="background:\${col.bg};color:\${col.color}">\${tradLabel.split('·')[0].trim()}</div>\`:''}
              <div class="ceremony-name">\${name}</div>
              <div class="ceremony-timing">\${timing}\${duration?' · '+duration:''}</div>
            </div>
            <div class="ceremony-toggle">›</div>
          </div>
          <div class="ceremony-body" onclick="event.stopPropagation()">
            <div style="margin-bottom:10px">
              \${size?\`<div class="ceremony-detail-row"><span class="ceremony-detail-label">Guest size</span><span class="ceremony-detail-val">\${size}</span></div>\`:''}
              \${loc?\`<div class="ceremony-detail-row"><span class="ceremony-detail-label">Location</span><span class="ceremony-detail-val">\${loc}</span></div>\`:''}
            </div>
            \${notes?\`<div class="ceremony-notes">\${notes}</div>\`:''}
            <div class="ceremony-include">
              <input type="checkbox" \${selected?'checked':''} onchange="toggleCeremony(\${i},event)">
              Include this ceremony in my plan
            </div>
          </div>
        </div>\`;
      }).join('')}
    </div>
    <p style="font-size:11px;color:var(--muted);font-style:italic;margin-top:16px">
      \${window.selectedCeremonies.size} of \${items.length} ceremonies included
    </p>\`;
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
function renderBudget(items) {
  const el = document.getElementById('tab-budget');
  if (!items.length) { el.innerHTML='<p style="color:var(--muted);font-style:italic;font-size:13px;padding:20px 0">No budget breakdown found.</p>'; return; }
  const total = S.budget;
  el.innerHTML = \`
    <div class="budget-total-display">\${total.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})}</div>
    <div class="budget-sub">allocated across \${items.length} categories</div>
    \${items.map(item=>{
      const cat = item.category||item.name||'Other';
      const pct = item.pct_mid||item.pct||((item.pct_low||0)+(item.pct_high||0))/2||10;
      const amt = Math.round(total*pct/100);
      return \`<div class="budget-row">
        <div class="budget-cat">\${cat}</div>
        <div class="budget-track"><div class="budget-fill" style="width:\${Math.min(pct*2,100)}%"></div></div>
        <div class="budget-amt">\${amt.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})}</div>
      </div>\`;
    }).join('')}\`;
}

// ── Keyboard ──
document.addEventListener('keydown', e=>{
  if (e.key==='Enter' && currentQ<=TOTAL_Q) {
    const btn = document.querySelector('.screen.active .cta');
    if (btn) btn.click();
  }
});

// ── Init ──
buildGrid();
updateProgress();
updateBudget();
const today = new Date().toISOString().split('T')[0];
document.getElementById('wedding-date').min = today;
</script>
</body>
</html>
`;/ ============================================================================
// MARIGOLD ENGINE TEST SERVER
// A minimal Express app to prove the deterministic CIE works end-to-end
// against real Supabase data. Completely separate from the demo (server.js).
// ============================================================================
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { calculateBudget } = require('./engine/budgetCalculator');
const { mergeTraditions } = require('./engine/interfaithMerge');
const UNIVERSAL_CHECKLIST = require('./engine/universalChecklist.json');


const QUESTIONNAIRE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Marigold — Your wedding plan</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --gold:       #C8A820;
    --gold-light: #F7D44C;
    --gold-pale:  #FDFAF0;
    --brown-deep: #3C3010;
    --brown-mid:  #6B5A20;
    --brown-mute: #9A8A6A;
    --brown-hint: #D4C8A0;
    --white:      #FFFFFF;
    --danger:     #C0392B;
  }

  html, body {
    height: 100%;
    background: var(--gold-pale);
    color: var(--brown-deep);
    font-family: Georgia, 'Times New Roman', serif;
    overflow: hidden;
  }

  /* ── Progress bar ── */
  #progress-bar {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--brown-hint);
    z-index: 100;
  }
  #progress-fill {
    height: 100%;
    background: var(--gold);
    transition: width 0.5s ease;
    width: 0%;
  }

  /* ── Header ── */
  #header {
    position: fixed;
    top: 12px; left: 0; right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
    z-index: 99;
  }
  #nav-links {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .nav-link {
    font-size: 12px;
    font-family: -apple-system, sans-serif;
    color: var(--brown-mute);
    text-decoration: none;
    padding: 5px 12px;
    border: 1px solid var(--brown-hint);
    border-radius: 6px;
    transition: all 0.2s;
    background: white;
  }
  .nav-link:hover {
    border-color: var(--gold);
    color: var(--brown-mid);
  }
  #logo {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
  }
  #logo svg { width: 28px; height: 28px; }
  #logo-text {
    font-size: 15px;
    font-weight: normal;
    color: var(--brown-mid);
    letter-spacing: 0.5px;
  }
  #step-indicator {
    font-size: 12px;
    color: var(--brown-mute);
    font-family: -apple-system, sans-serif;
    letter-spacing: 0.3px;
  }

  /* ── Screen container ── */
  #screens {
    position: fixed;
    inset: 0;
    overflow: hidden;
  }

  .screen {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 32px 100px;
    opacity: 0;
    pointer-events: none;
    transform: translateX(60px);
    transition: opacity 0.4s ease, transform 0.4s ease;
  }
  .screen.active {
    opacity: 1;
    pointer-events: all;
    transform: translateX(0);
  }
  .screen.exit-left {
    opacity: 0;
    transform: translateX(-60px);
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  /* ── Question content ── */
  .q-wrap {
    width: 100%;
    max-width: 620px;
  }
  .q-eyebrow {
    font-size: 11px;
    font-family: -apple-system, sans-serif;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 16px;
  }
  .q-text {
    font-size: clamp(22px, 4vw, 34px);
    line-height: 1.3;
    color: var(--brown-deep);
    margin-bottom: 8px;
    font-weight: normal;
  }
  .q-text em {
    color: var(--gold);
    font-style: normal;
  }
  .q-hint {
    font-size: 14px;
    color: var(--brown-mute);
    margin-bottom: 36px;
    font-family: -apple-system, sans-serif;
    line-height: 1.6;
  }

  /* ── Text inputs ── */
  .name-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 8px;
  }
  @media (max-width: 500px) {
    .name-row { grid-template-columns: 1fr; }
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .field-label {
    font-size: 11px;
    font-family: -apple-system, sans-serif;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--brown-mute);
  }
  input[type="text"], input[type="date"], input[type="number"] {
    width: 100%;
    padding: 14px 16px;
    font-size: 18px;
    font-family: Georgia, serif;
    color: var(--brown-deep);
    background: var(--white);
    border: 1.5px solid var(--brown-hint);
    border-radius: 8px;
    outline: none;
    transition: border-color 0.2s;
  }
  input:focus {
    border-color: var(--gold);
  }
  input::placeholder {
    color: var(--brown-hint);
  }

  /* ── Option buttons ── */
  .options {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 8px;
  }
  .options.two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  @media (max-width: 500px) {
    .options.two-col { grid-template-columns: 1fr; }
  }

  .option-btn {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 20px;
    background: var(--white);
    border: 1.5px solid var(--brown-hint);
    border-radius: 10px;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.2s, background 0.2s;
    font-family: Georgia, serif;
    font-size: 16px;
    color: var(--brown-deep);
  }
  .option-btn:hover {
    border-color: var(--gold);
    background: #FFFDF5;
  }
  .option-btn.selected {
    border-color: var(--gold);
    background: #FFFAEA;
  }
  .option-btn .opt-key {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1.5px solid var(--brown-hint);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-family: -apple-system, sans-serif;
    color: var(--brown-mute);
    flex-shrink: 0;
    transition: all 0.2s;
  }
  .option-btn.selected .opt-key {
    background: var(--gold);
    border-color: var(--gold);
    color: var(--brown-deep);
  }
  .option-btn .opt-label { flex: 1; line-height: 1.4; }
  .option-btn .opt-sub {
    font-size: 12px;
    color: var(--brown-mute);
    font-family: -apple-system, sans-serif;
    margin-top: 2px;
  }

  /* ── Tradition search ── */
  #tradition-search {
    width: 100%;
    padding: 14px 16px;
    font-size: 16px;
    font-family: -apple-system, sans-serif;
    color: var(--brown-deep);
    background: var(--white);
    border: 1.5px solid var(--brown-hint);
    border-radius: 8px;
    outline: none;
    margin-bottom: 12px;
    transition: border-color 0.2s;
  }
  #tradition-search:focus { border-color: var(--gold); }

  .tradition-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px;
    max-height: 280px;
    overflow-y: auto;
    padding-right: 4px;
  }
  .tradition-grid::-webkit-scrollbar { width: 4px; }
  .tradition-grid::-webkit-scrollbar-track { background: transparent; }
  .tradition-grid::-webkit-scrollbar-thumb { background: var(--brown-hint); border-radius: 2px; }

  .trad-chip {
    padding: 10px 14px;
    background: var(--white);
    border: 1.5px solid var(--brown-hint);
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-family: -apple-system, sans-serif;
    color: var(--brown-deep);
    transition: all 0.15s;
    text-align: left;
    line-height: 1.3;
  }
  .trad-chip:hover { border-color: var(--gold); background: #FFFDF5; }
  .trad-chip.selected {
    border-color: var(--gold);
    background: #FFFAEA;
    color: var(--brown-deep);
  }
  .trad-chip.selected::before {
    content: '✓ ';
    color: var(--gold);
    font-weight: bold;
  }
  .trad-note {
    font-size: 11px;
    color: var(--brown-mute);
    margin-top: 8px;
    font-family: -apple-system, sans-serif;
  }

  /* ── Budget slider ── */
  .budget-display {
    font-size: 42px;
    color: var(--brown-deep);
    margin-bottom: 8px;
    letter-spacing: -1px;
  }
  .budget-display span {
    font-size: 20px;
    color: var(--brown-mute);
    vertical-align: super;
    font-size: 22px;
  }
  input[type="range"] {
    width: 100%;
    margin: 16px 0 8px;
    accent-color: var(--gold);
    height: 6px;
    cursor: pointer;
  }
  .budget-labels {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--brown-mute);
    font-family: -apple-system, sans-serif;
  }

  /* ── Guest count ── */
  .guest-stepper {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 16px;
  }
  .stepper-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 1.5px solid var(--brown-hint);
    background: var(--white);
    font-size: 24px;
    cursor: pointer;
    color: var(--brown-deep);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    font-family: -apple-system, sans-serif;
  }
  .stepper-btn:hover { border-color: var(--gold); background: #FFFDF5; }
  .stepper-count {
    font-size: 52px;
    color: var(--brown-deep);
    min-width: 80px;
    text-align: center;
    letter-spacing: -2px;
  }

  /* ── CTA ── */
  .cta-row {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-top: 28px;
  }
  .btn-next {
    padding: 14px 32px;
    background: var(--gold);
    color: var(--brown-deep);
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-family: Georgia, serif;
    font-style: italic;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
    letter-spacing: 0.3px;
  }
  .btn-next:hover { background: var(--gold-light); }
  .btn-next:active { transform: scale(0.98); }
  .btn-next:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-skip {
    font-size: 13px;
    color: var(--brown-mute);
    background: none;
    border: none;
    cursor: pointer;
    font-family: -apple-system, sans-serif;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .btn-skip:hover { color: var(--brown-mid); }

  /* ── Results screen ── */
  #results-screen {
    overflow-y: auto;
    padding: 100px 32px 80px;
    align-items: flex-start;
    justify-content: flex-start;
  }
  .results-wrap {
    width: 100%;
    max-width: 780px;
    margin: 0 auto;
  }
  .results-hero {
    margin-bottom: 48px;
  }
  .results-hero h1 {
    font-size: clamp(26px, 4vw, 40px);
    font-weight: normal;
    color: var(--brown-deep);
    line-height: 1.2;
    margin-bottom: 12px;
  }
  .results-hero h1 em { color: var(--gold); font-style: normal; }
  .results-hero p {
    font-size: 16px;
    color: var(--brown-mute);
    font-family: -apple-system, sans-serif;
    line-height: 1.6;
  }

  .results-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1.5px solid var(--brown-hint);
    margin-bottom: 32px;
  }
  .results-tab {
    padding: 10px 20px;
    font-size: 14px;
    font-family: -apple-system, sans-serif;
    color: var(--brown-mute);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1.5px;
    transition: all 0.2s;
    background: none;
    border-top: none;
    border-left: none;
    border-right: none;
  }
  .results-tab.active {
    color: var(--brown-deep);
    border-bottom-color: var(--gold);
  }

  .tab-panel { display: none; }
  .tab-panel.active { display: block; }

  /* Checklist */
  .checklist-group { margin-bottom: 32px; }
  .checklist-milestone {
    font-size: 11px;
    font-family: -apple-system, sans-serif;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--brown-hint);
  }
  .checklist-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #F0E8D0;
  }
  .checklist-item:last-child { border-bottom: none; }
  .check-box {
    width: 20px;
    height: 20px;
    border: 1.5px solid var(--brown-hint);
    border-radius: 4px;
    flex-shrink: 0;
    margin-top: 2px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .check-box:hover { border-color: var(--gold); }
  .check-box.checked {
    background: var(--gold);
    border-color: var(--gold);
  }
  .check-label { font-size: 14px; color: var(--brown-deep); font-family: -apple-system, sans-serif; line-height: 1.5; }
  .check-trad {
    display: inline-block;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    margin-left: 6px;
    font-family: -apple-system, sans-serif;
    vertical-align: middle;
  }

  /* Ceremony */
  .ceremony-item {
    display: flex;
    gap: 20px;
    padding: 16px 0;
    border-bottom: 1px solid #F0E8D0;
    align-items: flex-start;
  }
  .ceremony-num {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--gold-pale);
    border: 1.5px solid var(--brown-hint);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--brown-mute);
    flex-shrink: 0;
    font-family: -apple-system, sans-serif;
  }
  .ceremony-content { flex: 1; }
  .ceremony-name { font-size: 16px; color: var(--brown-deep); margin-bottom: 4px; }
  .ceremony-meta { font-size: 12px; color: var(--brown-mute); font-family: -apple-system, sans-serif; line-height: 1.6; }
  .ceremony-trad {
    display: inline-block;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    margin-bottom: 4px;
    font-family: -apple-system, sans-serif;
  }

  /* Budget */
  .budget-total {
    font-size: 36px;
    color: var(--brown-deep);
    margin-bottom: 4px;
    letter-spacing: -1px;
  }
  .budget-subtitle {
    font-size: 14px;
    color: var(--brown-mute);
    font-family: -apple-system, sans-serif;
    margin-bottom: 32px;
  }
  .budget-bar-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }
  .budget-cat { font-size: 13px; color: var(--brown-deep); width: 160px; flex-shrink: 0; font-family: -apple-system, sans-serif; }
  .budget-bar-wrap { flex: 1; background: var(--brown-hint); border-radius: 3px; height: 8px; overflow: hidden; }
  .budget-bar-fill { height: 100%; background: var(--gold); border-radius: 3px; }
  .budget-amt { font-size: 13px; color: var(--brown-mute); font-family: -apple-system, sans-serif; min-width: 70px; text-align: right; }

  /* Conflicts */
  .conflict-banner {
    background: #FFF8E0;
    border: 1px solid var(--gold);
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 16px;
    font-size: 13px;
    font-family: -apple-system, sans-serif;
    color: var(--brown-mid);
    line-height: 1.5;
  }
  .conflict-banner strong { color: var(--brown-deep); }

  /* Loading */
  #loading-screen {
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
  }
  #loading-screen.active { display: flex; }
  .loading-flower {
    animation: spin 2s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .loading-text {
    font-size: 18px;
    color: var(--brown-mid);
    text-align: center;
  }
  .loading-sub {
    font-size: 13px;
    color: var(--brown-mute);
    font-family: -apple-system, sans-serif;
    text-align: center;
  }

  /* Error */
  .error-msg {
    font-size: 13px;
    color: var(--danger);
    font-family: -apple-system, sans-serif;
    margin-top: 8px;
    display: none;
  }
  .error-msg.show { display: block; }
</style>
</head>
<body>

<div id="progress-bar"><div id="progress-fill"></div></div>

<div id="header">
  <a id="logo" href="/">
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="4" fill="#C8A820"/>
      <ellipse cx="16" cy="8" rx="3" ry="5" fill="#F7D44C" opacity="0.9"/>
      <ellipse cx="16" cy="24" rx="3" ry="5" fill="#F7D44C" opacity="0.9"/>
      <ellipse cx="8" cy="16" rx="5" ry="3" fill="#F7D44C" opacity="0.9"/>
      <ellipse cx="24" cy="16" rx="5" ry="3" fill="#F7D44C" opacity="0.9"/>
      <ellipse cx="10.3" cy="10.3" rx="3" ry="5" fill="#E8C020" opacity="0.75" transform="rotate(-45 10.3 10.3)"/>
      <ellipse cx="21.7" cy="21.7" rx="3" ry="5" fill="#E8C020" opacity="0.75" transform="rotate(-45 21.7 21.7)"/>
      <ellipse cx="21.7" cy="10.3" rx="3" ry="5" fill="#E8C020" opacity="0.75" transform="rotate(45 21.7 10.3)"/>
      <ellipse cx="10.3" cy="21.7" rx="3" ry="5" fill="#E8C020" opacity="0.75" transform="rotate(45 10.3 21.7)"/>
    </svg>
    <span id="logo-text">Marigold</span>
  </a>
  <div id="nav-links">
    <span id="step-indicator"></span>
    <a href="/advisor" class="nav-link">Advisor review →</a>
  </div>
</div>

<div id="screens">

  <!-- Q1: Names -->
  <div class="screen active" id="q1">
    <div class="q-wrap">
      <div class="q-eyebrow">Let's begin</div>
      <div class="q-text">What are your names?</div>
      <div class="q-hint">We'll use these throughout your plan — so it feels like yours, not a template.</div>
      <div class="name-row">
        <div class="field-group">
          <label class="field-label">Partner one</label>
          <input type="text" id="name1" placeholder="e.g. Priya" autocomplete="given-name" autofocus>
        </div>
        <div class="field-group">
          <label class="field-label">Partner two</label>
          <input type="text" id="name2" placeholder="e.g. James" autocomplete="given-name">
        </div>
      </div>
      <div class="error-msg" id="err-q1">Please enter both names to continue.</div>
      <div class="cta-row">
        <button class="btn-next" onclick="goNext(1)">Continue →</button>
      </div>
    </div>
  </div>

  <!-- Q2: Date -->
  <div class="screen" id="q2">
    <div class="q-wrap">
      <div class="q-eyebrow">Your wedding</div>
      <div class="q-text" id="q2-text">When is the wedding?</div>
      <div class="q-hint">Approximate is absolutely fine — you can always update this later.</div>
      <input type="date" id="wedding-date" style="max-width:300px">
      <div class="cta-row">
        <button class="btn-next" onclick="goNext(2)">Continue →</button>
        <button class="btn-skip" onclick="goNext(2, true)">Not sure yet</button>
      </div>
    </div>
  </div>

  <!-- Q3: Location -->
  <div class="screen" id="q3">
    <div class="q-wrap">
      <div class="q-eyebrow">Where</div>
      <div class="q-text" id="q3-text">Where are you getting married?</div>
      <div class="q-hint">City and state/country is enough — we'll use this for vendor recommendations.</div>
      <input type="text" id="location" placeholder="e.g. New Jersey, US" style="max-width:400px">
      <div class="cta-row">
        <button class="btn-next" onclick="goNext(3)">Continue →</button>
        <button class="btn-skip" onclick="goNext(3, true)">Not decided yet</button>
      </div>
    </div>
  </div>

  <!-- Q4: Traditions -->
  <div class="screen" id="q4">
    <div class="q-wrap">
      <div class="q-eyebrow">Cultural traditions</div>
      <div class="q-text" id="q4-text">Which traditions will your wedding honour?</div>
      <div class="q-hint">Select up to two. If yours isn't listed, choose the closest and tell us more after.</div>
      <input type="text" id="tradition-search" placeholder="Search traditions…" oninput="filterTraditions()">
      <div class="tradition-grid" id="tradition-grid"></div>
      <div class="trad-note" id="trad-note">0 selected — select 1 or 2</div>
      <div class="error-msg" id="err-q4">Please select at least one tradition.</div>
      <div class="cta-row">
        <button class="btn-next" onclick="goNext(4)">Continue →</button>
      </div>
    </div>
  </div>

  <!-- Q5: Budget -->
  <div class="screen" id="q5">
    <div class="q-wrap">
      <div class="q-eyebrow">Budget</div>
      <div class="q-text" id="q5-text">What's your total estimated budget?</div>
      <div class="q-hint">We'll allocate this across every part of your wedding based on your traditions.</div>
      <div class="budget-display"><span>$</span><span id="budget-val">50,000</span></div>
      <input type="range" id="budget-slider" min="10000" max="500000" step="5000" value="50000" oninput="updateBudget()">
      <div class="budget-labels">
        <span>$10k</span>
        <span>$500k+</span>
      </div>
      <div class="cta-row">
        <button class="btn-next" onclick="goNext(5)">Continue →</button>
        <button class="btn-skip" onclick="goNext(5, true)">Not sure yet</button>
      </div>
    </div>
  </div>

  <!-- Q6: Guest count -->
  <div class="screen" id="q6">
    <div class="q-wrap">
      <div class="q-eyebrow">Guests</div>
      <div class="q-text" id="q6-text">How many guests are you expecting?</div>
      <div class="q-hint">A rough number is fine — this helps us size your venue and catering recommendations.</div>
      <div class="guest-stepper">
        <button class="stepper-btn" onclick="adjustGuests(-25)">−</button>
        <div class="stepper-count" id="guest-count">100</div>
        <button class="stepper-btn" onclick="adjustGuests(25)">+</button>
      </div>
      <div style="font-size:13px;color:var(--brown-mute);font-family:-apple-system,sans-serif">guests across all events</div>
      <div class="cta-row">
        <button class="btn-next" onclick="goNext(6)">Build my plan →</button>
        <button class="btn-skip" onclick="goNext(6, true)">Not sure yet</button>
      </div>
    </div>
  </div>

  <!-- Loading -->
  <div class="screen" id="loading-screen">
    <svg class="loading-flower" width="48" height="48" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="4" fill="#C8A820"/>
      <ellipse cx="16" cy="8" rx="3" ry="5" fill="#F7D44C" opacity="0.9"/>
      <ellipse cx="16" cy="24" rx="3" ry="5" fill="#F7D44C" opacity="0.9"/>
      <ellipse cx="8" cy="16" rx="5" ry="3" fill="#F7D44C" opacity="0.9"/>
      <ellipse cx="24" cy="16" rx="5" ry="3" fill="#F7D44C" opacity="0.9"/>
      <ellipse cx="10.3" cy="10.3" rx="3" ry="5" fill="#E8C020" opacity="0.75" transform="rotate(-45 10.3 10.3)"/>
      <ellipse cx="21.7" cy="21.7" rx="3" ry="5" fill="#E8C020" opacity="0.75" transform="rotate(-45 21.7 21.7)"/>
      <ellipse cx="21.7" cy="10.3" rx="3" ry="5" fill="#E8C020" opacity="0.75" transform="rotate(45 21.7 10.3)"/>
      <ellipse cx="10.3" cy="21.7" rx="3" ry="5" fill="#E8C020" opacity="0.75" transform="rotate(45 10.3 21.7)"/>
    </svg>
    <div class="loading-text" id="loading-text">Building your plan…</div>
    <div class="loading-sub" id="loading-sub">Reading your traditions from the cultural taxonomy</div>
  </div>

  <!-- Results -->
  <div class="screen" id="results-screen">
    <div class="results-wrap">
      <div class="results-hero">
        <h1 id="results-title">Your wedding plan</h1>
        <p id="results-subtitle"></p>
      </div>
      <div id="conflicts-container"></div>
      <div class="results-tabs">
        <button class="results-tab active" onclick="switchTab('checklist')">Checklist</button>
        <button class="results-tab" onclick="switchTab('ceremonies')">Ceremony timeline</button>
        <button class="results-tab" onclick="switchTab('budget')">Budget</button>
      </div>
      <div class="tab-panel active" id="tab-checklist"></div>
      <div class="tab-panel" id="tab-ceremonies"></div>
      <div class="tab-panel" id="tab-budget"></div>
    </div>
  </div>

</div>

<script>
// ── State ──
const state = {
  name1: '', name2: '',
  date: '', location: '',
  traditions: [],
  budget: 50000,
  guests: 100,
  plan: null,
};

// ── Traditions list (from live DB slugs) ──
const TRADITIONS = [
  { slug:'sikh',                  label:'Sikh',                           region:'South Asian' },
  { slug:'north-indian-punjabi',  label:'Hindu · North Indian / Punjabi', region:'South Asian' },
  { slug:'bengali-hindu',         label:'Hindu · Bengali',                region:'South Asian' },
  { slug:'gujarati',              label:'Hindu · Gujarati',               region:'South Asian' },
  { slug:'marathi',               label:'Hindu · Marathi',                region:'South Asian' },
  { slug:'tamil-hindu',           label:'Hindu · Tamil',                  region:'South Asian' },
  { slug:'kashmiri-pandit',       label:'Hindu · Kashmiri Pandit',        region:'South Asian' },
  { slug:'kerala-nair',           label:'Hindu · Kerala / Nair',          region:'South Asian' },
  { slug:'andhra-telugu',         label:'Hindu · Andhra / Telugu',        region:'South Asian' },
  { slug:'assamese-hindu',        label:'Hindu · Assamese',               region:'South Asian' },
  { slug:'bihari-hindu',          label:'Hindu · Bihari',                 region:'South Asian' },
  { slug:'odia-hindu',            label:'Hindu · Odia',                   region:'South Asian' },
  { slug:'rajasthani-marwari',    label:'Rajasthani (Marwari)',           region:'South Asian' },
  { slug:'rajasthani-rajput',     label:'Rajasthani (Rajput)',            region:'South Asian' },
  { slug:'vedic-general',         label:'Vedic (General)',                region:'South Asian' },
  { slug:'arya-samaj',            label:'Arya Samaj',                     region:'South Asian' },
  { slug:'jain-shwetambar',       label:'Jain (Shwetambar)',              region:'South Asian' },
  { slug:'dawoodi-bohra',         label:'Dawoodi Bohra',                  region:'South Asian' },
  { slug:'muslim-nikah',          label:'Muslim · Nikah',                 region:'Muslim' },
  { slug:'hausa-muslim',          label:'Muslim · West African (Hausa)',  region:'Muslim' },
  { slug:'jewish-reform-conservative', label:'Jewish · Reform / Conservative', region:'Jewish' },
  { slug:'christian-western',     label:'Christian / Western',            region:'Christian' },
  { slug:'catholic',              label:'Catholic',                       region:'Christian' },
  { slug:'greek-orthodox',        label:'Greek Orthodox',                 region:'Christian' },
  { slug:'mexican-catholic',      label:'Mexican Catholic',               region:'Latin American' },
  { slug:'latin-american-catholic',label:'Latin American Catholic',       region:'Latin American' },
  { slug:'cuban',                 label:'Cuban',                          region:'Caribbean' },
  { slug:'yoruba-nigerian',       label:'Nigerian · Yoruba',              region:'West African' },
  { slug:'chinese-taiwanese',     label:'Chinese / Taiwanese',            region:'East Asian' },
  { slug:'korean',                label:'Korean',                         region:'East Asian' },
  { slug:'thai-buddhist',         label:'Thai Buddhist',                  region:'Buddhist' },
  { slug:'sri-lankan-buddhist',   label:'Sri Lankan Buddhist',            region:'Buddhist' },
  { slug:'filipino-catholic',     label:'Filipino Catholic',              region:'Southeast Asian' },
  { slug:'manipuri-vaishnavite',  label:'Manipuri (Vaishnavite)',         region:'South Asian' },
  { slug:'khasi',                 label:'Khasi',                          region:'South Asian' },
];

// ── Tradition colours ──
const TRAD_COLORS = {
  'South Asian': { bg:'#EEEDFE', color:'#3C3489' },
  'Muslim':      { bg:'#E1F5EE', color:'#085041' },
  'Jewish':      { bg:'#E6F1FB', color:'#0C447C' },
  'Christian':   { bg:'#FAECE7', color:'#993C1D' },
  'West African':{ bg:'#FBEAF0', color:'#72243E' },
  'East Asian':  { bg:'#FDF8E8', color:'#9A7E10' },
  'Buddhist':    { bg:'#EAF3DE', color:'#27500A' },
  'Latin American':{ bg:'#FCEBEB', color:'#791F1F' },
  'Caribbean':   { bg:'#FAEEDA', color:'#633806' },
  'Southeast Asian':{ bg:'#E1F5EE', color:'#085041' },
};

function tradColor(region) {
  return TRAD_COLORS[region] || { bg:'#F1EFE8', color:'#444441' };
}

// ── Build tradition grid ──
function buildTraditionGrid() {
  const grid = document.getElementById('tradition-grid');
  grid.innerHTML = TRADITIONS.map(t => \`
    <button class="trad-chip" data-slug="\${t.slug}" data-region="\${t.region}" onclick="toggleTradition('\${t.slug}')">
      \${t.label}
    </button>\`).join('');
}

function filterTraditions() {
  const q = document.getElementById('tradition-search').value.toLowerCase();
  document.querySelectorAll('.trad-chip').forEach(chip => {
    const match = chip.textContent.toLowerCase().includes(q);
    chip.style.display = match ? '' : 'none';
  });
}

function toggleTradition(slug) {
  const idx = state.traditions.indexOf(slug);
  if (idx > -1) {
    state.traditions.splice(idx, 1);
  } else {
    if (state.traditions.length >= 2) {
      // deselect first
      const old = state.traditions.shift();
      document.querySelector(\`.trad-chip[data-slug="\${old}"]\`)?.classList.remove('selected');
    }
    state.traditions.push(slug);
  }
  document.querySelectorAll('.trad-chip').forEach(chip => {
    chip.classList.toggle('selected', state.traditions.includes(chip.dataset.slug));
  });
  const n = state.traditions.length;
  document.getElementById('trad-note').textContent =
    n === 0 ? '0 selected — select 1 or 2' :
    n === 1 ? \`1 selected — add a second tradition for an interfaith plan\` :
    \`2 traditions selected\`;
}

// ── Budget ──
function updateBudget() {
  const v = parseInt(document.getElementById('budget-slider').value);
  state.budget = v;
  document.getElementById('budget-val').textContent = v >= 1000
    ? (v >= 1000000 ? (v/1000000).toFixed(1)+'M' : (v/1000).toFixed(0)+'k')
    : v.toLocaleString();
  // Actually show full number nicely
  document.getElementById('budget-val').textContent = v.toLocaleString();
}

// ── Guests ──
let guests = 100;
function adjustGuests(delta) {
  guests = Math.max(10, Math.min(1000, guests + delta));
  document.getElementById('guest-count').textContent = guests;
  state.guests = guests;
}

// ── Personalise questions ──
function personalise() {
  const n1 = state.name1 || 'you';
  const n2 = state.name2;
  const names = n2 ? \`\${n1} and \${n2}\` : n1;
  document.getElementById('q2-text').innerHTML = \`When is your wedding, <em>\${n1}</em>?\`;
  document.getElementById('q3-text').innerHTML = \`Where are <em>\${names}</em> getting married?\`;
  document.getElementById('q4-text').innerHTML = \`Which traditions will <em>\${names + "'s"}</em> wedding honour?\`;
  document.getElementById('q5-text').innerHTML = \`What's your estimated budget, <em>\${n1}</em>?\`;
  document.getElementById('q6-text').innerHTML = \`How many guests are you expecting?\`;
}

// ── Navigation ──
let currentQ = 1;
const TOTAL_Q = 6;

function goNext(from, skip = false) {
  // Validate
  if (from === 1) {
    const n1 = document.getElementById('name1').value.trim();
    const n2 = document.getElementById('name2').value.trim();
    if (!n1 || !n2) {
      document.getElementById('err-q1').classList.add('show');
      return;
    }
    document.getElementById('err-q1').classList.remove('show');
    state.name1 = n1;
    state.name2 = n2;
    personalise();
  }
  if (from === 2 && !skip) {
    state.date = document.getElementById('wedding-date').value;
  }
  if (from === 3 && !skip) {
    state.location = document.getElementById('location').value.trim();
  }
  if (from === 4) {
    if (state.traditions.length === 0) {
      document.getElementById('err-q4').classList.add('show');
      return;
    }
    document.getElementById('err-q4').classList.remove('show');
  }
  if (from === 5 && !skip) {
    state.budget = parseInt(document.getElementById('budget-slider').value);
  }
  if (from === 6) {
    state.guests = guests;
    submitPlan();
    return;
  }

  const next = from + 1;
  transition(currentQ, next);
  currentQ = next;
  updateProgress();
}

function transition(from, to) {
  const fromEl = document.getElementById(\`q\${from}\`);
  const toEl = document.getElementById(\`q\${to}\`);
  fromEl.classList.add('exit-left');
  fromEl.classList.remove('active');
  setTimeout(() => {
    fromEl.classList.remove('exit-left');
    toEl.classList.add('active');
  }, 300);
}

function updateProgress() {
  const pct = ((currentQ - 1) / TOTAL_Q) * 100;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('step-indicator').textContent = \`\${currentQ} of \${TOTAL_Q}\`;
}

// ── Submit to engine ──
async function submitPlan() {
  // Show loading
  const q6 = document.getElementById('q6');
  q6.classList.add('exit-left');
  q6.classList.remove('active');
  setTimeout(() => {
    q6.classList.remove('exit-left');
    const loading = document.getElementById('loading-screen');
    loading.classList.add('active');
  }, 300);

  document.getElementById('progress-fill').style.width = '90%';
  document.getElementById('step-indicator').textContent = '';

  const loadingMessages = [
    ['Building your plan…', 'Reading your traditions from the cultural taxonomy'],
    ['Merging traditions…', 'Combining checklists and resolving conflicts'],
    ['Allocating your budget…', 'Distributing across ceremony and vendor categories'],
    ['Almost ready…', 'Finalising your personalised wedding plan'],
  ];
  let msgIdx = 0;
  const msgInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % loadingMessages.length;
    document.getElementById('loading-text').textContent = loadingMessages[msgIdx][0];
    document.getElementById('loading-sub').textContent = loadingMessages[msgIdx][1];
  }, 1800);

  try {
    const res = await fetch('https://marigold-engine-test.vercel.app/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        traditionSlugs: state.traditions,
        totalBudget: state.budget,
        jurisdiction: state.location || 'US',
      }),
    });

    const data = await res.json();
    clearInterval(msgInterval);

    if (!data.success) {
      showError(data.error || 'Something went wrong generating your plan.');
      return;
    }

    state.plan = data.plan;
    showResults();

  } catch (err) {
    clearInterval(msgInterval);
    showError('Could not connect to the plan engine. Please try again.');
  }
}

function showError(msg) {
  const loading = document.getElementById('loading-screen');
  loading.classList.remove('active');
  document.getElementById('loading-text').textContent = 'Something went wrong';
  document.getElementById('loading-sub').textContent = msg;
  loading.classList.add('active');
  document.getElementById('progress-fill').style.width = '0%';
}

// ── Render results ──
function showResults() {
  const loading = document.getElementById('loading-screen');
  loading.classList.add('exit-left');
  loading.classList.remove('active');

  setTimeout(() => {
    loading.classList.remove('exit-left');
    const results = document.getElementById('results-screen');
    results.classList.add('active');
  }, 300);

  document.getElementById('progress-fill').style.width = '100%';
  document.getElementById('step-indicator').textContent = '';

  const plan = state.plan;
  const names = state.name2 ? \`\${state.name1} & \${state.name2}\` : state.name1;
  const tradNames = state.traditions.map(s =>
    TRADITIONS.find(t => t.slug === s)?.label || s
  ).join(' + ');

  document.getElementById('results-title').innerHTML =
    \`<em>\${names}</em> — your wedding plan\`;
  document.getElementById('results-subtitle').textContent =
    \`\${tradNames} · \${state.budget.toLocaleString('en-US', {style:'currency', currency:'USD', maximumFractionDigits:0})} budget · \${state.guests} guests\`;

  // Conflicts
  const conflictsEl = document.getElementById('conflicts-container');
  if (plan.conflicts && plan.conflicts.length > 0) {
    conflictsEl.innerHTML = plan.conflicts.map(c => \`
      <div class="conflict-banner">
        <strong>⚠ \${c.type?.replace(/_/g,' ') || 'Note'}</strong> — \${c.description || c.message || JSON.stringify(c)}
      </div>\`).join('');
  }

  // Checklist
  renderChecklist(plan.checklist || []);

  // Ceremonies
  renderCeremonies(plan.ceremonySequence || plan.ceremonies || []);

  // Budget
  renderBudget(plan.budget || plan.budgetBreakdown || []);
}

function renderChecklist(items) {
  const el = document.getElementById('tab-checklist');
  if (!items.length) {
    el.innerHTML = '<p style="color:var(--brown-mute);font-family:-apple-system,sans-serif;font-size:14px;padding:20px 0">No checklist items found.</p>';
    return;
  }

  // Group by milestone
  const groups = {};
  items.forEach(item => {
    const m = item.milestone || item.timeframe || 'General';
    if (!groups[m]) groups[m] = [];
    groups[m].push(item);
  });

  el.innerHTML = Object.entries(groups).map(([milestone, its]) => {
    const rows = its.map((item, i) => {
      const label = item.label || item.task || item.description || JSON.stringify(item);
      const trad = item.tradition || item.source;
      const region = trad ? (TRADITIONS.find(t=>t.slug===trad)?.region || 'South Asian') : null;
      const col = region ? tradColor(region) : null;
      return \`<div class="checklist-item">
        <div class="check-box" onclick="this.classList.toggle('checked')"></div>
        <div class="check-label">
          \${label}
          \${col ? \`<span class="check-trad" style="background:\${col.bg};color:\${col.color}">\${TRADITIONS.find(t=>t.slug===trad)?.label?.split('·')[0]?.trim() || trad}</span>\` : ''}
        </div>
      </div>\`;
    }).join('');
    return \`<div class="checklist-group">
      <div class="checklist-milestone">\${milestone}</div>
      \${rows}
    </div>\`;
  }).join('');
}

function renderCeremonies(items) {
  const el = document.getElementById('tab-ceremonies');
  if (!items.length) {
    el.innerHTML = '<p style="color:var(--brown-mute);font-family:-apple-system,sans-serif;font-size:14px;padding:20px 0">No ceremony sequence found.</p>';
    return;
  }

  // Build Gantt-style visual timeline
  const TIMELINE = ['12m','10m','8m','6m','4m','3m','2m','1m','Day','After'];
  const TIMING_MAP = {
    '12 months':0,'10 months':1,'8 months':2,'6 months':3,'4 months':4,
    '3 months':5,'2 months':6,'1 month':7,'day of':8,'day-of':8,'after':9,'following':9
  };

  function timingToCol(t) {
    if (!t) return 8;
    const tl = t.toLowerCase();
    for (const [k,v] of Object.entries(TIMING_MAP)) if (tl.includes(k)) return v;
    return 8;
  }

  // Selected ceremonies state
  if (!window.selectedCeremonies) {
    window.selectedCeremonies = new Set(items.map((_,i)=>i));
  }

  const tradColors = {
    'South Asian': '#534AB7','Muslim':'#0F6E56','Jewish':'#185FA5',
    'Christian':'#993C1D','West African':'#72243E','East Asian':'#9A7E10',
    'Buddhist':'#27500A','Latin American':'#791F1F','Caribbean':'#633806',
    'Southeast Asian':'#085041','Global':'#888780',
  };

  function getTradColor(trad) {
    const t = TRADITIONS.find(x=>x.slug===trad);
    return t ? (tradColors[t.region] || '#888780') : '#888780';
  }

  // Gantt rows
  const ganttRows = items.map((item, i) => {
    const col = timingToCol(item.timing || item.timeframe || '');
    const dur = item.duration ? 1 : 0.5;
    const tradSlug = item.tradition || item.source || '';
    const color = getTradColor(tradSlug);
    const selected = window.selectedCeremonies.has(i);
    const name = item.name || item.event || item.ceremony || '';
    const region = TRADITIONS.find(x=>x.slug===tradSlug)?.region || 'Global';

    return `<div class="gantt-row-q" data-idx="${i}" style="opacity:${selected?1:0.35}">
      <div class="gantt-label-q">
        <input type="checkbox" ${selected?'checked':''} onchange="toggleCeremony(${i})" style="accent-color:var(--gold);margin-right:6px">
        <span style="font-size:12px;color:var(--brown-deep);font-family:-apple-system,sans-serif;line-height:1.3">${name}</span>
      </div>
      <div class="gantt-track-q">
        ${TIMELINE.map((_,ci) => `<div class="gantt-cell-q ${ci===8?'gantt-day-col':''}"></div>`).join('')}
        <div class="gantt-bar-q" style="
          left:calc(${col} * (100% / ${TIMELINE.length}));
          width:calc(${Math.max(dur,0.4)} * (100% / ${TIMELINE.length}));
          background:${color};
        " title="${name} — ${item.timing||''}&#10;${item.notes||''}">
          <span>${name}</span>
        </div>
      </div>
    </div>`;
  }).join('');

  // Legend
  const traditions = [...new Set(items.map(i=>i.tradition||i.source).filter(Boolean))];
  const legend = traditions.map(slug => {
    const t = TRADITIONS.find(x=>x.slug===slug);
    if (!t) return '';
    return `<div style="display:flex;align-items:center;gap:5px;font-size:11px;font-family:-apple-system,sans-serif;color:var(--brown-mute)">
      <div style="width:10px;height:10px;border-radius:2px;background:${getTradColor(slug)};flex-shrink:0"></div>
      ${t.label}
    </div>`;
  }).join('');

  el.innerHTML = `
    <style>
      .gantt-container-q { overflow-x:auto; border:1px solid #E8DDB8; border-radius:10px; margin-bottom:24px; }
      .gantt-header-q { display:flex; border-bottom:1px solid #E8DDB8; background:#FDFAF0; }
      .gantt-label-header-q { width:220px;flex-shrink:0;padding:8px 12px;font-size:10px;font-family:-apple-system,sans-serif;color:var(--brown-mute);border-right:1px solid #E8DDB8; }
      .gantt-months-q { flex:1;display:grid;grid-template-columns:repeat(10,1fr); }
      .gantt-month-q { text-align:center;padding:8px 2px;font-size:10px;font-family:-apple-system,sans-serif;color:var(--brown-mute);border-right:1px solid #F0E8D0; }
      .gantt-month-q.day-col { background:rgba(200,168,32,0.08);color:#9A7E10;font-weight:600; }
      .gantt-row-q { display:flex;align-items:center;border-bottom:1px solid #F0E8D0;min-height:38px;transition:opacity 0.2s; }
      .gantt-row-q:last-child { border-bottom:none; }
      .gantt-row-q:hover { background:#FFFDF5; }
      .gantt-label-q { width:220px;flex-shrink:0;padding:6px 12px;border-right:1px solid #E8DDB8;display:flex;align-items:flex-start; }
      .gantt-track-q { flex:1;position:relative;height:38px;display:grid;grid-template-columns:repeat(10,1fr); }
      .gantt-cell-q { border-right:1px solid #F0E8D0;height:100%; }
      .gantt-day-col { background:rgba(200,168,32,0.06); }
      .gantt-bar-q { position:absolute;top:50%;transform:translateY(-50%);height:22px;border-radius:4px;display:flex;align-items:center;padding:0 8px;font-size:10px;color:white;font-family:-apple-system,sans-serif;white-space:nowrap;overflow:hidden;cursor:default;transition:opacity 0.2s; }
      .gantt-bar-q:hover { opacity:0.85; }
      .gantt-bar-q span { overflow:hidden;text-overflow:ellipsis; }
    </style>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">${legend}</div>
    <p style="font-size:12px;color:var(--brown-mute);font-family:-apple-system,sans-serif;margin-bottom:12px">
      ✓ = included in your plan · uncheck any ceremony you don't want
    </p>
    <div class="gantt-container-q">
      <div class="gantt-header-q">
        <div class="gantt-label-header-q">Ceremony / Event</div>
        <div class="gantt-months-q">
          ${TIMELINE.map((m,i)=>`<div class="gantt-month-q ${i===8?'day-col':''}">${m}</div>`).join('')}
        </div>
      </div>
      ${ganttRows}
    </div>
    <p style="font-size:11px;color:var(--brown-hint);font-family:-apple-system,sans-serif">
      ${window.selectedCeremonies.size} of ${items.length} ceremonies included
    </p>`;
}

window.toggleCeremony = function(idx) {
  if (window.selectedCeremonies.has(idx)) {
    window.selectedCeremonies.delete(idx);
  } else {
    window.selectedCeremonies.add(idx);
  }
  if (state.plan) renderCeremonies(state.plan.ceremonySequence || state.plan.ceremonies || []);
}


function renderBudget(items) {
  const el = document.getElementById('tab-budget');
  if (!items.length) {
    el.innerHTML = '<p style="color:var(--brown-mute);font-family:-apple-system,sans-serif;font-size:14px;padding:20px 0">No budget breakdown found.</p>';
    return;
  }

  const total = state.budget;
  const formatted = total.toLocaleString('en-US', {style:'currency', currency:'USD', maximumFractionDigits:0});

  const bars = items.map(item => {
    const cat = item.category || item.name || 'Other';
    const pct = item.pct_mid || item.pct || ((item.pct_low + item.pct_high) / 2) || 10;
    const amt = Math.round(total * pct / 100);
    const amtFmt = amt.toLocaleString('en-US', {style:'currency', currency:'USD', maximumFractionDigits:0});
    return \`<div class="budget-bar-row">
      <div class="budget-cat">\${cat}</div>
      <div class="budget-bar-wrap"><div class="budget-bar-fill" style="width:\${Math.min(pct*2,100)}%"></div></div>
      <div class="budget-amt">\${amtFmt}</div>
    </div>\`;
  }).join('');

  el.innerHTML = \`
    <div class="budget-total">\${formatted}</div>
    <div class="budget-subtitle">estimated total · allocated across \${items.length} categories</div>
    \${bars}\`;
}

function switchTab(name) {
  document.querySelectorAll('.results-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(\`[onclick="switchTab('\${name}')"]\`).classList.add('active');
  document.getElementById(\`tab-\${name}\`).classList.add('active');
}

// ── Keyboard navigation ──
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && currentQ <= TOTAL_Q) {
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen && !activeScreen.id.includes('results') && !activeScreen.id.includes('loading')) {
      const btn = activeScreen.querySelector('.btn-next');
      if (btn) btn.click();
    }
  }
});

// ── Init ──
buildTraditionGrid();
updateProgress();
updateBudget();

// Set min date to today
const today = new Date().toISOString().split('T')[0];
document.getElementById('wedding-date').min = today;
</script>
</body>
</html>
`;

const app = express();
app.use(express.json());

// Supabase client — server-side only, uses the secret key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Landing page — links to questionnaire (couples) and advisor review (advisors)
const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Marigold Weddings</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --gold: #C8A820;
    --gold-light: #F7D44C;
    --gold-pale: #FDFAF0;
    --brown-deep: #3C3010;
    --brown-mid: #6B5A20;
    --brown-mute: #9A8A6A;
    --brown-hint: #D4C8A0;
  }
  html, body {
    min-height: 100vh;
    background: var(--gold-pale);
    font-family: Georgia, serif;
    color: var(--brown-deep);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
  }
  .flower {
    margin-bottom: 32px;
  }
  h1 {
    font-size: 36px;
    font-weight: normal;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    color: var(--brown-deep);
  }
  .tagline {
    font-size: 15px;
    color: var(--brown-mute);
    font-family: -apple-system, sans-serif;
    margin-bottom: 64px;
    text-align: center;
    line-height: 1.6;
    max-width: 380px;
  }
  .cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    max-width: 560px;
    width: 100%;
  }
  @media (max-width: 480px) { .cards { grid-template-columns: 1fr; } }
  .card {
    background: white;
    border: 1.5px solid var(--brown-hint);
    border-radius: 14px;
    padding: 28px 24px;
    text-decoration: none;
    color: var(--brown-deep);
    transition: border-color 0.2s, transform 0.15s;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .card:hover {
    border-color: var(--gold);
    transform: translateY(-2px);
  }
  .card-eyebrow {
    font-size: 10px;
    font-family: -apple-system, sans-serif;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--gold);
  }
  .card-title {
    font-size: 18px;
    font-weight: normal;
    color: var(--brown-deep);
  }
  .card-desc {
    font-size: 13px;
    color: var(--brown-mute);
    font-family: -apple-system, sans-serif;
    line-height: 1.5;
    margin-top: 4px;
  }
  .card-cta {
    font-size: 13px;
    color: var(--gold);
    font-family: -apple-system, sans-serif;
    margin-top: 12px;
  }
  .card.primary {
    border-color: var(--gold);
    background: #FFFAEA;
  }
  .footer {
    margin-top: 64px;
    font-size: 12px;
    color: var(--brown-hint);
    font-family: -apple-system, sans-serif;
    text-align: center;
    line-height: 1.8;
  }
  .status-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    background: #27AE60;
    border-radius: 50%;
    margin-right: 5px;
    vertical-align: middle;
  }
</style>
</head>
<body>

<svg class="flower" width="52" height="52" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
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

<h1>Marigold Weddings</h1>
<p class="tagline">Your wedding, your traditions. Planning that actually gets it.</p>

<div class="cards">
  <a href="/questionnaire" class="card primary">
    <div class="card-eyebrow">For couples</div>
    <div class="card-title">Build your wedding plan</div>
    <div class="card-desc">Answer 6 questions. Get a personalised plan built from our cultural taxonomy — checklist, ceremony timeline, and budget.</div>
    <div class="card-cta">Start now →</div>
  </a>
  <a href="/advisor" class="card">
    <div class="card-eyebrow">For advisors</div>
    <div class="card-title">Review cultural content</div>
    <div class="card-desc">Review, edit, and approve taxonomy entries across all traditions. Changes go live immediately in the engine.</div>
    <div class="card-cta">Open advisor review →</div>
  </a>
</div>

<div class="footer">
  <span class="status-dot"></span>Engine live · 35 traditions · Supabase connected<br>
  Confidential — internal build · June 2026
</div>

</body>
</html>`;

// ============================================================
// MARIGOLD BRAND CSS — single source of truth
// Edit BRAND_CSS to update colours, fonts, and shared styles
// across all pages simultaneously.
// ============================================================
const BRAND_CSS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');

/* ============================================================
   MARIGOLD BRAND CSS — single source of truth
   Edit here to update all pages simultaneously.
   Deployed at /brand.css via server.js
   ============================================================ */

/* ── Colour palette ── */
:root {
  --cream:  #FDFAF0;   /* page background */
  --warm:   #F5F0E8;   /* secondary background, hover states */
  --deep:   #3C3010;   /* primary text, CTA buttons */
  --tx:     #2A2010;   /* body text */
  --muted:  #9A8A6A;   /* secondary text, hints */
  --bdr:    #E0D4B0;   /* borders, dividers */
  --g:      #F7D44C;   /* sunshine yellow — selected states */
  --gd:     #C8A820;   /* gold — progress, accents */
  --gk:     #9A7E10;   /* dark gold — hover, active */
}

/* ── Base ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  background: var(--cream);
  color: var(--tx);
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 15px;
  line-height: 1.7;
}

/* ── Brand mark ──
   To change the brand name style, edit .bname only.
   Options: font-style:normal (remove italic),
            font-weight:600 (bold),
            text-transform:uppercase (capitals),
            letter-spacing:2px (tighter/looser)
   Current: lowercase, italic, wide tracking
*/
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  cursor: pointer;
}
.bname {
  font-size: 13px;
  letter-spacing: 3px;
  color: var(--deep);
  font-style: italic;
  font-weight: 400;
  font-family: 'Playfair Display', Georgia, serif;
  /* CHANGE BRAND NAME STYLE HERE */
}

/* ── Shared header ── */
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  border-bottom: 1px solid var(--bdr);
  background: var(--cream);
  position: sticky;
  top: 0;
  z-index: 100;
}

/* ── Navigation pills ── */
.nav-pill {
  font-size: 11px;
  letter-spacing: 1px;
  color: var(--muted);
  text-decoration: none;
  padding: 5px 14px;
  border: 1px solid var(--bdr);
  border-radius: 100px;
  font-family: 'Playfair Display', serif;
  font-style: italic;
  transition: all 0.2s;
  background: transparent;
  cursor: pointer;
  display: inline-block;
}
.nav-pill:hover {
  border-color: var(--gd);
  background: var(--warm);
  color: var(--deep);
}

/* ── CTA buttons ── */
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

/* ── Progress bar ── */
.progress-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--bdr);
  z-index: 200;
}
.progress-fill {
  height: 100%;
  background: var(--gd);
  transition: width 0.5s ease;
}

/* ── Eyebrow labels ── */
.ql {
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 8px;
  font-family: 'Playfair Display', serif;
}

/* ── Marigold flower mark SVG ──
   The canonical flower SVG used across all pages.
   Copy the SVG block below when adding the flower to a new page.
   Three rings: 14 outer petals, 14 mid petals, 18 inner petals.
   Dark brown centre with three detail dots.

   SMALL  (26x26): use in header nav
   MEDIUM (44x44): use in loading spinner
   LARGE  (52x52): use on landing page

   To animate (spinner): add class "marigold-spin"
*/
@keyframes marigold-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.marigold-spin { animation: marigold-spin 2.5s linear infinite; }

/* ── Tab navigation ── */
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

/* ── Section eyebrow ── */
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

/* ── Back / skip link ── */
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

/* ============================================================
   FLOWER SVG REFERENCE (copy-paste into HTML as needed)
   Size: viewBox="0 0 34 34" — scale with width/height attrs

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
   ============================================================ */
`;

app.get('/brand.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(BRAND_CSS);
});


app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(LANDING_HTML);
});

// Questionnaire — the couple-facing onboarding UI
app.get('/questionnaire', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(QUESTIONNAIRE_HTML);
});
// Lists all traditions currently approved and live in the database
// ============================================================================
app.get('/api/traditions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('live_taxonomy')
      .select('slug, name, region, typical_event_count');
    if (error) throw error;
    res.json({ count: data.length, traditions: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// POST /api/generate-plan
// Generates a deterministic plan for one or two traditions
// Body: { slugs: ['sikh'], budget: 80000 }
//    or { slugs: ['gujarati', 'jewish-reform-conservative'], budget: 120000 }
// ============================================================================
app.post('/api/generate-plan', async (req, res) => {
  // Accept both 'slugs' and 'traditionSlugs' for compatibility with questionnaire UI
  const slugs = req.body.slugs || req.body.traditionSlugs;
  const budget = req.body.budget || req.body.totalBudget;
  const jurisdiction = req.body.jurisdiction;

  if (!slugs || !Array.isArray(slugs) || slugs.length === 0) {
    return res.status(400).json({ error: 'slugs array required' });
  }
  if (slugs.length > 2) {
    return res.status(400).json({ error: 'maximum 2 traditions supported' });
  }

  try {
    // Load traditions from live_taxonomy (approved + current only)
    const { data: traditions, error } = await supabase
      .from('live_taxonomy')
      .select('*')
      .in('slug', slugs);

    if (error) throw error;

    // Check all requested slugs were found
    const foundSlugs = traditions.map(t => t.slug);
    const missing = slugs.filter(s => !foundSlugs.includes(s));
    if (missing.length > 0) {
      return res.status(404).json({
        error: 'Traditions not found or not yet approved',
        missing
      });
    }

    // Single tradition
    if (traditions.length === 1) {
      const t = traditions[0];
      const budgetResult = budget
        ? calculateBudget({ totalBudget: budget, traditions: [t] })
        : null;

      return res.json({
        source: 'deterministic_engine',
        traditions: [t.slug],
        tradition_names: [t.name],
        checklist_items: [...(t.checklist_template || []), ...UNIVERSAL_CHECKLIST].length,
        ceremony_events: (t.ceremony_sequence || []).length,
        vendor_categories: (t.vendor_categories || []).length,
        budget: budgetResult,
        conflicts: [],
        version_ids: [t.version_id],
        sample_checklist: (t.checklist_template || []).slice(0, 3),
        sample_ceremony: (t.ceremony_sequence || []).slice(0, 3),
      });
    }

    // Two traditions — run the interfaith merge algorithm
    const [t1, t2] = slugs.map(s => traditions.find(t => t.slug === s));
    const merged = mergeTraditions({
      t1, t2,
      universalChecklist: UNIVERSAL_CHECKLIST,
      totalBudget: budget,
      jurisdiction: jurisdiction || null
    });

    return res.json({
      source: 'deterministic_engine',
      traditions: [t1.slug, t2.slug],
      tradition_names: [t1.name, t2.name],
      checklist_items: merged.checklist.length,
      ceremony_events: merged.ceremony_sequence.length,
      vendor_categories: merged.vendors.length,
      conflicts: merged.conflicts,
      budget: merged.budget,
      interfaith_additions: merged.interfaith_additions.length,
      version_ids: [t1.version_id, t2.version_id],
      sample_checklist: merged.checklist.slice(0, 3),
      sample_conflicts: merged.conflicts.slice(0, 3),
    });

  } catch (e) {
    console.error('Engine error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    engine: 'deterministic',
    supabase_url: process.env.SUPABASE_URL ? 'configured' : 'MISSING',
    secret_key: process.env.SUPABASE_SECRET_KEY ? 'configured' : 'MISSING'
  });
});

// ============================================================================
// ADVISOR REVIEW ROUTES
// All Supabase calls go through these server-side routes — the service role
// key never touches the browser. This is why the advisor review UI is served
// from this server rather than as a standalone HTML file connecting to
// Supabase directly (which browsers block as a security measure).
// ============================================================================

// Serve the advisor review UI inline — avoids filesystem issues on Vercel serverless
// Advisor HTML inlined for Vercel serverless compatibility
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
  .cultural-notes-rendered { font-size: 13px; line-height: 1.7; color: #3C3010; }
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
  .toast { position: fixed; bottom: 24px; right: 24px; background: var(--deep); color: white; padding: 12px 20px; border-radius: var(--radius); font-size: 13px; font-weight: 500; z-index: 1000; opacity: 0; transition: opacity 0.2s; pointer-events: none; }
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 200; display: flex; align-items: center; justify-content: center; }
  .modal-box { background: white; border-radius: var(--radius); padding: 28px; width: 420px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); }
  .modal-title { font-size: 15px; font-weight: 700; color: var(--deep); margin-bottom: 8px; }
  .modal-body { font-size: 13px; color: var(--muted); margin-bottom: 20px; line-height: 1.6; }
  .modal-input { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 13px; font-family: var(--font); margin-bottom: 16px; }
  .modal-input:focus { outline: none; border-color: var(--gold); }
  .modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
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
    <div class="modal-title" id="modal-title"></div>
    <div class="modal-body" id="modal-body"></div>
    <input type="text" class="modal-input" id="modal-input" style="display:none" placeholder="">
    <div class="modal-actions" id="modal-actions"></div>
  </div>
</div>
<script>
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
  const sorted=[...traditions].sort((a,b)=>a.name.localeCompare(b.name));
  document.getElementById('tradition-list').innerHTML=sorted.map(t=>{
    const versions=t.tradition_versions||[];
    const current=versions.find(v=>v.is_current);
    const latest=[...versions].sort((a,b)=>b.version_number-a.version_number)[0];
    const sv=current||latest;
    const status=sv?.status||'no versions';
    return \`<div class="tradition-item \${currentTradition?.id===t.id?'active':''}" onclick="selectTradition('\${t.id}')">
      <span class="t-name">\${t.name}</span>
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
    <div class="page-title">\${currentTradition.name}</div>
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
      <div class="section-sub">Key vendor and planner briefing notes. Use <strong>bold</strong> for headings and numbered lists for the "three things" format.</div>
      <div class="field">
        \${canEdit ? \`
          <div class="rich-editor-wrap">
            <div class="rich-editor-toolbar">
              <button onclick="execCmd('bold')" title="Bold"><b>B</b></button>
              <button onclick="execCmd('insertOrderedList')" title="Numbered list">1. List</button>
              <button onclick="execCmd('insertUnorderedList')" title="Bullet list">• List</button>
              <button onclick="execCmd('removeFormat')" title="Clear formatting">Clear</button>
            </div>
            <div class="rich-editor-content" id="cultural-notes-editor" contenteditable="true"
              oninput="syncCulturalNotes()"
              onpaste="handlePaste(event)">\${htmlToEditor(workingData.cultural_notes)}</div>
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:6px">Changes will appear highlighted in the version history diff view.</div>
        \` : \`<div class="cultural-notes-rendered">\${renderCulturalNotes(workingData.cultural_notes)}</div>\`}
      </div>tml lang="en">
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
  .cultural-notes-rendered { font-size: 13px; line-height: 1.7; color: #3C3010; }
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
  .toast { position: fixed; bottom: 24px; right: 24px; background: var(--deep); color: white; padding: 12px 20px; border-radius: var(--radius); font-size: 13px; font-weight: 500; z-index: 1000; opacity: 0; transition: opacity 0.2s; pointer-events: none; }
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 200; display: flex; align-items: center; justify-content: center; }
  .modal-box { background: white; border-radius: var(--radius); padding: 28px; width: 420px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); }
  .modal-title { font-size: 15px; font-weight: 700; color: var(--deep); margin-bottom: 8px; }
  .modal-body { font-size: 13px; color: var(--muted); margin-bottom: 20px; line-height: 1.6; }
  .modal-input { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 13px; font-family: var(--font); margin-bottom: 16px; }
  .modal-input:focus { outline: none; border-color: var(--gold); }
  .modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
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
    <div class="modal-title" id="modal-title"></div>
    <div class="modal-body" id="modal-body"></div>
    <input type="text" class="modal-input" id="modal-input" style="display:none" placeholder="">
    <div class="modal-actions" id="modal-actions"></div>
  </div>
</div>
<script>
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
  const sorted=[...traditions].sort((a,b)=>a.name.localeCompare(b.name));
  document.getElementById('tradition-list').innerHTML=sorted.map(t=>{
    const versions=t.tradition_versions||[];
    const current=versions.find(v=>v.is_current);
    const latest=[...versions].sort((a,b)=>b.version_number-a.version_number)[0];
    const sv=current||latest;
    const status=sv?.status||'no versions';
    return \`<div class="tradition-item \${currentTradition?.id===t.id?'active':''}" onclick="selectTradition('\${t.id}')">
      <span class="t-name">\${t.name}</span>
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
    <div class="page-title">\${currentTradition.name}</div>
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
      <div class="section-sub">Key vendor and planner briefing notes. Bold headings (**text**) and numbered lists are rendered when viewing.</div>
      <div class="field">
        \${canEdit
          ? \`<textarea rows="10" oninput="workingData.cultural_notes=this.value">\${workingData.cultural_notes}</textarea>\`
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
  if (!text) return '<p style="color:#9A8A6A;font-style:italic">No cultural notes added yet.</p>';
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
    .replace(/(^|\\n)(\\d+\\. .+)/g, (m, pre, item) => pre + '<li>' + item.replace(/^\\d+\\. /, '') + '</li>')
    .replace(/(<li>.*?<\\/li>\\n?)+/gs, match => '<ol>' + match + '</ol>')
    .split('\\n\\n').map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<ol>') || p.startsWith('<li>')) return p;
      return '<p>' + p.replace(/\\n/g, '<br>') + '</p>';
    }).join('');
  return html;
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
          <div class="item-field"><label>Timing</label><input value="\${esc(item.timing||'')}" \${canEdit?\`oninput="workingData.ceremony_sequence[\${i}].timing=this.value"\`:' disabled'} placeholder="e.g. day before"></div>
          <div class="item-field"><label>Duration</label><input value="\${esc(item.duration||'')}" \${canEdit?\`oninput="workingData.ceremony_sequence[\${i}].duration=this.value"\`:' disabled'}></div>
          <div class="item-field"><label>Typical guest count</label><input value="\${esc(item.typical_size||'')}" \${canEdit?\`oninput="workingData.ceremony_sequence[\${i}].typical_size=this.value"\`:' disabled'}></div>
          <div class="item-field"><label>Location type</label><input value="\${esc(item.location_type||'')}" \${canEdit?\`oninput="workingData.ceremony_sequence[\${i}].location_type=this.value"\`:' disabled'}></div>
          <div class="item-field full"><label>Notes</label><textarea \${canEdit?\`oninput="workingData.ceremony_sequence[\${i}].notes=this.value"\`:' disabled'}>\${esc(item.notes||'')}</textarea></div>
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
function toast(msg,type='default'){
  const el=document.getElementById('toast');el.textContent=msg;
  el.className='toast visible'+(type==='error'?' error':type==='success'?' success':'');
  setTimeout(()=>el.className='toast',3000);
}
</script>
</body>
</html>
`;

app.get('/advisor', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(ADVISOR_HTML);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Marigold engine test running on port ${PORT}`));
module.exports = app;