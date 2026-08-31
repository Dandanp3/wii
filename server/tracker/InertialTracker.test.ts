import test from 'node:test';
import assert from 'node:assert/strict';
import { InertialTracker } from './InertialTracker';
import { MotionData } from '../../shared/protocol';

test('InertialTracker - Inicializa com valores zerados e estado STATIONARY', () => {
    const tracker = new InertialTracker();
    const pose = tracker.getPose();

    assert.strictEqual(pose.position.x, 0);
    assert.strictEqual(pose.position.y, 0);
    assert.strictEqual(pose.position.z, 0);
    assert.strictEqual(pose.velocity.x, 0);
    assert.strictEqual(pose.isStationary, true);
});

test('InertialTracker - Transformação para coordenadas globais com rotação nula', () => {
    const tracker = new InertialTracker();
    const devVector = { x: 1, y: 2, z: 3 };
    const orientation = { alpha: 0, beta: 0, gamma: 0 };

    const worldVector = tracker.transformDeviceToWorld(devVector, orientation);

    assert.ok(Math.abs(worldVector.x - 1) < 0.001);
    assert.ok(Math.abs(worldVector.y - 2) < 0.001);
    assert.ok(Math.abs(worldVector.z - 3) < 0.001);
});

test('InertialTracker - ZUPT força velocidade a ZERO quando parado', () => {
    const tracker = new InertialTracker({ accelVarThreshold: 0.1, gyroMagThreshold: 5.0 });
    
    for (let i = 0; i < 15; i++) {
        const motion: MotionData = {
            accelerometer: { x: 0.01, y: -0.01, z: 0.01 },
            gyroscope: { x: 0.1, y: 0.1, z: 0.1 },
            orientation: { alpha: 0, beta: 0, gamma: 0 }
        };
        tracker.update(motion, 1000 + i * 20);
    }

    const pose = tracker.getPose();
    assert.strictEqual(pose.isStationary, true);
    assert.strictEqual(pose.velocity.x, 0);
    assert.strictEqual(pose.velocity.y, 0);
    assert.strictEqual(pose.velocity.z, 0);
});

test('InertialTracker - Integração trapezoidal calcula velocidade e posição em movimento', () => {
    const tracker = new InertialTracker({ deadZone: 0.01, accelVarThreshold: 0.0001 });
    tracker.reset();

    const motion1: MotionData = {
        accelerometer: { x: 2.0, y: 0, z: 0 },
        gyroscope: { x: 30, y: 0, z: 0 },
        orientation: { alpha: 0, beta: 0, gamma: 0 }
    };
    tracker.update(motion1, 1000);

    const motion2: MotionData = {
        accelerometer: { x: 4.0, y: 0, z: 0 },
        gyroscope: { x: 30, y: 0, z: 0 },
        orientation: { alpha: 0, beta: 0, gamma: 0 }
    };
    const pose = tracker.update(motion2, 1100);

    assert.strictEqual(pose.isStationary, false);
    assert.ok(pose.velocity.x > 0.25 && pose.velocity.x < 0.35, `Obtido v.x: ${pose.velocity.x}`);
    assert.ok(pose.position.x > 0.01 && pose.position.x < 0.02, `Obtido p.x: ${pose.position.x}`);
});

test('InertialTracker - Estimativa de viés (Bias) aprende offset constante', () => {
    const tracker = new InertialTracker({ biasAlpha: 0.5 });
    tracker.reset();

    for (let i = 0; i < 20; i++) {
        const motion: MotionData = {
            accelerometer: { x: 0.4, y: 0, z: 0 },
            gyroscope: { x: 0, y: 0, z: 0 },
            orientation: { alpha: 0, beta: 0, gamma: 0 }
        };
        tracker.update(motion, 1000 + i * 20);
    }

    const pose = tracker.getPose();
    assert.ok(pose.bias.x > 0.35, `Viés esperado ~0.4, obtido: ${pose.bias.x}`);
});

test('InertialTracker - Rotação pura sem aceleração mantém posição constante', () => {
    const tracker = new InertialTracker();
    tracker.reset();

    for (let angle = 0; angle <= 90; angle += 10) {
        const motion: MotionData = {
            accelerometer: { x: 0, y: 0, z: 0 },
            gyroscope: { x: 0, y: 0, z: 10 },
            orientation: { alpha: angle, beta: 0, gamma: 0 }
        };
        tracker.update(motion, 1000 + angle * 20);
    }

    const pose = tracker.getPose();
    assert.strictEqual(pose.position.x, 0);
    assert.strictEqual(pose.position.y, 0);
    assert.strictEqual(pose.position.z, 0);
});