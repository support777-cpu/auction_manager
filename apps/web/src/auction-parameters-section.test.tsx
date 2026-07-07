/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuctionParametersSection } from "./auction-parameters-section.js";
import { createParameterNumberFields } from "./auction-parameters-helpers.js";

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

describe("AuctionParametersSection", () => {
  it("renders stable selectors and a parameter summary", () => {
    render(
      <AuctionParametersSection
        numberFields={createParameterNumberFields(sampleParameters)}
        onBidIncrementChange={vi.fn()}
        onManualAssignmentBehaviorChange={vi.fn()}
        onMaxSquadSizeChange={vi.fn()}
        onPhase1OrderChange={vi.fn()}
        onRoleBasePriceChange={vi.fn()}
        onRoleTargetChange={vi.fn()}
        onSave={vi.fn()}
        onTeamBudgetChange={vi.fn()}
        parameterBlockingReasons={[]}
        parameterDraft={sampleParameters}
        parameterLoadState="ready"
        parameterSaveError={null}
        parameterSaveState="idle"
        phase1OrderError={null}
        phase1OrderText={sampleParameters.phase1CategoryOrder.join(", ")}
      />
    );

    expect(screen.getByTestId("setup-auction-parameters")).toBeTruthy();
    expect(screen.getByTestId("auction-parameters-summary")).toHaveTextContent(
      "Increment 2; Team budget 170"
    );
    expect(screen.getByTestId("bid-increment-input")).toBeTruthy();
    expect(screen.getByTestId("auction-parameters-save")).toBeTruthy();
  });

  it("shows inline field alerts for blocking reasons", () => {
    render(
      <AuctionParametersSection
        numberFields={createParameterNumberFields({
          ...sampleParameters,
          bidIncrement: 0
        })}
        onBidIncrementChange={vi.fn()}
        onManualAssignmentBehaviorChange={vi.fn()}
        onMaxSquadSizeChange={vi.fn()}
        onPhase1OrderChange={vi.fn()}
        onRoleBasePriceChange={vi.fn()}
        onRoleTargetChange={vi.fn()}
        onSave={vi.fn()}
        onTeamBudgetChange={vi.fn()}
        parameterBlockingReasons={[
          {
            id: "invalid-bid-increment",
            code: "invalid_bid_increment",
            field: "bidIncrement",
            message: "Bid increment must be a positive integer."
          }
        ]}
        parameterDraft={{ ...sampleParameters, bidIncrement: 0 }}
        parameterLoadState="ready"
        parameterSaveError={null}
        parameterSaveState="idle"
        phase1OrderError={null}
        phase1OrderText={sampleParameters.phase1CategoryOrder.join(", ")}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bid increment must be a positive integer."
    );
    expect(screen.getByText("Parameters need fixes")).toBeTruthy();
  });
});
