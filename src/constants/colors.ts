// src/constants/colors.ts
import { ClusterType } from '../types';

export const CLUSTER_COLORS: Record<ClusterType, string> = {
  1: '#FCA5A5', // Cautious - red
  2: '#93C5FD', // Positive - blue
  3: '#FDBA74', // Cautiously Positive - orange
  4: '#F9A8D4', // Proactive - pink
  5: '#86EFAC', // Balanced Neutral - green
};

export const CLUSTER_LABELS: Record<ClusterType, string> = {
  1: 'Cautious',
  2: 'Positive',
  3: 'Cautiously Positive',
  4: 'Proactive',
  5: 'Balanced Neutral'
};

export const SELECTED_BACKGROUND = '#DCDFFF';