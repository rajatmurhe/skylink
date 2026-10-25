import React, { useState } from 'react';
import { Card } from '../ui/components/Card';
import { Pill } from '../ui/components/Pill';
import { BookOpen, Layers, Info, CheckCircle2, ArrowRight } from 'lucide-react';

export const Learn: React.FC = () => {
  const [activeModule, setActiveModule] = useState<string>('monitor');

  const modules = [
    {
      id: 'sensors',
      title: 'Sensors & World State',
      description: 'Maintains 2000m x 2000m map, ground station positions, obstacle attenuation bounds, and jammer interference zones.',
      equation: 'RSSI = Ptx - PL0 - 10*n*log10(d) - obstacleLoss - shadowNoise',
    },
    {
      id: 'monitor',
      title: 'Link Degradation Monitor',
      description: 'Computes Exponential Moving Average (EMA) smoothing over link quality Q and calculates slope to predict Q 5 seconds ahead.',
      equation: 'Q_pred = Q_ema + slope * 5.0',
    },
    {
      id: 'risk',
      title: 'Risk Assessment Engine',
      description: 'Combines predicted link quality, time to outage, remaining mission value, and battery margin over return reserve.',
      equation: 'Risk = 0.4*(1-Q_pred) + 0.3*(1-Bat/Max) + 0.3*Criticality',
    },
    {
      id: 'utility',
      title: 'Multi Objective Utility Engine',
      description: 'Evaluates utility score for 6 actions (Continue, Replan, Recover, Hold, Resume, Safe Return) with hard safety shield overrides.',
      equation: 'Utility(a) = w_comm*Q_a + w_miss*V_a - w_nrg*E_a - w_risk*R_a + hysteresis',
    },
    {
      id: 'planner',
      title: 'Communication Aware A* Planner',
      description: 'Grid path planner applying cost penalty scaled by (1 - Q) per cell to steer around dead zones.',
      equation: 'Cost(cell) = distance + lambda * (1 - Q(cell)) + obstaclePenalty',
    },
    {
      id: 'uav',
      title: 'UAV Kinematics & Battery Model',
      description: 'Point mass kinematics (max 15 m/s) and non-linear power draw model with 1.25x safety factor return reserve calculation.',
      equation: 'P(v) = P_hover + dragCoeff * v^2',
    },
  ];

  const glossary = [
    { term: 'RSSI', def: 'Received Signal Strength Indicator in dBm. Describes raw power received from serving ground station.' },
    { term: 'SINR', def: 'Signal to Interference plus Noise Ratio in dB. Accounts for thermal noise floor (-95 dBm) and jammer noise.' },
    { term: 'Handover Hysteresis', def: '3 dB buffer required before switching serving towers to prevent rapid ping pong handovers.' },
    { term: 'Path Loss Exponent n', def: 'Rate at which signal attenuates with distance. This prototype uses a fixed exponent of 2.4 in all scenarios.' },
  ];

  const selectedMod = modules.find((m) => m.id === activeModule) || modules[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-8">
      {/* Header */}
      <header className="glass-panel-raised p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-accent-cyan" />
          <h1 className="font-heading text-xl font-bold text-slate-100">
            System Architecture & Methodological Reference
          </h1>
        </div>
        <Pill type="skylink" label="Interactive Architecture Map" />
      </header>

      <p className="text-sm text-slate-400">Research prototype: a 2D point-mass simulation with heuristic RF and energy models. RF obstacle areas are attenuation regions, not collision-certified no-fly zones. The five-second projection is a linear estimate, not a guaranteed outage forecast. No hardware flights, physical payload delivery, video streaming, ROS or PX4 integration are claimed.</p>
      {/* Interactive System Architecture Map */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-semibold text-cyan-400 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          <span>Closed-loop architecture</span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {modules.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id)}
              className={`p-3 rounded-control text-xs font-semibold flex flex-col items-center text-center gap-2 border transition-all ${
                activeModule === m.id
                  ? 'bg-accent-cyan/20 text-cyan-300 border-accent-cyan shadow-glow font-bold scale-105'
                  : 'bg-slate-900/80 text-slate-400 border-border-subtle hover:text-slate-200'
              }`}
            >
              <span className="font-mono text-[10px] text-slate-400 uppercase">Module</span>
              <span>{m.title}</span>
            </button>
          ))}
        </div>

        {/* Selected Module Detail Panel */}
        <Card variant="raised" className="border-cyan-500/40">
          <div className="flex flex-col gap-3">
            <h3 className="font-heading font-bold text-base text-cyan-300">
              {selectedMod.title}
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed">
              {selectedMod.description}
            </p>
            <div className="p-3 bg-slate-950 rounded-control border border-border-subtle font-mono text-xs text-amber-300">
              Formulation: {selectedMod.equation}
            </div>
          </div>
        </Card>
      </section>

      {/* RF Physics Glossary */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-semibold text-cyan-400 flex items-center gap-2">
          <Info className="w-4 h-4" />
          <span>RF Physics Glossary</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {glossary.map((g) => (
            <Card key={g.term}>
              <div className="flex flex-col gap-1">
                <span className="font-heading font-bold text-sm text-slate-100">{g.term}</span>
                <p className="text-xs text-slate-400 leading-relaxed">{g.def}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Feature traceability */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-semibold text-cyan-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>Feature traceability</span>
        </h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/90 text-slate-300 border-b border-border-subtle">
                <tr>
                  <th className="p-3">Slide Concept</th>
                  <th className="p-3">Implemented SkyLink Feature</th>
                  <th className="p-3">Application Screen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-slate-300">
                <tr>
                  <td className="p-3 font-bold text-slate-100">Problem Statement</td>
                  <td className="p-3">Toggleable RF effects (distance, obstacles, jammers, congestion)</td>
                  <td className="p-3 text-cyan-300">Stress Lab</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-100">Research Gap</td>
                  <td className="p-3">Baseline static route aborting on link loss</td>
                  <td className="p-3 text-cyan-300">Compare Mode</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-100">5-Stage Loop</td>
                  <td className="p-3">Sense, Assess, Decide, Recover, Resume ribbon bar</td>
                  <td className="p-3 text-cyan-300">Mission Control</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-100">RL Framework</td>
                  <td className="p-3">Experimental 1440-state Q-learning; separate from the deployed utility policy</td>
                  <td className="p-3 text-cyan-300">AI Lab</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Future Scope Roadmap */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-semibold text-cyan-400 flex items-center gap-2">
          <ArrowRight className="w-4 h-4" />
          <span>Future work</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card header="ROS and PX4 Integration">
            <p className="text-xs text-slate-400">Bridge simulation decision engine to MAVLink telemetry protocol.</p>
          </Card>
          <Card header="Field Measurements">
            <p className="text-xs text-slate-400">Calibrate path loss exponents against real world drone flight RF logs.</p>
          </Card>
          <Card header="Multi UAV Relays">
            <p className="text-xs text-slate-400">Deploy secondary relay drones to extend mesh coverage across mountains.</p>
          </Card>
          <Card header="Edge AI Deep RL">
            <p className="text-xs text-slate-400">Extend tabular Q learning to continuous PPO neural networks on edge hardware.</p>
          </Card>
        </div>
      </section>
    </div>
  );
};
