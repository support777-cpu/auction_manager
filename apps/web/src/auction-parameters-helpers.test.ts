import { describe, expect, it } from "vitest";
import {
  buildSubmittedParameters,
  createParameterNumberFields,
  parseParameterNumberInput,
  parsePhase1CategoryOrderText,
  parsePhase1CategoryOrderTextStrict
} from "./auction-parameters-helpers.js";

const sampleParameters = {
  roleBasePrices: {
    Ace: 10,
    Batting: 8,
    Bowling: 6,
    AllRounder: 6,
    Girls: 6
  },
  bidIncrement: 2,
  teamBudget: 170,
  maxSquadSize: 13,
  roleTargets: {
    Ace: 2,
    Batting: 3,
    Bowling: 2,
    AllRounder: 2,
    Girls: 2
  },
  phase1CategoryOrder: [
    "Ace Men",
    "Ace Women",
    "Women All Rounders",
    "Men Bowlers",
    "Men Batsmen",
    "Men All Rounders"
  ],
  manualAssignmentBudgetBehavior: "NoBudgetImpact"
};

describe("auction parameter helpers", () => {
  it("treats empty numeric input as missing", () => {
    expect(parseParameterNumberInput("")).toBeUndefined();
    expect(parseParameterNumberInput("   ")).toBeUndefined();
  });

  it("rejects non-numeric input", () => {
    expect(Number.isNaN(parseParameterNumberInput("abc") as number)).toBe(true);
  });

  it("parses comma, semicolon, and newline separated phase order", () => {
    expect(parsePhase1CategoryOrderText("Ace Men; Ace Women\nWomen All Rounders")).toEqual([
      "Ace Men",
      "Ace Women",
      "Women All Rounders"
    ]);
  });

  it("flags unknown phase 1 categories before submit", () => {
    expect(parsePhase1CategoryOrderTextStrict("Ace Men, Not A Category")).toEqual({
      order: ["Ace Men", "Not A Category"],
      invalidTokens: ["Not A Category"]
    });
  });

  it("treats cleared role prices as missing values", () => {
    const numberFields = createParameterNumberFields(sampleParameters);
    numberFields.roleBasePrices.Bowling = "";

    expect(
      buildSubmittedParameters(
        numberFields,
        sampleParameters.phase1CategoryOrder.join(", "),
        "NoBudgetImpact"
      ).roleBasePrices
    ).toMatchObject({
      Bowling: null
    });
  });
});
