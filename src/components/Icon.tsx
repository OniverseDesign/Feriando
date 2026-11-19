import React from 'react';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: number | string;
  filled?: boolean;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  filled = false,
  className = '',
  style,
  ...props
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <span
      className={`material-symbols-rounded select-none inline-flex items-center justify-center leading-none ${filled ? 'filled' : ''} ${className}`}
      style={{
        fontSize: pixelSize,
        width: pixelSize,
        height: pixelSize,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
};
