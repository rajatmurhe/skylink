import React, { useState } from 'react';
import { Card } from '../ui/components/Card';
import { Gauge } from '../ui/components/Gauge';
import { Pill } from '../ui/components/Pill';
import { Slider } from '../ui/components/Slider';
import { Toggle } from '../ui/components/Toggle';
import { Tooltip } from '../ui/components/Tooltip';
import { Toast } from '../ui/components/Toast';
import { Sparkline } from '../ui/components/Sparkline';
import { StatTile } from '../ui/components/StatTile';

export const Gallery: React.FC = () => {
  const [sliderVal, setSliderVal] = useState(75);
  const [toggleVal, setToggleVal] = useState(true);

  const sparklineData = [0.9, 0.85, 0.8, 0.72, 0.6, 0.45, 0.38, 0.2, 0.15, 0.4, 0.75, 0.92];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold text-slate-100">
          Design System Component Gallery
        </h1>
        <p className="text-sm text-slate-400">
          Base component library showcasing tokens, variants, and interactive controls.
        </p>
      </div>

      {/* Cards & Panels */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-semibold text-cyan-400">
          Cards and Glass Panels
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card header="Default Glass Panel">
            <p className="text-xs text-slate-300">
              Standard panel with translucent backdrop and subtle borders.
            </p>
          </Card>

          <Card header="Raised Panel with Glow" variant="raised">
            <p className="text-xs text-slate-300">
              Elevated panel with luminous cyan glow effect for focal elements.
            </p>
          </Card>

          <Card header="Interactive Panel" variant="interactive">
            <p className="text-xs text-slate-300">
              Hoverable panel with active border transitions and interactive feedback.
            </p>
          </Card>
        </div>
      </section>

      {/* Status Pills */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-semibold text-cyan-400">
          Status Pills and Indicators
        </h2>
        <div className="flex flex-wrap gap-4 items-center glass-panel p-6">
          <Pill type="good" />
          <Pill type="degrading" />
          <Pill type="poor" />
          <Pill type="outage" />
          <Pill type="baseline" />
          <Pill type="skylink" />
        </div>
      </section>

      {/* Telemetry Widgets */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-semibold text-cyan-400">
          Gauges, Sparklines, and Stat Tiles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card header="Radial Link Quality Gauge" className="flex items-center justify-center">
            <Gauge value={84} label="Signal Link Quality" sublabel="RSSI" color="var(--color-link-good)" />
          </Card>

          <Card header="30 Second Sparkline">
            <div className="flex flex-col gap-3">
              <span className="text-xs text-slate-400">Recent signal trend history:</span>
              <Sparkline data={sparklineData} width={240} height={50} color="var(--color-accent-cyan)" />
            </div>
          </Card>

          <Card header="Numeric Telemetry Stat Tile">
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Power Draw" value="142" unit="W" subtext="+4W vs hover" color="text-amber-400" />
              <StatTile label="Air Speed" value="12.4" unit="m/s" subtext="Max 15 m/s" color="text-cyan-400" />
            </div>
          </Card>
        </div>
      </section>

      {/* Controls & Inputs */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-semibold text-cyan-400">
          Interactive Sliders, Toggles, and Tooltips
        </h2>
        <Card className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <Slider
            label="Transmit Power"
            value={sliderVal}
            min={0}
            max={100}
            unit="dBm"
            onChange={setSliderVal}
          />

          <Toggle
            label="Auto Chaos Mode"
            checked={toggleVal}
            onChange={setToggleVal}
          />

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Hover for info:</span>
            <Tooltip content="Path loss exponent describes Signal Attenuation in urban vs open space.">
              <span className="px-3 py-1.5 rounded-control bg-slate-800 border border-slate-700 text-xs font-semibold text-cyan-300 cursor-help">
                Path Loss Exponent (?)
              </span>
            </Tooltip>
          </div>
        </Card>
      </section>

      {/* Toasts */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-semibold text-cyan-400">
          Notification Toasts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Toast type="info" title="Telemetry Active" message="Connected to ground station 1" />
          <Toast type="warning" title="Early Warning: Link Degrading" message="Predicted signal drop below 45% in 4 seconds" />
          <Toast type="success" title="Mission Resumed" message="Rejoined flight plan at Waypoint 3" />
        </div>
      </section>
    </div>
  );
};
