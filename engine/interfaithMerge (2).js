// ============================================================================
// INTERFAITH MERGE ALGORITHM
// Faithful implementation of INTERFAITH MERGE ALGORITHM v1.0,
// Marigold_19b_CulturalTaxonomy_v2.docx §7
// ============================================================================
const { calculateBudget } = require('./budgetCalculator');

const PRIORITY_ORDER = { Required: 0, Traditional: 1, Universal: 2, Optional: 3 };

// The 18 vendor categories an advisor can tick on a ceremony (matches the
// checkbox list in advisor.html's ceremony editor exactly -- these two
// lists must stay in sync, since a category ticked there with no matching
// entry here would be silently skipped rather than generating a task).
// Each maps to one generic, LOCKED task wording (never overridden per
// ceremony -- ceremony-specific nuance belongs in that category's own
// notes field instead, kept separate so the wording itself never drifts
// into 423 one-off variants the way the original taxonomy did) and a
// typical milestone reflecting realistic lead time for that vendor type --
// a venue needs booking a year out, a cake can wait two months.
const VENDOR_CATEGORY_TASK_TEMPLATES = {
  'Venue hire': { label: 'Book venue hire', milestone: '12 months' },
  'Catering & bar': { label: 'Book catering & bar', milestone: '9 months' },
  'Photography & video': { label: 'Book photography & video', milestone: '9 months' },
  'Music & entertainment': { label: 'Book music & entertainment', milestone: '6 months' },
  'Florals & décor': { label: 'Book florals & décor', milestone: '4 months' },
  'Hair & makeup (bride)': { label: 'Book hair & makeup for the bride', milestone: '4 months' },
  'Officiant / pandit / priest': { label: 'Book the officiant', milestone: '9 months' },
  'Mehndi artist': { label: 'Book the mehndi artist', milestone: '4 months' },
  'Horse & procession': { label: 'Arrange horse & procession', milestone: '3 months' },
  'Dhol & band': { label: 'Book dhol & band', milestone: '4 months' },
  'Bridal wear & styling': { label: 'Finalize bridal wear & styling', milestone: '6 months' },
  'Groom\'s attire & styling': { label: 'Finalize groom\'s attire & styling', milestone: '4 months' },
  'Invitations & stationery': { label: 'Order invitations & stationery for this event', milestone: '4 months' },
  'Lighting & AV': { label: 'Book lighting & AV', milestone: '3 months' },
  'Cake & desserts': { label: 'Order cake & desserts', milestone: '2 months' },
  'Transport (Bride/Groom/Couple)': { label: 'Arrange transport', milestone: '2 months' },
  'Guest accommodation': { label: 'Arrange guest accommodation', milestone: '4 months' },
  'Henna for guests': { label: 'Arrange henna for guests', milestone: '1 month' },
};

// Generates the tier-1 (ceremony heading) and tier-2 (per-vendor-category)
// checklist tasks for one ceremony. Called once per ceremony in the final
// merged ceremonySequence, not stored in checklist_template -- these are
// computed fresh every time a plan is generated, directly from the
// ceremony's own name and vendor_categories, so there is exactly one
// place (the ceremony itself) that has to be edited to change what
// appears, never a separate copy that can drift out of sync.
function generateCeremonyDerivedTasks(ceremony) {
  const tasks = [];
  const common = {
    related_ceremony: ceremony.name,
    side: ceremony.side || 'both',
    _sourceTradition: ceremony._sourceTradition,
    _sourceTraditionSlug: ceremony._sourceTraditionSlug,
    _generated: true,
  };

  // Tier 1: the ceremony's own heading, not a checkable task -- carries the
  // ceremony's own cultural note (if any) for display underneath it.
  tasks.push({
    ...common,
    label: ceremony.name,
    _tier: 1,
    milestone: ceremony.timing || 'General',
    notes: ceremony.notes || '',
  });

  // Tier 2: one task per ticked vendor category, wording locked to the
  // shared template, with its own OPTIONAL per-ceremony note kept separate
  // from the generic label -- e.g. "Book photography & video" always reads
  // exactly that, but its note for Chandlo Matli specifically might say
  // "brief them on the Antarpat curtain moment."
  (ceremony.vendor_categories || []).forEach(function(vc) {
    const template = VENDOR_CATEGORY_TASK_TEMPLATES[vc.category];
    if (!template) return; // unrecognized category -- skip rather than guess at wording
    tasks.push({
      ...common,
      label: template.label,
      _tier: 2,
      vendor_category: vc.category,
      milestone: template.milestone,
      notes: vc.notes || '',
    });

    // Paraphernalia (ritual materials): only meaningful under the
    // officiant/priest category, since that's the vendor who typically
    // specifies what's needed. Each item becomes its own individually
    // checkable task, tagged with _parentTaskLabel so the dashboard nests
    // it as a sub-item under this category's own task ("Book the
    // officiant") rather than as a flat, unrelated checklist row.
    if (vc.category === 'Officiant / pandit / priest' && Array.isArray(vc.paraphernalia)) {
      vc.paraphernalia.forEach(function(item) {
        if (!item) return;
        tasks.push({
          ...common,
          label: `Arrange ${item}`,
          _tier: 2,
          _isParaphernalia: true,
          _parentTaskLabel: template.label,
          vendor_category: vc.category,
          milestone: template.milestone,
          notes: '',
        });
      });
    }
  });

  return tasks;
}



// Maps a checklist item's free-text label to a canonical "task signature" --
// e.g. "Book the ceremony venue (church, hall, outdoor)" and "Book venue(s)
// — ceremony and reception" both resolve to 'venue'. This is the same
// vocabulary already established for ceremony vendor categories in the
// advisor tool, kept intentionally small and conservative: a false-negative
// (two genuinely-same tasks not matching) just means they show up twice,
// which is the status quo; a false-positive (two genuinely-different tasks
// wrongly matching) would actively hide something a couple needs to see, so
// each keyword group is picked to be unambiguous rather than broad.
function taskSignature(label) {
  const l = (label || '').toLowerCase();
  // Deliberately excludes officiant/priest/pandit/rabbi/imam and attire --
  // these sound similar across traditions but are genuinely different needs
  // for an interfaith couple (a separate officiant per tradition, often
  // separate outfits per ceremony), not the same task worded two ways.
  // Merging those would hide a real requirement, not just deduplicate one.
  const groups = [
    ['venue', /\bvenue\b/],
    ['catering', /\bcater(er|ing)?\b/],
    ['photography', /\bphoto(grapher|graphy)?\b|\bvideograph/],
    ['music', /\bmusic\b|\bdj\b|\bband\b/],
    ['florist', /\bflorist\b|\bflowers?\b|\bfloral/],
    ['invitations', /\binvitations?\b/],
    ['rings', /\bring(s)?\b/],
    ['hair-makeup', /\bhair\b.*\bmakeup\b|\bmakeup\b.*\bhair\b|\bhair and makeup\b/],
    ['transport', /\btransport(ation)?\b/],
    ['guest-list', /\bguest list\b/],
    ['seating', /\bseating\b/],
    ['rehearsal', /\brehearsal\b/],
  ];
  for (const [key, re] of groups) {
    if (re.test(l)) return key;
  }
  return null; // no confident signature -- never used for near-match merging
}

/**
 * STEP 2 (spec): merge checklist items from both traditions + universal.
 * Identical items (same milestone + vendor category) collapse into one,
 * marked as applying to both. Differing items in the same category are kept
 * separately with tradition-attribution notes.
 */
function mergeChecklists(t1, t2, universalChecklist) {
  const combined = [
    ...t1.checklist_template.map((i) => ({ ...i, _sourceTradition: t1.name })),
    ...(t2 ? t2.checklist_template.map((i) => ({ ...i, _sourceTradition: t2.name })) : []),
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
      const itemCat = item.vendor_category || item.category;
      const otherCat = other.vendor_category || other.category;
      if (
        other.milestone === item.milestone &&
        itemCat && otherCat && otherCat === itemCat
      ) {
        matchIndex = j;
        break;
      }
    }

    if (matchIndex !== -1) {
      const match = combined[matchIndex];
      consumed.add(matchIndex);

      const identical = item.label === match.label && item.notes === match.notes;

      if (identical) {
        merged.push({ ...item, _appliesTo: 'both' });
      } else {
        merged.push({ ...item, notes: `${item.notes || ''} (Required for ${item._sourceTradition} ceremony)`.trim() });
        merged.push({ ...match, notes: `${match.notes || ''} (Required for ${match._sourceTradition} ceremony)`.trim() });
      }
      continue;
    }

    // No exact match on milestone+category -- check for a near-match by task
    // signature instead, so e.g. a tradition's own "book venue" item collapses
    // with the universal one even though they sit at different milestones.
    // Only considered against items that haven't already been claimed by an
    // exact match above, and only when neither item is already the product
    // of a prior near-match merge (so we never chain three+ items into one).
    const sig = taskSignature(item.label);
    let nearMatchIndex = -1;
    if (sig) {
      for (let j = i + 1; j < combined.length; j++) {
        if (consumed.has(j)) continue;
        const other = combined[j];
        if (other._sourceTradition === item._sourceTradition) continue; // only across different sources
        if (taskSignature(other.label) === sig) { nearMatchIndex = j; break; }
      }
    }

    if (nearMatchIndex === -1) {
      merged.push(item);
      continue;
    }

    const nearMatch = combined[nearMatchIndex];
    consumed.add(nearMatchIndex);
    // Keep the earlier (further-out) milestone -- booking early is always
    // the safer of two pieces of advice -- and preserve both originals
    // untouched under _alternates so the client can offer "split into two"
    // and restore each exactly as it was, not a reconstruction. Critically,
    // _sourceTradition on the merged item itself is forced neutral: whichever
    // original happened to have the earlier milestone must not leak through
    // and make this display as tradition-specific again -- a near-matched
    // item is by definition meant to show as shared, regardless of which
    // side's wording or timing "won."
    const itemMonths = parseMilestoneMonths(item.milestone);
    const matchMonths = parseMilestoneMonths(nearMatch.milestone);
    const earlier = itemMonths >= matchMonths ? item : nearMatch;
    merged.push({
      ...earlier,
      _sourceTradition: 'Universal',
      _sourceTraditionSlug: undefined,
      _nearMatch: true,
      _taskSignature: sig,
      _alternates: [item, nearMatch],
    });
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
  ].filter(c => c.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));

  // Tier 1/2 tasks, one set per ceremony, generated fresh from each
  // ceremony's own name and ticked vendor categories -- never stored,
  // always computed, so there is nothing here that can drift out of sync
  // with what the ceremony itself actually says.
  const derivedTasks = ceremonySequence.reduce((acc, cer) => acc.concat(generateCeremonyDerivedTasks(cer)), []);

  return {
    checklist: [...derivedTasks, ...checklist, ...interfaithAdditions],
    vendors,
    budget,
    conflicts,
    ceremony_sequence: ceremonySequence,
    interfaith_additions: interfaithAdditions,
  };
}

module.exports = { mergeTraditions, mergeChecklists, mergeVendorCategories, detectConflicts, generateCeremonyDerivedTasks };
