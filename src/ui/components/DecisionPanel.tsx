import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Card } from './Card';
import { ActionType } from '../../types/sim';
import { generatePlainEnglishExplanation } from '../../decision/explain';
import { useSimStore } from '../../store/simStore';
import { Cpu, HelpCircle, X } from 'lucide-react';

export const DecisionPanel: React.FC = () => {
  const { currentRecord } = useSimStore();
  const [showWhyModal, setShowWhyModal] = useState(false);

  if (!currentRecord) return null;

  const { decision, comm, uav, waypoints, risk } = currentRecord;
  const explanation = decision.explanation;

  const actions: ActionType[] = [
    'CONTINUE',
    'REPLAN',
    'RECOVER_CONNECTIVITY',
    'HOLD',
    'RESUME',
    'SAFE_RETURN',
  ];

  return (
    <Card
      header={
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>Decision Engine Utility Scores</span>
        </div>
      }
      action={
        <button
          onClick={() => setShowWhyModal(!showWhyModal)}
          className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/30 transition-all"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Why?</span>
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Active Action Display */}
        <div className="flex items-center justify-between p-3 bg-slate-900/80 rounded-control border border-border-subtle">
          <span className="text-xs font-medium text-slate-300">Active Action:</span>
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 tracking-wider">
            {decision.action}
          </span>
        </div>

        {/* Plain English Explanation */}
        <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/70 p-3 rounded-control border border-border-subtle italic">
          "{explanation}"
        </p>

        {/* 6 Action Utility Score Bars */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border-subtle">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Heuristic scores (baseline does not score actions):
          </div>

          {actions.map((act) => {
            const rawScore = decision.actionScores[act] || 0;
            const percentage = Math.min(100, Math.round(rawScore * 100));
            const isSelected = decision.action === act;

            return (
              <div key={act} className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className={isSelected ? 'text-cyan-300 font-bold' : 'text-slate-400'}>
                    {act}
                  </span>
                  <span className={isSelected ? 'text-cyan-300 font-bold' : 'text-slate-400'}>
                    {rawScore.toFixed(2)}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isSelected ? 'bg-accent-cyan shadow-glow' : 'bg-slate-700'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* "Why?" Explanation Breakdown Modal */}
      {showWhyModal && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Decision explanation" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel-raised max-w-md w-full p-6 flex flex-col gap-4 border-cyan-500/40 shadow-glow-lg">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="font-heading font-bold text-base text-slate-100">
                Decision Objective Weight Breakdown
              </h3>
              <button aria-label="Close explanation"
                onClick={() => setShowWhyModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              SkyLink evaluates every action using a multi objective utility function combining expected link quality gain, mission value captured, energy cost, and safety risk.
            </p>

            <div className="space-y-2 text-xs font-mono bg-slate-900 p-3 rounded-control border border-border-subtle text-slate-300">
              <div>Communication Weight: 35%</div>
              <div>Mission Value Weight: 35%</div>
              <div>Energy Cost Weight: 15%</div>
              <div>Safety Risk Weight: 15%</div>
            </div>

            <button
              onClick={() => setShowWhyModal(false)}
              className="w-full py-2 bg-accent-cyan text-slate-950 font-bold text-xs rounded-control hover:bg-cyan-400 transition-colors"
            >
              Close Breakdown
            </button>
          </div>
        </div>, document.body
      )}
    </Card>
  );
};
