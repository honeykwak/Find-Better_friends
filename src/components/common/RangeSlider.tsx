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

  // 값의 유효성을 검사하는 헬퍼 함수
  const getValidValue = (newValue: number, isStart: boolean): number => {
    if (isStart) {
      return Math.max(min, Math.min(newValue, value[1] - 1)); // 최소 1의 간격 유지
    } else {
      return Math.min(max, Math.max(newValue, value[0] + 1)); // 최소 1의 간격 유지
    }
  };

  const handleDrag = (e: MouseEvent, isStart: boolean, startX: number, startValue: number) => {
    if (!trackRef.current) return;
    
    const rect = trackRef.current.getBoundingClientRect();
    const dx = e.clientX - startX;
    const range = max - min;
    const newValue = startValue + (dx / rect.width) * range;
    
    if (isStart) {
      onChange([getValidValue(newValue, true), value[1]]);
    } else {
      onChange([value[0], getValidValue(newValue, false)]);
    }
  };

  return (
    <div className="px-4 py-2">
      <div 
        ref={trackRef}
        className="relative h-2 mb-6" 
      >
        {/* 배경 트랙 */}
        <div className="absolute inset-0 bg-gray-200 rounded-full" />

        {/* 선택된 범위 표시 */}
        <div 
          className="absolute h-full bg-blue-500 rounded-full transition-all duration-150 ease-out"
          style={{
            left: `${((value[0] - min) / (max - min)) * 100}%`,
            right: `${100 - ((value[1] - min) / (max - min)) * 100}%`
          }}
        />

        {/* 핸들 - 시작 */}
        <div 
          className="absolute w-4 h-4 -ml-2 -mt-1.5 bg-white border-2 border-blue-500 rounded-full cursor-pointer shadow-md hover:shadow-lg transition-all duration-150 ease-out hover:scale-110 active:scale-95"
          style={{
            left: `${((value[0] - min) / (max - min)) * 100}%`,
            transform: 'translateX(0)',
            zIndex: 20,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startValue = value[0];
            
            const handleMouseMove = (e: MouseEvent) => {
              handleDrag(e, true, startX, startValue);
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />

        {/* 핸들 - 끝 */}
        <div 
          className="absolute w-4 h-4 -ml-2 -mt-1.5 bg-white border-2 border-blue-500 rounded-full cursor-pointer shadow-md hover:shadow-lg transition-all duration-150 ease-out hover:scale-110 active:scale-95"
          style={{
            left: `${((value[1] - min) / (max - min)) * 100}%`,
            transform: 'translateX(0)',
            zIndex: 20,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startValue = value[1];
            
            const handleMouseMove = (e: MouseEvent) => {
              handleDrag(e, false, startX, startValue);
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />

        {/* 트랙 클릭 영역 */}
        <div 
          className="absolute inset-0 cursor-pointer"
          onClick={(e) => {
            if (!trackRef.current) return;
            const rect = trackRef.current.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percent = clickX / rect.width;
            const clickValue = min + (max - min) * percent;
            
            // 클릭 위치에 따라 가까운 핸들 이동
            const distToStart = Math.abs(clickValue - value[0]);
            const distToEnd = Math.abs(clickValue - value[1]);
            
            if (distToStart < distToEnd) {
              onChange([getValidValue(clickValue, true), value[1]]);
            } else {
              onChange([value[0], getValidValue(clickValue, false)]);
            }
          }}
        />
      </div>

      {/* 날짜 표시 */}
      <div className="flex justify-between text-sm text-gray-600">
        <span>{formatDate(value[0])}</span>
        <span>{formatDate(value[1])}</span>
      </div>
    </div>
  );
}; 