import { ProjectionRow } from "../affordability";
import { ComparisonData } from "../affordability";

/**
 * Generates comparison data for viable years
 * This is used for the intermediate analysis step
 */
export function generateComparisonData(
  projectionData: ProjectionRow[],
  firstViableYear: number,
  targetPurchaseYear: number
): ComparisonData {
  // Get viable years from firstViableYear up to a few years beyond the target year
  const maxYear = Math.max(targetPurchaseYear + 3, firstViableYear + 5);

  const viableYears = projectionData
    .filter(p => p.isAffordable && p.year >= firstViableYear && p.year <= maxYear)
    .map(p => ({
      year: p.year,
      housePriceProjected: p.housePriceProjected,
      monthlySurplus: p.monthlySurplus,
      monthlyPayment: p.monthlyPayment,
      buffer: p.buffer,
      cumulativeSavings: p.cumulativeSavings
    }));

  return { viableYears };
}

/**
 * Determines the affordability outcome and first viable year
 * This implements the corrected affordability logic from the PRD
 */
export function determineAffordabilityOutcome(
  projectionData: ProjectionRow[],
  yearsToPurchase: number
): { affordabilityOutcome: "ScenarioA" | "ScenarioB"; firstViableYear: number | null } {
  // Default: Not affordable in target range (ScenarioA)
  let affordabilityOutcome: "ScenarioA" | "ScenarioB" = "ScenarioA";
  let firstViableYear: number | null = null;
  
  // Scan from year 1 up to target year (not beyond)
  for (let n = 1; n <= yearsToPurchase; n++) {
    if (projectionData[n].isAffordable) {
      affordabilityOutcome = "ScenarioB"; // Affordable in target range
      firstViableYear = projectionData[n].year;
      break; // Found first viable year
    }
  }
  
  // If no viable year found in target range but there are viable years later
  if (affordabilityOutcome === "ScenarioA") {
    // Look beyond target year
    for (let n = yearsToPurchase + 1; n < projectionData.length; n++) {
      if (projectionData[n].isAffordable) {
        firstViableYear = projectionData[n].year;
        break;
      }
    }
  }
  
  return { affordabilityOutcome, firstViableYear };
}
