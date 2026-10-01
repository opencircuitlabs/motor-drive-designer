import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accelerationTorque,currentLoopTuning,currentSenseDesign,driveThermal,
  encoderResolution,fieldWeakening,gearboxTransform,inverterLoss,inverterSizing,
  monteCarloOperatingPoint,motionMission,motorConstants,operatingPoint,
  protectionThresholds,pwmCurrentRipple,regenerativeBraking,reportMarkdown,
  speedLoopTuning,torqueSpeedEnvelope
} from '../src/index.js';

const motor={kvRpmPerVolt:1000,resistanceOhm:.2,noLoadCurrentA:1,maximumCurrentA:20,maximumSpeedRpm:20000};

test('converts motor Kv into torque and back-EMF constants',()=>{
  const result=motorConstants(1000);
  assert.equal(result.torqueConstantNmPerA,.009549297);
  assert.equal(result.backEmfVPerRadPerSecond,.009549297);
  assert.throws(()=>motorConstants(0),/positive Kv/);
});

test('solves a feasible motor operating point',()=>{
  const result=operatingPoint(motor,24,.1,10000);
  assert.equal(result.currentA,11.471975);
  assert.equal(result.backEmfV,10);
  assert.equal(result.requiredVoltageV,12.294395);
  assert.equal(result.mechanicalPowerW,104.719755);
  assert.equal(result.pass,true);
});

test('flags current and voltage infeasibility',()=>{
  assert.equal(operatingPoint(motor,12,.3,15000).pass,false);
  assert.throws(()=>operatingPoint(motor,24,-1,1),/non-negative torque/);
});

test('generates a torque-speed envelope and peak-power point',()=>{
  const result=torqueSpeedEnvelope(motor,24,{points:5});
  assert.equal(result.rows.length,5);
  assert.equal(result.rows[0].availableCurrentA,20);
  assert.equal(result.rows.at(-1).maximumTorqueNm,0);
  assert.ok(result.peakPowerPoint.mechanicalPowerW>0);
});

test('validates torque-speed envelope resolution',()=>{
  assert.throws(()=>torqueSpeedEnvelope(motor,24,{points:1}),/at least two/);
});

test('transforms torque, speed, power, and inertia through a gearbox',()=>{
  const result=gearboxTransform({motorTorqueNm:1,motorSpeedRpm:3000,ratio:5,efficiency:.9,loadInertiaKgM2:.25});
  assert.equal(result.outputTorqueNm,4.5);
  assert.equal(result.outputSpeedRpm,600);
  assert.equal(result.outputPowerW,282.743339);
  assert.equal(result.reflectedLoadInertiaKgM2,.01);
});

test('calculates inertial and load torque for acceleration',()=>{
  const result=accelerationTorque(.01,0,3000,2,.5);
  assert.equal(result.angularAccelerationRadPerSecond2,157.079633);
  assert.equal(result.inertialTorqueNm,1.570796);
  assert.equal(result.totalTorqueNm,2.070796);
  assert.ok(result.peakMechanicalPowerW>650);
});

test('simulates motoring and regenerative motion segments',()=>{
  const result=motionMission(.01,[{id:'up',durationSeconds:2,targetSpeedRpm:3000,loadTorqueNm:0,driveEfficiency:.9},{id:'down',durationSeconds:2,targetSpeedRpm:0,loadTorqueNm:0,regenEfficiency:.7}]);
  assert.equal(result.rows.length,2);
  assert.ok(result.consumedEnergyJ>result.regeneratedEnergyJ);
  assert.ok(result.regeneratedEnergyJ>0);
  assert.equal(result.durationSeconds,4);
});

test('sizes inverter voltage, current, and DC-link ripple ratings',()=>{
  const result=inverterSizing(48,10);
  assert.equal(result.minimumMosfetVoltageRatingV,60);
  assert.equal(result.minimumMosfetCurrentRatingA,18.384776);
  assert.equal(result.phaseCurrentPeakA,14.142136);
  assert.equal(result.minimumDcLinkCapacitorRmsA,7.071068);
});

test('validates inverter modulation and margins',()=>{
  assert.throws(()=>inverterSizing(48,10,{modulationIndex:2}),/valid margins/);
});

test('estimates PWM phase-current ripple',()=>{
  const result=pwmCurrentRipple(48,24,100,20000,.5);
  assert.equal(result.peakToPeakCurrentRippleA,6);
  assert.equal(result.rmsRippleCurrentA,1.732051);
  assert.throws(()=>pwmCurrentRipple(48,50,100,20000,.5),/valid back EMF/);
});

test('decomposes six-switch inverter losses',()=>{
  const result=inverterLoss({phaseCurrentRmsA:10,busVoltageV:48,switchingFrequencyHz:20000,rdsOnMilliohm:10,junctionTemperatureC:75,rdsTemperatureCoefficientPerC:.004,riseTimeNs:50,fallTimeNs:50,gateChargeNc:50,gateDriveVoltageV:10});
  assert.equal(result.rdsTemperatureMultiplier,1.2);
  assert.equal(result.conductionLossW,3.6);
  assert.equal(result.switchingLossW,4.072935);
  assert.equal(result.gateDriveLossW,.06);
  assert.equal(result.totalLossW,7.732935);
});

test('tunes a PI current loop from motor R and L',()=>{
  const result=currentLoopTuning(.2,.0001,1000);
  assert.equal(result.proportionalGainVPerA,.628319);
  assert.equal(result.integralGainVPerAmpSecond,1256.637061);
  assert.equal(result.plantPoleHz,318.309886);
});

test('tunes a second-order speed loop',()=>{
  const result=speedLoopTuning(.01,.1,10,.707);
  assert.equal(result.proportionalGainASecondPerRad,8.884424);
  assert.equal(result.integralGainAPerRad,394.784176);
});

test('designs a shunt amplifier and ADC current channel',()=>{
  const result=currentSenseDesign(20,5,20,3.3,12);
  assert.equal(result.shuntVoltageV,.1);
  assert.equal(result.amplifierOutputV,2);
  assert.equal(result.currentResolutionA,.008058608);
  assert.equal(result.shuntPowerW,2);
  assert.equal(result.pass,true);
});

test('flags current-sense headroom violations',()=>{
  assert.equal(currentSenseDesign(40,5,20,3.3,12).pass,false);
  assert.throws(()=>currentSenseDesign(20,5,20,3.3,0),/positive integer ADC/);
});

test('calculates quadrature encoder angle and speed resolution',()=>{
  assert.deepEqual(encoderResolution(1000,2,.01),{countsPerOutputRevolution:8000,angleResolutionDegrees:.045,speedResolutionRpm:.75});
});

test('calculates field-weakening current above base speed',()=>{
  const result=fieldWeakening(motor,24,30000,10);
  assert.equal(result.baseSpeedRpm,22800);
  assert.equal(result.fluxRatio,.76);
  assert.equal(result.fieldWeakeningCurrentA,-4.8);
  assert.equal(result.totalCurrentA,11.09234);
  assert.equal(result.pass,true);
});

test('calculates regenerative braking energy and battery current',()=>{
  const result=regenerativeBraking(.01,3000,0,2,48,{regenEfficiency:.7,maximumChargeCurrentA:10});
  assert.equal(result.kineticEnergyRemovedJ,493.48022);
  assert.equal(result.recoveredEnergyJ,345.436154);
  assert.equal(result.averageRegenerativePowerW,172.718077);
  assert.equal(result.averageBusCurrentA,3.598293);
  assert.equal(result.pass,true);
});

test('flags regenerative charge-current overload',()=>{
  assert.equal(regenerativeBraking(.1,6000,0,1,24,{regenEfficiency:.8,maximumChargeCurrentA:5}).pass,false);
  assert.throws(()=>regenerativeBraking(.1,1000,2000,1,24),/end speed/);
});

test('models transient and steady drive thermal response',()=>{
  const result=driveThermal([{name:'bridge',watts:5},{name:'motor',watts:3}],25,3,100,{heatCapacityJPerC:100,durationSeconds:300});
  assert.equal(result.totalLossW,8);
  assert.equal(result.steadyStateTemperatureC,49);
  assert.equal(result.estimatedTemperatureC,40.170893);
  assert.equal(result.pass,true);
});

test('derives guarded drive protection thresholds',()=>{
  assert.deepEqual(protectionThresholds({maximumPhaseCurrentA:20,maximumBusVoltageV:60,minimumBusVoltageV:20,maximumTemperatureC:150}),{phaseOvercurrentA:18,busOvervoltageV:54,busUndervoltageV:22,overtemperatureC:140});
});

test('runs deterministic motor-tolerance yield analysis',()=>{
  const tolerant={...motor,kvTolerancePercent:5,resistanceTolerancePercent:10,currentTolerancePercent:5},first=monteCarloOperatingPoint(tolerant,24,.1,10000,{iterations:100,seed:12}),second=monteCarloOperatingPoint(tolerant,24,.1,10000,{iterations:100,seed:12});
  assert.deepEqual(first,second);
  assert.ok(first.p05CurrentMarginA<=first.p50CurrentMarginA);
  assert.ok(first.p05VoltageMarginV<=first.p50VoltageMarginV);
  assert.throws(()=>monteCarloOperatingPoint(tolerant,24,.1,10000,{iterations:0}),/positive integer/);
});

test('renders a review-ready motor-drive report',()=>{
  const point=operatingPoint(motor,24,.1,10000),inverter=inverterSizing(24,10),thermal=driveThermal([{watts:5}],25,2,100);
  const report=reportMarkdown(point,inverter,thermal);
  assert.match(report,/# Motor drive design/);
  assert.match(report,/0.1 Nm at 10000 rpm/);
  assert.match(report,/MOSFET minimum: 30 V/);
  assert.match(report,/Drive temperature: 35 C/);
});
