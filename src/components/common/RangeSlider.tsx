import React, { useCallback } from 'react';

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
  const handleMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange([Number(e.target.value), value[1]]);
  }, [onChange, value[1]]);

  const handleMaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange([value[0], Number(e.target.value)]);
  }, [onChange, value[0]]);

  return (
    <div className="relative w-full h-6">
      <input
        type="range"
        min={min}
        max={max}
        value={value[0]}
        onChange={handleMinChange}
        className="absolute w-full"
      />
      <input
        type="range"
        min={min}
        max={max}
        value={value[1]}
        onChange={handleMaxChange}
        className="absolute w-full"
      />
    </div>
  );
}; 