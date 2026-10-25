import React from 'react';

export interface GaugeProps {
  value: number; // 0 to 1 or 0 to 100
  max?: number;
  label?: string;
  sublabel?: string;
  size?: number;
  color?: string;
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  max = 100,
  label,
  sublabel,
  size = 140,
  color = 'var(--color-accent-cyan)',
}) => {
  const normalizedValue = Math.min(Math.max(value, 0), max);
  const percentage = Math.round((normalizedValue / max) * 100);
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-slate-800/80"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono font-bold text-2xl tracking-tight text-slate-100">
            {percentage}%
          </span>
          {sublabel && (
            <span className="text-[10px] uppercase font-semibold text-slate-400 mt-0.5">
              {sublabel}
            </span>
          )}
        </div>
      </div>
      {label && (
        <span className="mt-2 text-xs font-medium text-slate-300">
          {label}
        </span>
      )}
    </div>
  );
};
