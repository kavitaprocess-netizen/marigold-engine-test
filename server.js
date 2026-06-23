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

const app = express();
app.use(express.json());

// Supabase client — server-side only, uses the secret key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Root redirect — the only UI on this server is the advisor review interface
app.get('/', (req, res) => {
  res.redirect('/advisor');
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
  const { slugs, budget, jurisdiction } = req.body;

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
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
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
      <div class="section-sub">Key facts, sensitivities, and guidance for vendors and planners. Write in plain English.</div>
      <div class="field"><textarea rows="6" \${dis} oninput="workingData.cultural_notes=this.value">\${workingData.cultural_notes}</textarea></div>
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
  return allVersions.map(v=>\`
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
`);
});

// GET /api/advisor/traditions
// All traditions with all versions (not just live — advisors need to see drafts)
app.get('/api/advisor/traditions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cultural_traditions')
      .select(`
        id, slug, name, region, priority, created_at,
        tradition_versions (
          id, version_number, status, is_current,
          proposed_at, reviewed_at, review_notes,
          avg_budget_low, avg_budget_high, typical_event_count
        )
      `)
      .order('priority')
      .order('name');
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/advisor/traditions/:id/versions
// All versions for a single tradition, full content
app.get('/api/advisor/traditions/:id/versions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tradition_versions')
      .select('*')
      .eq('tradition_id', req.params.id)
      .order('version_number', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/advisor/versions/:id
// Single version by ID — full content
app.get('/api/advisor/versions/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tradition_versions')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/advisor/traditions/:id/draft
// Create a new draft version (copy of current content)
app.post('/api/advisor/traditions/:id/draft', async (req, res) => {
  try {
    const { base } = req.body; // existing version content to copy from

    // Get next version number
    const { data: latest } = await supabase
      .from('tradition_versions')
      .select('version_number')
      .eq('tradition_id', req.params.id)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = latest?.length ? latest[0].version_number + 1 : 1;

    const { data, error } = await supabase
      .from('tradition_versions')
      .insert({
        tradition_id: req.params.id,
        version_number: nextVersion,
        avg_budget_low: base?.avg_budget_low || null,
        avg_budget_high: base?.avg_budget_high || null,
        budget_currency: base?.budget_currency || 'USD',
        typical_event_count: base?.typical_event_count || null,
        ceremony_sequence: base?.ceremony_sequence || [],
        vendor_categories: base?.vendor_categories || [],
        budget_allocation: base?.budget_allocation || [],
        checklist_template: base?.checklist_template || [],
        cultural_notes: base?.cultural_notes || '',
        sources: base?.sources || '',
        status: 'draft',
        review_notes: '',
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/advisor/versions/:id
// Save edits to a draft or in_review version
app.patch('/api/advisor/versions/:id', async (req, res) => {
  try {
    // Safety check — never allow editing an approved or retired version
    const { data: existing } = await supabase
      .from('tradition_versions')
      .select('status')
      .eq('id', req.params.id)
      .single();

    if (!['draft', 'in_review'].includes(existing?.status)) {
      return res.status(403).json({ error: `Cannot edit a version with status "${existing?.status}". Create a new editing copy instead.` });
    }

    const { data, error } = await supabase
      .from('tradition_versions')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/advisor/versions/:id/submit
// Submit a draft for review
app.post('/api/advisor/versions/:id/submit', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tradition_versions')
      .update({ status: 'in_review' })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/advisor/versions/:id/approve
// Approve a version — makes it live, retires the previous current
app.post('/api/advisor/versions/:id/approve', async (req, res) => {
  try {
    const { notes } = req.body;
    const { data, error } = await supabase
      .from('tradition_versions')
      .update({
        status: 'approved',
        is_current: true,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || 'Approved via advisor review interface.',
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/advisor/versions/:id/reject
// Reject — returns to draft with notes
app.post('/api/advisor/versions/:id/reject', async (req, res) => {
  try {
    const { notes } = req.body;
    if (!notes) return res.status(400).json({ error: 'Rejection reason required' });
    const { data, error } = await supabase
      .from('tradition_versions')
      .update({ status: 'draft', review_notes: notes })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/advisor/versions/:id/cancel
// Delete a draft version (used when advisor clicks "Cancel editing")
app.post('/api/advisor/versions/:id/cancel', async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('tradition_versions')
      .select('status')
      .eq('id', req.params.id)
      .single();

    if (existing?.status !== 'draft') {
      return res.status(403).json({ error: 'Can only cancel draft versions' });
    }

    const { error } = await supabase
      .from('tradition_versions')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// Audit trail for a tradition
app.get('/api/advisor/traditions/:id/audit', async (req, res) => {
  try {
    const { data: versions } = await supabase
      .from('tradition_versions')
      .select('id')
      .eq('tradition_id', req.params.id);

    const versionIds = (versions || []).map(v => v.id);
    if (!versionIds.length) return res.json([]);

    const { data, error } = await supabase
      .from('tradition_version_audit')
      .select('*')
      .in('tradition_version_id', versionIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Marigold engine test running on port ${PORT}`));
module.exports = app;
