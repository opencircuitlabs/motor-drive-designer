# Motor Drive Designer

`motor-drive-designer` is a dependency-free Node.js toolkit for traceable early electromechanical design. It connects motor constants and load motion to torque-speed feasibility, inverter ratings, PWM ripple, semiconductor losses, current and speed control, sensing, field weakening, regeneration, protection, thermal response, and tolerance yield.

It is an engineering screening tool. Safe motor drives require hardware current limiting, independent fault shutdown, isolation where applicable, overspeed protection, braking-energy management, mechanical guarding, validated control stability, and testing across supply, load, speed, and temperature extremes.

## Capabilities

- Convert Kv to ideal torque and back-EMF constants.
- Solve torque/current/back-EMF/voltage feasibility at an operating point.
- Generate current- and voltage-limited torque-speed envelopes.
- Transform torque, speed, power, and reflected inertia through a gearbox.
- Calculate acceleration torque and simulate motoring/regenerative motion missions.
- Size inverter switch voltage/current and DC-link ripple-current ratings.
- Estimate PWM current ripple and six-switch conduction, switching, and gate loss.
- Tune first-pass PI current loops and second-order speed loops.
- Design shunt/amplifier/ADC current-sense chains with headroom and resolution.
- Calculate quadrature encoder angle and sampled-speed resolution.
- Screen field-weakening current above base speed.
- Calculate regenerative braking energy, bus power, and charge-current compliance.
- Model lumped steady or transient drive thermal response.
- Derive guarded current, bus-voltage, and temperature protection thresholds.
- Run deterministic Monte Carlo analysis across motor production tolerances.
- Generate review-ready Markdown reports.

## Requirements

- Node.js 18 or newer

## Quick start

```bash
npm install
npm test
node src/cli.js constants 1000
node src/cli.js point examples/motor.json 24 0.1 10000 --output result.json
node src/cli.js envelope examples/motor.json 24 --points 21
node src/cli.js mission 0.01 examples/mission.json
node src/cli.js loss examples/inverter-loss.json
node src/cli.js monte-carlo examples/motor.json 24 0.1 10000 --iterations 1000 --seed 42
node src/cli.js report result.json --output report.md
```

## Motor model

```json
{
  "kvRpmPerVolt":1000,
  "resistanceOhm":0.2,
  "noLoadCurrentA":1,
  "maximumCurrentA":20,
  "maximumSpeedRpm":20000
}
```

The operating-point solver uses an equivalent motor terminal model. Be explicit and consistent about whether manufacturer resistance and current values are phase, line-to-line, RMS, or peak before mapping measured data into this model.

## CLI

```text
motor-drive-designer constants kvRpmPerVolt
motor-drive-designer point motor.json busV torqueNm speedRpm
motor-drive-designer envelope motor.json busV --points N
motor-drive-designer gearbox input.json
motor-drive-designer acceleration inertia startRpm endRpm duration --load Nm
motor-drive-designer mission inertia segments.json
motor-drive-designer inverter busV phaseRmsA
motor-drive-designer ripple busV backEmfV inductanceMicrohenry pwmHz --duty fraction
motor-drive-designer loss input.json
motor-drive-designer current-loop resistanceOhm inductanceH bandwidthHz
motor-drive-designer speed-loop inertia torqueConstant bandwidthHz
motor-drive-designer sense maxA shuntMilliohm gain --reference V --bits N
motor-drive-designer encoder pulsesPerRev gearRatio sampleSeconds
motor-drive-designer field-weakening motor.json busV speedRpm torqueCurrentA
motor-drive-designer regen input.json
motor-drive-designer thermal losses.json thermal.json
motor-drive-designer protection ratings.json
motor-drive-designer monte-carlo motor.json busV torqueNm speedRpm --iterations N --seed N
motor-drive-designer report point.json [inverter.json] [thermal.json] --output report.md
```

## Library API

```js
import {
  motorConstants, operatingPoint, torqueSpeedEnvelope, gearboxTransform,
  accelerationTorque, motionMission, inverterSizing, pwmCurrentRipple,
  inverterLoss, currentLoopTuning, speedLoopTuning, currentSenseDesign,
  encoderResolution, fieldWeakening, regenerativeBraking, driveThermal,
  protectionThresholds, monteCarloOperatingPoint, reportMarkdown
} from '@opencircuitlabs/motor-drive-designer';

const point = operatingPoint(motor, 24, 0.1, 10000);
console.log(point.currentA, point.voltageMarginV, point.pass);
```

## Engineering assumptions

- Kv/Kt conversion assumes ideal SI reciprocity and a consistent motor/controller convention.
- The equivalent terminal model is deliberately simple; saturation, saliency, iron loss, commutation advance, inverter voltage drop, and nonlinear maps require measured data or FEA.
- PWM ripple uses a worst-interval inductive slope and does not replace time-domain phase simulation.
- PI gains are analytical starting points. Sampling, computation delay, modulation, filters, observers, saturation, and anti-windup affect real stability.
- Regeneration calculations assume the bus can accept energy. A battery/BMS, brake resistor, or active front end must enforce voltage and current limits independently.
- Thermal calculations are lumped; verify device junctions, motor windings, magnets, bearings, coolant, and enclosure hot spots separately.

## Development

```bash
npm test
npm run check
```

CI runs all tests on Node.js 18, 20, and 22.

## License

MIT © OpenCircuitLabs contributors. See [LICENSE](LICENSE).
