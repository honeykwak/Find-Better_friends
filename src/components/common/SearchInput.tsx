import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { tokens } from '../../styles/tokens';
import { SearchResult } from '../../types/search';

interface SearchInputProps<T = any> {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onClear?: () => void;
  placeholder?: string;
  results: SearchResult<T>[];
  onResultClick?: (result: SearchResult<T>) => void;
  onResultHover?: (result: SearchResult<T> | null) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onFocus,
  onClear,
  placeholder = "Search...",
  results = [],
  onResultClick,
  onResultHover
}) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < results.length) {
      onResultHover?.(results[selectedIndex]);
    } else {
      onResultHover?.(null);
    }
  }, [selectedIndex, results, onResultHover]);

  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current && selectedItemRef.current) {
      const dropdown = dropdownRef.current;
      const selectedItem = selectedItemRef.current;
      
      const dropdownRect = dropdown.getBoundingClientRect();
      const selectedItemRect = selectedItem.getBoundingClientRect();
      
      if (selectedItemRect.bottom > dropdownRect.bottom) {
        dropdown.scrollTop += selectedItemRect.bottom - dropdownRect.bottom;
      } else if (selectedItemRect.top < dropdownRect.top) {
        dropdown.scrollTop -= dropdownRect.top - selectedItemRect.top;
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    if (results.length === 0) {
      onResultHover?.(null);
    }
  }, [results.length, onResultHover]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          onResultClick?.(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setSelectedIndex(-1);
        onChange('');
        onClear?.();
        break;
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          onFocus?.();
          setSelectedIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`
          w-64 px-3 py-2 text-sm 
          border rounded-lg 
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${results.length > 0 ? 'rounded-b-none' : ''}
        `}
      />
      {value && (
        <button
          onClick={() => {
            onChange('');
            onClear?.();
            setSelectedIndex(-1);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2"
        >
          <XMarkIcon className={tokens.components.searchInput.clearButton.icon.size + ' ' + 
            tokens.components.searchInput.clearButton.icon.color + ' ' + 
            tokens.components.searchInput.clearButton.icon.hoverColor} 
          />
        </button>
      )}
      
      <div 
        ref={dropdownRef}
        className={`
          ${tokens.components.searchInput.dropdown.base}
          ${results.length > 0 ? 'block' : 'hidden'}
          border-t-0 rounded-t-none
        `}
      >
        {results.map((result, index) => (
          <button
            key={result.id}
            ref={index === selectedIndex ? selectedItemRef : null}
            className={`
              ${tokens.components.searchInput.dropdown.item.base}
              ${index === selectedIndex ? 'bg-gray-50/90' : ''}
            `}
            onClick={() => onResultClick?.(result)}
            onMouseEnter={() => {
              onResultHover?.(result);
              setSelectedIndex(index);
            }}
            onMouseLeave={() => {
              onResultHover?.(null);
              setSelectedIndex(-1);
            }}
          >
            <div className={tokens.components.searchInput.dropdown.item.text}>
              {result.text}
            </div>
            {result.subText && (
              <div className={tokens.components.searchInput.dropdown.item.subText}>
                {result.subText}
              </div>
            )}
          </button>
        ))}
        {results.length === 0 && (
          <div className="p-2 text-sm text-gray-500">
            No results found
          </div>
        )}
      </div>
    </div>
  );
}; 