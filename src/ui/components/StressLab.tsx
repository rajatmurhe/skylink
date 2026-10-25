import { Card } from './Card';
import { useSimStore } from '../../store/simStore';
import { Radio, Flame, Activity, RotateCcw } from 'lucide-react';
export const StressLab = () => {
 const { engine, reset, stepTick } = useSimStore();
 const inject = (kind: string) => {
   engine.world = structuredClone(engine.world);
   if (kind === 'tower') {
     const tower = engine.world.towers.find(t => t.id === engine.servingTowerId) ?? engine.world.towers.find(t => t.isOnline);
     if (tower) tower.isOnline = false;
   }
   if (kind === 'jammer') engine.world.jammers.push({ id: `injected-${engine.tick}-${engine.world.jammers.length}`, position: { ...engine.uav.position }, radius: 250, strengthDbm: -45 });
   if (kind === 'load') engine.world.towers.forEach(t => { t.loadFactor = .95; });
   stepTick();
 };
 return <Card header="Fault injection"><p className="text-xs text-slate-400 mb-4">Apply a disruption and advance one tick. Congestion affects throughput; interference affects signal quality.</p><div className="grid grid-cols-2 gap-2">{[['tower',Radio,'Fail serving tower'],['jammer',Flame,'Jam current position'],['load',Activity,'Increase load']].map(([id,Icon,label])=>{const I=Icon as typeof Radio;return <button className="text-xs p-3 rounded-control border border-border-subtle text-amber-200 bg-slate-900 flex gap-2 items-center" key={String(id)} onClick={()=>inject(String(id))}><I size={14}/>{String(label)}</button>})}<button className="text-xs p-3 rounded-control border border-border-subtle flex gap-2 items-center" onClick={()=>reset()}><RotateCcw size={14}/>Reset scenario</button></div></Card>;
};
