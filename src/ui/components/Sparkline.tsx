import React from 'react';

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 160,
  height = 40,
  color = 'var(--color-accent-cyan)',
}) => {
  if (!data || data.length === 0) {
    return <div style={{ width, height }} className="bg-slate-800/30 rounded" />;
  }

  const min = 0;
  const max = 1;
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1 || 1)) * width;
      const normalized = Math.min(Math.max(val, min), max);
      const y = height - normalized * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};
