// ============================================================================
// MAIN ENGINE ENTRY POINT
// Given a couple's questionnaire answers, produces a full plan using ONLY
// deterministic taxonomy data — no AI call anywhere in this path.
// ============================================================================
const { loadTradition } = require('./taxonomyData');
const { calculateBudget } = require('./budgetCalculator');
const { mergeTraditions } = require('./interfaithMerge');
const UNIVERSAL_CHECKLIST = require('./universalChecklist.json');

/**
 * NOT_YET_AVAILABLE result shape — returned when a couple selects a
 * tradition with no approved taxonomy content yet. The engine NEVER falls
 * back to AI-generated content silently; that would defeat the entire
 * purpose of the deterministic rebuild. The caller (UI layer) decides how
 * to message this to the couple.
 */
function notYetAvailable(slug) {
  return {
    available: false,
    slug,
    reason: 'NO_APPROVED_VERSION',
    message: `No advisor-approved content exists yet for "${slug}". This tradition cannot use the deterministic engine until an advisor reviews and approves content for it.`,
  };
}

/**
 * Main entry point.
 * @param {Object} input
 * @param {string[]} input.traditionSlugs - 1 or 2 tradition slugs selected by the couple
 * @param {number} input.totalBudget
 * @param {number} [input.actualEventCount] - couple's planned event count, for multi-event budget adjustment
 * @param {string} [input.jurisdiction] - for legal marriage validity flagging on interfaith pairings
 */
async function generatePlan({ traditionSlugs, totalBudget, actualEventCount, jurisdiction }) {
  if (!traditionSlugs || traditionSlugs.length === 0) {
    throw new Error('generatePlan requires at least one traditionSlug');
  }
  if (traditionSlugs.length > 2) {
    throw new Error("generatePlan supports a maximum of two traditions (matches the questionnaire's own limit)");
  }

  const loaded = await Promise.all(traditionSlugs.map(loadTradition));

  // Check availability BEFORE doing any merge/budget work — fail clearly,
  // not silently, and never substitute AI content for a missing tradition.
  const missing = loaded.map((t, i) => (t ? null : traditionSlugs[i])).filter(Boolean);

  if (missing.length > 0) {
    return {
      success: false,
      unavailable_traditions: missing.map(notYetAvailable),
    };
  }

  if (loaded.length === 1) {
    const t = loaded[0];
    const budget = totalBudget ? calculateBudget({ totalBudget, traditions: [t], actualEventCount }) : null;

    return {
      success: true,
      traditions: [t.slug],
      checklist: [...t.checklist_template, ...UNIVERSAL_CHECKLIST],
      vendors: t.vendor_categories,
      ceremony_sequence: t.ceremony_sequence,
      budget,
      cultural_notes: t.cultural_notes,
      conflicts: [],
      source: 'deterministic_engine',
      version_ids: [t.version_id],
    };
  }

  // Two traditions — run the full interfaith merge algorithm.
  const [t1, t2] = loaded;
  const merged = mergeTraditions({
    t1,
    t2,
    universalChecklist: UNIVERSAL_CHECKLIST,
    totalBudget,
    actualEventCount,
    jurisdiction,
  });

  return {
    success: true,
    traditions: [t1.slug, t2.slug],
    ...merged,
    cultural_notes: `${t1.name}: ${t1.cultural_notes}\n\n${t2.name}: ${t2.cultural_notes}`,
    source: 'deterministic_engine',
    version_ids: [t1.version_id, t2.version_id],
  };
}

module.exports = { generatePlan, notYetAvailable };
