export interface ChainAnalysis {
  Operation_Time_Days: number;
  Voting_Power: number;
  Votes_Participation_Count: number;
  Yes_Rate: number;
  No_Rate: number;
  Veto_Rate: number;
  Abstain_Rate: number;
  No_Vote_Rate: number;
}

export interface ValidatorAnalysis {
  [validator: string]: {
    [chain: string]: ChainAnalysis;
  };
}

export interface ChainProposals {
  [chain: string]: number;
} 