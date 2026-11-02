import { box, comp, at, arduinoUno, l298n, hcsr04, ttMotor, wheel, servoSG90, batteryHolder, switchRocker, casterBall, cyl } from '../shapes.js';
import { usd } from '../util.js';

const SKETCH = (four) => `// Ingeniare obstacle-avoiding robot (${four ? '4WD' : '2WD'}) - Arduino Uno R3
#include <Servo.h>
const int ENA = 5, IN1 = 7, IN2 = 8;   // left motor${four ? 's' : ''}
const int ENB = 6, IN3 = 4, IN4 = 2;   // right motor${four ? 's' : ''}
const int TRIG = A1, ECHO = A0, SERVO_PIN = 3;
const int SPEED = 170, TURN_MS = 350, STOP_CM = 25;
Servo scan;

long distanceCm() {
  digitalWrite(TRIG, LOW); delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10); digitalWrite(TRIG, LOW);
  long us = pulseIn(ECHO, HIGH, 25000);          // 25 ms timeout ~ 4 m
  return us == 0 ? 400 : us / 58;
}
void drive(int l, int r) {                         // -255..255 each side
  digitalWrite(IN1, l > 0); digitalWrite(IN2, l < 0); analogWrite(ENA, abs(l));
  digitalWrite(IN3, r > 0); digitalWrite(IN4, r < 0); analogWrite(ENB, abs(r));
}
long look(int angle) { scan.write(angle); delay(300); return distanceCm(); }

void setup() {
  int pins[] = {ENA, IN1, IN2, ENB, IN3, IN4, TRIG};
  for (int p : pins) pinMode(p, OUTPUT);
  pinMode(ECHO, INPUT);
  scan.attach(SERVO_PIN); scan.write(90);
  Serial.begin(9600); delay(1000);
}
void loop() {
  long d = distanceCm();
  if (d > STOP_CM) { drive(SPEED, SPEED); delay(40); return; }
  drive(0, 0); drive(-SPEED, -SPEED); delay(250); drive(0, 0);
  long left = look(160), right = look(20); scan.write(90); delay(200);
  if (left > right) drive(-SPEED, SPEED); else drive(SPEED, -SPEED);
  delay(TURN_MS); drive(0, 0);
}`;

export default {
  id: 'robot_car', title: 'Arduino Obstacle-Avoiding Robot Car', domain: 'Electronics / Robotics', unit: 'mm', icon: '🤖',
  params: [
    { key: 'drive', label: 'Drivetrain', type: 'select', options: ['2WD', '4WD'], default: '2WD', from: (e) => (e.wheels ? `${e.wheels}WD` : undefined) },
    { key: 'stop', label: 'Stop distance', type: 'number', min: 10, max: 60, step: 5, default: 25, unit: 'cm', from: () => undefined },
  ],
  generate(p) {
    const four = p.drive === '4WD';
    const L = four ? 260 : 210, Wc = 150, deckY = 30;
    const motors = four ? 4 : 2;
    const mz = Wc / 2 - 10, wz = Wc / 2 + 18;
    const mx = four ? [70, -70] : [-50];
    const motorAdds = [], wheelAdds = [];
    for (const x of mx) for (const s of [1, -1]) { motorAdds.push({ part: 'motor', p: [x + 12, deckY - 14, s * (mz - 8)] }); wheelAdds.push({ part: 'wheel', p: [x, deckY - 14, s * wz], r: [0, 90, 0] }); }
    const sketch = SKETCH(four).replace('STOP_CM = 25', `STOP_CM = ${p.stop}`);
    return {
      summary: `A ${p.drive} autonomous robot on a ${L} x ${Wc} mm acrylic chassis: Arduino Uno R3 brain, L298N motor driver, ${motors} TT gear motors, HC-SR04 ultrasonic sensor on an SG90 scanning servo, powered by 2 x 18650 Li-ion (7.4 V). It drives forward, stops ${p.stop} cm from obstacles, looks left/right and turns toward the open side.`,
      difficulty: 'Intermediate', time: '3-4 hours', cost: usd(four ? 58 : 45),
      tools: ['Soldering iron (60 W, 350 °C) + 0.8 mm 63/37 solder', 'Small Phillips screwdriver (PH0/PH1)', 'Wire stripper (22-26 AWG)', 'Multimeter', 'Computer with Arduino IDE 2.x + USB-B cable', 'Hot-glue gun', 'Zip ties'],
      parts: [
        { id: 'chassis', name: 'Chassis plate', spec: `3 mm acrylic ${p.drive} robot chassis, ${L} x ${Wc} mm`, qty: 1, shape: box(L, 3, Wc, '#9fd8ff', 'glass') },
        { id: 'motor', name: 'TT gear motor', spec: 'DC 3-6 V TT gearmotor, 1:48, ~200 RPM @ 6 V, with M3 x 30 mounting screws', qty: motors, shape: ttMotor() },
        { id: 'wheel', name: 'Wheel', spec: '65 mm rubber-tyre wheel for TT motor shaft', qty: motors, shape: wheel() },
        ...(four ? [] : [{ id: 'caster', name: 'Caster', spec: 'Ball caster, 15 mm steel ball, with 2 x M3 x 10 standoffs', qty: 1, shape: casterBall() }]),
        { id: 'uno', name: 'Microcontroller', spec: 'Arduino Uno R3 (ATmega328P)', qty: 1, shape: arduinoUno() },
        { id: 'driver', name: 'Motor driver', spec: 'L298N dual H-bridge module (2 A/channel, 5 V regulator jumper ON)', qty: 1, shape: l298n() },
        { id: 'sonar', name: 'Distance sensor', spec: 'HC-SR04 ultrasonic sensor, 2-400 cm, 5 V', qty: 1, shape: hcsr04() },
        { id: 'servo', name: 'Scan servo', spec: 'TowerPro SG90 9 g micro servo + HC-SR04 bracket', qty: 1, shape: servoSG90() },
        { id: 'battery', name: 'Battery pack', spec: '2 x 18650 3.7 V 2500 mAh protected Li-ion cells (e.g. Samsung 25R) in a 2S holder with leads', qty: 1, shape: batteryHolder(2) },
        { id: 'switch', name: 'Power switch', spec: 'KCD1 SPST rocker switch, 6 A', qty: 1, shape: switchRocker() },
        { id: 'wires', name: 'Jumper wires', spec: '20 x male-female + 10 x male-male Dupont jumpers, 20 cm; 22 AWG red/black hookup wire', qty: 1, shape: null },
        { id: 'hardware', name: 'Hardware', spec: '8 x M3 x 10 brass standoffs, 16 x M3 x 6 screws, 8 x M3 nuts', qty: 1, shape: null },
      ],
      steps: [
        { title: 'Solder leads to the motors', text: `Solder a 15 cm red and black 22 AWG wire to each of the ${motors} TT motors (red to the tab nearest the red dot). Add a 0.1 µF ceramic capacitor across the tabs of each motor to cut electrical noise that resets the Arduino.`, add: [] },
        { title: 'Mount motors to the chassis', text: `Fix each motor to the underside of the chassis with the two acrylic brackets and M3 x 30 screws, shafts facing outward. ${four ? 'Front pair 70 mm ahead of centre, rear pair 70 mm behind.' : 'Mount them 50 mm behind centre so the caster carries the front.'}`, add: [{ part: 'chassis', p: [0, deckY, 0] }, ...motorAdds] },
        { title: 'Fit wheels' + (four ? '' : ' and caster'), text: `Press the 65 mm wheels straight onto the D-shaft — support the motor gearbox from behind so you don't crack it.${four ? '' : ' Bolt the ball caster to the front underside on two 10 mm standoffs so the chassis sits level.'}`, add: [...wheelAdds, ...(four ? [] : [{ part: 'caster', p: [75, deckY - 23, 0] }])] },
        { title: 'Mount the electronics', text: 'Screw the Arduino Uno to the rear of the deck on four 10 mm M3 standoffs and the L298N to the middle. Hot-glue the 2 x 18650 holder under the deck between the motors and mount the rocker switch in reach.', add: [{ part: 'uno', p: [-55, deckY + 12, 0] }, { part: 'driver', p: [25, deckY + 12, 0] }, { part: 'battery', p: [20, deckY - 11, 0] }, { part: 'switch', p: [-L / 2 + 20, deckY + 4, 55] }] },
        { title: 'Mount the scanning sensor', text: 'Centre the SG90 horn first (upload a sketch that writes 90°, or turn by hand to the middle of its travel). Screw the servo to the front of the deck, then clip the HC-SR04 bracket onto the horn so the sensor faces straight ahead.', add: [{ part: 'servo', p: [L / 2 - 30, deckY + 14, 0] }, { part: 'sonar', p: [L / 2 - 22, deckY + 40, 0], r: [0, 90, 0] }] },
        { title: 'Wire power and motors', text: 'Battery + → switch → L298N "12V" terminal; battery − → L298N GND. Run a jumper from L298N GND to Arduino GND (common ground — required!) and from L298N "5V" to Arduino 5V. Left motor leads → OUT1/OUT2, right → OUT3/OUT4' + (four ? ' (each side\'s two motors in parallel).' : '.'), details: ['Remove the ENA and ENB jumpers on the L298N so the Arduino controls speed.', 'Check polarity with the multimeter before switching on: 7.4-8.4 V at the 12V terminal.'], add: [] },
        { title: 'Wire the signals', text: 'L298N ENA → D5, IN1 → D7, IN2 → D8, IN3 → D4, IN4 → D2, ENB → D6. HC-SR04 VCC → 5V, GND → GND, TRIG → A1, ECHO → A0. SG90 brown → GND, red → 5V, orange → D3.', details: ['ENA/ENB use D5/D6 because the Servo library disables PWM on D9/D10.'], add: [] },
        { title: 'Upload the code and test', text: `Open Arduino IDE, select Board "Arduino Uno" and the correct port, paste the sketch below and upload. Lift the robot so the wheels spin freely and switch on: both wheels must spin FORWARD. If one runs backward, swap that motor's two wires at the L298N. Then set it on the floor.`, code: sketch, add: [] },
      ],
    };
  },
};
