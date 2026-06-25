// ============================================================================
// INTERFAITH MERGE ALGORITHM
// Faithful implementation of INTERFAITH MERGE ALGORITHM v1.0,
// Marigold_19b_CulturalTaxonomy_v2.docx §7
// ============================================================================
const { calculateBudget } = require('./budgetCalculator');

const PRIORITY_ORDER = { Required: 0, Traditional: 1, Universal: 2, Optional: 3 };

/**
 * STEP 2 (spec): merge checklist items from both traditions + universal.
 * Identical items (same milestone + vendor category) collapse into one,
 * marked as applying to both. Differing items in the same category are kept
 * separately with tradition-attribution notes.
 */
function mergeChecklists(t1, t2, universalChecklist) {
  const combined = [
    ...t1.checklist_template.map((i) => ({ ...i, _sourceTradition: t1.name })),
    ...t2.checklist_template.map((i) => ({ ...i, _sourceTradition: t2.name })),
    ...universalChecklist.map((i) => ({ ...i, _sourceTradition: 'Universal' })),
  ];

  const merged = [];
  const consumed = new Set();

  for (let i = 0; i < combined.length; i++) {
    if (consumed.has(i)) continue;
    const item = combined[i];

    let matchIndex = -1;
    for (let j = i + 1; j < combined.length; j++) {
      if (consumed.has(j)) continue;
      const other = combined[j];
      if (
        other.milestone === item.milestone &&
        (other.vendor_category || other.category) === (item.vendor_category || item.category)
      ) {
        matchIndex = j;
        break;
      }
    }

    if (matchIndex === -1) {
      merged.push(item);
      continue;
    }

    const match = combined[matchIndex];
    consumed.add(matchIndex);

    const identical = item.label === match.label && item.notes === match.notes;

    if (identical) {
      merged.push({ ...item, _appliesTo: 'both' });
    } else {
      merged.push({ ...item, notes: `${item.notes || ''} (Required for ${item._sourceTradition} ceremony)`.trim() });
      merged.push({ ...match, notes: `${match.notes || ''} (Required for ${match._sourceTradition} ceremony)`.trim() });
    }
  }

  merged.sort((a, b) => {
    const aMonths = parseMilestoneMonths(a.milestone);
    const bMonths = parseMilestoneMonths(b.milestone);
    if (aMonths !== bMonths) return bMonths - aMonths; // descending — furthest out first
    const aPriority = PRIORITY_ORDER[a.type] ?? 4;
    const bPriority = PRIORITY_ORDER[b.type] ?? 4;
    return aPriority - bPriority;
  });

  return merged;
}

function parseMilestoneMonths(milestone) {
  if (!milestone) return 0;
  const m = /(\d+)\s*month/i.exec(milestone);
  if (m) return parseInt(m[1], 10);
  const w = /(\d+)\s*week/i.exec(milestone);
  if (w) return parseInt(w[1], 10) / 4.345;
  if (/day of/i.test(milestone)) return 0;
  if (/after/i.test(milestone)) return -1;
  return 0;
}

/**
 * STEP 3 (spec): merge vendor categories with the specified dedup rules.
 */
function mergeVendorCategories(t1, t2) {
  const t1Vendors = t1.vendor_categories.map((v) => ({ ...v, _trad: t1.name }));
  const t2Vendors = t2.vendor_categories.map((v) => ({ ...v, _trad: t2.name }));
  const merged = [];
  const consumedT2 = new Set();

  const dedupRule = (categoryName) => {
    const lower = (categoryName || '').toLowerCase();
    if (lower.includes('photo')) return 'merge_labeled';
    if (lower.includes('caterer') || lower.includes('catering')) return 'flag_dietary';
    if (lower.includes('florist') || lower.includes('decor')) return 'merge_notes';
    if (lower.includes('officiant') || lower.includes('priest')) return 'replace';
    if (lower.includes('music') || lower.includes('dj') || lower.includes('band')) return 'keep_separate';
    if (lower.includes('hair') || lower.includes('makeup')) return 'merge_labeled';
    return 'keep_separate';
  };

  for (const v1 of t1Vendors) {
    const rule = dedupRule(v1.category || v1.tag);
    const v1Key = (v1.category || v1.tag || '').toLowerCase().split(' ')[0];
    const t2MatchIdx = t2Vendors.findIndex(
      (v2, idx) => !consumedT2.has(idx) && (v2.category || v2.tag || '').toLowerCase().includes(v1Key)
    );

    if (t2MatchIdx === -1 || rule === 'keep_separate') {
      merged.push(v1);
      continue;
    }

    const v2 = t2Vendors[t2MatchIdx];
    consumedT2.add(t2MatchIdx);

    switch (rule) {
      case 'merge_labeled':
        merged.push({
          category: v1.category || v1.tag,
          tag: `${v1._trad}+${v2._trad}`,
          priority: 'Required',
          notes: `Experienced with ${v1._trad} + ${v2._trad} weddings`,
          spend_pct_low: avg(v1.typical_spend_pct_low, v2.typical_spend_pct_low),
          spend_pct_high: avg(v1.typical_spend_pct_high, v2.typical_spend_pct_high),
        });
        break;
      case 'flag_dietary':
        merged.push({
          category: v1.category || v1.tag,
          tag: `${v1._trad}+${v2._trad}`,
          priority: 'Required',
          notes: `Must accommodate both ${v1._trad} and ${v2._trad} dietary requirements — see conflict flags.`,
          spend_pct_low: avg(v1.typical_spend_pct_low, v2.typical_spend_pct_low),
          spend_pct_high: avg(v1.typical_spend_pct_high, v2.typical_spend_pct_high),
        });
        break;
      case 'merge_notes':
        merged.push({
          category: v1.category || v1.tag,
          tag: `${v1._trad}+${v2._trad}`,
          priority: v1.priority,
          notes: `${v1.notes || ''} / ${v2.notes || ''}`.trim(),
          spend_pct_low: avg(v1.typical_spend_pct_low, v2.typical_spend_pct_low),
          spend_pct_high: avg(v1.typical_spend_pct_high, v2.typical_spend_pct_high),
        });
        break;
      case 'replace':
        merged.push({
          category: 'Officiant',
          tag: 'multi-faith',
          priority: 'Required',
          notes: `Multi-faith officiant (${v1._trad} + ${v2._trad} specialist)`,
          spend_pct_low: avg(v1.typical_spend_pct_low, v2.typical_spend_pct_low),
          spend_pct_high: avg(v1.typical_spend_pct_high, v2.typical_spend_pct_high),
        });
        break;
      default:
        merged.push(v1);
        merged.push(v2);
    }
  }

  t2Vendors.forEach((v2, idx) => {
    if (!consumedT2.has(idx)) merged.push(v2);
  });

  return merged;
}

function avg(a, b) {
  if (a == null && b == null) return null;
  if (a == null) return b;
  if (b == null) return a;
  return (a + b) / 2;
}

/**
 * STEP 4 (spec): conflict detection.
 */
function detectConflicts(t1, t2, jurisdiction) {
  const flags = [];

  const t1Notes = (t1.cultural_notes || '').toLowerCase();
  const t2Notes = (t2.cultural_notes || '').toLowerCase();
  const has = (notes, word) => notes.includes(word);

  if (has(t1Notes, 'kosher') && has(t2Notes, 'halal')) {
    flags.push({ type: 'dietary_kosher_halal', severity: 'high',
      message: 'One tradition requires kosher catering, the other halal. Confirm whether a single caterer can certify both, or whether separate stations/caterers are needed.' });
  }
  if (has(t1Notes, 'halal') && has(t2Notes, 'kosher')) {
    flags.push({ type: 'dietary_kosher_halal', severity: 'high',
      message: 'One tradition requires halal catering, the other kosher. Confirm whether a single caterer can certify both, or whether separate stations/caterers are needed.' });
  }
  if (has(t1Notes, 'vegetarian') && !has(t2Notes, 'vegetarian')) {
    flags.push({ type: 'dietary_vegetarian_nonveg', severity: 'medium',
      message: `${t1.name} tradition expects vegetarian catering; ${t2.name} does not require it. Confirm menu approach with both families.` });
  }
  if (has(t2Notes, 'vegetarian') && !has(t1Notes, 'vegetarian')) {
    flags.push({ type: 'dietary_vegetarian_nonveg', severity: 'medium',
      message: `${t2.name} tradition expects vegetarian catering; ${t1.name} does not require it. Confirm menu approach with both families.` });
  }
  if (has(t1Notes, 'jain') || has(t2Notes, 'jain')) {
    flags.push({ type: 'dietary_jain', severity: 'medium',
      message: 'Jain dietary requirements (no root vegetables) apply to at least one tradition selected. Confirm with caterer.' });
  }

  if (t1.ceremony_sequence?.length && t2.ceremony_sequence?.length) {
    flags.push({
      type: 'two_ceremonies_same_day',
      severity: 'info',
      message: 'Some couples hold both ceremonies on the same day (sequential). Others prefer to separate them. What works best for your families?',
    });
  }

  const mentionsOutdoorRequirement = (n) => n.includes('outdoor') && n.includes('require');
  const mentionsIndoorRequirement = (n) =>
    (n.includes('indoor') || n.includes('gurdwara') || n.includes('temple') || n.includes('synagogue')) &&
    (n.includes('must') || n.includes('require'));

  if (mentionsOutdoorRequirement(t1Notes) && mentionsIndoorRequirement(t2Notes)) {
    flags.push({ type: 'venue_indoor_outdoor', severity: 'medium',
      message: `${t1.name} traditionally requires an outdoor element while ${t2.name} requires an indoor sacred space. Confirm a venue that can accommodate both.` });
  }
  if (mentionsIndoorRequirement(t1Notes) && mentionsOutdoorRequirement(t2Notes)) {
    flags.push({ type: 'venue_indoor_outdoor', severity: 'medium',
      message: `${t2.name} traditionally requires an outdoor element while ${t1.name} requires an indoor sacred space. Confirm a venue that can accommodate both.` });
  }

  flags.push({
    type: 'dual_ceremony_setup',
    severity: 'info',
    message: `If both ceremonies happen at the same venue, confirm setup/changeover logistics between ${t1.name} and ${t2.name} ceremony structures.`,
  });

  // Always flagged for interfaith pairings — the engine cannot verify officiant
  // legal authorization itself, this is jurisdiction-specific and must be
  // confirmed by the couple directly.
  flags.push({
    type: 'legal_marriage_validity',
    severity: 'high',
    message: jurisdiction
      ? `Confirm one of your officiants is legally authorised to marry you in ${jurisdiction}. You may need a civil ceremony in addition.`
      : 'Confirm one of your officiants is legally authorised to marry you in your jurisdiction. You may need a civil ceremony in addition.',
  });

  return flags;
}

/**
 * STEP 5 (spec): interfaith-specific checklist additions.
 */
function generateInterfaithAdditions(t1, t2) {
  return [
    { milestone: '12 months', label: `Book multi-faith officiant who co-officiates ${t1.name} + ${t2.name}`, type: 'Required' },
    { milestone: '12 months', label: 'Decide: sequential or blended ceremony', type: 'Required' },
    { milestone: '10 months', label: 'Family communication guide for both traditions', type: 'Required' },
    { milestone: '6 months', label: 'Guest experience guide for ceremony elements', type: 'Required' },
    { milestone: '4 months', label: 'Joint rehearsal with both officiants and both families', type: 'Required' },
  ];
}

/**
 * Main entry point — runs the full 6-step merge algorithm (spec §7).
 */
function mergeTraditions({ t1, t2, universalChecklist, totalBudget, actualEventCount, jurisdiction }) {
  const checklist = mergeChecklists(t1, t2, universalChecklist || []);
  const vendors = mergeVendorCategories(t1, t2);
  const conflicts = detectConflicts(t1, t2, jurisdiction);
  const interfaithAdditions = generateInterfaithAdditions(t1, t2);

  const budget = totalBudget
    ? calculateBudget({ totalBudget, traditions: [t1, t2], actualEventCount })
    : null;

  const ceremonySequence = [
    ...(t1.ceremony_sequence || []).map(c => ({ ...c, _sourceTradition: t1.name, _sourceTraditionSlug: t1.slug })),
    ...(t2.ceremony_sequence || []).map(c => ({ ...c, _sourceTradition: t2.name, _sourceTraditionSlug: t2.slug })),
  ].sort((a, b) => (a.order || 0) - (b.order || 0));

  return {
    checklist: [...checklist, ...interfaithAdditions],
    vendors,
    budget,
    conflicts,
    ceremony_sequence: ceremonySequence,
    interfaith_additions: interfaithAdditions,
  };
}

module.exports = { mergeTraditions, mergeChecklists, mergeVendorCategories, detectConflicts };
