import React from 'react';

export interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  unit = '',
  subtext,
  color = 'text-slate-100',
}) => {
  return (
    <div className="flex flex-col gap-1 p-3 bg-bg-surface/50 border border-border-subtle rounded-control">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className={`font-mono text-xl font-bold tracking-tight ${color}`}>
          {value}
        </span>
        {unit && <span className="text-xs text-slate-400 font-medium">{unit}</span>}
      </div>
      {subtext && <span className="text-[10px] text-slate-400 mt-0.5">{subtext}</span>}
    </div>
  );
};
