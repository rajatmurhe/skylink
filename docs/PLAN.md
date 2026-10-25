# SkyLink Mission Control: Build Plan for Antigravity

Project: SkyLink, Communication Aware Autonomous Mission Recovery System
Subject: Autonomous Drones (DA1)
Team: Rishika Deshmukh, Rajat Murhe
Approach: 100% software. A browser based UAV mission simulator, decision engine and analytics platform. No hardware, no flight controller, no ROS.

## 1. How to use this document with Antigravity

1. Create an empty workspace folder called skylink and save this file inside it as docs/PLAN.md.
2. Open Antigravity in Planning mode. Paste the Master Prompt from Section 2 first. Ask the agent to produce an implementation plan and task list artifact, and review it before it writes code.
3. Build one phase at a time from Section 11. Each phase has a goal, tasks and acceptance checks. After each phase, ask the browser agent to open the dev server, walk through the acceptance checks and attach screenshots as a walkthrough artifact.
4. Commit to git after every phase so you can roll back.
5. If your Antigravity version supports workspace rules, put Section 2 there. Otherwise paste it at the top of each new conversation.
6. Never let the agent skip the acceptance checks. If a check fails, tell it to fix before moving on.

## 2. Master Prompt (paste this first)

You are building SkyLink Mission Control, a fully software, browser based simulator and decision platform for a university project on autonomous drones. Read docs/PLAN.md completely and treat it as the source of truth.

What SkyLink is: a communication aware autonomous mission management framework. A simulated UAV flies a multi waypoint mission across a map where radio link quality changes because of distance, obstacles, interference, congestion and tower failures. SkyLink continuously senses telemetry, assesses link and mission risk, decides among six actions (Continue, Replan, Recover connectivity, Hold or alternate route, Resume, Safe return), executes adaptive recovery, and resumes the mission when feasible. It is compared against a baseline that follows a static route and returns home when the link is lost.

Hard rules:
* No hardware, no backend required. Everything runs in the browser. Deployable as a static site.
* TypeScript everywhere, strict mode. The simulation core must be pure, deterministic (seeded random numbers) and runnable headless in a Web Worker and in tests.
* The UI must be stunning, polished and very easy for a first time user: guided tour, tooltips, plain English explanations, presets, and a one click Cinematic Demo.
* Never claim real world flight results. Everything is simulation. Label it clearly in the UI footer and in the README.
* Do not use hyphens or dashes in any user facing copy, labels, headings or documentation text. Use commas, colons or the word "to" instead.
* Work phase by phase. After each phase, run tests, start the dev server, verify with the browser, and summarise what changed.

Start by proposing the implementation plan and folder structure. Wait for my approval.

## 3. Product vision

In the first 60 seconds a first time user should be able to:
1. Land on a cinematic home page that explains the problem in one sentence: "A weak signal should not mean a failed mission."
2. Click Launch Demo and watch a drone fly a rescue mission while the signal collapses, with SkyLink visibly detecting it early, explaining its decision in plain English, recovering and finishing the mission.
3. Flip to Compare mode and see the baseline drone give up and return home while SkyLink completes more of the mission on the same map and the same random seed.
4. Open Benchmark and see charts proving the difference over 100 or more runs.

The product is both a demo for the viva and a real experimentation tool: users can build scenarios, break the network with a Stress Lab, tune the decision weights, and train the RL agent live.

## 4. Slide to feature traceability

Use this table of mappings to show your examiner that every slide idea is implemented.

* Slide 2, Problem statement (distance, terrain, interference, congestion, coverage gaps, temporary failure): each cause is a simulated, toggleable effect in the Stress Lab.
* Slide 3, Research gap (path and comms treated separately, static routes, recovery sacrifices progress): the Baseline strategy reproduces exactly this behaviour so the gap is visible side by side.
* Slide 4, Sense, Assess, Decide, Recover, Resume: a live loop ribbon in the UI that highlights the active stage every tick.
* Slide 5, Novelty: communication as a mission variable (link quality inside waypoint rewards and planner cost), mission aware recovery (remaining value drives decisions), continue replan recover resume loop, multi objective decisions (weights), degradation aware response (predictive early warning before outage).
* Slide 6, Architecture: an interactive architecture diagram on the Learn page, wired to the real modules.
* Slide 7, RL framework: State, Action and Reward are implemented exactly as listed, with a tabular Q learning agent trained in the browser.
* Slide 8, Objectives and roadmap: monitoring, detection, risk assessment, adaptive decisions, replanning, progress preservation and baseline comparison each map to a module and a screen.
* Slide 9, Future scope: shown on the Learn page as a roadmap (ROS and PX4 integration, field measurements, multi UAV, edge AI).

## 5. Tech stack

Frontend and app
* Vite, React 18 and TypeScript (strict).
* Tailwind CSS with CSS variables for design tokens, plus Radix UI primitives (via shadcn/ui) for accessible dialogs, tabs, tooltips, sliders and popovers.
* Framer Motion for page transitions, spring animations and number tickers.
* Zustand for app state. React Router for pages.
* Canvas 2D for the simulation map (fast, full control, 60 fps). Optional 3D view with React Three Fiber as a stretch goal.
* Recharts or visx for charts. Lucide icons.

Simulation and AI
* Pure TypeScript simulation core in src/sim. Seeded random numbers (seedrandom or a small custom PRNG such as mulberry32).
* Web Workers for headless batch runs and RL training so the UI never freezes. Comlink to talk to workers.
* Tabular Q learning implemented in TypeScript. Optional Python notebook (Gymnasium and Stable Baselines3) as a stretch to show a PPO comparison, with exported results imported as JSON.

Quality and delivery
* Vitest for unit tests, Playwright for end to end tests, ESLint and Prettier.
* GitHub Actions for tests, and deploy to Vercel or GitHub Pages (static).
* jsPDF or the browser print stylesheet for report export. Papaparse style CSV export.

Why this stack: no backend means zero deployment risk during the viva, instant load, and one language for everything.

## 6. Architecture and folder structure

Data flow (closed loop, one tick per step):

Sensors and World → Monitor → Assess → Decide → Plan → Execute → World, repeating. Every block publishes its outputs to a shared TickRecord that the UI reads.

Folder structure:

* src/sim/
  * rng.ts : seeded random numbers
  * world.ts : map size, towers, obstacles, jammers, terrain noise, home, geofence
  * uav.ts : kinematics, battery model
  * comm_model.ts : RSSI, SINR, link quality, packet loss, latency, handover
  * monitor.ts : smoothing, trend, prediction, link state classification
  * mission.ts : waypoints, values, deadlines, progress, criticality
  * planner.ts : grid based A star with communication aware cost, plus the baseline shortest path
  * events.ts : scheduled and user injected events (tower failure, jammer, storm, congestion)
  * engine.ts : the tick loop that wires everything together
  * recorder.ts : snapshots every tick for replay and charts
* src/decision/
  * baseline.ts : static route, hover then return home on link loss
  * utility.ts : explainable multi objective utility engine
  * rl_env.ts : state discretisation, reward, episode wrapper
  * qlearning.ts : the agent
  * state_machine.ts : Continue, Replan, Recover, Hold, Resume, Safe return transitions with hysteresis
  * explain.ts : turns a decision into plain English
* src/workers/ : batch.worker.ts, train.worker.ts
* src/ui/ : components, canvas renderer, charts, tour
* src/pages/ : Home, MissionControl, Compare, Builder, Benchmark, AILab, Learn
* src/scenarios/ : preset JSON files
* tests/ : unit and end to end tests
* docs/ : PLAN.md, METHODS.md, README assets

Rule: nothing in src/sim or src/decision may import React or touch the DOM.

## 7. Simulation specification

### 7.1 World
* 2D map, 2000 m by 2000 m, metres as the unit. Home or launch point, geofence boundary.
* Towers (ground stations) with position, transmit power, height, load and an online flag.
* Obstacles: rectangles and polygons (buildings, hills) that add attenuation for any link path that crosses them.
* Jammer or interference zones: circles with strength and falloff.
* Coverage gap zones are simply areas far from every tower or shadowed by obstacles. Smooth seeded value noise adds shadow fading so the heatmap looks organic.

### 7.2 UAV model
* Point mass kinematics with max speed 15 m/s, max acceleration, turn rate limit. Simulation tick of 0.1 s, decision interval of 1 s.
* Battery in Wh. Power draw = hover power plus a term that grows with speed squared. Return reserve = estimated energy to fly home along the best path times a safety factor of 1.25.

### 7.3 Communication model
For each online tower i, received power is:

RSSI_i = Ptx_i minus PL0 minus 10 times n times log10(d_i divided by d0) minus obstacle_loss_i minus shadow_i

where n is the path loss exponent (about 2.2 in open terrain, 2.8 to 3.5 in urban areas), d_i is distance, and shadow_i is smooth seeded noise.

* Serving tower: the strongest tower, with a handover hysteresis of 3 dB so it does not flip back and forth.
* Interference: each jammer adds to the noise floor with a distance falloff. SINR = RSSI of serving tower minus (thermal noise plus summed interference). Thermal noise floor is around minus 95 dBm.
* Congestion: each tower has a load factor that reduces throughput and raises latency.
* Link quality Q in the range 0 to 1: Q = clamp((SINR minus 5 dB) divided by (25 dB minus 5 dB)).
* Packet loss = logistic function of Q centred near 0.35. Latency = base latency plus a term growing with (1 minus Q) squared. Throughput scales with Q and tower load.
* Telemetry loss: if Q is in outage, command and telemetry messages are dropped with the packet loss probability, so the baseline really does "miss mission updates".

### 7.4 Degradation detection (Monitor and Assess)
* Smooth Q with an exponential moving average (alpha 0.3). Estimate slope over a 2 second window. Predict Q five seconds ahead: Q_pred = Q_ema plus slope times 5. Also look ahead along the planned path using the coverage map to predict Q at upcoming positions (this is the proactive part from slide 5).
* Link states: GOOD (Q at least 0.7), DEGRADING (0.45 to 0.7, or predicted below 0.45), POOR (0.2 to 0.45), OUTAGE (below 0.2, or heartbeat missed for 3 ticks).
* Risk score 0 to 1 combines: predicted link quality, time to predicted outage, remaining mission value, battery margin over return reserve, distance to home, obstacle proximity.
* Mission criticality = remaining waypoint value divided by total value, boosted by deadline pressure.

### 7.5 Mission model
* A mission is an ordered list (or optionally a reorderable set) of waypoints. Each has a value from 1 to 10, an optional deadline, and an optional "needs uplink" flag. Needs uplink means the waypoint only counts as completed if Q is at least 0.5 at arrival, for example "stream live video of survivor". This is how link quality becomes a true mission variable.
* Mission progress = captured value divided by total value.

### 7.6 Stress events
Scheduled or user triggered: tower failure, new jammer, storm cell (moving interference circle), congestion spike, random flicker (short transient outage). All events are seeded so a run can be reproduced exactly.

### 7.7 Determinism
Same scenario plus same seed plus same strategy must produce identical results. This is what makes fair side by side comparison and benchmarks possible. Add a test for it.

## 8. Decision engine specification

### 8.1 Baseline (represents the research gap on slide 3)
* Plans the shortest path through all waypoints once and never changes it.
* If Q drops into POOR or OUTAGE for more than 5 seconds, it aborts and flies home on the shortest path, even if that path crosses the dead zone.
* Ignores mission value and link prediction.

### 8.2 SkyLink utility engine (explainable, the main strategy)
At each decision interval, estimate the outcome of each of the six actions over a short horizon and score:

Utility(action) = w_comm times expected link quality gain, plus w_mission times expected mission progress gain, minus w_energy times energy cost, minus w_dev times path deviation, minus w_delay times delay, minus w_risk times safety risk.

* Weight presets in the UI: Mission First, Balanced, Safety First. Advanced users get sliders.
* Hard safety constraints always override the score: battery below return reserve forces Safe return, geofence and obstacle proximity block unsafe moves.
* Hysteresis and minimum dwell time on each action stop flip flopping.

The six actions in detail:
* Continue: keep following the current plan.
* Replan: run A star from the current position through remaining waypoints with cost per cell = distance plus lambda times (1 minus predicted Q at that cell) plus obstacle penalty. This steers around dead zones when possible.
* Recover connectivity: sample candidate points within a radius, pick the one with the best predicted Q minus travel cost, fly there, then re assess.
* Hold or alternate route: loiter up to a time limit to ride out a transient failure, or skip to the next waypoint that is reachable with good link and return to the skipped one later.
* Resume: after Q has stayed above the resume threshold for a set number of seconds, rejoin the mission plan from the last completed waypoint.
* Safe return: fly home via the best coverage path when energy or risk requires it.

### 8.3 RL agent (slide 7)
* State S_t = UAV state, communication state, mission state, environment state, discretised into buckets: link quality (5), link trend (3), battery margin (4), mission remaining (4), distance to home (3), recovery phase flag (2). About 1440 states.
* Actions A_t = the six actions above.
* Reward per decision step: plus mission value captured, plus a small term for link quality, minus energy used, minus path deviation, minus delay, minus a large penalty for outage time, minus a very large penalty for battery depletion or leaving the geofence, plus a completion bonus.
* Algorithm: tabular Q learning with epsilon greedy exploration (decaying), learning rate decay, trained over randomised procedurally generated scenarios in a Web Worker. Hold out test seeds that are never used in training to avoid overfitting.
* Ship a pretrained policy JSON so the app works instantly. Let users retrain and watch the reward curve live.
* Safety shield: the hard constraints from 8.2 still apply on top of the learned policy.
* Be honest in the report: this is a simulation study. The tabular agent is a proof of concept for the proposed RL framework, and deeper algorithms (DQN, PPO) are listed as future work or the optional Python stretch.

### 8.4 Explanations
Every decision produces a short plain English sentence plus the numbers behind it, for example: "Link is predicted to drop below 45 percent in 4 seconds. Moving 80 metres north puts the drone in Tower B coverage at a cost of 3 percent battery. Continuing would risk 12 seconds of outage near a waypoint that needs live video."

## 9. UI and UX specification

Goal: a first time user with no drone knowledge understands what is happening within seconds.

### 9.1 Home page
* Full screen animated hero: a stylised map with a drone gliding along a path while a signal heatmap pulses. Headline: "A weak signal should not mean a failed mission." Primary buttons: Launch Cinematic Demo, Open Mission Control. Secondary: Compare, Benchmark.
* Scroll story in four steps matching the loop: Sense, Assess, Decide, Recover and Resume, each with a small looping animation.
* Footer note: "Simulation only. No real flight data."

### 9.2 Mission Control (the main screen)
* Top bar: logo, scenario picker, Play and Pause, speed (0.5x, 1x, 2x, 4x, 8x), Reset, seed field with a dice button, strategy switch (Baseline, SkyLink Utility, SkyLink RL), theme toggle, help.
* Left panel, Stress Lab: big friendly buttons to drag onto the map: Tower Failure, Jammer, Storm, Congestion, Random Flicker. Intensity sliders and an "Auto chaos" toggle.
* Centre, the map canvas: terrain and building shading, towers with range rings, a live signal heatmap layer (toggle), the planned path coloured by predicted link quality, the actual trail coloured by real link quality, waypoints with value badges that fill when captured, the drone with a heading cone and a soft glow, the baseline ghost drone (toggle). Hover any point to see predicted Q there. Click the map to drop a manual waypoint when paused.
* Right panel, in cards:
  * Loop ribbon: Sense, Assess, Decide, Recover, Resume chips with the active stage glowing.
  * Link Health: radial gauge, state pill (Good, Degrading, Poor, Outage), 30 second sparkline, predicted Q in 5 seconds, packet loss, latency.
  * Mission: waypoints done, value captured, ETA, progress ring.
  * Energy: battery bar with a marker for the return reserve.
  * Decision: current action with icon, utility bars for all six actions, and the plain English explanation. A "Why?" button opens a detailed breakdown by objective.
* Bottom: timeline with coloured bands for link state, markers for events and decisions, and a draggable scrubber for replay.
* Toasts for key moments: "Early warning: link degrading", "Recovered at Tower B", "Mission resumed".

### 9.3 Compare mode
* Two synced maps (Baseline on the left, SkyLink on the right), same seed and same events. A central scoreboard animates live: value captured, outage seconds, energy used, mission status. At the end, a verdict banner: "SkyLink captured 78 percent of mission value, baseline captured 41 percent" (numbers come from the real run, never hard coded).
* One click "Run to end" for a fast result, and "Replay slowly".

### 9.4 Scenario Builder
* Drag and drop towers, obstacles, jammers, home and waypoints. Set waypoint values and the needs uplink flag. Live heatmap updates as you edit. Undo and redo. Save to local storage, import and export JSON, and a share link that encodes the scenario in the URL.
* Four presets: Disaster Search and Rescue, Urban Infrastructure Inspection, Wildfire Surveillance, Mountain Valley Relief Delivery. Each tells a short story and has a different difficulty.

### 9.5 Benchmark and Analytics
* Choose scenarios, strategies and number of runs (default 100). Progress bar while the Web Worker runs.
* KPI cards: mission completion rate, average value captured, outage seconds, energy used, unnecessary aborts, safe return success.
* Charts: grouped bars with 95 percent confidence intervals, distribution plots, a per scenario table. Paired comparison because seeds are shared across strategies.
* Export: CSV, and a one click printable report page for your submission.

### 9.6 AI Lab
* Train button with live reward curve, success rate curve and epsilon. Reward weight sliders. A policy explorer: pick link quality and battery buckets and see the chosen action as a heatmap grid. Buttons: Load pretrained, Retrain, Export policy.
* Plain English tooltips for every term (reward, epsilon, state, policy).

### 9.7 Learn page
* Interactive architecture diagram (slide 6) where clicking a block shows the real module and live values from the last run.
* Glossary with hover cards: RSSI, SINR, handover, path loss, hysteresis.
* Roadmap and future scope (slide 9) and your three references with short summaries.

### 9.8 Guided onboarding and friendliness
* First visit: a 60 second spotlight tour (custom built, no heavy library), skippable, replayable from the help menu.
* Cinematic Demo button: a scripted story with captions that auto plays a scenario, triggers a tower failure at a fixed time, and narrates each SkyLink decision. This is your viva safety net.
* Empty states, loading skeletons, friendly error messages, undo for destructive actions, confirm before overwriting scenarios.
* Keyboard shortcuts: Space play or pause, R reset, 1 2 3 switch strategy, H toggle heatmap, question mark opens help. Show them in a cheat sheet dialog.
* Fully responsive: desktop first, usable on tablet, and a simplified read only layout on phones.

### 9.9 Accessibility
* Colour is never the only signal: link states also use icons and patterns. Colour blind safe palette. WCAG AA contrast. Visible focus rings. ARIA live region announcing decisions. Respect the reduced motion setting.

## 10. Design system

Look and feel: a premium "mission control" interface. Dark by default with a deep navy base, frosted glass panels, thin luminous borders, subtle grid and topographic lines, and a light theme with the same tokens. Avoid the generic template look: strong typography, generous spacing, purposeful motion.

Tokens (define as CSS variables, swap per theme):
* Background deep navy #0B1020, surface #121A33, raised surface #1A2447, border a translucent white.
* Accent cyan #22D3EE, secondary violet #8B5CF6.
* Link quality ramp: Good #2DD4BF, Degrading #FACC15, Poor #FB923C, Outage #F43F5E. Baseline strategy colour: slate #94A3B8. SkyLink colour: cyan.
* Typography: Space Grotesk for headings, Inter for body, JetBrains Mono for numbers and telemetry. Large tabular numerals for gauges.
* Radius 16 px on cards, 10 px on controls. Soft glow shadows on active elements.
* Motion: spring based transitions, number tickers that count smoothly, a pulsing ring on the drone when the link degrades, a gentle shake only on outage (disabled for reduced motion).
* Canvas rendering runs on requestAnimationFrame separate from the simulation tick, with interpolation so movement is smooth at any speed.
* Build a small internal component library first (Card, Gauge, Pill, Toggle, Slider, Tooltip, Toast, Sparkline, StatTile) and reuse it everywhere so the whole app feels consistent.

## 11. Phased build plan

Rough effort with Antigravity doing the heavy lifting: 6 to 9 working days, or 2 to 3 weeks alongside classes. Do the phases in order.

### Phase 0: Foundation (half a day)
Goal: running app shell with the design system.
Tasks: scaffold Vite, React, TypeScript, Tailwind, router, Zustand; design tokens; theme toggle; base component library; page stubs; ESLint, Prettier, Vitest.
Acceptance: all seven pages route; dark and light themes work; component gallery page shows every base component.

### Phase 1: Simulation core (1 day)
Goal: headless deterministic engine.
Tasks: rng, world, uav, mission, engine tick loop, recorder; Web Worker wrapper.
Acceptance: unit tests pass; same seed gives identical recorded runs; a headless run of 1000 ticks completes in well under a second.

### Phase 2: Communication model and monitor (1 day)
Goal: realistic, tunable link behaviour plus early warning.
Tasks: comm_model with towers, obstacles, jammers, shadowing, handover hysteresis; monitor with EMA, slope, prediction and link states; coverage grid generation for the heatmap and for planning.
Acceptance: tests show Q falls with distance, drops behind obstacles, drops inside jammers, and recovers; predicted Q warns before outage in a scripted test.

### Phase 3: Mission Control UI and renderer (1 to 1.5 days)
Goal: the main screen looks and feels great with the baseline strategy running.
Tasks: canvas renderer (terrain, towers, heatmap, trail, drone), top bar, right side cards (Link, Mission, Energy), play controls and speed, seed input.
Acceptance: smooth 60 fps at 8x speed; all cards update live; heatmap toggle works; drone movement is interpolated.

### Phase 4: Planner, SkyLink engine and state machine (1.5 days)
Goal: SkyLink actually works and beats baseline on a hard scenario.
Tasks: comm aware A star, baseline strategy, utility engine, six action state machine with hysteresis and dwell time, hard safety constraints, recovery and resume logic.
Acceptance: in the Disaster preset with a tower failure, SkyLink avoids or recovers from the dead zone and finishes more value than baseline; no flip flopping (tested); safety constraints never violated in 500 random runs.

### Phase 5: Explainability, timeline, replay, Stress Lab (1 day)
Goal: the decision panel and interactivity that make the demo impressive.
Tasks: explain.ts, Decision card with utility bars, loop ribbon, timeline with scrubber and replay, drag and drop stress events, toasts.
Acceptance: every decision shows a correct plain English reason; scrubbing the timeline restores exact earlier states; dragging a Tower Failure onto the map changes the run live.

### Phase 6: Compare mode (half a day)
Goal: side by side proof.
Tasks: two synced engines, scoreboard, verdict banner, Run to end.
Acceptance: both sides share seed and events; verdict numbers come from real results; works at all speeds.

### Phase 7: Scenario Builder and presets (1 day)
Goal: users can create and share their own missions.
Tasks: editor with drag and drop, live heatmap, undo and redo, save, import and export JSON, URL share link, four preset scenarios with stories.
Acceptance: an exported scenario re imports identically; a share link reproduces the same run; presets have clearly different difficulty.

### Phase 8: AI Lab and RL agent (1 to 1.5 days)
Goal: working RL framework from slide 7.
Tasks: rl_env, Q learning, train worker, live reward and success curves, policy explorer, pretrained policy file, SkyLink RL strategy.
Acceptance: training improves average reward visibly within one to two minutes; the RL strategy runs in Mission Control and Compare; test on held out seeds is reported separately from training results.

### Phase 9: Benchmark and Analytics (1 day)
Goal: quantitative evaluation from slide 8.
Tasks: batch worker, KPI cards, charts with confidence intervals, per scenario table, CSV export, printable report.
Acceptance: 100 runs times 3 strategies times 4 scenarios finishes in under a minute without freezing the UI; results are reproducible from the same seeds.

### Phase 10: Onboarding, Learn page, Cinematic Demo, polish (1 day)
Goal: end user friendliness and wow factor.
Tasks: home page hero and scroll story, guided tour, Cinematic Demo script, Learn page with interactive architecture diagram and glossary, keyboard shortcuts, empty and error states, responsive layout, accessibility pass, motion polish.
Acceptance: a new person can finish the tour and understand the demo without help; Lighthouse accessibility score of 90 or higher; no layout break between 360 px and 1920 px widths.

### Phase 11: Testing, deployment, documentation (half a day)
Goal: ship it.
Tasks: Playwright end to end tests for the main flows, GitHub Actions, deploy to Vercel or GitHub Pages, README with screenshots, METHODS.md describing every model and equation, demo video recording.
Acceptance: the live URL works from a fresh browser; tests are green in CI; README explains how to run locally in three commands.

## 12. Evaluation methodology (this is your results chapter)

* Strategies: Baseline, SkyLink Utility, SkyLink RL.
* Scenarios: the four presets plus a randomised "stress" family.
* Runs: at least 200 seeds per scenario and strategy. Training seeds 1 to 1000. Test seeds 5000 to 5199, never used in training. Report test seeds only.
* Metrics: mission completion rate, value captured, unnecessary aborts, outage seconds, time to recover, energy used, path length, safe return success, number of decision switches.
* Statistics: mean with 95 percent confidence intervals, paired comparison across shared seeds, and a significance test such as the Wilcoxon signed rank test.
* Ablations (these show the novelty from slide 5 really matters): SkyLink without prediction (reactive only), without mission awareness (ignores waypoint value), without replanning, and with different weight presets.
* Sensitivity: sweep tower failure probability and jammer strength to show where SkyLink helps most.
* Do not write expected numbers in advance. Run the benchmark and report what comes out, including scenarios where the gain is small. That honesty makes the report stronger.

## 13. Quality, testing and performance

* Unit tests: rng determinism, path loss monotonic with distance, obstacle attenuation, handover hysteresis, state machine transitions, planner finds paths and respects obstacles, battery reserve logic, safety constraints.
* Property style tests: 500 random scenarios must never end with a geofence violation or a crash under SkyLink.
* End to end tests: tour, launch demo, run compare, build a scenario, run a small benchmark.
* Performance: simulation in Web Workers; canvas layers cached (heatmap drawn once per change); avoid React re renders in the render loop by reading from a store with selectors and by drawing the canvas outside React state.
* Error handling: never show a blank screen; wrap pages in error boundaries with a friendly message and a reset button.

## 14. Deployment and documentation

* Static deploy on Vercel or GitHub Pages. Add a custom looking title, favicon and social preview image.
* README: what it is, screenshots or a GIF, features, how to run, how it maps to your slides, honest limitations.
* METHODS.md: all equations, parameters and assumptions, written so your professor can check them.
* Record a 2 minute screen capture of the Cinematic Demo as a backup in case the venue Wi Fi fails.

## 15. Viva demo script (about 5 minutes)

1. Home page: say the one sentence problem. Click Launch Cinematic Demo.
2. Watch the loop ribbon. Point at the early warning toast: "SkyLink saw the link degrading before it failed."
3. Open the Decision card: show the plain English reason and the six utility bars.
4. Switch to Compare: "Same map, same failure, same seed. The baseline gave up."
5. Open the Stress Lab live: drop a jammer on the path and let the examiner see SkyLink adapt.
6. Open Benchmark: show confidence interval charts and the ablation result.
7. Open AI Lab: show the reward curve and the policy grid, then state clearly that this is a simulation study and list future scope (ROS, PX4, field measurements, multi UAV).

## 16. Report outline for DA1

1. Introduction and problem statement
2. Related work and research gap (include your three references)
3. SkyLink architecture
4. Simulation environment and communication model
5. Decision framework: baseline, utility engine, RL formulation
6. Implementation and software design
7. Experimental setup and metrics
8. Results and discussion, including ablations and limitations
9. Conclusion and future scope

## 17. Risks and stretch goals

Risks and fixes
* Scope creep: finish Phases 0 to 6 first. That alone is a strong, demo ready project. Phases 7 to 10 add polish and depth.
* RL does not beat the utility engine: that is fine. Report it honestly and explain why. The utility engine is the main contribution and RL is the proposed learning extension.
* Flip flopping decisions: hysteresis and dwell time, covered by tests.
* Canvas performance: cache layers, cap the heatmap resolution, test at 8x speed.
* Overclaiming: always say simulation, never imply real flight results.

Stretch goals
* 3D view with React Three Fiber and a chase camera.
* Multi UAV mode with relay drones that extend coverage.
* Python PPO training notebook with results imported as JSON.
* Real map tiles for the background, with a simulated radio layer on top.
* Voice narration for the Cinematic Demo.
