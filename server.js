// ============================================================================
// MARIGOLD ENGINE TEST SERVER v3.2
// Landing / Questionnaire / Advisor / brand.css / API
// ============================================================================
const express = require('express');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { generatePlan } = require('./engine/index');

const app = express();
// Default express.json() body limit is 100KB, which a full plan payload
// (checklist + ceremony sequence + budget, potentially across two
// traditions) can genuinely exceed -- this was causing a silent 413 on
// /api/regenerate-preserving-edits and /api/resync-plan that the client's
// own error handling never got a chance to catch, since Express rejects
// an oversized body before the route handler ever runs.
app.use(express.json({ limit: '5mb' }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Page content (loaded from disk — single source of truth per file) ──
const BRAND_CSS = fs.readFileSync(path.join(__dirname, 'public', 'brand.css'), 'utf8');
const LANDING_HTML = fs.readFileSync(path.join(__dirname, 'views', 'landing.html'), 'utf8');
const ADVISOR_HTML = fs.readFileSync(path.join(__dirname, 'views', 'advisor.html'), 'utf8');
const QUESTIONNAIRE_HTML = fs.readFileSync(path.join(__dirname, 'views', 'questionnaire.html'), 'utf8');
const DASHBOARD_HTML = fs.readFileSync(path.join(__dirname, 'views', 'dashboard.html'), 'utf8');
const DASHBOARD_CHECKLIST_HTML = fs.readFileSync(path.join(__dirname, 'views', 'dashboard-checklist.html'), 'utf8');

// ── Routes: brand CSS (single source of truth) ──
app.get('/brand.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(BRAND_CSS);
});

// ── Routes: pages ──
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(LANDING_HTML);
});

// /questionnaire is served as a static file by Vercel (see vercel.json)
// This route is a fallback for local development only
app.get('/questionnaire', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(QUESTIONNAIRE_HTML);
});

app.get('/advisor', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(ADVISOR_HTML);
});

app.get('/dashboard', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(DASHBOARD_HTML);
});

app.get('/dashboard/checklist', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(DASHBOARD_CHECKLIST_HTML);
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
        versionIds: result.version_ids || [],
      }
    });
  } catch(e) {
    console.error('generate-plan error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Resync an existing saved plan with the latest approved taxonomy ──
// Re-runs generation fresh, then reapplies the couple's own ceremony
// moves/copies/deletes and checklist-checked state on top of the refreshed
// content, matching by NAME (not array index, since the fresh content's
// ordering/length may differ from what the plan was originally built from).
// Shared merge logic: given existing plan_data and freshly-generated
// content, reapplies the couple's own ceremony moves/copies/deletes and
// checklist checked-state on top of the fresh content, matched by NAME
// (not array index, since fresh content's ordering/length may differ).
// Used by both /api/resync-plan (fetch+merge+save, for the dashboard's
// "Apply update") and /api/regenerate-preserving-edits (merge only, no
// save, for the questionnaire's own "Build my plan" on a returning edit --
// the questionnaire controls its own save timing via later steps).
function mergePlanDataWithFreshContent(pd, fresh) {
  const S = pd.S || {};
  const oldCeremonySelections = pd.ceremonySelections || {};
  const oldChecklistProgress = pd.checklistProgress || {};
  const oldPlanCeremonies = pd.planCeremonies || [];
  const freshCeremonies = fresh.ceremony_sequence || [];
  const freshChecklist = fresh.checklist || [];

  const oldIndexToName = {};
  oldPlanCeremonies.forEach((c, i) => { oldIndexToName[i] = c.name || c.event || ''; });

  const nameToNewIndex = {};
  freshCeremonies.forEach((c, i) => { nameToNewIndex[c.name || c.event || ''] = i; });

  const newCeremonySelections = {};
  Object.entries(oldCeremonySelections).forEach(([tradSlug, groups]) => {
    newCeremonySelections[tradSlug] = {};
    ['side1', 'side2', 'both'].forEach((group) => {
      const oldGroup = groups[group] || {};
      const newGroup = {};
      Object.entries(oldGroup).forEach(([oldIdxStr, val]) => {
        if (val === false) return;
        const name = oldIndexToName[parseInt(oldIdxStr)];
        const newIdx = name != null ? nameToNewIndex[name] : undefined;
        if (newIdx !== undefined) newGroup[newIdx] = true;
      });
      if (Object.keys(newGroup).length) newCeremonySelections[tradSlug][group] = newGroup;
    });
  });

  function checklistItemId(item, i) {
    const label = item.label || item.task || item.description || ('item' + i);
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return 'ci-' + i + '-' + slug.slice(0, 40);
  }
  const oldLabelToChecked = {};
  (S.plan && S.plan.checklist || []).forEach((item, i) => {
    const id = checklistItemId(item, i);
    if (oldChecklistProgress[id]) oldLabelToChecked[item.label] = true;
  });
  const newChecklistProgress = {};
  freshChecklist.forEach((item, i) => {
    if (oldLabelToChecked[item.label]) {
      newChecklistProgress[checklistItemId(item, i)] = true;
    }
  });

  const newS = Object.assign({}, S, {
    plan: {
      traditions: fresh.traditions,
      checklist: freshChecklist,
      ceremonySequence: freshCeremonies,
      vendorCategories: fresh.vendors || [],
      budget: fresh.budget || [],
      conflicts: fresh.conflicts || [],
      culturalNotes: fresh.cultural_notes || '',
      versionIds: fresh.version_ids || [],
    }
  });

  return Object.assign({}, pd, {
    S: newS,
    ceremonySelections: newCeremonySelections,
    checklistProgress: newChecklistProgress,
    planCeremonies: freshCeremonies,
  });
}

app.post('/api/resync-plan', async (req, res) => {
  const userId = req.body.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const { data: planRow, error: fetchErr } = await supabase
      .from('plans').select('*').eq('user_id', userId).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!planRow) return res.status(404).json({ error: 'no saved plan found' });

    const pd = planRow.plan_data || {};
    const S = pd.S || {};
    const traditionSlugs = S.traditions || [];
    if (!traditionSlugs.length) return res.status(400).json({ error: 'plan has no traditions on record' });

    const fresh = await generatePlan({
      traditionSlugs,
      totalBudget: parseInt(S.budget) || 50000,
      jurisdiction: S.jurisdiction || 'US',
    });
    if (!fresh.success) return res.status(404).json({ error: 'traditions not currently available' });

    const merged = mergePlanDataWithFreshContent(pd, fresh);
    const newPlanData = Object.assign({}, merged, {
      savedAt: new Date().toISOString(),
      lastResyncedAt: new Date().toISOString(),
    });

    const { error: saveErr } = await supabase
      .from('plans').update({ plan_data: newPlanData }).eq('user_id', userId);
    if (saveErr) throw saveErr;

    res.json({ success: true, planData: newPlanData });
  } catch (e) {
    console.error('resync-plan error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Regenerate a plan's cultural content from CURRENT (possibly just-
// edited-in-this-session) questionnaire answers, preserving the couple's
// existing ceremony moves/checklist progress -- but WITHOUT saving. Used
// when a returning couple clicks "Build my plan" again from the review
// screen; they still have Q7/Q8 ahead of them before an explicit save.
app.post('/api/regenerate-preserving-edits', async (req, res) => {
  const planData = req.body.planData;
  if (!planData || !planData.S) return res.status(400).json({ error: 'planData required' });

  try {
    const S = planData.S;
    const traditionSlugs = S.traditions || [];
    if (!traditionSlugs.length) return res.status(400).json({ error: 'no traditions on record' });

    const fresh = await generatePlan({
      traditionSlugs,
      totalBudget: parseInt(S.budget) || 50000,
      jurisdiction: S.jurisdiction || 'US',
    });
    if (!fresh.success) return res.status(404).json({ error: 'traditions not currently available' });

    const merged = mergePlanDataWithFreshContent(planData, fresh);
    res.json({ success: true, planData: merged });
  } catch (e) {
    console.error('regenerate-preserving-edits error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Advisor access control ──
// Verifies the caller's Supabase session token, then checks them against
// the curated advisor_allowlist table (via a security-definer function,
// so this server never needs direct table access -- just the same
// pass/fail answer any client could get, but enforced here for real).
async function requireApprovedAdvisor(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Not signed in.' });
    }
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData || !userData.user) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    const email = userData.user.email;
    const { data: isApproved, error: checkError } = await supabase.rpc('is_approved_advisor', { check_email: email });
    if (checkError) {
      console.error('Advisor allowlist check failed:', checkError);
      return res.status(500).json({ error: 'Could not verify access. Please try again.' });
    }
    if (!isApproved) {
      return res.status(403).json({ error: 'This account does not have advisor access.' });
    }
    const { data: permissionRows, error: permError } = await supabase.rpc('get_advisor_tradition_slugs', { check_email: email });
    if (permError) {
      console.error('Advisor permission lookup failed:', permError);
      return res.status(500).json({ error: 'Could not verify access. Please try again.' });
    }
    const slugs = (permissionRows || []).map(function(r) { return r.tradition_slug; });
    var isEmpty = function(s) { return s === null || s === undefined || (typeof s === 'string' && s.trim() === ''); };
    req.advisorEmail = email;
    req.advisorFullAccess = slugs.some(isEmpty);
    req.advisorTraditionSlugs = slugs.filter(function(s) { return !isEmpty(s); });
    next();
  } catch (e) {
    console.error('requireApprovedAdvisor error:', e);
    res.status(500).json({ error: 'Something went wrong verifying access.' });
  }
}
app.use('/api/advisor', requireApprovedAdvisor);

// Checks whether the current advisor is allowed to touch a specific tradition
// (by its id). Returns true/false; sends the 403 response itself if denied,
// so callers can just `if (!(await checkTraditionAccess(req, res, id))) return;`
async function checkTraditionAccess(req, res, traditionId) {
  if (req.advisorFullAccess) return true;
  const { data, error } = await supabase.from('cultural_traditions').select('slug').eq('id', traditionId).single();
  if (error || !data) {
    res.status(404).json({ error: 'Tradition not found.' });
    return false;
  }
  if (!req.advisorTraditionSlugs.includes(data.slug)) {
    res.status(403).json({ error: 'You do not have access to this tradition.' });
    return false;
  }
  return true;
}

// Same check, but starting from a *version* id -- looks up which tradition
// that version belongs to first.
async function checkVersionAccess(req, res, versionId) {
  if (req.advisorFullAccess) return true;
  const { data, error } = await supabase.from('tradition_versions').select('tradition_id').eq('id', versionId).single();
  if (error || !data) {
    res.status(404).json({ error: 'Version not found.' });
    return false;
  }
  return checkTraditionAccess(req, res, data.tradition_id);
}

// ── Advisor API ──
app.get('/api/advisor/traditions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cultural_traditions')
      .select('id,slug,name,region,priority,tradition_versions(id,version_number,status,is_current,proposed_at,reviewed_at)')
      .order('name');
    if (error) throw error;
    const filtered = req.advisorFullAccess ? data : data.filter(function(t) { return req.advisorTraditionSlugs.includes(t.slug); });
    res.json(filtered);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/advisor/traditions/:id/versions', async (req, res) => {
  try {
    if (!(await checkTraditionAccess(req, res, req.params.id))) return;
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
    if (!(await checkVersionAccess(req, res, req.params.id))) return;
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
    if (!(await checkVersionAccess(req, res, id))) return;
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
    if (!(await checkTraditionAccess(req, res, req.params.id))) return;
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
    if (!(await checkVersionAccess(req, res, req.params.id))) return;
    const { data, error } = await supabase.from('tradition_versions')
      .update({ ...req.body, status: 'in_review', proposed_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/advisor/versions/:id/approve', async (req, res) => {
  try {
    if (!(await checkVersionAccess(req, res, req.params.id))) return;
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
    if (!(await checkVersionAccess(req, res, req.params.id))) return;
    const { data, error } = await supabase.from('tradition_versions')
      .update({ status: 'draft', review_notes: req.body.review_notes || '' })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/advisor/versions/:id/cancel', async (req, res) => {
  try {
    if (!(await checkVersionAccess(req, res, req.params.id))) return;
    const { error } = await supabase.from('tradition_versions')
      .delete().eq('id', req.params.id).eq('status', 'draft');
    if (error) throw error;
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/advisor/traditions/:id/audit', async (req, res) => {
  try {
    if (!(await checkTraditionAccess(req, res, req.params.id))) return;
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
