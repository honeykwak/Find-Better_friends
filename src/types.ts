export type ClusterType = 1 | 2 | 3 | 4 | 5;

export interface ValidatorData {
  voter: string;
  x: number;
  y: number;
  cluster: ClusterType;
  mds_x: number;
  mds_y: number;
  tsne_x: number;
  tsne_y: number;
}

export interface ChainInfo {
  name: string;
  validators_count: number;
  cluster_distribution: {
    [key in ClusterType]: number;
  };
}

export interface CoordinateData {
  coords_dict: {
    onehot: ValidatorData[];
  };
  chain_coords_dict: {
    [chain: string]: ValidatorData[];
  };
  chain_info: {
    [chain: string]: ChainInfo;
  };
}

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
    [chain: string]: ChainAnalysis & {
      votingPattern?: ValidatorVotingPattern;
    };
  };
}

export interface ProposalData {
  main_category: string;
  sub_category: string;
  title: string;
  type: string;
  status: string;
  timeSubmit: number;
  timeVotingStart: number;
  timeVotingEnd: number;
  ratios?: {
    YES: number;
    NO: number;
    NO_WITH_VETO: number;
    ABSTAIN: number;
  };
  total_votes?: number;
}

export interface ChainProposals {
  [chainId: string]: {
    proposals: {
      [proposalId: string]: ProposalData;
    };
    totalCount: number;
  };
}

export interface ValidatorVotingPattern {
  proposal_votes: {
    [proposalId: string]: {
      option: 'YES' | 'NO' | 'ABSTAIN' | 'NOWITHVETO';
      timestamp: string;
    };
  };
  category_votes: {
    [category: string]: CategoryVotes;
  };
  cluster: number;
}

export interface CategoryVotes {
  total: CategoryVoteStats;
  subcategories: {
    [subcategory: string]: CategoryVoteStats;
  };
}

export interface CategoryVoteStats {
  count: number;
  ratio: number;
}

export const handleError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export function isProposalData(value: any): value is ProposalData {
  return (
    value &&
    typeof value === 'object' &&
    'title' in value &&
    'status' in value &&
    'main_category' in value &&
    'sub_category' in value &&
    'type' in value
  );
} 