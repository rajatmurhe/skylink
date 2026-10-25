import {describe,it,expect} from 'vitest';
import {simulateRoll,controlMetrics,DEFAULT_CONTROL,designMetrics} from '../../src/sim/control';
describe('Flight engineering model',()=>{
 it('balanced roll settles near its command and recovers after the pulse',()=>{const s=simulateRoll(DEFAULT_CONTROL);const m=controlMetrics(DEFAULT_CONTROL,s);expect(Math.abs(m.finalError)).toBeLessThan(.01);expect(m.settling).not.toBeNull();expect(m.settling!).toBeLessThan(3);expect(s.every(r=>Math.abs(r.torque)<=.6)).toBe(true);});
 it('removing rate feedback increases overshoot',()=>{expect(controlMetrics({...DEFAULT_CONTROL,kd:.015}).overshoot).toBeGreaterThan(controlMetrics(DEFAULT_CONTROL).overshoot+20);});
 it('zero command and zero disturbance preserve equilibrium',()=>{expect(simulateRoll({...DEFAULT_CONTROL,targetDeg:0,disturbanceNm:0}).every(s=>s.angle===0&&s.rate===0)).toBe(true);});
 it('payload power decreases constant-power endurance without changing energy',()=>{const a=designMetrics(1.4,4,5000,7,220,0),b=designMetrics(1.4,4,5000,7,220,40);expect(a.energyWh).toBe(74);expect(b.estimatedMinutes).toBeLessThan(a.estimatedMinutes);expect(b.energyWh).toBe(a.energyWh);});
 it('doubling mass halves thrust-to-weight for the same propulsion assumptions',()=>{const a=designMetrics(1,4,5000,7,220,0),b=designMetrics(2,4,5000,7,220,0);expect(b.thrustRatio).toBeCloseTo(a.thrustRatio/2);});
});
