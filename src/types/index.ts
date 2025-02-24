// src/types/index.ts

export type VoteOption = 'YES' | 'NO' | 'NO_WITH_VETO' | 'ABSTAIN' | 'NO_VOTE';

export type ClusterType = 1 | 2 | 3 | 4 | 5;

// src/types/index.ts에서 ValidatorData 부분만 수정
export interface ValidatorData {
    voter: string;
    x: number;          // 모든 경우에 이 필드를 사용
    y: number;          // 모든 경우에 이 필드를 사용
    cluster: ClusterType;
    // 원본 데이터 필드들
    mds_x?: number;
    mds_y?: number;
    tsne_x?: number;
    tsne_y?: number;
  }

export interface ChainData {
  name: string;
  validators_count: number;
  cluster_distribution: {
    [key: string]: number;
  };
}

export interface CoordinateData {
  chain_coords_dict: {
    [key: string]: ValidatorData[];
  };
  coords_dict: {
    onehot: ValidatorData[];
  };
  chain_info: {
    [key: string]: ChainData;
  };
  global_info: {
    total_validators: number;
    cluster_distribution: {
      [key: string]: number;
    };
  };
  score: number;
}

export interface Chain {
  id: string;
  name: string;
  chains: Array<{
    name: string;
    clusterGroup: ClusterType;
    percentage: number;
  }>;
}

export interface Validator {
  id: string;
  name: string;
  operationTime: string;
  votingPower: string;
  participationRate: string;
  coordinates: {
    x: number;
    y: number;
  };
  clusterGroup: ClusterType;
}

export interface ValidatorSummary {
  type: string;
  voteDistribution: {
    yes: number;
    no: number;
    veto: number;
    abstain: number;
    noVote: number;
  };
}

export interface ValidatorDetails {
  validator: string;
  participationRate: number;
  proposalMatchRate: number;
  overallMatchRate: number;
  clusterMatchRate: number;
  clusterNumber: ClusterType;
}

export interface Proposal {
  id: string;
  data: Array<{
    column: number;
    row: number;
    value: string;
    clusterGroup: ClusterType;
  }>;
}

// Redux 상태 타입
export interface ChainState {
    chains: string[];
    selectedChain: string | null;
    selectedClusters: ClusterType[];
  }

export interface ValidatorState {
  selectedValidator: ValidatorData | null;
  validatorChains: string[];
}

export interface ProposalState {
  proposals: Proposal[];
  filters: {
    sortBy?: string;
    filterBy?: string;
  };
}

export interface RootState {
    chain: ChainState;
    validator: ValidatorState;
    proposal: ProposalState;
  }

export interface CategoryVoteStats {
  count: number;
  ratio: number;
}

export interface CategoryVotes {
  total: CategoryVoteStats;
  subcategories: {
    [key: string]: CategoryVoteStats;
  };
}

export interface ProposalVote {
  option: string;
  votingPower: number;
}

export interface ValidatorVotingPattern {
  category_votes: {
    [category: string]: {
      total: {
        count: number;
        ratio: number;
      };
      subcategories: {
        [subcategory: string]: {
          count: number;
          ratio: number;
        };
      };
    };
  };
  proposal_votes: {
    [proposalId: string]: ProposalVote;
  };
}

export interface VotingPatternsData {
  [validator: string]: ValidatorVotingPattern;
}

export interface ProposalData {
  title: string;
  main_category: string;
  sub_category: string;
  status: 'PASSED' | 'REJECTED';
  // 필요한 다른 필드들...
}

export interface ChainProposalData {
  validator_count: number;
  proposals: {
    [proposalId: string]: ProposalData;
  };
}

