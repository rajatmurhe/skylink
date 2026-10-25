/** Decoupled small-angle roll axis model near hover. SI units internally. */
export interface ControlConfig { kp:number; kd:number; inertia:number; damping:number; targetDeg:number; disturbanceNm:number; torqueLimit:number; }
export interface ControlSample { time:number; angle:number; rate:number; target:number; torque:number; disturbance:number; }
export const DEFAULT_CONTROL: ControlConfig = { kp:.8,kd:.22,inertia:.025,damping:.015,targetDeg:15,disturbanceNm:.12,torqueLimit:.6 };
export function simulateRoll(c:ControlConfig):ControlSample[] {
 const dt=.005, result:ControlSample[]=[]; let angle=0,rate=0;
 const rad=Math.PI/180;
 for(let i=0;i<=2400;i++) {
  const time=i*dt,target=time>=1?c.targetDeg*rad:0;
  const disturbance=time>=6 && time<6.25?c.disturbanceNm:0;
  const torque=Math.max(-c.torqueLimit,Math.min(c.torqueLimit,c.kp*(target-angle)-c.kd*rate));
  if(i%4===0) result.push({time,angle:angle/rad,rate:rate/rad,target:target/rad,torque,disturbance});
  // RK4 integration of plant with zero-order-held control torque over 5 ms.
  const acc=(v:number)=>(torque+disturbance-c.damping*v)/c.inertia;
  const k1=acc(rate),k2=acc(rate+k1*dt/2),k3=acc(rate+k2*dt/2),k4=acc(rate+k3*dt);
  angle+=dt*(rate+2*(rate+k1*dt/2)+2*(rate+k2*dt/2)+(rate+k3*dt))/6;
  rate+=dt*(k1+2*k2+2*k3+k4)/6;
 }
 return result;
}
export function controlMetrics(c:ControlConfig, samples=simulateRoll(c)) {
 const wn=Math.sqrt(c.kp/c.inertia), zeta=(c.damping+c.kd)/(2*Math.sqrt(c.kp*c.inertia));
 const pre=samples.filter(s=>s.time>=1&&s.time<6), tolerance=Math.abs(c.targetDeg)*.02;
 const lastOutside=pre.findLastIndex(s=>Math.abs(s.angle-c.targetDeg)>tolerance);
 const settling=lastOutside===pre.length-1?null:pre[lastOutside+1]?.time-1;
 const magnitude=Math.abs(c.targetDeg);
 const overshoot=magnitude===0?0:Math.max(0,(Math.max(...pre.map(s=>s.angle*Math.sign(c.targetDeg)))-magnitude)/magnitude*100);
 const saturation=samples.filter(s=>Math.abs(s.torque)>=c.torqueLimit-1e-8).length/samples.length*100;
 return {wn,zeta,settling,overshoot,saturation,finalError:c.targetDeg-samples.at(-1)!.angle,regime:zeta<.999?'Underdamped':zeta>1.001?'Overdamped':'Critically damped'};
}
export function designMetrics(massKg:number,cellCount:number,capacityMah:number,motorThrustN:number,hoverPowerW:number,payloadPowerW:number) {
 const voltage=cellCount*3.7, energyWh=voltage*capacityMah/1000;
 return { voltage,energyWh,thrustRatio:4*motorThrustN/(massKg*9.81),hoverPerMotorN:massKg*9.81/4,estimatedMinutes:energyWh*.8/(hoverPowerW+payloadPowerW)*60,currentA:(hoverPowerW+payloadPowerW)/voltage };
}
