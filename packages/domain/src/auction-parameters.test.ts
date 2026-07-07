import {
  applyAuctionParameterDraft,
  getDefaultAuctionParameters,
  validateAuctionParametersForSetup
} from "./index.js";
import { describe, expect, it } from "vitest";

const setupContext = {
  importedPlayerRoles: ["Ace", "Bowling", "Girls"] as const,
  importedTeamCount: 2
};

describe("auction parameter domain rules", () => {
  it("returns league defaults aligned to the runtime contract", () => {
    expect(getDefaultAuctionParameters()).toEqual({
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
    });
  });

  it("accepts valid parameters for imported players and teams", () => {
    const review = validateAuctionParametersForSetup(
      getDefaultAuctionParameters(),
      setupContext
    );

    expect(review.startAuctionBlocked).toBe(false);
    expect(review.blockingReasons).toEqual([]);
  });

  it("requires imported teams before validating parameters", () => {
    const review = validateAuctionParametersForSetup(getDefaultAuctionParameters(), {
      importedPlayerRoles: [],
      importedTeamCount: 0
    });

    expect(review.startAuctionBlocked).toBe(true);
    expect(review.blockingReasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "no_imported_teams",
          field: "teamBudget"
        })
      ])
    );
  });

  it("returns blocked review parameters that satisfy the review schema", async () => {
    const { auctionParameterReviewResponseSchema } = await import(
      "@auction-manager/shared"
    );
    const review = validateAuctionParametersForSetup(
      {
        ...getDefaultAuctionParameters(),
        bidIncrement: 0,
        roleTargets: {
          Ace: 3,
          Batting: 3,
          Bowling: 3,
          AllRounder: 3,
          Girls: 3
        }
      },
      setupContext
    );

    expect(review.startAuctionBlocked).toBe(true);
    expect(auctionParameterReviewResponseSchema.safeParse(review).success).toBe(true);
  });

  it("requires base prices for every imported player role", () => {
    const parameters = {
      ...getDefaultAuctionParameters(),
      roleBasePrices: {
        Ace: 10,
        Batting: 8,
        AllRounder: 6,
        Girls: 6
      }
    };

    const review = validateAuctionParametersForSetup(parameters, setupContext);

    expect(review.startAuctionBlocked).toBe(true);
    expect(review.blockingReasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_role_base_price",
          field: "roleBasePrices.Bowling",
          message: "Base price is missing for Bowling."
        })
      ])
    );
  });

  it.each([
    ["bidIncrement", 0, "invalid_bid_increment"],
    ["teamBudget", -1, "invalid_team_budget"],
    ["maxSquadSize", 0, "invalid_max_squad_size"]
  ] as const)("rejects invalid %s boundaries", (field, value, code) => {
    const review = validateAuctionParametersForSetup(
      {
        ...getDefaultAuctionParameters(),
        [field]: value
      },
      setupContext
    );

    expect(review.blockingReasons).toEqual(
      expect.arrayContaining([expect.objectContaining({ code })])
    );
  });

  it("rejects negative role targets and totals above max squad size", () => {
    const negativeReview = validateAuctionParametersForSetup(
      {
        ...getDefaultAuctionParameters(),
        roleTargets: {
          ...getDefaultAuctionParameters().roleTargets,
          Girls: -1
        }
      },
      setupContext
    );
    expect(negativeReview.blockingReasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "invalid_role_target" })
      ])
    );

    const totalReview = validateAuctionParametersForSetup(
      {
        ...getDefaultAuctionParameters(),
        roleTargets: {
          Ace: 3,
          Batting: 3,
          Bowling: 3,
          AllRounder: 3,
          Girls: 3
        }
      },
      setupContext
    );
    expect(totalReview.blockingReasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "role_targets_exceed_max_squad_size",
          message: "Role targets total 15, which exceeds max squad size 13."
        })
      ])
    );
  });

  it("rejects invalid Phase 1 order and unsupported manual assignment behavior", () => {
    const phaseReview = validateAuctionParametersForSetup(
      {
        ...getDefaultAuctionParameters(),
        phase1CategoryOrder: [
          "Ace Men",
          "Ace Women",
          "Women All Rounders",
          "Men Bowlers",
          "Men Bowlers",
          "Men All Rounders"
        ]
      },
      setupContext
    );
    expect(phaseReview.blockingReasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "invalid_phase1_category_order" })
      ])
    );

    const behaviorReview = validateAuctionParametersForSetup(
      {
        ...getDefaultAuctionParameters(),
        manualAssignmentBudgetBehavior: "DeductBudget"
      },
      setupContext
    );
    expect(behaviorReview.blockingReasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unsupported_manual_assignment_budget_behavior"
        })
      ])
    );
  });

  it("applies valid drafts without mutating the previous parameters", () => {
    const previous = getDefaultAuctionParameters();
    const review = applyAuctionParameterDraft(
      previous,
      {
        bidIncrement: 5,
        roleTargets: {
          ...previous.roleTargets,
          Batting: 2
        }
      },
      setupContext
    );

    expect(review.parameters.bidIncrement).toBe(5);
    expect(review.parameters.roleTargets.Batting).toBe(2);
    expect(previous.bidIncrement).toBe(2);
    expect(previous.roleTargets.Batting).toBe(3);
    expect(review.startAuctionBlocked).toBe(false);
  });
});
