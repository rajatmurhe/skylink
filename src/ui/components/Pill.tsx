import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';
import { clsx } from 'clsx';

export type StatePillType = 'good' | 'degrading' | 'poor' | 'outage' | 'baseline' | 'skylink';

export interface PillProps {
  type: StatePillType;
  label?: string;
  icon?: boolean;
}

export const Pill: React.FC<PillProps> = ({ type, label, icon = true }) => {
  const configs: Record<StatePillType, { bg: string; text: string; border: string; defaultLabel: string; IconComp: React.ElementType }> = {
    good: {
      bg: 'bg-teal-500/15',
      text: 'text-teal-300',
      border: 'border-teal-500/40',
      defaultLabel: 'Good Link',
      IconComp: CheckCircle2,
    },
    degrading: {
      bg: 'bg-yellow-500/15',
      text: 'text-yellow-300',
      border: 'border-yellow-500/40',
      defaultLabel: 'Degrading Link',
      IconComp: AlertTriangle,
    },
    poor: {
      bg: 'bg-orange-500/15',
      text: 'text-orange-300',
      border: 'border-orange-500/40',
      defaultLabel: 'Poor Link',
      IconComp: AlertCircle,
    },
    outage: {
      bg: 'bg-rose-500/15',
      text: 'text-rose-300',
      border: 'border-rose-500/40',
      defaultLabel: 'Signal Outage',
      IconComp: XCircle,
    },
    baseline: {
      bg: 'bg-slate-500/15',
      text: 'text-slate-300',
      border: 'border-slate-500/40',
      defaultLabel: 'Baseline Strategy',
      IconComp: CheckCircle2,
    },
    skylink: {
      bg: 'bg-cyan-500/15',
      text: 'text-cyan-300',
      border: 'border-cyan-500/40',
      defaultLabel: 'SkyLink Strategy',
      IconComp: CheckCircle2,
    },
  };

  const config = configs[type];
  const displayLabel = label || config.defaultLabel;
  const IconComponent = config.IconComp;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm transition-all',
        config.bg,
        config.text,
        config.border
      )}
    >
      {icon && <IconComponent className="w-3.5 h-3.5 shrink-0" />}
      <span>{displayLabel}</span>
    </span>
  );
};
