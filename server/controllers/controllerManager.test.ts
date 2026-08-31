import test from 'node:test';
import assert from 'node:assert/strict';
import { ControllerManager } from './controllerManager';

test('ControllerManager - Estado inicial correto com ProcessedMotion', () => {
    const manager = new ControllerManager();
    const state = manager.getState();
    
    assert.strictEqual(state.buttons.A, false);
    assert.strictEqual(state.motion.active, false);
    assert.strictEqual(state.processedMotion.movementState, 'IDLE');
    assert.strictEqual(state.processedMotion.isCalibrated, false);
});

test('ControllerManager - Regressão Fase 3: Botões funcionam perfeitamente', () => {
    const manager = new ControllerManager();
    manager.updateButton('A', 'pressed');
    assert.strictEqual(manager.getState().buttons.A, true);
    
    manager.updateButton('A', 'released');
    assert.strictEqual(manager.getState().buttons.A, false);
});

test('ControllerManager - Calibração altera o estado de processamento', () => {
    const manager = new ControllerManager();
    manager.calibrate();
    assert.strictEqual(manager.getState().processedMotion.isCalibrated, true);
});

test('ControllerManager - Transmissão de Motion gera dados processados', () => {
    const manager = new ControllerManager();
    const validPayload = {
        type: 'MOTION',
        version: 1,
        timestamp: Date.now(),
        motion: {
            accelerometer: { x: 0.1, y: 0.2, z: 9.81 },
            gyroscope: { x: 0.0, y: 0.0, z: 0.0 },
            interval: 16
        }
    };

    const updated = manager.updateMotion(validPayload);
    assert.strictEqual(updated, true);
    assert.strictEqual(manager.getState().motion.active, true);
    assert.ok(manager.getState().processedMotion.gravity.z > 0);
});
