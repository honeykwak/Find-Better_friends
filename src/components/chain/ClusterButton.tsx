// src/components/chain/ClusterButton.tsx
// React import 제거 (다른 import만 유지)
import { ClusterType } from '../../types';
import { useAppDispatch } from '../../hooks/useAppDispatch';
// import { useAppSelector } from '../../hooks/useAppSelector';
import { toggleCluster } from '../../store/slices/chainSlice';
import { CLUSTER_LABELS, CLUSTER_COLORS } from '../../constants';
import classNames from 'classnames';

interface ClusterButtonProps {
  cluster: ClusterType;
  isSelected: boolean;
  onClick: () => void;
}

export const ClusterButton: React.FC<ClusterButtonProps> = ({ cluster, isSelected }) => {
  const dispatch = useAppDispatch();
  // const selectedClusters = useAppSelector(state => state.chain.selectedClusters);

  return (
    <div className="relative w-8">  {/* 고정 너비 컨테이너 */}
      <button
        className={classNames(
          'relative group',
          'w-8 h-8 rounded-full transition-all',
          'hover:opacity-80', // hover 시 opacity로 어둡게
          isSelected && 'ring-2 ring-offset-2 ring-gray-500'
        )}
        style={{
          backgroundColor: CLUSTER_COLORS[cluster]
        }}
        onClick={() => dispatch(toggleCluster(cluster))}
      >
        {/* 클러스터 번호 */}
        <span className="text-sm font-medium">{cluster}</span>

        {/* 모바일/작은 화면에서만 보이는 호버 툴팁 */}
        <div className="
          lg:hidden
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

      {/* 큰 화면에서만 보이는 레이블 */}
      <span className="
        hidden lg:block
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