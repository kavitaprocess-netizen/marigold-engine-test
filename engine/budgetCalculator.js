// ============================================================================
// BUDGET CALCULATION LOGIC
// Faithful implementation of BUDGET CALCULATION LOGIC v1.0,
// Marigold_19b_CulturalTaxonomy_v2.docx §6
// ============================================================================

// STEP 6 (spec): fixed-cost overrides, not percentage-based.
const FIXED_COST_OVERRIDES = {
  officiant_fee: { low: 500, high: 3000 },
  registry_fees: { low: 50, high: 200 },
  marriage_cert: { low: 25, high: 100 },
};

// STEP 5 (spec): priority order for trimming when allocations exceed 100%.
// NEVER reduce venue, catering, officiant, or photographer/ceremony requirements.
const REDUCIBLE_CATEGORY_ORDER = [
  'contingency',
  'honeymoon',
  'invitations',
  'stationery',
  'transport',
  'favours',
  'gifts',
];
const PROTECTED_CATEGORIES = ['venue', 'catering', 'officiant', 'photography', 'photographer'];

/**
 * STEP 2 (spec): single-tradition calculation.
 */
function calculateSingleTraditionBudget(totalBudget, budgetAllocation) {
  return budgetAllocation.map((cat) => ({
    category: cat.category,
    suggested_amount: Math.round(totalBudget * ((cat.pct_low + cat.pct_high) / 2) / 100),
    min_amount: Math.round(totalBudget * cat.pct_low / 100),
    max_amount: Math.round(totalBudget * cat.pct_high / 100),
    pct_low: cat.pct_low,
    pct_high: cat.pct_high,
    notes: cat.notes || null,
  }));
}

/**
 * STEP 3 (spec): interfaith weighted merge by event count.
 * Shared categories (venue, photography, catering) get a weighted-average
 * percentage. Tradition-specific categories (mandap, chuppah, etc.) are kept
 * at full allocation but flagged as tradition-specific, per spec.
 */
const SHARED_CATEGORY_KEYWORDS = ['venue', 'catering', 'photography', 'photographer', 'video'];

function isSharedCategory(categoryName) {
  const lower = categoryName.toLowerCase();
  return SHARED_CATEGORY_KEYWORDS.some((kw) => lower.includes(kw));
}

function mergeInterfaithBudget(totalBudget, t1, t2) {
  const t1Events = t1.typical_event_count || t1.ceremony_sequence.length || 1;
  const t2Events = t2.typical_event_count || t2.ceremony_sequence.length || 1;
  const t1Weight = t1Events / (t1Events + t2Events);
  const t2Weight = t2Events / (t1Events + t2Events);

  const merged = [];
  const seen = new Set();

  // Walk t1's categories, merging with matching t2 categories if shared.
  for (const cat of t1.budget_allocation) {
    if (isSharedCategory(cat.category)) {
      const t2Match = t2.budget_allocation.find(
        (c) => c.category.toLowerCase() === cat.category.toLowerCase()
      );
      if (t2Match) {
        seen.add(t2Match.category.toLowerCase());
        const mergedPctLow = cat.pct_low * t1Weight + t2Match.pct_low * t2Weight;
        const mergedPctHigh = cat.pct_high * t1Weight + t2Match.pct_high * t2Weight;
        merged.push({
          category: cat.category,
          pct_low: mergedPctLow,
          pct_high: mergedPctHigh,
          shared: true,
          notes: `Weighted across both traditions (${t1.name}: ${(t1Weight * 100).toFixed(0)}%, ${t2.name}: ${(t2Weight * 100).toFixed(0)}%)`,
        });
        continue;
      }
    }
    // Tradition-specific — kept at full allocation, flagged.
    merged.push({
      category: cat.category,
      pct_low: cat.pct_low,
      pct_high: cat.pct_high,
      shared: false,
      tradition_specific_to: t1.name,
      notes: cat.notes || null,
    });
  }

  // Add any t2 categories not already merged above.
  for (const cat of t2.budget_allocation) {
    if (seen.has(cat.category.toLowerCase())) continue;
    merged.push({
      category: cat.category,
      pct_low: cat.pct_low,
      pct_high: cat.pct_high,
      shared: false,
      tradition_specific_to: t2.name,
      notes: cat.notes || null,
    });
  }

  return calculateSingleTraditionBudget(totalBudget, merged);
}

/**
 * STEP 4 (spec): multi-event adjustment. If the couple has more events than
 * the tradition's typical count, scale catering/photography up, capped.
 */
function applyMultiEventAdjustment(budgetLines, actualEventCount, typicalEventCount) {
  if (!typicalEventCount || actualEventCount <= typicalEventCount) return budgetLines;

  const eventMultiplier = actualEventCount / typicalEventCount;
  const cateringMultiplier = Math.min(eventMultiplier, 1.4); // cap at 40% increase
  const photoMultiplier = Math.min(eventMultiplier, 1.3); // cap at 30% increase

  return budgetLines.map((line) => {
    const lower = line.category.toLowerCase();
    if (lower.includes('catering')) {
      return scaleLine(line, cateringMultiplier);
    }
    if (lower.includes('photo')) {
      return scaleLine(line, photoMultiplier);
    }
    return line;
  });
}

function scaleLine(line, multiplier) {
  return {
    ...line,
    suggested_amount: Math.round(line.suggested_amount * multiplier),
    min_amount: Math.round(line.min_amount * multiplier),
    max_amount: Math.round(line.max_amount * multiplier),
    adjusted_for_event_count: true,
  };
}

/**
 * STEP 5 (spec): if total allocations exceed 100%, reduce in the specified
 * priority order. Protected categories are never touched.
 */
function applyOverBudgetPriorityRules(budgetLines, totalBudget) {
  let totalAllocated = budgetLines.reduce((sum, l) => sum + l.suggested_amount, 0);
  if (totalAllocated <= totalBudget) return { budgetLines, wasAdjusted: false };

  const lines = budgetLines.map((l) => ({ ...l }));
  let overage = totalAllocated - totalBudget;

  for (const reducible of REDUCIBLE_CATEGORY_ORDER) {
    if (overage <= 0) break;
    const line = lines.find(
      (l) =>
        l.category.toLowerCase().includes(reducible) &&
        !PROTECTED_CATEGORIES.some((p) => l.category.toLowerCase().includes(p))
    );
    if (!line) continue;

    const isContingency = reducible === 'contingency';
    const floor = isContingency ? Math.round(totalBudget * 0.05) : 0; // never below 5% contingency
    const reducible_amount = Math.max(line.suggested_amount - floor, 0);
    const reduction = Math.min(reducible_amount, overage);

    line.suggested_amount -= reduction;
    line.max_amount = Math.max(line.max_amount - reduction, line.suggested_amount);
    line.reduced_due_to_overbudget = true;
    overage -= reduction;
  }

  return { budgetLines: lines, wasAdjusted: true, remainingOverage: Math.max(overage, 0) };
}

/**
 * STEP 7 (spec): budget alerts.
 * Alert if any category's suggested amount implies spending >40% over the
 * tradition's high-end percentage, or if contingency is below 5%.
 */
function generateBudgetAlerts(budgetLines, traditionName) {
  const alerts = [];

  for (const line of budgetLines) {
    if (!line.pct_high || !line.suggested_amount) continue;
    const highEndAmount = line.max_amount;
    if (highEndAmount > 0 && line.suggested_amount > highEndAmount * 1.4) {
      alerts.push({
        type: 'category_over_typical_range',
        category: line.category,
        message: `Your ${line.category.toLowerCase()} budget is higher than typical for a ${traditionName} wedding. This may affect other categories. Review your allocation.`,
      });
    }
  }

  const contingency = budgetLines.find((l) => l.category.toLowerCase().includes('contingency'));
  if (contingency && contingency.pct_high && contingency.pct_high < 5) {
    alerts.push({
      type: 'contingency_below_minimum',
      message:
        'Your contingency fund is below the recommended minimum. Unexpected costs are very common in multi-day weddings.',
    });
  }
  return alerts;
}

/**
 * Main entry point: calculates the full budget breakdown for one or two
 * traditions, following the spec's algorithm end to end (Steps 1-7).
 */
function calculateBudget({ totalBudget, traditions, actualEventCount }) {
  if (!totalBudget || totalBudget <= 0) {
    throw new Error('calculateBudget requires a positive totalBudget');
  }
  if (!traditions || traditions.length === 0) {
    throw new Error('calculateBudget requires at least one tradition');
  }

  let budgetLines;
  let primaryTradition = traditions[0];

  if (traditions.length === 1) {
    budgetLines = calculateSingleTraditionBudget(totalBudget, traditions[0].budget_allocation);
  } else if (traditions.length === 2) {
    budgetLines = mergeInterfaithBudget(totalBudget, traditions[0], traditions[1]);
  } else {
    throw new Error('calculateBudget supports a maximum of two traditions (per app questionnaire limit)');
  }

  if (actualEventCount && primaryTradition.typical_event_count) {
    budgetLines = applyMultiEventAdjustment(budgetLines, actualEventCount, primaryTradition.typical_event_count);
  }

  const { budgetLines: finalLines, wasAdjusted, remainingOverage } = applyOverBudgetPriorityRules(
    budgetLines,
    totalBudget
  );

  const alerts = generateBudgetAlerts(finalLines, primaryTradition.name);

  return {
    budget_lines: finalLines,
    fixed_costs: FIXED_COST_OVERRIDES,
    total_budget: totalBudget,
    was_adjusted_for_overbudget: wasAdjusted,
    remaining_overage: remainingOverage || 0,
    alerts,
  };
}

module.exports = { calculateBudget, calculateSingleTraditionBudget, mergeInterfaithBudget };
