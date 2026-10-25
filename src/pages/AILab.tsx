import { ACTIONS, QTableJSON } from '../decision/qlearning';
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/components/Card';
import { StatTile } from '../ui/components/StatTile';
import { Tooltip } from '../ui/components/Tooltip';
import { Cpu, Play, Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as ChartTooltip } from 'recharts';

interface RewardPoint {
  episode: number;
  avgReward: number;
  epsilon: number;
}

export const AILab: React.FC = () => {
  const [isTraining, setIsTraining] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [totalEpisodes] = useState(100);
  const [avgReward, setAvgReward] = useState(0);
  const [epsilon, setEpsilon] = useState(1.0);
  const [rewardData, setRewardData] = useState<RewardPoint[]>([]);

  // Selected policy matrix bucket filters
  const [selectedLink, setSelectedLink] = useState(3); // Good link
  const [selectedBattery, setSelectedBattery] = useState(2); // Good battery

  const worker = useRef<Worker | null>(null);
  const [policy, setPolicy] = useState<QTableJSON | null>(null);
  const [error, setError] = useState('');
  useEffect(() => () => worker.current?.terminate(), []);
  const startTraining = () => {
    worker.current?.terminate();
    setIsTraining(true); setPolicy(null); setCurrentEpisode(0); setRewardData([]); setError('');
    const w = new Worker(new URL('../workers/train.worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    w.onmessage = ({ data }) => {
      if (data.type === 'PROGRESS') {
        setCurrentEpisode(data.progress.episode); setAvgReward(data.progress.avgReward); setEpsilon(data.progress.epsilon);
        setRewardData(previous => [...previous, data.progress]);
      }
      if (data.type === 'COMPLETE') { setPolicy(data.qTable); setIsTraining(false); w.terminate(); }
    };
    w.onerror = () => { setError('Training failed. Please retry.'); setIsTraining(false); w.terminate(); };
    w.postMessage({ episodes: totalEpisodes });
  };
  const getRecommendedAction = (link: number, battery: number) => {
    if (!policy) return 'TRAIN TO INSPECT';
    // Fixed slice: stable trend, full mission, near home, no recovery.
    const index = link + 5 * (1 + 3 * (battery + 4 * 3));
    const row = policy.qMatrix[index];
    if (row.every(v => v === 0)) return 'UNVISITED STATE';
    return ACTIONS[row.indexOf(Math.max(...row))];
  };
  const exportPolicy = () => {
    if (!policy) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(policy)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'skylink-experimental-policy.json'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* Header */}
      <header className="glass-panel-raised p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-accent-cyan" />
          <h1 className="font-heading text-xl font-bold text-slate-100">
            AI Lab: Tabular Q Learning Framework
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={startTraining}
            disabled={isTraining}
            className="flex items-center gap-2 px-5 py-2 rounded-control bg-accent-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glow transition-all disabled:opacity-50"
          >
            {isTraining ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isTraining ? 'Training Web Worker...' : 'Train Q Agent'}</span>
          </button>

          <button onClick={exportPolicy} disabled={!policy} className="disabled:opacity-40 flex items-center gap-1.5 px-4 py-2 rounded-control bg-slate-800 hover:bg-slate-700 text-slate-200 border border-border-subtle text-xs font-semibold">
            <Download className="w-4 h-4" />
            <span>Export Policy JSON</span>
          </button>
        </div>
      </header>

      <p className="text-sm text-slate-400">Experimental tabular Q-learning: 100 seeded episodes with actions applied to the simulator. This research sandbox is not the flight policy used in Mission Control or Benchmark. Training does not guarantee convergence or improved performance. The policy explorer fixes stable trend, full mission, near-home and no-recovery buckets.</p>
      {error && <p role="alert">{error}</p>}
      {/* KPI Stats Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatTile label="Training Episodes" value={`${currentEpisode} / ${totalEpisodes}`} color="text-slate-100" />
        <StatTile label="Mean Episode Reward" value={avgReward} color="text-teal-300" />
        <StatTile label="Exploration Epsilon" value={epsilon} color="text-amber-400" />
        <StatTile label="Discretized States" value="1,440" subtext="5x3x4x4x3x2 matrix" color="text-cyan-400" />
      </div>

      {/* Reward Convergence Chart */}
      <Card header="Live Training Reward Convergence Curve">
        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rewardData}>
              <XAxis dataKey="episode" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} />
              <ChartTooltip
                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
              />
              <Line type="monotone" dataKey="avgReward" stroke="#22D3EE" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Interactive Policy Matrix Explorer */}
      <Card header="Interactive Q Table Policy Explorer">
        <div className="flex flex-col gap-6">
          <p className="text-xs text-slate-400">
            Select link state and battery margin buckets to inspect the action chosen by the Q learning policy matrix.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <span>Signal Link Quality Bucket:</span>
                <Tooltip content="Discretized into 5 buckets from Outage to Excellent.">
                  <span className="text-cyan-400 cursor-help">(?)</span>
                </Tooltip>
              </label>
              <div className="grid grid-cols-5 gap-1.5 bg-slate-900 p-1.5 rounded-control border border-border-subtle">
                {['Outage', 'Poor', 'Degrading', 'Good', 'Excellent'].map((l, idx) => (
                  <button
                    key={l}
                    onClick={() => setSelectedLink(idx)}
                    className={`py-1.5 text-[11px] font-semibold rounded ${
                      selectedLink === idx
                        ? 'bg-accent-cyan text-slate-950 font-bold shadow-glow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <span>Battery Margin Bucket:</span>
                <Tooltip content="Discretized into Low, Medium, Good, and High.">
                  <span className="text-cyan-400 cursor-help">(?)</span>
                </Tooltip>
              </label>
              <div className="grid grid-cols-4 gap-1.5 bg-slate-900 p-1.5 rounded-control border border-border-subtle">
                {['Low (<5Wh)', 'Med (5-15Wh)', 'Good (15-30Wh)', 'High (>30Wh)'].map((b, idx) => (
                  <button
                    key={b}
                    onClick={() => setSelectedBattery(idx)}
                    className={`py-1.5 text-[11px] font-semibold rounded ${
                      selectedBattery === idx
                        ? 'bg-accent-cyan text-slate-950 font-bold shadow-glow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recommended Action Result */}
          <div className="p-4 bg-slate-900/90 rounded-control border border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-400" />
              <span className="text-xs font-semibold text-slate-200">
                Greedy learned action for this state:
              </span>
            </div>
            <span className="px-4 py-1.5 rounded-full text-xs font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/40 uppercase">
              {getRecommendedAction(selectedLink, selectedBattery)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
