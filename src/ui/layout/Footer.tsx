import React from 'react';
import { NavLink } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full py-6 bg-bg-surface/40 border-t border-border-subtle mt-auto">
      <nav aria-label="Research resources" className="max-w-7xl mx-auto px-8 pb-5 flex flex-wrap gap-6 text-xs text-slate-400"><NavLink to="/builder">Scenario builder</NavLink><NavLink to="/ai-lab">Experimental AI lab</NavLink><NavLink to="/learn">Scientific methods</NavLink><NavLink to="/submission">Course alignment & viva</NavLink><a href="/matlab/skylink_roll_reference.m" download>MATLAB reference</a></nav>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
          <span>SkyLink Mission Control: Autonomous Drone Mission Recovery</span>
        </div>
        <div className="font-mono text-[11px] text-amber-400/90 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
          Simulation only: No real flight data
        </div>
        <div>
          Team: Rishika Deshmukh, Rajat Murhe
        </div>
      </div>
    </footer>
  );
};
