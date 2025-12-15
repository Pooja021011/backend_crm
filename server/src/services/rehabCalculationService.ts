/**
 * Rehab Budget Calculation Service
 * Contains all formulas and calculation logic for rehab budget
 */

export interface RehabCalculationInput {
  sqft: number;
  finishLevel: 'low_end' | 'mid_range' | 'high_end';
  toggledItems: {
    [key: string]: boolean;
  };
  numberOfBathrooms?: number;
  numberOfWindows?: number;
}

export interface RehabCalculationResult {
  itemizedCosts: {
    [key: string]: number;
  };
  subtotal: number;
  contingencyAmount: number;
  totalCost: number;
}

export const rehabCalculationService = {
  /**
   * Calculate total rehab cost based on inputs
   */
  calculate(input: RehabCalculationInput): RehabCalculationResult {
    const { sqft, finishLevel, toggledItems, numberOfBathrooms = 1, numberOfWindows = 10 } = input;
    const itemizedCosts: { [key: string]: number } = {};

    // Permits
    if (toggledItems.permits) {
      itemizedCosts.permits = 1000;
    }

    // Demolition and Cleanup
    if (toggledItems.demolition) {
      itemizedCosts.demolition = 1.50 * sqft;
    }

    // Structural Work
    if (toggledItems.foundation) {
      itemizedCosts.foundation = 7.00 * sqft;
    }
    if (toggledItems.roof) {
      itemizedCosts.roof = 4.00 * sqft;
    }
    if (toggledItems.framing) {
      itemizedCosts.framing = 2.00 * sqft;
    }

    // Mechanical Systems
    if (toggledItems.hvac) {
      itemizedCosts.hvac = 5.00 * sqft;
    }
    if (toggledItems.electrical) {
      itemizedCosts.electrical = 3.50 * sqft;
    }
    if (toggledItems.plumbing) {
      itemizedCosts.plumbing = 2.00 * sqft;
    }

    // Kitchen Renovation
    if (toggledItems.kitchenCabinets) {
      const costs = { low_end: 3000, mid_range: 5000, high_end: 10000 };
      itemizedCosts.kitchenCabinets = costs[finishLevel];
    }
    if (toggledItems.kitchenCountertops) {
      const costs = { low_end: 2000, mid_range: 4000, high_end: 6000 };
      itemizedCosts.kitchenCountertops = costs[finishLevel];
    }
    if (toggledItems.kitchenAppliances) {
      const costs = { low_end: 2000, mid_range: 4000, high_end: 6000 };
      itemizedCosts.kitchenAppliances = costs[finishLevel];
    }
    if (toggledItems.kitchenSink) {
      const costs = { low_end: 500, mid_range: 1000, high_end: 2000 };
      itemizedCosts.kitchenSink = costs[finishLevel];
    }
    if (toggledItems.kitchenLighting) {
      const costs = { low_end: 500, mid_range: 1000, high_end: 2000 };
      itemizedCosts.kitchenLighting = costs[finishLevel];
    }

    // Bathroom Renovation (multiplied by number of bathrooms)
    if (toggledItems.bathroomVanity) {
      const costs = { low_end: 500, mid_range: 1000, high_end: 2000 };
      itemizedCosts.bathroomVanity = costs[finishLevel] * numberOfBathrooms;
    }
    if (toggledItems.bathroomShower) {
      const costs = { low_end: 2000, mid_range: 3500, high_end: 5000 };
      itemizedCosts.bathroomShower = costs[finishLevel] * numberOfBathrooms;
    }
    if (toggledItems.bathroomToilet) {
      const costs = { low_end: 500, mid_range: 1000, high_end: 2000 };
      itemizedCosts.bathroomToilet = costs[finishLevel] * numberOfBathrooms;
    }
    if (toggledItems.bathroomFixtures) {
      const costs = { low_end: 500, mid_range: 1000, high_end: 2000 };
      itemizedCosts.bathroomFixtures = costs[finishLevel] * numberOfBathrooms;
    }
    if (toggledItems.bathroomFlooring) {
      const costs = { low_end: 500, mid_range: 1000, high_end: 2000 };
      itemizedCosts.bathroomFlooring = costs[finishLevel] * numberOfBathrooms;
    }
    if (toggledItems.bathroomLighting) {
      const costs = { low_end: 500, mid_range: 1000, high_end: 2000 };
      itemizedCosts.bathroomLighting = costs[finishLevel] * numberOfBathrooms;
    }

    // Flooring
    if (toggledItems.flooring) {
      const rates = { low_end: 4, mid_range: 6, high_end: 10 };
      itemizedCosts.flooring = rates[finishLevel] * sqft;
    }

    // Paint
    if (toggledItems.paintInterior) {
      const rates = { low_end: 2, mid_range: 3, high_end: 4 };
      itemizedCosts.paintInterior = rates[finishLevel] * sqft;
    }
    if (toggledItems.paintExterior) {
      itemizedCosts.paintExterior = 3.00 * sqft;
    }

    // Windows and Doors
    if (toggledItems.windows) {
      itemizedCosts.windows = 500 * numberOfWindows;
    }
    if (toggledItems.entryDoor) {
      const costs = { low_end: 1000, mid_range: 2000, high_end: 3000 };
      itemizedCosts.entryDoor = costs[finishLevel];
    }

    // Insulation and Drywall
    if (toggledItems.insulation) {
      itemizedCosts.insulation = 4.00 * sqft;
    }

    // Miscellaneous
    if (toggledItems.smartHome) {
      itemizedCosts.smartHome = 2000;
    }
    if (toggledItems.landscaping) {
      itemizedCosts.landscaping = 3000;
    }

    // Calculate subtotal
    const subtotal = Object.values(itemizedCosts).reduce((sum, cost) => sum + cost, 0);

    // Contingency is always 10% of subtotal
    const contingencyAmount = subtotal * 0.10;

    // Total cost
    const totalCost = subtotal + contingencyAmount;

    return {
      itemizedCosts,
      subtotal: Math.round(subtotal * 100) / 100,
      contingencyAmount: Math.round(contingencyAmount * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100
    };
  }
};

