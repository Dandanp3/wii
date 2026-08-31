import test from 'node:test';
import assert from 'node:assert/strict';
import { PointerProcessor } from './PointerProcessor';
import { PoseState } from '../../shared/pose';

test('PointerProcessor - Inicia em modo ROTATION descalibrado', () => {
    const processor = new PointerProcessor({ screenWidth: 1000, screenHeight: 800 });
    const state = processor.getState();

    assert.strictEqual(state.isCalibrated, false);
    assert.strictEqual(state.mode, 'ROTATION');
    assert.strictEqual(state.x, 500);
    assert.strictEqual(state.y, 400);
});

test('PointerProcessor - Suporta alteração dinâmica para modo 6DOF', () => {
    const processor = new PointerProcessor();
    processor.setMode('6DOF');
    assert.strictEqual(processor.getMode(), '6DOF');
});

test('PointerProcessor - Modo 6DOF altera o cursor com deslocamento inercial físico', () => {
    const processor = new PointerProcessor({ 
        screenWidth: 1000, 
        screenHeight: 800,
        sensitivity6DofX: 100,
        sensitivity6DofY: 100,
        smoothingFactor: 0,
        invertX: false,
        invertY: false  // <--- Esta é a linha que faltava!
    });

    processor.setMode('6DOF');
    processor.calibrate({ alpha: 0, beta: 0, gamma: 0 });

    const dummyPose: PoseState = {
        position: { x: 2, y: 1, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        worldAcceleration: { x: 0, y: 0, z: 0 },
        orientation: { yaw: 0, pitch: 0, roll: 0 },
        bias: { x: 0, y: 0, z: 0 },
        isStationary: false,
        timestamp: Date.now()
    };

    const state = processor.process({ alpha: 0, beta: 0, gamma: 0 }, dummyPose);
    
    assert.strictEqual(state.x, 700); // 500 + (2 * 100)
    assert.strictEqual(state.y, 300); // 400 - (1 * 100)
});