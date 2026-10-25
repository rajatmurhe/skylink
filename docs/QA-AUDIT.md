# Verification audit — 26 October 2026

## Executed checks

- Production TypeScript check and Vite build.
- 76 automated tests across 15 files: all ten public pages mount; builder add/undo/redo; preflight gating; seeded generation; RF model, controller, mission, RL and replay regression checks.
- Four fixed presets × two strategies × three radio seeds, each up to 6,000 simulation ticks.
- Four generated themes × three difficulty levels × two strategies, map seed 123 and radio seed 0, each up to 6,000 ticks. Every tick checks finite, non-increasing energy and position-consistent home/reserve telemetry. Aggregates are reconciled against recorded outcomes and outage counts.
- 300 generated environments validated for bounds and clear home/objective positions.
- Built production workers: 20 benchmark runs, deterministic repetition, seed-zero regression, independently recomputed means/confidence intervals/rates, and 100 training episodes producing a finite 1,440 × 6 Q table.
- Real browser: generate map seed zero, radio seed zero, complete preflight, single step, transfer selected map to Compare, run to evaluation limit, verify terminal controls, and execute ten paired benchmark seeds. Browser benchmark values matched production worker results.

## Corrections

1. Radio seed zero no longer falls back to 42 in Mission Control or Compare, or to 5000 in the batch worker.
2. Headless output stops at termination instead of repeating the terminal record.
3. Home status and return reserve are recomputed after geofence position clamping.
4. Compare disables run controls when finished or at the evaluation limit and displays each strategy's individual outcome and elapsed time.

## Observed results

Fixed Disaster Search, seeds 5000–5009:

| Metric | Baseline | SkyLink |
|---|---:|---:|
| Mean captured value | 5 | 5 |
| Mean outage seconds | 9.3 | 3.3 |
| Mean energy used, Wh | 8.8 | 12.8 |
| All objectives captured | 0% | 0% |
| Safe return | 100% | 100% |

Generated urban/moderate map seed 0, radio seed 0: both captured 14/42 points; SkyLink reached the 600-second limit without landing, with 170.5 seconds of outage. The adaptive policy is not universally superior. This is an observed controller limitation, not a result to conceal or relabel as successful.

## Scope and limitations

Passing tests establish the checked invariants and calculations, not real-aircraft validity or exhaustive correctness for all seeds. UI mounting tests mock canvas and chart dimensions; they are not full visual checks. Browser checks cover the workflows listed above, not every possible interaction or device size. MATLAB reference code was not executed in MATLAB. No hardware, live RF measurements, real terrain, flight authorization, or physical collision-avoidance validation was performed. The mission kinematics and isolated roll dynamics remain separate educational models. Recorded communication is the pre-motion decision sample for that tick; capture eligibility is evaluated at the arrival position. Normal confidence intervals describe sample variation and can be zero for identical results; they are not reliability guarantees.

## Follow-up controller fix — supersedes earlier result tables

79 tests across 16 files, production build, production worker reconciliation and browser benchmark passed after the controller revision. New regressions verify convergence on a short target and terminal home return on the two previously problematic scenarios.

- Generated urban/moderate map 0, radio seed 0: SkyLink captures 32/42 points, lands at 329.9 s, retains 79.8 Wh, and records 18.2 s outage. Previously: 14/42 and no landing at 600 s.
- Disaster Search, ten paired seeds 5000–5009: baseline captures mean 5 points, outage 9.7 s, energy 8.8 Wh; revised SkyLink captures mean 13 points, outage 36.1 s, energy 22.5 Wh. Both have 100% safe return and 0% full completion. The browser matches production-worker results.
- The larger value capture has a measurable cost in energy and outage exposure. Unreachable or stalled objectives remain uncaptured; no result is converted into a full mission success.
