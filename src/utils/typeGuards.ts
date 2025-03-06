import { ClusterType } from '../types';
import { CLUSTER_COLORS, VOTE_COLORS } from '../constants';

/**
 * Type guard to check if a value is a valid cluster type
 */
export function isValidCluster(cluster: any): cluster is ClusterType {
  return typeof cluster === 'number' && cluster >= 1 && cluster <= 5;
}

/**
 * Type guard to check if a value is a valid vote option
 */
export function isValidVoteOption(vote: any): vote is keyof typeof VOTE_COLORS {
  return vote === 'YES' || vote === 'NO' || vote === 'NO_WITH_VETO' || vote === 'ABSTAIN' || vote === 'NO_VOTE';
}

/**
 * Safe accessor for cluster colors
 */
export function getClusterColor(cluster: any): string {
  if (isValidCluster(cluster)) {
    return CLUSTER_COLORS[cluster];
  }
  return '#E5E7EB'; // Default gray color
}

/**
 * Safe accessor for vote colors
 */
export function getVoteColor(vote: any): string {
  if (isValidVoteOption(vote)) {
    return VOTE_COLORS[vote];
  }
  return '#d9d9d9'; // Default gray color
} 