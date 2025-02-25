// src/constants/index.ts
import { ClusterType } from '../types';

export type VoteOption = 'YES' | 'NO' | 'NO_WITH_VETO' | 'ABSTAIN' | 'NO_VOTE';

export const CLUSTER_COLORS: Record<ClusterType, string> = {
  1: '#8dd3c7', // Cautious
  2: '#ffed6f', // Positive
  3: '#fccde5', // Cautiously Positive
  4: '#bebada', // Proactive
  5: '#b3de69', // Balanced Neutral
};

export const VOTE_COLORS: Record<VoteOption, string> = {
  YES: '#80b1d3',
  NO: '#fb8072',
  NO_WITH_VETO: '#fdb462',
  ABSTAIN: '#bc80bd',
  NO_VOTE: '#d9d9d9'
};

export const VOTE_COLOR_CLASSES: Record<VoteOption, string> = {
  YES: 'bg-[#80b1d3] text-white',
  NO: 'bg-[#fb8072] text-white',
  NO_WITH_VETO: 'bg-[#fdb462] text-white',
  ABSTAIN: 'bg-[#bc80bd] text-white',
  NO_VOTE: 'bg-[#d9d9d9] text-gray-700'
};

export const CLUSTER_LABELS: Record<ClusterType, string> = {
  1: 'Passive Neutrals',
  2: 'Balanced Participants',
  3: 'Extreme Non-participants',
  4: 'Moderate Non-participants',
  5: 'Strong Opposition Group'
};

export const SELECTED_BACKGROUND = '#DCDFFF';

export const CHAIN_LIST = [
  'cosmos', 
  'juno', 
  'osmosis', 
  'stargaze', 
  'terra', 
  'kava', 
  'evmos', 
  'injective',
  'secret'
];