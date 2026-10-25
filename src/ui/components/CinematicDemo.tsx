import React, { useState, useEffect } from 'react';
import { useSimStore } from '../../store/simStore';
import { Card } from './Card';
import { Play, Pause, Radio, Film } from 'lucide-react';

export const CinematicDemo: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { engine, play, pause, isPlaying, stepTick } = useSimStore();
  const [caption, setCaption] = useState('Welcome to the Viva Cinematic Demo. Press play to start.');
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        stepTick();
        setElapsedSec((s) => parseFloat((s + 0.1).toFixed(1)));
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isPlaying, stepTick]);

  // Scripted narrative milestones
  useEffect(() => {
    if (elapsedSec >= 15 && elapsedSec < 16) {
      // Trigger tower failure
      if (engine.world.towers[0]) {
        engine.world.towers[0].isOnline = false;
        setCaption('EVENT: Ground Station Alpha has failed! Signal link quality is collapsing.');
      }
    } else if (elapsedSec >= 18 && elapsedSec < 19) {
      setCaption('EARLY WARNING: SkyLink detected upcoming signal outage 5 seconds in advance.');
    } else if (elapsedSec >= 24 && elapsedSec < 25) {
      setCaption('DECISION: Executing Communication Aware A Star replanning to circumvent the dead zone.');
    } else if (elapsedSec >= 35 && elapsedSec < 36) {
      setCaption('RECOVERY: UAV entered Tower Bravo coverage zone. Telemetry link restored to 85 percent.');
    } else if (elapsedSec >= 48 && elapsedSec < 49) {
      setCaption('RESUME: Rejoining mission plan to capture remaining survivor video streaming waypoint.');
    }
  }, [elapsedSec, engine.world.towers]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <Card
        variant="raised"
        className="max-w-2xl w-full p-6 border-cyan-500/50 shadow-glow-lg flex flex-col gap-5 relative"
      >
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-accent-cyan" />
            <h2 className="font-heading font-extrabold text-lg text-slate-100">
              SkyLink Viva Cinematic Narrated Demo
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 font-bold text-xs">
            Close Demo
          </button>
        </div>

        {/* Live Caption Display Box */}
        <div className="p-4 bg-slate-900/90 rounded-control border border-cyan-500/40 flex items-start gap-3">
          <Radio className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
              Live Narrative Caption ({elapsedSec}s)
            </span>
            <p className="text-xs text-slate-100 font-medium leading-relaxed">
              "{caption}"
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={isPlaying ? pause : play}
              className="flex items-center gap-2 px-5 py-2 rounded-control bg-accent-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glow transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'Pause Demo' : 'Start Cinematic Demo'}</span>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
