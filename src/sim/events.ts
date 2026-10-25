import { WorldState, Jammer } from '../types/sim';

export type StressEventType =
  | 'TOWER_FAILURE'
  | 'JAMMER_INJECTION'
  | 'STORM_CELL'
  | 'CONGESTION_SPIKE'
  | 'RANDOM_FLICKER';

export interface StressEvent {
  id: string;
  type: StressEventType;
  triggerTick: number;
  durationTicks?: number; // Optional duration for transient events
  targetId?: string;       // Tower ID if applicable
  position?: { x: number; y: number };
  intensity?: number;     // 0 to 1
  isActive: boolean;
}

export function applyStressEvents(
  world: WorldState,
  events: StressEvent[],
  currentTick: number
): WorldState {
  let updatedWorld = { ...world };

  events.forEach((event) => {
    if (!event.isActive && currentTick >= event.triggerTick) {
      if (event.durationTicks && currentTick > event.triggerTick + event.durationTicks) {
        // Event expired
        return;
      }

      switch (event.type) {
        case 'TOWER_FAILURE': {
          if (event.targetId) {
            updatedWorld.towers = updatedWorld.towers.map((t) =>
              t.id === event.targetId ? { ...t, isOnline: false } : t
            );
          }
          break;
        }
        case 'JAMMER_INJECTION': {
          if (event.position) {
            const newJammer: Jammer = {
              id: `jam_${event.id}`,
              position: event.position,
              radius: (event.intensity || 0.5) * 400 + 100,
              strengthDbm: -50,
            };
            updatedWorld.jammers = [...updatedWorld.jammers, newJammer];
          }
          break;
        }
        case 'CONGESTION_SPIKE': {
          if (event.targetId) {
            updatedWorld.towers = updatedWorld.towers.map((t) =>
              t.id === event.targetId ? { ...t, loadFactor: 0.95 } : t
            );
          }
          break;
        }
        default:
          break;
      }
    }
  });

  return updatedWorld;
}
