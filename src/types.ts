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
    [chain: string]: ChainAnalysis;
  };
}

export interface ChainProposals {
  [chain: string]: number;
} 