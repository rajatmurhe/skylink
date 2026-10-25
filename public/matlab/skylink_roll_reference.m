% SKYLINK: simplified near-hover roll-axis experiment.
% Standalone MATLAB script; no toolbox needed. Not a full quadcopter model.
% Mirrors src/sim/control.ts: PD control held constant within each 5 ms step.
% Supplied for reproducibility; MATLAB execution has not been verified here.
clear; clc;
Ixx = 0.025; b = 0.015; Kp = 0.8; Kd = 0.22;
torqueLimit = 0.6; targetDeg = 15; pulseNm = 0.12;
dt = 0.005; t = (0:dt:12)';
phi = 0; rate = 0; response = zeros(length(t),6);
for k = 1:length(t)
    target = (t(k) >= 1) * targetDeg * pi/180;
    disturbance = (t(k) >= 6 && t(k) < 6.25) * pulseNm;
    torque = min(torqueLimit,max(-torqueLimit,Kp*(target-phi)-Kd*rate));
    response(k,:) = [t(k),phi*180/pi,rate*180/pi,target*180/pi,torque,disturbance];
    acc = @(v) (torque+disturbance-b*v)/Ixx;
    k1=acc(rate); k2=acc(rate+k1*dt/2);
    k3=acc(rate+k2*dt/2); k4=acc(rate+k3*dt);
    phi=phi+dt*(rate+2*(rate+k1*dt/2)+2*(rate+k2*dt/2)+(rate+k3*dt))/6;
    rate=rate+dt*(k1+2*k2+2*k3+k4)/6;
end
response=response(1:4:end,:); % 50 Hz output, matching browser CSV
figure; plot(response(:,1),response(:,2),'LineWidth',1.5); hold on;
plot(response(:,1),response(:,4),'--'); grid on;
xlabel('Time (s)'); ylabel('Roll (degrees)');
legend('Response','Command'); title('SkyLink roll PD response');
writematrix(response,'skylink_matlab_response.csv');
fprintf('Linear omega_n = %.3f rad/s, zeta = %.3f\n',sqrt(Kp/Ixx),(b+Kd)/(2*sqrt(Kp*Ixx)));
% Simulink reproduction: Sum(target-roll) -> Kp; rate -> Kd negative
% feedback; summed torque -> Saturation +/-0.6; add disturbance;
% subtract b*rate; gain 1/Ixx -> Integrator(rate) -> Integrator(roll).
% Use fixed-step 0.005 s; choose a consistent sampled-controller setup.
