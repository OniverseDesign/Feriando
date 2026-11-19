import React from 'react';
import { M3_EXPRESSIVE_PALETTE, getM3ColorName, getContrastTextColor } from '../utils/m3Palette';
import { Icon } from './Icon';

interface M3ColorSelectorProps {
  selectedColor: string;
  onSelectColor: (hex: string) => void;
  label?: string;
  compact?: boolean;
}

export const M3ColorSelector: React.FC<M3ColorSelectorProps> = ({
  selectedColor,
  onSelectColor,
  label,
  compact = false,
}) => {
  const normalizedSelected = selectedColor.toUpperCase();
  const activeColorName = getM3ColorName(selectedColor);

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
          <span>{label}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-on-surface">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: selectedColor }}
            />
            {activeColorName}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        {M3_EXPRESSIVE_PALETTE.map((c) => {
          const isSelected = normalizedSelected === c.hex.toUpperCase();
          return (
            <button
              key={c.hex}
              type="button"
              onClick={() => onSelectColor(c.hex)}
              className={`group relative flex shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                compact ? 'h-7 w-7' : 'h-9 w-9'
              } ${
                isSelected
                  ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-surface shadow-xs'
                  : 'hover:scale-105 hover:ring-1 hover:ring-outline/50'
              }`}
              style={{ backgroundColor: c.hex }}
              title={`${c.name} (${c.hex})`}
            >
              {isSelected && (
                <Icon
                  name="check"
                  size={compact ? 14 : 18}
                  className="drop-shadow-xs"
                  style={{ color: getContrastTextColor(c.hex) }}
                />
              )}
            </button>
          );
        })}

        {/* Custom hex color fallback */}
        <label
          className={`flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-dashed border-outline-variant bg-surface transition-all hover:bg-surface-container hover:scale-105 ${
            compact ? 'h-7 w-7' : 'h-9 w-9'
          }`}
          title="Personalizar color..."
        >
          <Icon
            name="palette"
            size={compact ? 14 : 18}
            className="text-on-surface-variant"
          />
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => onSelectColor(e.target.value)}
            className="sr-only"
            aria-label="Selector de color personalizado"
          />
        </label>
      </div>
    </div>
  );
};
