#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import {
  accelerationTorque, currentLoopTuning, currentSenseDesign, driveThermal,
  encoderResolution, fieldWeakening, gearboxTransform, inverterLoss,
  inverterSizing, monteCarloOperatingPoint, motionMission, motorConstants,
  operatingPoint, protectionThresholds, pwmCurrentRipple, regenerativeBraking,
  reportMarkdown, speedLoopTuning, torqueSpeedEnvelope
} from './index.js';

const args=process.argv.slice(2);
const [command,a,b,c,d]=args;
const option=name=>{const index=args.indexOf(`--${name}`);return index<0?undefined:args[index+1]};
const load=async path=>JSON.parse(await readFile(path,'utf8'));
const emit=async value=>{const output=`${JSON.stringify(value,null,2)}\n`;if(option('output'))await writeFile(option('output'),output);else process.stdout.write(output)};

try {
  if(!command||command==='help'){
    process.stdout.write('Usage: motor-drive-designer <constants kv|point motor.json busV torqueNm speedRpm|envelope motor.json busV|gearbox input.json|acceleration inertia startRpm endRpm duration --load Nm|mission inertia segments.json|inverter busV phaseRmsA|ripple busV backEmfV inductanceUh pwmHz --duty value|loss input.json|current-loop resistance inductanceH bandwidthHz|speed-loop inertia kt bandwidthHz|sense maxA shuntMohm gain --reference V --bits N|encoder ppr ratio sampleSeconds|field-weakening motor.json busV speedRpm currentA|regen input.json|thermal losses.json thermal.json|protection ratings.json|monte-carlo motor.json busV torqueNm speedRpm|report point.json [inverter.json] [thermal.json]> [--output file]\n');
  } else if(command==='constants') await emit(motorConstants(Number(a)));
  else if(command==='point') await emit(operatingPoint(await load(a),Number(b),Number(c),Number(d)));
  else if(command==='envelope') await emit(torqueSpeedEnvelope(await load(a),Number(b),{points:Number(option('points')??11)}));
  else if(command==='gearbox') await emit(gearboxTransform(await load(a)));
  else if(command==='acceleration') await emit(accelerationTorque(Number(a),Number(b),Number(c),Number(d),Number(option('load')??0)));
  else if(command==='mission') await emit(motionMission(Number(a),await load(b)));
  else if(command==='inverter') await emit(inverterSizing(Number(a),Number(b)));
  else if(command==='ripple') await emit(pwmCurrentRipple(Number(a),Number(b),Number(c),Number(d),Number(option('duty'))));
  else if(command==='loss') await emit(inverterLoss(await load(a)));
  else if(command==='current-loop') await emit(currentLoopTuning(Number(a),Number(b),Number(c)));
  else if(command==='speed-loop') await emit(speedLoopTuning(Number(a),Number(b),Number(c)));
  else if(command==='sense') await emit(currentSenseDesign(Number(a),Number(b),Number(c),Number(option('reference')),Number(option('bits'))));
  else if(command==='encoder') await emit(encoderResolution(Number(a),Number(b),Number(c)));
  else if(command==='field-weakening') await emit(fieldWeakening(await load(a),Number(b),Number(c),Number(d)));
  else if(command==='regen'){
    const input=await load(a);
    await emit(regenerativeBraking(input.inertiaKgM2,input.startRpm,input.endRpm,input.durationSeconds,input.busVoltageV,input));
  } else if(command==='thermal'){
    const thermal=await load(b);
    await emit(driveThermal(await load(a),thermal.ambientC,thermal.thermalResistanceCPerW,thermal.maximumTemperatureC,thermal));
  } else if(command==='protection') await emit(protectionThresholds(await load(a)));
  else if(command==='monte-carlo') await emit(monteCarloOperatingPoint(await load(a),Number(b),Number(c),Number(d),{iterations:Number(option('iterations')??500),seed:Number(option('seed')??42)}));
  else if(command==='report'){
    const inverterPath=b&&!b.startsWith('--')?b:null;
    const thermalPath=inverterPath&&c&&!c.startsWith('--')?c:null;
    const markdown=reportMarkdown(await load(a),inverterPath?await load(inverterPath):null,thermalPath?await load(thermalPath):null);
    if(option('output'))await writeFile(option('output'),markdown);else process.stdout.write(markdown);
  } else throw new Error('invalid command or arguments');
} catch(error){
  process.stderr.write(`motor-drive-designer: ${error.message}\n`);
  process.exitCode=1;
}
