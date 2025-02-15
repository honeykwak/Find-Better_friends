// src/types/index.ts

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
  validators: Validator[];
  selectedValidator: string | null;
  validatorSummary: ValidatorSummary | null;
  validatorDetails: ValidatorDetails[];
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
  }

