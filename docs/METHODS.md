# SkyLink Mission Control: Scientific Methods and Mathematical Models

Project: SkyLink, Communication Aware Autonomous Mission Recovery System  
Authors: Rishika Deshmukh, Rajat Murhe  
Platform: 100% Software Browser Simulation Core  

---

## 1. Kinematics and Battery Energy Model

The UAV is modeled as a 2D point mass with velocity constraints, turn rate limits, and non linear energy consumption.

### 1.1 Kinematic State Equations
For simulation tick interval $\Delta t = 0.1\text{ s}$:

$$\mathbf{p}(t + \Delta t) = \mathbf{p}(t) + \mathbf{v}(t) \cdot \Delta t$$

$$\mathbf{v}(t) = \begin{bmatrix} v \cdot \cos(\theta) \\ v \cdot \sin(\theta) \end{bmatrix}$$

$$\theta(t + \Delta t) = \theta(t) + \text{clamp}\left(\theta_{target} - \theta(t), -\omega_{max} \cdot \Delta t, \omega_{max} \cdot \Delta t\right)$$

where $v \le 15.0\text{ m/s}$ (maximum cruise speed) and $\omega_{max} = 1.5\text{ rad/s}$ (maximum turn rate).

### 1.2 Non-Linear Power Draw
Total power draw $P_{draw}(v)$ in Watts combines hover power and velocity dependent aerodynamic drag:

$$P_{draw}(v) = P_{hover} + k_{drag} \cdot v^2$$

where $P_{hover} = 150.0\text{ W}$ and $k_{drag} = 0.4\text{ W / (m/s)}^2$.

### 1.3 Safety Return Energy Reserve
The return energy reserve $E_{reserve}$ in Watt-hours is computed continuously:

$$E_{reserve} = \left( \frac{\|\mathbf{p} - \mathbf{p}_{home}\|_2}{v_{cruise}} \right) \cdot \frac{P_{draw}(v_{cruise})}{3600} \cdot S_f$$

where $v_{cruise} = 12.0\text{ m/s}$ and safety factor $S_f = 1.25$.

---

## 2. RF Communication Physics Model

### 2.1 Received Signal Strength (RSSI)
For each online ground station tower $i$:

$$\text{RSSI}_i = Ptx_i - \text{PL}_0 - 10 \cdot n \cdot \log_{10}\left( \frac{d_{3D, i}}{d_0} \right) - L_{obstacle, i} - S_i$$

where:
* $Ptx_i$: scenario-specific transmit power (default 33 dBm)
* $\text{PL}_0 = 38.5\text{ dB}$ at reference distance $d_0 = 1.0\text{ m}$
* $n = 2.4$ (Path Loss Exponent)
* $d_{3D, i} = \sqrt{(x - x_i)^2 + (y - y_i)^2 + h_i^2}$
* $L_{obstacle, i}$: Cumulative attenuation of obstacles intersecting the line of sight path
* $S_i$: Smooth 2D value noise attenuation scaled to a 0–3 dB range (not Gaussian fading)

### 2.2 Handover Hysteresis
Serving tower selection incorporates a $3.0\text{ dB}$ handover hysteresis threshold to eliminate rapid ping pong tower switching:

$$\text{Tower}_{serving}(t) = \begin{cases} i_{candidate} & \text{if } \text{RSSI}_{candidate} > \text{RSSI}_{current} + 3.0\text{ dB} \\ \text{Tower}_{serving}(t-1) & \text{otherwise} \end{cases}$$

### 2.3 Interference, SINR, and Link Quality
Total interference noise $N_{total}$ in dBm incorporates thermal noise floor $N_{thermal} = -95.0\text{ dBm}$ and jammer sources:

$$N_{total} = 10 \cdot \log_{10}\left( 10^{(N_{thermal}/10)} + \sum_{j} 10^{(I_j / 10)} \right)$$

$$\text{SINR} = \text{RSSI}_{serving} - N_{total}\text{ (in dB)}$$

Link quality metric $Q \in [0, 1]$:

$$Q = \text{clamp}\left( \frac{\text{SINR} - 5.0\text{ dB}}{25.0\text{ dB} - 5.0\text{ dB}}, 0, 1 \right)$$

---

## 3. Degradation Monitor and 5-Second Predictor

Link quality is smoothed using an Exponential Moving Average (EMA) with $\alpha = 0.3$:

$$Q_{ema}(t) = 0.3 \cdot Q(t) + 0.7 \cdot Q_{ema}(t - \Delta t)$$

Slope $\frac{dQ}{dt}$ is estimated over a 2 second window (20 ticks):

$$\text{slope} = \frac{Q_{ema}(t) - Q_{ema}(t - 2.0\text{s})}{2.0\text{s}}$$

Predictor projects link quality 5 seconds ahead:

$$Q_{pred} = \text{clamp}\left( Q_{ema} + \text{slope} \cdot 5.0\text{s}, 0, 1 \right)$$

---

## 4. Multi-Objective Utility Engine

At each decision interval, 6 actions are evaluated against a multi-objective utility function:

$$\text{Utility}(a) = w_{comm} \cdot Q_a + w_{mission} \cdot V_a - w_{energy} \cdot E_a - w_{risk} \cdot R_a + H(a)$$

These action-specific terms are hand-written heuristic estimates in `src/decision/utility.ts`, rather than forward rollouts or measured changes.

where $H(a) = 0.1$ if $a = a_{current}$ (hysteresis bias) and $0$ otherwise.

### Hard Safety Shield Rules
1. Battery Condition: If $E_{battery} \le E_{reserve}$, FORCE `SAFE_RETURN`.
2. Dwell Timer: Minimum action dwell time of 30 ticks (3 seconds) enforced before action transitions.

## 5. Execution, evaluation and limitations (implementation notes)

The `SimEngine` executes the selected action rather than only labeling telemetry. Baseline follows direct waypoint legs and latches an abort after more than 50 consecutive poor/outage ticks. SkyLink uses the utility state machine and communication-aware A* grid paths (50 m cells). REPLAN, CONTINUE and RESUME follow a planned mission route; RECOVER_CONNECTIVITY targets the nearest online tower; HOLD requests the current position; SAFE_RETURN targets home and latches until landing. The vehicle stops once returning within the 15 m home radius, or when energy is depleted. A completed mission also initiates return. Geofence coordinates are clamped to the scenario bounds.

The monitor has 21 samples spanning exactly 20 intervals for its two-second slope. Five-second predicted quality is a clamped linear extrapolation. It is not a probabilistic model or an empirically validated outage forecast. The risk field `predictedOutageSeconds` is a binary five-second horizon flag, not predicted outage duration. Utility terms are heuristic estimates, not measured counterfactual outcomes. Ground-station load scales modeled throughput, not RSSI.

**Clarifications to the equations above:** tower transmit power and height are scenario-specific. The height term is used as a simplified distance proxy; the simulator has no UAV altitude state. Smooth value noise is scaled by 3 dB; it is not calibrated Gaussian shadowing with a proven 3 dB standard deviation. A* uses estimated instantaneous grid quality Q without the seeded shadow field, not the temporal Q predictor. The utility mission term is normalized by the scenario's total waypoint value. All six scores are exposed, with recovery/resume eligibility restrictions and a 0.1 current-action bias. Low battery can override dwell immediately. The engine adds a 0.05 Wh return-trigger buffer.

Obstacle rectangles apply RF attenuation and a soft routing cost of 1000; they are not hard collision boundaries. Reserve energy is based on a straight-line return at 12 m/s with a 1.25 factor. It excludes detours and does not guarantee a successful landing. Battery use is integrated from power in W over seconds, divided by 3600. Grounded terminal states do not continue consuming energy.

Benchmark runs use the Disaster Search preset with paired seeds starting at 5000, two implemented flight policies, and a maximum 600 s horizon. Completion is capture of all waypoint value, while safe return separately requires a terminal state inside the home radius with positive battery. Outage time is the count of recorded OUTAGE ticks multiplied by 0.1 s. Energy used is initial capacity minus final energy. Reported confidence intervals for value/outage use sample standard deviation and 1.96 × s/√n (normal approximation, not a field reliability guarantee). Results are computed in a dedicated worker. No expected winner is imposed.

The AI lab is separate experimental Q-learning over 1440 discretized states and six actions, with fixed seeded episodes and epsilon-greedy exploration. Actions are applied to the same simulator. Each episode is bounded to 800 decisions and may terminate early. Terminal Bellman targets do not bootstrap. A mission completion bonus is given only on the first completion transition. An exported table is not automatically used by the mission controller; the explorer shows one slice and identifies unvisited rows. Reward curves are observed worker results, and convergence is not claimed.


## 6. Flight Lab: near-hover roll-axis model

This independent educational model uses Ixx × roll acceleration + b × roll rate = control torque + disturbance torque. PD torque is Kp × (command − angle) − Kd × rate, clipped to ±0.6 Nm. Angle and angular rate use radians internally. Default Ixx is 0.025 kg m², b is 0.015 Nm s/rad, Kp is 0.8 Nm/rad and Kd is 0.22 Nm s/rad. These are illustrative parameters, not identified hardware measurements.

The roll command steps to 15 degrees at 1 s. A 0.12 Nm disturbance acts from 6 to 6.25 s. RK4 integrates the plant at 0.005 s with control torque held constant within each step; outputs are recorded every 0.02 s through 12 s. The 2% settling-time metric measures the last crossing of a command-relative band in the interval [1,6) s; if no sustained settling is observed there, it reports not settled. Overshoot is measured before disturbance. Saturation is the fraction of recorded torque samples at the actuator limit.

For the unsaturated continuous linear approximation, natural frequency is sqrt(Kp/Ixx) and damping ratio is (b+Kd)/(2 sqrt(Kp Ixx)). Damping classification refers to that approximation, not a guarantee for the saturated nonlinear response. The front-view illustration rotates by the computed roll angle. This is neither 6-DOF flight nor hardware-in-the-loop testing.

The MATLAB reference uses the same sampled controller, RK4 updates and output sampling. It is supplied as reproducible source, not as a claim that MATLAB or Simulink was run in this environment.

## 7. Conceptual airframe sizing

Nominal battery voltage is 3.7 × LiPo cell count; energy in Wh is nominal voltage × capacity in mAh / 1000. Constant-power endurance in minutes is 60 × 0.8 × energy / (assumed hover power + additional payload power). Thrust-to-weight ratio is four times the entered per-motor maximum thrust divided by mass × 9.81. Average current is power / nominal voltage.

Capacity, mass, thrust and power are independent scenario inputs, not a coupled propulsion model. The calculation does not account for voltage sag, thermal limits, discharge rates, air density, motor/propeller efficiency curves or wind. The 80% usable-energy factor is an assumption, not a validated safety margin.

Sources consulted for instructional context: MathWorks, “Model a Quadcopter Based on Parrot Minidrones” (https://in.mathworks.com/help/aeroblks/quadcopter-project.html) and “Quadcopter Dynamics” (https://www.mathworks.com/help/simulink/supportpkg/parrot_ug/quadcopter-dynamics.html). Current Indian portal descriptions: Ministry of Civil Aviation, “Our Digital Initiatives” (https://www.civilaviation.gov.in/our-digital-initiatives), consulted 25 October 2026. The supplied BCSE428L syllabus is the basis for course mapping; no instructor endorsement is implied.

### Bounded recovery revision (26 October 2026)

Kinematics now limits target speed using stopping distance `sqrt(2 a max(0,d−0.5))` and nonnegative heading alignment. The acceleration limit still applies. This prevents persistent overshoot around short grid segments; it is a planar kinematic approximation, not a rotor-dynamics controller.

SkyLink no longer gives immediate maximum abort utility merely because the link enters OUTAGE. It attempts recovery subject to the existing battery safety shield. A mission-progress watchdog requires at least 5 m improvement over the best distance to the current objective within 45 seconds. If that budget expires, the objective is marked deferred, receives no capture credit, and the next pending objective is attempted. When all objectives are captured, expired or deferred, the drone returns. A long valid detour can also trigger this heuristic; it is a bounded-effort policy, not a proof of infeasibility. Baseline retains its five-second poor-link abort policy. The common kinematics changes apply to both strategies.

The revised policy can collect more value at the cost of longer outage exposure and higher energy use. It must not be described as universally safer or superior.
