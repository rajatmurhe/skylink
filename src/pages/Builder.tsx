import { validateScenario } from '../sim/validation';
import React, { useState, useEffect } from 'react';
import { Scenario, Waypoint } from '../types/sim';
import disasterPreset from '../scenarios/disaster.json';
import urbanPreset from '../scenarios/urban.json';
import wildfirePreset from '../scenarios/wildfire.json';
import mountainPreset from '../scenarios/mountain.json';
import { Card } from '../ui/components/Card';
import { Pill } from '../ui/components/Pill';
import { SimCanvas } from '../ui/canvas/SimCanvas';
import { useSimStore } from '../store/simStore';
import {
  Wrench,
  Download,
  Upload,
  Share2,
  Undo,
  Redo,
  Plus,
  Trash2,
} from 'lucide-react';

export const Builder: React.FC = () => {
  const { loadScenario } = useSimStore();
  const [currentScenario, setCurrentScenario] = useState<Scenario>(
    disasterPreset as Scenario
  );

  const [history, setHistory] = useState<Scenario[]>([disasterPreset as Scenario]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [error, setError] = useState('');
  useEffect(() => {
    try {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const encoded = hash.get('scenario');
      const initial = encoded ? JSON.parse(decodeURIComponent(escape(atob(encoded)))) : (useSimStore.getState().scenario ?? disasterPreset);
      validateScenario(initial);
      setCurrentScenario(initial); setHistory([initial]); setHistoryIndex(0); loadScenario(initial);
    } catch { setError('Invalid shared scenario. Please choose a preset.'); loadScenario(disasterPreset); }
  }, [loadScenario]);
  const updateScenario = (newScen: Scenario) => {
    try { validateScenario(newScen); } catch (e) { setError(e instanceof Error ? e.message : 'Invalid scenario.'); return; }
    setError('');
    const nextHist = history.slice(0, historyIndex + 1);
    nextHist.push(newScen);
    setHistory(nextHist);
    setHistoryIndex(nextHist.length - 1);
    setCurrentScenario(newScen);
    loadScenario(newScen);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setCurrentScenario(prev);
      loadScenario(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setCurrentScenario(next);
      loadScenario(next);
    }
  };

  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(currentScenario, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${currentScenario.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string) as Scenario;
          validateScenario(parsed);
          updateScenario(parsed);
          setError('');
        } catch {
          setError('Invalid scenario JSON. Check map bounds, waypoints, towers and battery.');
        }
      };
    }
  };

  const handleShareLink = async () => {
    const jsonStr = JSON.stringify(currentScenario);
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
    const shareUrl = `${window.location.origin}/builder#scenario=${encodeURIComponent(encoded)}`;
    try { await navigator.clipboard.writeText(shareUrl); setError('Scenario link copied.'); } catch { setError('Clipboard unavailable. Export JSON to share this scenario.'); }
  };

  const addWaypoint = () => {
    const newWp: Waypoint = {
      id: `wp_${crypto.randomUUID()}`,
      name: `Custom Waypoint ${currentScenario.waypoints.length + 1}`,
      position: { x: (currentScenario.world.geofence.xMin + currentScenario.world.geofence.xMax) / 2, y: (currentScenario.world.geofence.yMin + currentScenario.world.geofence.yMax) / 2 },
      value: 5,
      captured: false,
    };
    updateScenario({
      ...currentScenario,
      waypoints: [...currentScenario.waypoints, newWp],
    });
  };

  const removeWaypoint = (id: string) => {
    updateScenario({
      ...currentScenario,
      waypoints: currentScenario.waypoints.filter((w: Waypoint) => w.id !== id),
    });
  };

  const presets = [
    { name: 'Disaster Search', preset: disasterPreset as Scenario },
    { name: 'Urban Inspection', preset: urbanPreset as Scenario },
    { name: 'Wildfire Patrol', preset: wildfirePreset as Scenario },
    { name: 'Mountain Relief', preset: mountainPreset as Scenario },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {error && <p role="status" className="text-sm text-amber-200">{error}</p>}
      {/* Top Header Controls */}
      <header className="glass-panel-raised p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Wrench className="w-5 h-5 text-accent-cyan" />
          <h1 className="font-heading text-xl font-bold text-slate-100">
            Interactive Mission Scenario Builder
          </h1>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1 rounded-control border border-border-subtle text-xs">
          {presets.map((p) => (
            <button
              key={p.preset.id}
              onClick={() => updateScenario(p.preset)}
              className={`px-3 py-1.5 rounded-control font-semibold transition-all ${
                currentScenario.id === p.preset.id
                  ? 'bg-accent-cyan text-slate-950 font-bold shadow-glow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Undo Redo Export Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-control bg-slate-800 hover:bg-slate-700 text-slate-200 border border-border-subtle disabled:opacity-40"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-control bg-slate-800 hover:bg-slate-700 text-slate-200 border border-border-subtle disabled:opacity-40"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-slate-800 hover:bg-slate-700 text-slate-200 border border-border-subtle text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-slate-800 hover:bg-slate-700 text-slate-200 border border-border-subtle text-xs font-semibold cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>
          <button
            onClick={handleShareLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-accent-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glow transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Link</span>
          </button>
        </div>
      </header>

      {/* Main Studio Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Canvas Viewport */}
        <div className="lg:col-span-2 h-[600px]">
          <SimCanvas />
        </div>

        {/* Right: Waypoints and Towers Inspector */}
        <div className="flex flex-col gap-5">
          <Card
            header="Waypoints List Inspector"
            action={
              <button
                onClick={addWaypoint}
                className="flex items-center gap-1 text-xs bg-cyan-500/20 text-cyan-300 px-2.5 py-1 rounded-full border border-cyan-500/40 hover:bg-cyan-500/30 transition-all font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Waypoint</span>
              </button>
            }
          >
            <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto pr-1">
              {currentScenario.waypoints.map((wp: Waypoint) => (
                <div
                  key={wp.id}
                  className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-control border border-border-subtle text-xs"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-200">{wp.name}</span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Pos ({wp.position.x}m, {wp.position.y}m) | Value: {wp.value}v
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {wp.needsUplink && <Pill type="good" label="Needs Uplink" />}
                    <button
                      onClick={() => removeWaypoint(wp.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card header="Scenario Metadata & Story">
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Scenario Name:</span>
                <span className="text-slate-100 font-bold">{currentScenario.name}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Difficulty:</span>
                <span className="text-amber-400 font-bold">{currentScenario.difficulty}</span>
              </div>
              <p className="text-slate-300 leading-relaxed mt-2 bg-slate-950/70 p-3 rounded-control border border-border-subtle">
                {currentScenario.description}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
