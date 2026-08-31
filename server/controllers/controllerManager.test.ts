import test from 'node:test';
import assert from 'node:assert/strict';
import { ControllerManager } from './ControllerManager';

test('ControllerManager - Estado inicial correto com PointerState e PoseState', () => {
    const manager = new ControllerManager();
    const state = manager.getState();
    
    assert.strictEqual(state.buttons.A, false);
    assert.strictEqual(state.motion.active, false);
    assert.strictEqual(state.pointer.isCalibrated, false);
    assert.strictEqual(state.pose.isStationary, true);
    assert.strictEqual(state.pose.position.x, 0);
});

test('ControllerManager - Alternar modo do ponteiro funciona corretamente', () => {
    const manager = new ControllerManager();
    manager.setPointerMode('6DOF');
    assert.strictEqual(manager.getState().pointer.mode, '6DOF');
});

test('ControllerManager - Calibração do Pointer atualiza PoseState e PointerState', () => {
    const manager = new ControllerManager();
    manager.calibratePointer();
    assert.strictEqual(manager.getState().pointer.isCalibrated, true);
    assert.strictEqual(manager.getState().pose.position.x, 0);
});

test('ControllerManager - Recebimento de dados atualiza o PoseState', () => {
    const manager = new ControllerManager();
    manager.calibratePointer();

    const payload = {
        type: 'MOTION',
        version: 1,
        timestamp: Date.now(),
        motion: {
            accelerometer: { x: 0.1, y: 0.2, z: 0.3 },
            gyroscope: { x: 0.1, y: 0.1, z: 0.1 },
            orientation: { alpha: 10, beta: 5, gamma: 10 }
        }
    };

    manager.updateMotion(payload);
    const pose = manager.getState().pose;

    assert.strictEqual(pose.orientation.yaw, 10);
    assert.ok(typeof pose.position.x === 'number');
});
