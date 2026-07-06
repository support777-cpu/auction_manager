export const testFixturesPackageReady = true;

export type Gender = "Male" | "Female";

export type AuctionRole = "Ace" | "Batting" | "Bowling" | "AllRounder" | "Girls";

export type Phase1Category =
  | "Ace Men"
  | "Ace Women"
  | "Women All Rounders"
  | "Men Bowlers"
  | "Men Batsmen"
  | "Men All Rounders";

export type PlayerStatus = "Pending" | "Current" | "Sold" | "Unsold" | "Assigned";

export type AuctionPhase = "Setup" | "InitialAuction" | "UnsoldBidding" | "ManualAssignment" | "Closed";

export type AcquisitionType = "Sold" | "Assigned";

export type ImportIssueSeverity = "must_fix" | "can_proceed_with_placeholder" | "ignored_source_field";

export type ManualAssignmentBudgetBehavior = "NoBudgetImpact";

export interface PlayerCsvRow {
  readonly Timestamp: string;
  readonly "Email address": string;
  readonly Score: string;
  readonly "Place and Pastor Name": string;
  readonly "Full Name": string;
  readonly Gender: string;
  readonly "Mobile Number": string;
  readonly Email: string;
  readonly Skill: string;
  readonly "TShirt Size": string;
  readonly "Jersey Number": string;
  readonly "Meal Preference (only applicable for Registrants Outside of Bangalore)": string;
  readonly "Photo Upload": string;
  readonly "Payment Confirmation": string;
  readonly "Payment Transaction Id": string;
  readonly Validated: string;
}

export interface TeamCsvRow {
  readonly Team: string;
  readonly Captain: string;
}

export interface AuctionPlayer {
  readonly id: string;
  readonly name: string;
  readonly gender: Gender;
  readonly role: AuctionRole;
  readonly phase1Category: Phase1Category;
  readonly basePrice: number;
  readonly status: PlayerStatus;
  readonly photoAssetId?: string;
  readonly soldPrice?: number;
  readonly winningTeamId?: string;
  readonly acquisitionType?: AcquisitionType;
}

export interface AuctionTeam {
  readonly id: string;
  readonly name: string;
  readonly captain: string;
  readonly logoAssetId?: string;
  readonly budget: number;
  readonly remainingBudget: number;
  readonly squadCount: number;
  readonly roleCounts: Record<AuctionRole, number>;
  readonly roster: readonly AuctionPlayer[];
}

export interface AuctionParameters {
  readonly roleBasePrices: Record<AuctionRole, number>;
  readonly bidIncrement: number;
  readonly teamBudget: number;
  readonly maxSquadSize: number;
  readonly roleTargets: Record<AuctionRole, number>;
  readonly phase1CategoryOrder: readonly Phase1Category[];
  readonly manualAssignmentBudgetBehavior: ManualAssignmentBudgetBehavior;
}

export interface ImportIssue {
  readonly id: string;
  readonly severity: ImportIssueSeverity;
  readonly targetType: "player" | "team" | "photo" | "logo" | "source_field" | "parameter";
  readonly targetId?: string;
  readonly message: string;
}

export interface AuctionStateFixture {
  readonly id: string;
  readonly phase: AuctionPhase;
  readonly parameters: AuctionParameters;
  readonly players: readonly AuctionPlayer[];
  readonly teams: readonly AuctionTeam[];
  readonly currentPlayerId: string | null;
  readonly currentBid: number | null;
  readonly selectedTeamId: string | null;
  readonly undoHistory: readonly string[];
  readonly importIssues: readonly ImportIssue[];
}

export const playerCsvHeaders = [
  "Timestamp",
  "Email address",
  "Score",
  "Place and Pastor Name",
  "Full Name",
  "Gender",
  "Mobile Number",
  "Email",
  "Skill",
  "TShirt Size",
  "Jersey Number",
  "Meal Preference (only applicable for Registrants Outside of Bangalore)",
  "Photo Upload",
  "Payment Confirmation",
  "Payment Transaction Id",
  "Validated"
] as const;

export const teamCsvHeaders = ["Team", "Captain"] as const;

export const privateSourceFieldNames = [
  "Timestamp",
  "Email address",
  "Score",
  "Place and Pastor Name",
  "Mobile Number",
  "Email",
  "TShirt Size",
  "Jersey Number",
  "Meal Preference (only applicable for Registrants Outside of Bangalore)",
  "Photo Upload",
  "Payment Confirmation",
  "Payment Transaction Id",
  "Validated"
] as const;

export const privateSourceFieldSampleValues = [
  "2026-07-01 09:00:00",
  "private-player@example.com",
  "9876543210",
  "UPI-PRIVATE-001",
  "PAID",
  "Validated"
] as const;

export const defaultAuctionParameters: AuctionParameters = {
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

const playerCsvDefaults: PlayerCsvRow = {
  Timestamp: "2026-07-01 09:00:00",
  "Email address": "private-player@example.com",
  Score: "0",
  "Place and Pastor Name": "Bangalore Central / Pastor Jacob",
  "Full Name": "Aarav Menon",
  Gender: "Male",
  "Mobile Number": "9876543210",
  Email: "aarav.private@example.com",
  Skill: "Ace",
  "TShirt Size": "L",
  "Jersey Number": "7",
  "Meal Preference (only applicable for Registrants Outside of Bangalore)": "Veg",
  "Photo Upload": "aarav_menon.jpg",
  "Payment Confirmation": "Paid",
  "Payment Transaction Id": "UPI-PRIVATE-001",
  Validated: "Yes"
};

export const createPlayerCsvRow = (overrides: Partial<PlayerCsvRow> = {}): PlayerCsvRow => ({
  ...playerCsvDefaults,
  ...overrides
});

export const createTeamCsvRow = (overrides: Partial<TeamCsvRow> = {}): TeamCsvRow => ({
  Team: "Falcons",
  Captain: "Priya Captain",
  ...overrides
});

export const samplePlayerCsvRows: readonly PlayerCsvRow[] = [
  createPlayerCsvRow({
    "Full Name": "Aarav Menon",
    Gender: "Male",
    Skill: "Ace",
    "Photo Upload": "aarav_menon.jpg"
  }),
  createPlayerCsvRow({
    Timestamp: "2026-07-01 09:01:00",
    "Email address": "neha.private@example.com",
    "Full Name": "Neha Rao",
    Gender: "Female",
    Skill: "Ace",
    "Mobile Number": "9876543211",
    Email: "neha.private@example.com",
    "Photo Upload": "neha_rao.png",
    "Payment Transaction Id": "UPI-PRIVATE-002"
  }),
  createPlayerCsvRow({
    Timestamp: "2026-07-01 09:02:00",
    "Email address": "meera.private@example.com",
    "Full Name": "Meera Iyer",
    Gender: "Female",
    Skill: "All Rounder",
    "Mobile Number": "9876543212",
    Email: "meera.private@example.com",
    "Photo Upload": "meera_iyer.webp",
    "Payment Transaction Id": "UPI-PRIVATE-003"
  }),
  createPlayerCsvRow({
    Timestamp: "2026-07-01 09:03:00",
    "Email address": "rohan.private@example.com",
    "Full Name": "Rohan Das",
    Gender: "Male",
    Skill: "Bowling",
    "Mobile Number": "9876543213",
    Email: "rohan.private@example.com",
    "Photo Upload": "rohan_das.heic",
    "Payment Transaction Id": "UPI-PRIVATE-004"
  }),
  createPlayerCsvRow({
    Timestamp: "2026-07-01 09:04:00",
    "Email address": "kunal.private@example.com",
    "Full Name": "Kunal Shah",
    Gender: "Male",
    Skill: "Batting",
    "Mobile Number": "9876543214",
    Email: "kunal.private@example.com",
    "Photo Upload": "kunal_shah.jpg",
    "Payment Transaction Id": "UPI-PRIVATE-005"
  }),
  createPlayerCsvRow({
    Timestamp: "2026-07-01 09:05:00",
    "Email address": "imran.private@example.com",
    "Full Name": "Imran Khan",
    Gender: "Male",
    Skill: "All Rounder",
    "Mobile Number": "9876543215",
    Email: "imran.private@example.com",
    "Photo Upload": "imran_khan.jpg",
    "Payment Transaction Id": "UPI-PRIVATE-006"
  }),
  createPlayerCsvRow({
    Timestamp: "2026-07-01 09:06:00",
    "Email address": "dev.private@example.com",
    "Full Name": "Dev Patel",
    Gender: "Male",
    Skill: "Bowling",
    "Mobile Number": "9876543216",
    Email: "dev.private@example.com",
    "Photo Upload": "",
    "Payment Transaction Id": "UPI-PRIVATE-007"
  }),
  createPlayerCsvRow({
    Timestamp: "2026-07-01 09:07:00",
    "Email address": "anika.private@example.com",
    "Full Name": "Anika Sen",
    Gender: "Female",
    Skill: "All Rounder",
    "Mobile Number": "9876543217",
    Email: "anika.private@example.com",
    "Photo Upload": "anika_sen.jpg",
    "Payment Transaction Id": "UPI-PRIVATE-008"
  })
];

export const invalidPlayerCsvRows: readonly PlayerCsvRow[] = [
  createPlayerCsvRow({
    "Full Name": "",
    Gender: "Male",
    Skill: "Batting",
    "Photo Upload": "missing_name.jpg"
  }),
  createPlayerCsvRow({
    "Full Name": "Vikram Keeper",
    Gender: "Male",
    Skill: "Wicket Keeper",
    "Photo Upload": "vikram_keeper.jpg"
  }),
  createPlayerCsvRow({
    "Full Name": "Priya Unknown",
    Gender: "",
    Skill: "Ace",
    "Photo Upload": "priya_unknown.jpg"
  }),
  createPlayerCsvRow({
    "Full Name": "Sara No Price",
    Gender: "Female",
    Skill: "Specialist",
    "Photo Upload": "sara_no_price.jpg"
  })
];

export const sampleTeamCsvRows: readonly TeamCsvRow[] = [
  createTeamCsvRow({ Team: "Falcons", Captain: "Priya Captain" }),
  createTeamCsvRow({ Team: "Tigers", Captain: "Rahul Captain" }),
  createTeamCsvRow({ Team: "Royals", Captain: "Anita Captain" }),
  createTeamCsvRow({ Team: "Warriors", Captain: "Joel Captain" })
];

export const invalidTeamCsvRows: readonly TeamCsvRow[] = [
  createTeamCsvRow({ Team: "", Captain: "Missing Team Captain" }),
  createTeamCsvRow({ Team: "No Captain XI", Captain: "" })
];

export const createAuctionPlayer = (overrides: Partial<AuctionPlayer> = {}): AuctionPlayer => ({
  id: "p-001",
  name: "Aarav Menon",
  gender: "Male",
  role: "Ace",
  phase1Category: "Ace Men",
  basePrice: 10,
  status: "Pending",
  photoAssetId: "asset-player-aarav-menon",
  ...overrides
});

export const sampleAuctionPlayers: readonly AuctionPlayer[] = [
  createAuctionPlayer(),
  createAuctionPlayer({
    id: "p-002",
    name: "Neha Rao",
    gender: "Female",
    role: "Ace",
    phase1Category: "Ace Women",
    basePrice: 10,
    photoAssetId: "asset-player-neha-rao"
  }),
  createAuctionPlayer({
    id: "p-003",
    name: "Meera Iyer",
    gender: "Female",
    role: "Girls",
    phase1Category: "Women All Rounders",
    basePrice: 6,
    photoAssetId: "asset-player-meera-iyer"
  }),
  createAuctionPlayer({
    id: "p-004",
    name: "Rohan Das",
    gender: "Male",
    role: "Bowling",
    phase1Category: "Men Bowlers",
    basePrice: 6,
    photoAssetId: "asset-player-rohan-das"
  }),
  createAuctionPlayer({
    id: "p-005",
    name: "Kunal Shah",
    gender: "Male",
    role: "Batting",
    phase1Category: "Men Batsmen",
    basePrice: 8,
    photoAssetId: "asset-player-kunal-shah"
  }),
  createAuctionPlayer({
    id: "p-006",
    name: "Imran Khan",
    gender: "Male",
    role: "AllRounder",
    phase1Category: "Men All Rounders",
    basePrice: 6,
    photoAssetId: "asset-player-imran-khan"
  }),
  createAuctionPlayer({
    id: "p-007",
    name: "Dev Patel",
    gender: "Male",
    role: "Bowling",
    phase1Category: "Men Bowlers",
    basePrice: 6,
    photoAssetId: "placeholder-player"
  }),
  createAuctionPlayer({
    id: "p-008",
    name: "Anika Sen",
    gender: "Female",
    role: "Girls",
    phase1Category: "Women All Rounders",
    basePrice: 6,
    photoAssetId: "asset-player-anika-sen"
  })
];

export const createTeam = (overrides: Partial<AuctionTeam> = {}): AuctionTeam => ({
  id: "t-001",
  name: "Falcons",
  captain: "Priya Captain",
  logoAssetId: "asset-team-falcons",
  budget: 170,
  remainingBudget: 170,
  squadCount: 0,
  roleCounts: {
    Ace: 0,
    Batting: 0,
    Bowling: 0,
    AllRounder: 0,
    Girls: 0
  },
  roster: [],
  ...overrides
});

export const sampleTeams: readonly AuctionTeam[] = [
  createTeam(),
  createTeam({
    id: "t-002",
    name: "Tigers",
    captain: "Rahul Captain",
    logoAssetId: "placeholder-team"
  }),
  createTeam({
    id: "t-003",
    name: "Royals",
    captain: "Anita Captain",
    logoAssetId: "asset-team-royals"
  }),
  createTeam({
    id: "t-004",
    name: "Warriors",
    captain: "Joel Captain",
    logoAssetId: "asset-team-warriors"
  })
];

export const createSetupReadyAuctionState = (
  overrides: Partial<AuctionStateFixture> = {}
): AuctionStateFixture => ({
  id: "auction-fixture-setup-ready",
  phase: "Setup",
  parameters: defaultAuctionParameters,
  players: sampleAuctionPlayers,
  teams: sampleTeams,
  currentPlayerId: null,
  currentBid: null,
  selectedTeamId: null,
  undoHistory: [],
  importIssues: [
    {
      id: "issue-photo-p-007",
      severity: "can_proceed_with_placeholder",
      targetType: "photo",
      targetId: "p-007",
      message: "Dev Patel has no matched photo; player placeholder will be used."
    },
    {
      id: "issue-logo-t-002",
      severity: "can_proceed_with_placeholder",
      targetType: "logo",
      targetId: "t-002",
      message: "Tigers has no matched logo; team placeholder will be used."
    }
  ],
  ...overrides
});

export const createLiveSaleAuctionState = (
  overrides: Partial<AuctionStateFixture> = {}
): AuctionStateFixture => {
  const soldPlayer = createAuctionPlayer({
    id: "p-001",
    status: "Sold",
    soldPrice: 12,
    winningTeamId: "t-001",
    acquisitionType: "Sold"
  });

  return {
    id: "auction-fixture-live-sale",
    phase: "InitialAuction",
    parameters: defaultAuctionParameters,
    players: [
      soldPlayer,
      ...sampleAuctionPlayers.filter((player) => player.id !== "p-001" && player.id !== "p-004"),
      createAuctionPlayer({
        id: "p-004",
        name: "Rohan Das",
        gender: "Male",
        role: "Bowling",
        phase1Category: "Men Bowlers",
        basePrice: 6,
        status: "Current",
        photoAssetId: "asset-player-rohan-das"
      })
    ],
    teams: [
      createTeam({
        id: "t-001",
        name: "Falcons",
        captain: "Priya Captain",
        remainingBudget: 158,
        squadCount: 1,
        roleCounts: {
          Ace: 1,
          Batting: 0,
          Bowling: 0,
          AllRounder: 0,
          Girls: 0
        },
        roster: [soldPlayer]
      }),
      ...sampleTeams.filter((team) => team.id !== "t-001")
    ],
    currentPlayerId: "p-004",
    currentBid: 12,
    selectedTeamId: "t-001",
    undoHistory: ["Reveal Aarav Menon", "Select Falcons", "Increase bid to 12", "Mark Sold"],
    importIssues: [],
    ...overrides
  };
};

export const createManualAssignmentAuctionState = (
  overrides: Partial<AuctionStateFixture> = {}
): AuctionStateFixture => ({
  id: "auction-fixture-manual-assignment",
  phase: "ManualAssignment",
  parameters: defaultAuctionParameters,
  players: sampleAuctionPlayers.map((player) =>
    player.id === "p-007" ? { ...player, status: "Current" } : { ...player, status: "Unsold" }
  ),
  teams: sampleTeams,
  currentPlayerId: "p-007",
  currentBid: null,
  selectedTeamId: null,
  undoHistory: ["Start Unsold Bidding", "Start Manual Assignment"],
  importIssues: [],
  ...overrides
});

export const csvEscape = (value: string | number | boolean | null | undefined): string => {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const toCsv = <T extends Record<string, string | number | boolean | null | undefined>>(
  headers: readonly (keyof T & string)[],
  rows: readonly T[]
): string => {
  const headerLine = headers.map(csvEscape).join(",");
  const dataLines = rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","));
  return [headerLine, ...dataLines].join("\n");
};
