import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/components/Card';
import { StatTile } from '../ui/components/StatTile';
import { Slider } from '../ui/components/Slider';
import type { StrategyStats, SingleRunResult } from '../workers/batch.worker';
import { BarChart2, Play, Download, Printer, RefreshCw, Trophy } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export const Benchmark: React.FC = () => {
  const [numRuns, setNumRuns] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<StrategyStats[]>([]);
  const [rawResults, setRawResults] = useState<SingleRunResult[]>([]);

  const worker = useRef<Worker | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  useEffect(() => () => worker.current?.terminate(), []);
  const startBenchmark = () => {
    worker.current?.terminate();
    setIsRunning(true); setStats([]); setRawResults([]); setError(''); setProgress('Running paired seeds from 5000…');
    const w = new Worker(new URL('../workers/batch.worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    w.onmessage = ({ data }) => {
      if (data.type === 'PROGRESS') setProgress(`Finished ${data.completedStrategy}. Continuing evaluation…`);
      if (data.type === 'COMPLETE') {
        setStats(data.stats); setRawResults(data.rawResults); setIsRunning(false); setProgress('Evaluation complete. All values below were computed in this browser.'); w.terminate();
      }
    };
    w.onerror = () => { setError('Evaluation failed. Please retry with fewer seeds.'); setIsRunning(false); w.terminate(); };
    w.postMessage({ numRuns, startSeed: 5000, strategies: ['baseline', 'skylink_utility'] });
  };

  const handleExportCSV = () => {
    let csv = 'Seed,Strategy,ValueCaptured,TotalValue,OutageSeconds,BatteryUsedWh,IsCompleted,IsSafeReturn\n';
    rawResults.forEach((r) => {
      csv += `${r.seed},${r.strategy},${r.capturedValue},${r.totalValue},${r.outageSeconds},${r.batteryUsedWh},${r.isCompleted},${r.isSafeReturn}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `skylink_benchmark_${numRuns}_runs.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const chartData = stats.map((s) => ({
    name: s.strategy,
    'Value Captured': s.meanValueCaptured,
    'Outage Seconds': s.meanOutageSeconds,
    'Completion %': s.completionRatePct,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 print:py-0 print:max-w-none">
      {/* Header */}
      <header className="glass-panel-raised p-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-accent-cyan" />
          <h1 className="font-heading text-xl font-bold text-slate-100">
            Headless Batch Benchmark & Analytics Studio
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="w-48">
            <Slider
              label="Evaluation Seeds"
              value={numRuns}
              min={10}
              max={200}
              step={10}
              unit="runs"
              onChange={setNumRuns}
            />
          </div>

          <button
            onClick={startBenchmark}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2 rounded-control bg-accent-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glow transition-all disabled:opacity-50"
          >
            {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isRunning ? 'Running Web Worker...' : `Run ${numRuns} paired seeds`}</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!rawResults.length}
            className="flex items-center gap-1.5 px-3 py-2 rounded-control bg-slate-800 hover:bg-slate-700 text-slate-200 border border-border-subtle text-xs font-semibold"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-control bg-slate-800 hover:bg-slate-700 text-slate-200 border border-border-subtle text-xs font-semibold"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </header>

      <p className="text-sm text-slate-400">Disaster Search scenario · paired seeds starting at 5000 · up to 600 simulated seconds per run. Completion means all waypoint value captured; safe return requires landing home with energy remaining. Approximate 95% normal confidence intervals describe variation across seeds, not real-world reliability.</p>
      <p className="text-sm text-accent-cyan" role="status">{error || progress || 'Ready to evaluate. Run an experiment to generate measured results.'}</p>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatTile label="SkyLink Completion" value={stats[1] ? `${stats[1].completionRatePct}%` : '—'} subtext={stats[0] ? `${stats[0].completionRatePct}% baseline` : 'Awaiting evaluation'} />
        <StatTile label="Mean Mission Value" value={stats[1] ? `${stats[1].meanValueCaptured} pts` : '—'} subtext={stats[1] ? `± ${stats[1].ciValueCaptured} · approx. 95% CI` : ''} />
        <StatTile label="Mean Outage Duration" value={stats[1] ? `${stats[1].meanOutageSeconds} s` : '—'} />
        <StatTile label="Safe Return Rate" value={stats[1] ? `${stats[1].safeReturnSuccessPct}%` : '—'} />
      </div>

      {/* Grouped Bar Chart with 95% CI */}
      <Card header="Mission completion across paired seeds (%)">
        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#64748B" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155' }} />
              <Legend />


              <Bar dataKey="Completion %" fill="#2DD4BF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Per Scenario Statistical Table */}
      <Card header="Statistical Performance Breakdown Table">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-300 uppercase border-b border-border-subtle">
              <tr>
                <th className="p-3">Strategy</th>
                <th className="p-3">Runs</th>
                <th className="p-3">Completion Rate</th>
                <th className="p-3">Mean Value (95% CI)</th>
                <th className="p-3">Outage Duration (s)</th>
                <th className="p-3">Energy Used (Wh)</th>
                <th className="p-3">Safe Return Success</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {stats.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-slate-100 flex items-center gap-2">
                    {idx === 1 && <Trophy className="w-4 h-4 text-amber-400" />}
                    <span>{s.strategy}</span>
                  </td>
                  <td className="p-3 text-slate-400">{s.numRuns}</td>
                  <td className="p-3 text-teal-300 font-bold">{s.completionRatePct}%</td>
                  <td className="p-3 text-cyan-300 font-bold">
                    {s.meanValueCaptured} +- {s.ciValueCaptured}
                  </td>
                  <td className="p-3 text-slate-300">{s.meanOutageSeconds}s</td>
                  <td className="p-3 text-amber-300">{s.meanEnergyWh} Wh</td>
                  <td className="p-3 text-teal-300">{s.safeReturnSuccessPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
