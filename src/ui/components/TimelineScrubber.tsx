import React from 'react';
import { useSimStore } from '../../store/simStore';
import { History, Play, Pause } from 'lucide-react';

export const TimelineScrubber: React.FC<{ canPlay?: boolean }> = ({canPlay = true}) => {
  const { currentRecord, historyRecords, isPlaying, play, pause, engine } = useSimStore();

  if (historyRecords.length === 0) return null;

  const currentTick = currentRecord?.tick || 0;
  const maxTick = historyRecords.length;

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    pause();
    const targetTick = parseInt(e.target.value);
    const targetRecord = engine.recorder.getRecordAt(targetTick);
    if (targetRecord) {
      useSimStore.setState({ currentRecord: targetRecord });
    }
  };

  return (
    <div className="glass-panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <span className="font-heading font-semibold text-slate-200">
            Replay History Timeline
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-slate-300">
          <span>
            Time: <strong className="text-cyan-400">{(currentTick * 0.1).toFixed(1)}s</strong>
          </span>
          <span>
            Tick: <strong className="text-cyan-400">{currentTick}</strong> / {maxTick}
          </span>
          <button
            disabled={!canPlay || engine.finished}
            onClick={isPlaying ? pause : play}
            className="p-1 px-2.5 rounded-control bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-border-subtle flex items-center gap-1"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isPlaying ? 'Pause' : 'Resume live'}</span>
          </button>
        </div>
      </div>

      {/* Timeline Color Band Grid */}
      <div className="relative w-full h-4 bg-slate-950 rounded-full overflow-hidden flex">
        {historyRecords.filter((_, i) => i % Math.max(1, Math.ceil(historyRecords.length / 500)) === 0).map((r, idx) => {
          let bandColor = 'bg-teal-400';
          if (r.comm.linkState === 'DEGRADING') bandColor = 'bg-yellow-400';
          else if (r.comm.linkState === 'POOR') bandColor = 'bg-orange-400';
          else if (r.comm.linkState === 'OUTAGE') bandColor = 'bg-rose-500';

          return (
            <div
              key={idx}
              className={`h-full flex-1 ${bandColor} transition-opacity ${
                r.tick <= currentTick ? 'opacity-100' : 'opacity-30'
              }`}
              title={`Tick ${r.tick} (${(r.tick * 0.1).toFixed(1)}s) : ${r.comm.linkState}`}
            />
          );
        })}
      </div>

      {/* Draggable Scrubber Slider */}
      <input
        aria-label="Inspect recorded simulation tick"
        type="range"
        min={1}
        max={maxTick}
        value={currentTick}
        onChange={handleScrub}
        className="w-full h-2 bg-slate-800 rounded-control appearance-none cursor-pointer accent-accent-cyan"
      />
    </div>
  );
};
