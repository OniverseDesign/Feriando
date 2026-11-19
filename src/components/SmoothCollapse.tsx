import React from 'react';

interface SmoothCollapseProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}

/**
 * Universal M3 Expressive Smooth Collapse container using CSS grid interpolation.
 * Animates smoothly between 0fr and 1fr without knowing the content height in advance.
 */
export const SmoothCollapse: React.FC<SmoothCollapseProps> = ({
  isOpen,
  children,
  className = '',
  innerClassName = '',
}) => {
  return (
    <div
      className={`m3-smooth-collapse ${isOpen ? 'is-open' : 'pointer-events-none'} ${className}`}
      aria-hidden={!isOpen}
    >
      <div className={`m3-smooth-collapse-inner ${innerClassName}`}>
        {children}
      </div>
    </div>
  );
};
