// ============================================================================
// MARIGOLD — DETERMINISTIC CULTURAL INTELLIGENCE ENGINE
// Data access layer: reads ONLY from the `live_taxonomy` view (approved + current
// content). Never calls an AI model. This is the real Phase 1 replacement for the
// demo's AI-prompted plan generation, per Marigold_04_FeatureSpec_v1.docx §2.2.
// ============================================================================
const { createClient } = require('@supabase/supabase-js');

// Server-side only — never expose the secret key to a browser bundle.
// Same handling pattern as the Anthropic API key in the existing demo's server.js.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Loads a single tradition's approved, current content from live_taxonomy.
 * Returns null if no approved version exists yet (e.g. still in draft/review) —
 * callers MUST handle this case explicitly, never silently fall back to AI
 * content, since that would defeat the entire point of the deterministic engine.
 */
async function loadTradition(slug) {
  const { data, error } = await supabase
    .from('live_taxonomy')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load tradition "${slug}": ${error.message}`);
  }
  if (!data) return null;
  // Ensure all fields have safe defaults so the engine never crashes on missing data
  return {
    ...data,
    checklist_template: data.checklist_template || [],
    ceremony_sequence: data.ceremony_sequence || [],
    vendor_categories: data.vendor_categories || [],
    budget_allocation: data.budget_allocation || [],
    cultural_notes: data.cultural_notes || '',
    sources: data.sources || '',
  };
}

/**
 * Returns the list of tradition slugs that have an approved, current version —
 * used to tell the questionnaire UI which traditions can use the deterministic
 * engine vs. which still need to fall back to a clear "not yet available"
 * state (never silently to AI — see ENGINE_DESIGN_NOTES.md).
 */
async function listAvailableTraditions() {
  const { data, error } = await supabase
    .from('live_taxonomy')
    .select('slug, name, region');

  if (error) {
    throw new Error(`Failed to list available traditions: ${error.message}`);
  }
  return data;
}

module.exports = { loadTradition, listAvailableTraditions, supabase };
