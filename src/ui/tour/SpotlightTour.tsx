import React, { useState } from 'react';
import { Card } from '../components/Card';
import { X, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';

export interface SpotlightStep {
  title: string;
  description: string;
  targetSelector?: string;
}

export const SpotlightTour: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps: SpotlightStep[] = [
    {
      title: 'Welcome to SkyLink Mission Control',
      description:
        'SkyLink is an autonomous drone mission recovery simulator that continuously senses radio signal quality, predicts upcoming outages, and replans routes to complete missions.',
    },
    {
      title: 'Strategy Switcher',
      description:
        'Compare the Baseline strategy (which returns home upon signal loss) against the SkyLink Multi Objective Utility Engine and Tabular RL Agent side by side.',
    },
    {
      title: 'Live Telemetry & 5 Second Predictor',
      description:
        'Monitor received signal strength, signal to noise ratio, packet loss, and latency in real time. The 5 second predictor warns of upcoming signal drops before outage occurs.',
    },
    {
      title: 'Stress Lab & Replay Timeline',
      description:
        'Drag tower failures, jammers, and storms directly onto the canvas to test adaptive recovery live, or scrub the timeline to inspect previous simulation ticks.',
    },
  ];

  const currentStep = steps[stepIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <Card
        variant="raised"
        className="max-w-md w-full p-6 border-cyan-500/50 shadow-glow-lg flex flex-col gap-4 relative animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
            Spotlight Tour ({stepIndex + 1} of {steps.length})
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="font-heading font-extrabold text-lg text-slate-100">
          {currentStep.title}
        </h3>

        <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-control border border-border-subtle">
          {currentStep.description}
        </p>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
            disabled={stepIndex === 0}
            className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-200 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {stepIndex < steps.length - 1 ? (
            <button
              onClick={() => setStepIndex((s) => s + 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-control bg-accent-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glow transition-all"
            >
              <span>Next Step</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 rounded-control bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-glow transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finish Tour</span>
            </button>
          )}
        </div>
      </Card>
    </div>
  );
};
