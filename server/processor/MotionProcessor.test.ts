import test from 'node:test';
import assert from 'node:assert/strict';
import { MotionProcessor } from './MotionProcessor';
import { MotionData } from '../../shared/protocol';

const mockRawMotion = (accelX = 0, accelY = 0, accelZ = 9.81, gyroX = 0, gyroY = 0, gyroZ = 0): MotionData => ({
    accelerometer: { x: accelX, y: accelY, z: accelZ },
    gyroscope: { x: gyroX, y: gyroY, z: gyroZ }
});

test('MotionProcessor - Calibração define estado isCalibrated como true', () => {
    const processor = new MotionProcessor();
    assert.strictEqual(processor.isControlCalibrated(), false);
    
    processor.calibrate();
    assert.strictEqual(processor.isControlCalibrated(), true);
});

test('MotionProcessor - Movimento abaixo do threshold retorna IDLE', () => {
    const processor = new MotionProcessor({ movingThreshold: 1.0 });
    const result = processor.process(mockRawMotion(0, 0, 9.81), 1000);

    assert.strictEqual(result.movementState, 'IDLE');
    assert.ok(result.motionMagnitude < 1.0);
});

test('MotionProcessor - Movimento acima do threshold retorna MOVING', () => {
    const processor = new MotionProcessor({ movingThreshold: 0.5 });
    
    // Primeiro ciclo para estabilizar gravidade
    processor.process(mockRawMotion(0, 0, 9.81), 1000);
    // Segundo ciclo simulando movimento forte no eixo X
    const result = processor.process(mockRawMotion(5.0, 0, 9.81), 1016);

    assert.strictEqual(result.movementState, 'MOVING');
});

test('MotionProcessor - Pequenas oscilações ou picos isolados NÃO inflam eventos de SHAKE', () => {
    const processor = new MotionProcessor({ shakeThreshold: 15.0, shakeMinPeaks: 2 });
    
    // 1. Ruído normal
    let res = processor.process(mockRawMotion(0.1, 0.2, 9.81), 1000);
    assert.strictEqual(res.shakeDetected, false);

    // 2. Um pico isolado forte
    res = processor.process(mockRawMotion(20.0, 0, 9.81), 1016);
    assert.strictEqual(res.shakeDetected, false); // Falta o 2º pico dentro da janela
});

test('MotionProcessor - Sequência de movimentos fortes dispara SHAKE exatamente uma vez com Cooldown', () => {
    const processor = new MotionProcessor({ 
        shakeThreshold: 10.0, 
        shakeMinPeaks: 2, 
        shakeWindowMs: 400, 
        shakeCooldownMs: 800 
    });

    processor.process(mockRawMotion(0, 0, 9.81), 1000);

    // Pico 1
    let res = processor.process(mockRawMotion(15.0, 0, 9.81), 1050);
    assert.strictEqual(res.shakeDetected, false);

    // Pico 2 (Dentro da janela) -> SHAKE!
    res = processor.process(mockRawMotion(-15.0, 0, 9.81), 1100);
    assert.strictEqual(res.shakeDetected, true);

    // Pico 3 imediato (Dentro do Cooldown) -> Deve ignorar para não spammar
    res = processor.process(mockRawMotion(15.0, 0, 9.81), 1150);
    assert.strictEqual(res.shakeDetected, false);
});