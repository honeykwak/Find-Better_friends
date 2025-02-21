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
    <div className="relative w-8">  {/* 고정 너비 컨테이너 */}
      <button
        className={classNames(
          'relative group',
          'w-8 h-8 rounded-full transition-all',
          clusterColors[cluster],
          isSelected && 'ring-2 ring-offset-2 ring-gray-500'
        )}
        onClick={() => dispatch(toggleCluster(cluster))}
      >
        {/* 클러스터 번호 */}
        <span className="text-sm font-medium">{cluster}</span>

        {/* 호버 툴팁 - 작은 화면에서만 표시 */}
        <div className="
          md:hidden
          absolute left-1/2 -translate-x-1/2 bottom-full mb-2
          whitespace-nowrap px-2 py-1 rounded
          bg-gray-800 text-white text-xs
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
          z-10
        ">
          {CLUSTER_LABELS[cluster]}
          <div className="
            absolute top-full left-1/2 -translate-x-1/2
            border-4 border-transparent
            border-t-gray-800
          "/>
        </div>
      </button>

      {/* 레이블 - 중간 크기 이상의 화면에서만 표시 */}
      <span className="
        hidden md:block
        absolute top-full left-1/2 -translate-x-1/2
        mt-1 text-[10px] text-gray-600
        text-center w-16
        leading-tight
      ">
        {CLUSTER_LABELS[cluster]}
      </span>
    </div>
  );
};