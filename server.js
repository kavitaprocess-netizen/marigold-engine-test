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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Marigold engine test running on port ${PORT}`));
module.exports = app;
