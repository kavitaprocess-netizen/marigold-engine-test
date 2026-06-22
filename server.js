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

const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'advisor-review')));

// Supabase client — server-side only, uses the secret key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// ============================================================================
// GET /api/traditions
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

// Serve the advisor review UI
app.get('/advisor', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'advisor-review', 'index.html'));
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

// GET /api/advisor/traditions/:id/audit
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
