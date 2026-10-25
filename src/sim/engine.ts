import { DecisionStateMachine } from '../decision/state_machine';
import { BaselineDecisionEngine } from '../decision/baseline';
import { planPathAStar } from './planner';
import { ActionType, Position2D } from '../types/sim';
import { SeededRNG, createRNG } from './rng';
import { WorldState, UAVState, Waypoint, TickRecord, CommState, RiskAssessment, DecisionRecord } from '../types/sim';
import { createDefaultWorld, create2DNoise } from './world';
import { createInitialUAVState, updateUAVKinematics, calculateReturnReserveWh } from './uav';
import { createSampleWaypoints, evaluateWaypointCapture } from './mission';
import { computeCommState } from './comm_model';
import { CommMonitor } from './monitor';
import { SimRecorder } from './recorder';

export interface SimEngineOptions {
  strategy?: 'baseline' | 'skylink_utility';
  seed?: number;
  world?: WorldState;
  waypoints?: Waypoint[];
  initialBatteryWh?: number;
}

export class SimEngine {
  public strategy: 'baseline' | 'skylink_utility';
  public finished = false;
  private returning = false;
  private progressTarget = '';
  private bestTargetDistance = Infinity;
  private lastProgressTick = 0;
  private returnReason = '';
  private deferredObjectives = new Set<string>();
  private stateMachine = new DecisionStateMachine();
  private baseline = new BaselineDecisionEngine();
  private route: Position2D[] = [];
  private routeKey = '';
  private recordedWorldKey = '';
  private recordedWorld?: WorldState;
  public seed: number;
  public rng: SeededRNG;
  public shadowNoiseMap: (x: number, y: number) => number;
  public world: WorldState;
  public uav: UAVState;
  public waypoints: Waypoint[];
  public tick: number;
  public commMonitor: CommMonitor;
  public servingTowerId: string | null = null;
  public recorder: SimRecorder;
  public dtSeconds = 0.1;

  constructor(options: SimEngineOptions = {}) {
    this.strategy = options.strategy ?? 'skylink_utility';
    this.seed = options.seed ?? 42;
    this.rng = createRNG(this.seed);
    this.shadowNoiseMap = create2DNoise(createRNG(this.seed + 100));
    this.world = structuredClone(options.world ?? createDefaultWorld());
    this.uav = createInitialUAVState(
      this.world.homePosition,
      options.initialBatteryWh ?? 100
    );
    this.waypoints = structuredClone(options.waypoints ?? createSampleWaypoints());
    this.tick = 0;
    this.commMonitor = new CommMonitor();
    this.recorder = new SimRecorder();
  }

  public get plannedPath(): Position2D[] { return this.route; }

  public get currentTargetWaypoint(): Waypoint | undefined {
    return this.waypoints.find((wp) => !wp.captured && !this.deferredObjectives.has(wp.id) && (wp.deadlineSeconds === undefined || this.tick * this.dtSeconds <= wp.deadlineSeconds));
  }

  public step(forcedAction?: ActionType): TickRecord {
    if (this.finished && this.recorder.getRecords().length) return this.recorder.getRecords().at(-1)!;
    this.tick++;

    // Compute RF physics communication state
    const rawCommResult = computeCommState(
      this.uav.position,
      this.world,
      this.servingTowerId,
      this.shadowNoiseMap
    );
    this.servingTowerId = rawCommResult.servingTowerId;

    // Run degradation monitor and 5s early warning predictor
    const monitorResult = this.commMonitor.update(rawCommResult.comm.linkQuality);

    const comm: CommState = {
      ...rawCommResult.comm,
      linkQualityEma: monitorResult.emaQ,
      predictedLinkQuality: monitorResult.predictedQ,
      linkState: monitorResult.linkState,
      heartbeatMissedTicks: monitorResult.heartbeatMissedTicks,
    };

    const selected: { action: ActionType; explanation: string; actionScores?: Record<ActionType, number>; dwellTicksRemaining?: number } = this.strategy === 'baseline'
      ? this.baseline.decide(comm, this.uav, this.waypoints)
      : this.stateMachine.stepDecision(comm, this.uav, this.waypoints, this.world);
    let action = forcedAction ?? selected.action;
    if (this.uav.batteryWh <= this.uav.returnReserveWh + 0.05 || !this.currentTargetWaypoint) action = 'SAFE_RETURN';
    // Bounded mission recovery: repeated recovery/hold cycles must not run forever.
    let progressExplanation = '';
    const objective = this.currentTargetWaypoint;
    if (objective && !this.returning) {
      const distance = Math.hypot(objective.position.x-this.uav.position.x, objective.position.y-this.uav.position.y);
      if (this.progressTarget !== objective.id) {
        this.progressTarget = objective.id; this.bestTargetDistance = distance; this.lastProgressTick = this.tick;
      } else if (distance < this.bestTargetDistance - 5) {
        this.bestTargetDistance = distance; this.lastProgressTick = this.tick;
      }
      if (this.strategy === 'skylink_utility' && this.tick-this.lastProgressTick >= 450) {
        this.deferredObjectives.add(objective.id);
        objective.deferredReason = 'No progress for 45 seconds';
        this.routeKey = '';
        progressExplanation = `No progress toward ${objective.name} for 45 seconds. Deferring this objective without awarding value.`;
        action = this.currentTargetWaypoint ? 'REPLAN' : 'SAFE_RETURN';
        if (action === 'SAFE_RETURN') this.returnReason = 'Remaining objectives exhausted or deferred after bounded recovery. Returning with a partial mission.';
      }
    }
    if (action === 'SAFE_RETURN') this.returning = true;
    if (this.returning) action = 'SAFE_RETURN';
    const decision: DecisionRecord = {
      tick: this.tick, action,
      actionScores: selected.actionScores ?? {
        CONTINUE: 0, REPLAN: 0, RECOVER_CONNECTIVITY: 0, HOLD: 0, RESUME: 0, SAFE_RETURN: 0,
      },
      explanation: this.returning ? (this.returnReason || 'Returning home. Mission complete or safety abort is latched until landing.') : progressExplanation ? progressExplanation : forcedAction ? `Experimental policy selected ${action}; simulator safety overrides remain active.` : selected.explanation,
      dwellTicksRemaining: selected.dwellTicksRemaining ?? 0,
    };
    let target = this.currentTargetWaypoint?.position ?? this.world.homePosition;
    if (action === 'SAFE_RETURN') target = this.world.homePosition;
    if (action === 'RECOVER_CONNECTIVITY') {
      const towers = this.world.towers.filter(t => t.isOnline).sort((a,b) =>
        Math.hypot(a.position.x-this.uav.position.x,a.position.y-this.uav.position.y) -
        Math.hypot(b.position.x-this.uav.position.x,b.position.y-this.uav.position.y));
      target = towers[0]?.position ?? this.world.homePosition;
    }
    if (action === 'HOLD') target = this.uav.position;
    const key = `${target.x},${target.y},${this.strategy},${action === 'REPLAN'},${JSON.stringify(this.world)}`;
    if (this.strategy !== 'baseline' && action !== 'HOLD') {
      if (key !== this.routeKey) {
        this.route = planPathAStar(this.uav.position, target, this.world, true).slice(1);
        this.route.push(target);
        this.routeKey = key;
      }
      while (this.route.length > 1 && Math.hypot(this.route[0].x-this.uav.position.x,this.route[0].y-this.uav.position.y) < 18) this.route.shift();
      target = this.route[0] ?? target;
    }
    this.uav = updateUAVKinematics(this.uav, target, this.world.homePosition, this.dtSeconds);
    const f = this.world.geofence;
    const p = this.uav.position;
    this.uav.isGeofenced = p.x < f.xMin || p.x > f.xMax || p.y < f.yMin || p.y > f.yMax;
    this.uav.position = { x: Math.max(f.xMin, Math.min(f.xMax,p.x)), y: Math.max(f.yMin,Math.min(f.yMax,p.y)) };
    // Clamping changes the physical position; keep derived telemetry consistent.
    this.uav.returnReserveWh = calculateReturnReserveWh(this.uav.position, this.world.homePosition);
    this.uav.isHome = Math.hypot(this.uav.position.x-this.world.homePosition.x, this.uav.position.y-this.world.homePosition.y) < 15;
    // Capture uses RF quality at the arrival position, not the previous location.
    const arrivalQ = computeCommState(this.uav.position, this.world, this.servingTowerId, this.shadowNoiseMap).comm.linkQuality;
    if (!this.returning) this.waypoints = evaluateWaypointCapture(this.waypoints, this.uav.position, arrivalQ, this.tick).waypoints;
    if (this.uav.batteryWh <= 0 || (this.returning && this.uav.isHome)) {
      this.finished = true;
      this.uav.speed = 0;
      this.uav.velocity = { x: 0, y: 0 };
    }

    const totalVal = this.waypoints.reduce((acc, wp) => acc + wp.value, 0);
    const remVal = this.waypoints.filter((w) => !w.captured).reduce((acc, wp) => acc + wp.value, 0);

    const riskScore = Math.max(
      0,
      Math.min(
        1,
        (1 - comm.predictedLinkQuality) * 0.4 +
          (1 - this.uav.batteryWh / this.uav.maxBatteryWh) * 0.3 +
          (remVal / (totalVal || 1)) * 0.3
      )
    );

    const risk: RiskAssessment = {
      riskScore: parseFloat(riskScore.toFixed(3)),
      predictedOutageSeconds: monitorResult.predictedQ < 0.2 ? 5.0 : 0.0,
      missionCriticality: parseFloat((totalVal > 0 ? remVal / totalVal : 0).toFixed(2)),
      batteryMarginWh: parseFloat((this.uav.batteryWh - this.uav.returnReserveWh).toFixed(2)),
      distanceToHomeM: parseFloat(
        Math.sqrt(
          Math.pow(this.uav.position.x - this.world.homePosition.x, 2) +
            Math.pow(this.uav.position.y - this.world.homePosition.y, 2)
        ).toFixed(1)
      ),
    };

    const worldKey = JSON.stringify(this.world);
    if (worldKey !== this.recordedWorldKey) {
      this.recordedWorld = structuredClone(this.world);
      this.recordedWorldKey = worldKey;
    }
    const record: TickRecord = {
      world: this.recordedWorld,
      tick: this.tick,
      timeSeconds: parseFloat((this.tick * this.dtSeconds).toFixed(1)),
      uav: structuredClone(this.uav),
      waypoints: structuredClone(this.waypoints),
      comm,
      risk,
      decision,
    };

    this.recorder.recordTick(record);
    return record;
  }

  public runHeadless(ticks: number): TickRecord[] {
    const results: TickRecord[] = [];
    for (let i = 0; i < ticks && !this.finished; i++) {
      results.push(this.step());
    }
    return results;
  }
}
