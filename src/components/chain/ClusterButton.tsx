// src/components/chain/ClusterButton.tsx
// React import 제거 (다른 import만 유지)
import { ClusterType } from '../../types';
import { useAppDispatch } from '../../hooks/useAppDispatch';
// import { useAppSelector } from '../../hooks/useAppSelector';
import { toggleCluster } from '../../store/slices/chainSlice';
import { CLUSTER_LABELS } from '../../constants';
import classNames from 'classnames';

interface ClusterButtonProps {
  cluster: ClusterType;
  isSelected: boolean;
  onClick: () => void;
}

const clusterColors: Record<ClusterType, string> = {
  1: 'bg-red-200 hover:bg-red-300',
  2: 'bg-blue-200 hover:bg-blue-300',
  3: 'bg-orange-200 hover:bg-orange-300',
  4: 'bg-pink-200 hover:bg-pink-300',
  5: 'bg-green-200 hover:bg-green-300',
};

export const ClusterButton: React.FC<ClusterButtonProps> = ({ cluster, isSelected }) => {
  const dispatch = useAppDispatch();
  // const selectedClusters = useAppSelector(state => state.chain.selectedClusters);

  return (
    <button
      className={classNames(
        'w-full px-2 py-1.5 rounded-lg transition-colors text-sm whitespace-nowrap overflow-hidden text-ellipsis',
        clusterColors[cluster],
        isSelected && 'ring-2 ring-offset-1 ring-gray-500'
      )}
      onClick={() => dispatch(toggleCluster(cluster))}
    >
      {CLUSTER_LABELS[cluster]}
    </button>
  );
};