import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSimStore } from '../../store/simStore';
import { generateScenario, themes, MapTheme, MapDifficulty } from '../../sim/generator';

export function ScenarioGenerator() {
  const scenario = useSimStore(s=>s.scenario);
  const load = useSimStore(s=>s.loadScenario);
  const generated = scenario?.id.match(/^generated-v1-(urban|mountain|wildfire|rescue)-(easy|moderate|difficult)-(\d+)$/);
  const [theme,setTheme] = useState<MapTheme>((generated?.[1] as MapTheme) ?? 'urban');
  const [difficulty,setDifficulty] = useState<MapDifficulty>((generated?.[2] as MapDifficulty) ?? 'moderate');
  const [seed,setSeed] = useState(generated?.[3] ?? '42');
  const [error,setError] = useState('');
  const generate = (value:string) => {
    try { if (!value.trim()) throw new Error('Enter a map seed.'); load(generateScenario(Number(value),theme,difficulty)); setSeed(value); setError(''); }
    catch(e) { setError((e as Error).message); }
  };
  return <section className="map-generator glass-panel-raised" aria-label="Environment generator">
    <div><span className="eyebrow">ENVIRONMENT LAB / PROCEDURAL MAPS</span><h2>{scenario?.name ?? 'Default training environment'}</h2><p>New terrain layout. New relay positions. A repeatable autonomy experiment.</p></div>
    <div className="map-generator-controls">
      <label>Mission theme<select value={theme} onChange={e=>setTheme(e.target.value as MapTheme)}>{Object.entries(themes).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>Difficulty<select value={difficulty} onChange={e=>setDifficulty(e.target.value as MapDifficulty)}>{['easy','moderate','difficult'].map(d=><option key={d}>{d}</option>)}</select></label>
      <label>Map seed<input type="number" min="0" max="4294967295" step="1" value={seed} onChange={e=>setSeed(e.target.value)} /></label>
      <button className="map-primary" onClick={()=>generate(String(crypto.getRandomValues(new Uint32Array(1))[0]))}>Generate new map ↗</button>
      <button onClick={()=>generate(seed)}>Recreate seed</button>
    </div>
    {error && <p role="alert" className="text-rose-400">{error}</p>}
    <div className="map-generator-footer"><span>{scenario ? `${scenario.world.mapSize.width} × ${scenario.world.mapSize.height} m · ${scenario.world.towers.length} relays · ${scenario.waypoints.length} objectives · ${scenario.difficulty}` : 'Choose a theme, then generate an environment.'}</span><Link to="/compare">Compare on this map →</Link></div>
    <p className="map-disclaimer">Synthetic simulation, not satellite imagery. Difficulty changes RF obstacles, relay density and interference. Validated bounds and clear objective positions do not guarantee mission completion or collision avoidance. Map seed controls geometry; radio seed below controls signal variation.</p>
  </section>;
}
