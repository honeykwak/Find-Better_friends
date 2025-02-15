// src/components/chain/ClusterButton.tsx
import React from 'react';
import { ClusterType } from '../../types';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { toggleCluster } from '../../store/slices/chainSlice';
import classNames from 'classnames';

interface ClusterButtonProps {
  cluster: ClusterType;
  label: string;
}

const clusterColors: Record<ClusterType, string> = {
  1: 'bg-red-200 hover:bg-red-300',
  2: 'bg-blue-200 hover:bg-blue-300',
  3: 'bg-orange-200 hover:bg-orange-300',
  4: 'bg-pink-200 hover:bg-pink-300',
  5: 'bg-green-200 hover:bg-green-300',
};

export const ClusterButton: React.FC<ClusterButtonProps> = ({ cluster, label }) => {
  const dispatch = useAppDispatch();
  const selectedClusters = useAppSelector(state => state.chain.selectedClusters);
  const isSelected = selectedClusters.includes(cluster);

  return (
    <button
      className={classNames(
        'px-4 py-2 rounded-full transition-colors',
        clusterColors[cluster],
        isSelected && 'ring-2 ring-offset-2 ring-gray-500'
      )}
      onClick={() => dispatch(toggleCluster(cluster))}
    >
      {label}
    </button>
  );
};