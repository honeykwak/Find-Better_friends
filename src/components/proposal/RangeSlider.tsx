import React, { useRef } from 'react';
import { format } from 'date-fns';

interface RangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  value,
  onChange
}) => {
  const trackRef = useRef<HTMLDivElement>(null);

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM d, yyyy');
  };

  // 값의 유효성을 검사하는 헬퍼 함수 추가
  const getValidValue = (newValue: number, isStart: boolean): number => {
    if (isStart) {
      return Math.max(min, Math.min(newValue, value[1]));
    } else {
      return Math.min(max, Math.max(newValue, value[0]));
    }
  };

  return (
    <div className="px-2">
      <div 
        ref={trackRef}
        className="relative h-2" 
      >
        {/* 배경 트랙 - 가장 아래 레이어 */}
        <div className="absolute inset-0">
          <div className="w-full h-full bg-gray-200 rounded-full" />
        </div>

        {/* 선택된 범위 표시 */}
        <div 
          className="absolute h-full bg-blue-500"
          style={{
            left: `${((value[0] - min) / (max - min)) * 100}%`,
            right: `${100 - ((value[1] - min) / (max - min)) * 100}%`
          }}
        />

        {/* 클릭 이벤트를 위한 트랙 영역 */}
        <div className="absolute inset-0 flex" style={{ pointerEvents: 'none' }}>
          {/* 왼쪽 영역 */}
          <div 
            className="h-full cursor-pointer"
            style={{ 
              width: `${((value[0] - min) / (max - min)) * 100}%`,
              pointerEvents: 'auto'
            }}
            onClick={(e) => {
              if (!trackRef.current) return;
              const rect = trackRef.current.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              const clickValue = min + (max - min) * percent;
              onChange([getValidValue(clickValue, true), value[1]]);
            }}
          />
          {/* 중간 영역 */}
          <div 
            style={{
              width: `${((value[1] - value[0]) / (max - min)) * 100}%`
            }}
          />
          {/* 오른쪽 영역 */}
          <div 
            className="h-full cursor-pointer flex-grow"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => {
              if (!trackRef.current) return;
              const rect = trackRef.current.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              const clickValue = min + (max - min) * percent;
              onChange([value[0], getValidValue(clickValue, false)]);
            }}
          />
        </div>

        {/* 핸들들 - 최상위 레이어 */}
        <div className="absolute inset-0">
          {/* 시작 핸들 */}
          <div 
            className="absolute h-4 w-4 -mt-1 rounded-full bg-white border-2 border-blue-500 cursor-pointer"
            style={{
              left: `${((value[0] - min) / (max - min)) * 100}%`,
              transform: 'translateX(-50%)',
              zIndex: 20
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              const startX = e.clientX;
              const startValue = value[0];
              
              const handleMouseMove = (e: MouseEvent) => {
                const dx = e.clientX - startX;
                const range = max - min;
                const newValue = startValue + (dx / trackRef.current!.offsetWidth) * range;
                onChange([getValidValue(newValue, true), value[1]]);
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />

          {/* 종료 핸들 */}
          <div 
            className="absolute h-4 w-4 -mt-1 rounded-full bg-white border-2 border-blue-500 cursor-pointer"
            style={{
              left: `${((value[1] - min) / (max - min)) * 100}%`,
              transform: 'translateX(-50%)',
              zIndex: 20
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              const startX = e.clientX;
              const startValue = value[1];
              
              const handleMouseMove = (e: MouseEvent) => {
                const dx = e.clientX - startX;
                const range = max - min;
                const newValue = startValue + (dx / trackRef.current!.offsetWidth) * range;
                onChange([value[0], getValidValue(newValue, false)]);
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
        </div>
      </div>

      {/* 날짜 표시 */}
      <div className="flex justify-between text-sm text-gray-600 mt-4">
        <span>{formatDate(value[0])}</span>
        <span>{formatDate(value[1])}</span>
      </div>
    </div>
  );
}; 