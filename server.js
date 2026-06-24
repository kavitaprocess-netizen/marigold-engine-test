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
  <a id="logo" href="#">
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
  <span id="step-indicator"></span>
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

  el.innerHTML = items.map((item, i) => {
    const name = item.name || item.event || item.ceremony || JSON.stringify(item);
    const timing = item.timing || item.timeframe || '';
    const duration = item.duration || '';
    const size = item.typical_size || item.guestSize || '';
    const loc = item.location_type || item.locationType || '';
    const notes = item.notes || '';
    const trad = item.tradition || item.source;
    const region = trad ? (TRADITIONS.find(t=>t.slug===trad)?.region || 'South Asian') : null;
    const col = region ? tradColor(region) : { bg:'#F1EFE8', color:'#444441' };

    return \`<div class="ceremony-item">
      <div class="ceremony-num">\${i + 1}</div>
      <div class="ceremony-content">
        \${region ? \`<div class="ceremony-trad" style="background:\${col.bg};color:\${col.color}">\${TRADITIONS.find(t=>t.slug===trad)?.label?.split('·')[0]?.trim() || trad}</div>\` : ''}
        <div class="ceremony-name">\${name}</div>
        <div class="ceremony-meta">
          \${timing ? \`\${timing}\` : ''}
          \${duration ? \` · \${duration}\` : ''}
          \${size ? \` · \${size}\` : ''}
          \${loc ? \` · \${loc}\` : ''}
        </div>
        \${notes ? \`<div class="ceremony-meta" style="margin-top:4px;opacity:0.8">\${notes.substring(0,140)}\${notes.length>140?'…':''}</div>\` : ''}
      </div>
    </div>\`;
  }).join('');
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

<svg class="flower" width="52" height="52" viewBox="0 0 32 32" fill="none">
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
app.get('/advisor', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  try {
    const html = fs.readFileSync(path.join(__dirname, 'advisor-review', 'index.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch(e) {
    res.status(500).send('Advisor review interface not found: ' + e.message);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Marigold engine test running on port ${PORT}`));
module.exports = app;