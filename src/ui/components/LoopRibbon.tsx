import React from 'react';
import { Radio, ShieldAlert, Cpu, RefreshCw, CheckCircle2 } from 'lucide-react';

export type LoopStage = 'sense' | 'assess' | 'decide' | 'recover' | 'resume';

export interface LoopRibbonProps {
  activeStage: LoopStage;
}

export const LoopRibbon: React.FC<LoopRibbonProps> = ({ activeStage }) => {
  const stages: { id: LoopStage; label: string; icon: React.ElementType }[] = [
    { id: 'sense', label: '1: Sense', icon: Radio },
    { id: 'assess', label: '2: Assess', icon: ShieldAlert },
    { id: 'decide', label: '3: Decide', icon: Cpu },
    { id: 'recover', label: '4: Recover', icon: RefreshCw },
    { id: 'resume', label: '5: Resume', icon: CheckCircle2 },
  ];

  return (
    <div className="flex items-center justify-between gap-2 p-2 bg-slate-900/80 rounded-control border border-border-subtle overflow-x-auto">
      {stages.map((stage) => {
        const Icon = stage.icon;
        const isActive = activeStage === stage.id;
        return (
          <div
            key={stage.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold transition-all ${
              isActive
                ? 'bg-accent-cyan/20 text-cyan-300 border border-accent-cyan/50 shadow-glow font-bold scale-105'
                : 'text-slate-500 bg-slate-950/40'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'animate-pulse text-accent-cyan' : ''}`} />
            <span>{stage.label}</span>
          </div>
        );
      })}
    </div>
  );
};
