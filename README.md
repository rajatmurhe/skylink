# SkyLink — Autonomous Mission Intelligence

A browser-based research prototype exploring how a drone can change its route when radio connectivity degrades. Created by Rishika Deshmukh and Rajat Murhe.

## Run locally

Use Node.js 20.19+ (or 22.12+).

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. No accounts, API keys, external map tiles or backend are required.

```sh
npm test
npm run build
npm run test:workers
npm run preview
```

The production output is `dist/`. A static host must rewrite unknown routes to `index.html` because the app uses browser routing.

## Submission walkthrough

1. **Overview:** explain the problem — a direct flight route may cross poor radio coverage. The illustration is explicitly schematic, not a recorded result.
2. **Mission control:** review the four-item educational preflight briefing, then start a seeded simulation. Observe RF quality, the five-second trend projection, action scores, battery reserve and waypoint capture. Switch between baseline and SkyLink; switching starts a fresh run. Use 8× playback to accelerate the demonstration.
3. **Fault injection:** fail the serving tower or inject a jammer at the current drone position. Observe the resulting link and decision changes. Congestion reduces throughput; it does not change RF power.
4. **Compare:** run both policies with the same default environment and seed. Run to end is bounded to 600 simulated seconds. Different policies actually execute different trajectories.
5. **Benchmark:** explicitly run paired experiments on the Disaster Search preset. Results are computed by a web worker, not prefilled. Export the per-run CSV. Discuss partial missions and failures as well as successes; no improvement is guaranteed.
6. **Scenarios:** choose one of four presets, add/remove objectives, undo/redo, and import/export validated JSON. Shared links encode scenario data in their URL fragment.
7. **AI lab:** run a separate experimental tabular Q-learning trainer and export the resulting table. Its actions affect the simulator, but the trained table is not deployed in Mission Control or included in the benchmark.
8. **Methods:** explain the models and their limits. See `docs/METHODS.md` for the detailed implementation assumptions.

## What is implemented

- Seeded 2D shadow field, RF attenuation, jammer interference and serving-station handover hysteresis.
- 0.1-second fixed time step, acceleration/turn constraints, speed-dependent energy use.
- EMA link monitoring, a linear five-second extrapolation and heuristic utility scoring with action dwell time.
- Communication-aware grid A* planning for SkyLink; direct waypoint legs and a five-second poor-link abort for the baseline.
- Return-to-home commands that affect flight, latch until landing and halt at home; zero-energy termination.
- Waypoint value, uplink requirements and optional deadlines.
- Browser workers for measured evaluation and experimental learning, plus exportable results.
- Historical telemetry inspection. “Resume live” continues the live engine; it does not branch a simulation from a historical state.

## Research limits

This is **software simulation only**, not a flight controller or evidence of operational drone safety. There are no physical flights, sensors, video streams or payload deliveries. RF and battery models are simplified and uncalibrated. Altitude, wind, real collision geometry, multipath, networking protocols and hardware interfaces are not simulated. Obstacle rectangles represent RF attenuation regions, and the planner applies a soft cost for crossing them. Geofence clamping is a simulation boundary rule, not a validated control law.

The five-second projection is an estimate, not a guaranteed forecast. Utility scores are heuristic rather than learned transition-model predictions. The battery return reserve uses straight-line distance and does not certify sufficient energy for a detour. Benchmark confidence intervals describe only variability over synthetic shadow-field seeds in one scenario; they do not establish field reliability. Q-learning is a finite, experimental sandbox and is not claimed to converge or outperform the utility policy.


## Course-focused engineering extension (BCSE428L)

- `/flight-lab`: near-hover, single-axis roll dynamics with PD feedback, actuator saturation and a reproducible disturbance pulse. Tune gains and inertia; inspect measured response, 2% settling time, overshoot and linear damping ratio; export CSV.
- `/airframe`: component signal chain and conceptual quadcopter sizing. Explore mass/thrust, battery energy and constant-power endurance; assumptions are explicitly editable and not a component recommendation.
- `/submission`: eight-minute demonstration agenda, supplied syllabus mapping, viva explanations, official sources and limits.
- `public/matlab/skylink_roll_reference.m`: standalone MATLAB reproduction of the roll experiment, including CSV output and a Simulink block-layout description. It has not been executed in MATLAB here. The browser is not running Simulink.

These are separate model layers: the roll lab does not drive Mission Control's 2D kinematics. The course mapping explicitly identifies topics that remain outside implementation scope.


## Validation coverage

`npm test` covers simulation units, controller metrics, all public page mounts (jsdom), preflight state, scenario builder undo/redo, and a four-scenario × two-strategy × three-seed full-run regression matrix. Canvas drawing is not visually verified by these tests; jsdom substitutes geometry and canvas access. Replay retains environment snapshots so subsequent tower failures do not rewrite historical coverage.

After building, `npm run test:workers` executes the actual production worker bundles in a Node worker adapter: 20 benchmark runs, an identical-seed repeatability check, and 100 training episodes with policy dimension/finite-value checks. This verifies worker computation, not browser Worker API integration or chart appearance. Local browser access was disabled during verification, so manual browser visual checks remain outstanding.

### Procedural maps for presentations
In Mission Control, choose a mission theme and difficulty, then select **Generate new map**. **Recreate seed** reconstructs the same geometry for the same theme and difficulty (generator v1). Radio seed separately controls RF variation. Generating an environment pauses the run and resets the preflight briefing. **Compare on this map** runs both strategies on independent copies of the selected environment with matching initial battery, objectives and radio seed.

These are synthetic local-coordinate RF experiments, not Google Maps, live imagery, terrain elevations or weather. Themes vary obstacle layout and mission labels; wildfire does not model fire propagation. Difficulty changes relay density, attenuation, objective count and interference. Bounds and objective clearance are checked, but route feasibility, collision avoidance and mission completion are not guaranteed. Keep the theme, difficulty, map seed and radio seed together when reporting results. Benchmark still uses its explicitly labelled fixed disaster scenario.
