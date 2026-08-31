import test from 'node:test';
import assert from 'node:assert/strict';
import { ControllerManager } from './controllerManager';

test('ControllerManager - Estado inicial correto', () => {
    const manager = new ControllerManager();
    const state = manager.getState();
    
    assert.strictEqual(state.buttons.A, false);
    assert.strictEqual(state.motion.active, false);
});

test('ControllerManager - Botões continuam funcionando corretamente (Fase 3)', () => {
    const manager = new ControllerManager();
    manager.updateButton('A', 'pressed');
    assert.strictEqual(manager.getState().buttons.A, true);
    
    manager.updateButton('A', 'released');
    assert.strictEqual(manager.getState().buttons.A, false);
});

test('ControllerManager - Payload de Motion válido atualiza o estado', () => {
    const manager = new ControllerManager();
    const validPayload = {
        type: 'MOTION',
        version: 1,
        timestamp: 1720000000000,
        motion: {
            accelerometer: { x: 0.1, y: 9.8, z: 0.3 },
            gyroscope: { x: 0.01, y: -0.05, z: 0.02 },
            interval: 16
        }
    };

    const updated = manager.updateMotion(validPayload);
    assert.strictEqual(updated, true);

    const state = manager.getState().motion;
    assert.strictEqual(state.active, true);
    assert.strictEqual(state.accelerometer.y, 9.8);
    assert.strictEqual(state.gyroscope.y, -0.05);
});

test('ControllerManager - Payload com NaN, Infinity ou ausência de dados deve ser rejeitado', () => {
    const manager = new ControllerManager();

    // Com NaN
    assert.strictEqual(manager.updateMotion({
        type: 'MOTION', version: 1, timestamp: 123,
        motion: { accelerometer: { x: NaN, y: 1, z: 1 }, gyroscope: { x: 0, y: 0, z: 0 } }
    }), false);

    // Com Infinity
    assert.strictEqual(manager.updateMotion({
        type: 'MOTION', version: 1, timestamp: 123,
        motion: { accelerometer: { x: 0, y: 1, z: 1 }, gyroscope: { x: Infinity, y: 0, z: 0 } }
    }), false);

    // Versão incorreta
    assert.strictEqual(manager.updateMotion({
        type: 'MOTION', version: 99, timestamp: 123,
        motion: { accelerometer: { x: 0, y: 1, z: 1 }, gyroscope: { x: 0, y: 0, z: 0 } }
    }), false);
});