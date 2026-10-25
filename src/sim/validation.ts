import { Scenario } from '../types/sim';
export function validateScenario(value: unknown): asserts value is Scenario {
 const s = value as Scenario;
 const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
 if (!s || typeof s.name !== 'string' || typeof s.id !== 'string' || typeof s.description !== 'string' || typeof s.difficulty !== 'string' || !finite(s.initialBatteryWh) || s.initialBatteryWh <= 0 || s.initialBatteryWh > 1000) throw new Error('Invalid scenario metadata or battery (0–1000 Wh).');
 const w = s.world;
 if (!w || !finite(w.mapSize?.width) || !finite(w.mapSize?.height) || w.mapSize.width < 100 || w.mapSize.height < 100 || w.mapSize.width > 5000 || w.mapSize.height > 5000) throw new Error('Map dimensions must be 100–5000 metres.');
 const pos = (p: {x:number;y:number}) => p && finite(p.x) && finite(p.y) && p.x >= 0 && p.y >= 0 && p.x <= w.mapSize.width && p.y <= w.mapSize.height;
 const bounds = (b: {xMin:number;xMax:number;yMin:number;yMax:number}) => b && [b.xMin,b.xMax,b.yMin,b.yMax].every(finite) && b.xMin >= 0 && b.yMin >= 0 && b.xMax <= w.mapSize.width && b.yMax <= w.mapSize.height && b.xMin < b.xMax && b.yMin < b.yMax;
 if (!pos(w.homePosition) || !bounds(w.geofence)) throw new Error('Invalid home or geofence.');
 const inside = (p: {x:number;y:number}) => pos(p) && p.x >= w.geofence.xMin && p.x <= w.geofence.xMax && p.y >= w.geofence.yMin && p.y <= w.geofence.yMax;
 if (!inside(w.homePosition)) throw new Error('Home must be inside the geofence.');
 if (!Array.isArray(s.waypoints) || s.waypoints.length > 100 || s.waypoints.some(p => !p || !inside(p.position) || !finite(p.value) || p.value <= 0 || typeof p.id !== 'string' || typeof p.name !== 'string' || typeof p.captured !== 'boolean' || (p.needsUplink !== undefined && typeof p.needsUplink !== 'boolean') || (p.deadlineSeconds !== undefined && (!finite(p.deadlineSeconds) || p.deadlineSeconds <= 0)))) throw new Error('Invalid waypoint list.');
 if (new Set(s.waypoints.map(p=>p.id)).size !== s.waypoints.length) throw new Error('Waypoint IDs must be unique.');
 if (!Array.isArray(w.towers) || w.towers.length > 30 || w.towers.some(t => !t || typeof t.id !== 'string' || !t.id || typeof t.name !== 'string' || !pos(t.position) || !finite(t.txPowerDbm) || !finite(t.height) || t.height < 0 || !finite(t.loadFactor) || t.loadFactor < 0 || t.loadFactor > 1 || typeof t.isOnline !== 'boolean')) throw new Error('Invalid tower list.');
 if (!Array.isArray(w.obstacles) || w.obstacles.length > 100 || w.obstacles.some(o => !o || typeof o.id !== 'string' || !o.id || typeof o.name !== 'string' || !bounds(o.bounds) || !finite(o.attenuationDb) || o.attenuationDb < 0)) throw new Error('Invalid RF obstacles.');
 if (!Array.isArray(w.jammers) || w.jammers.length > 30 || w.jammers.some(j => !j || typeof j.id !== 'string' || !j.id || !pos(j.position) || !finite(j.radius) || j.radius <= 0 || !finite(j.strengthDbm))) throw new Error('Invalid jammer list.');
 for (const entries of [w.towers,w.obstacles,w.jammers]) if (new Set(entries.map(e=>e.id)).size !== entries.length) throw new Error('Environment IDs must be unique within each list.');
}
