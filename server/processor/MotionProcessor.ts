import { Vector3, MotionData, ProcessedMotionData, MovementState } from '../../shared/protocol';
import { MotionConfig, DEFAULT_MOTION_CONFIG } from '../config/motionConfig';

export class MotionProcessor {
    private config: MotionConfig;

    // Estados do filtro LPF
    private estimatedGravity: Vector3 = { x: 0, y: 0, z: 9.81 };
    private filteredGyro: Vector3 = { x: 0, y: 0, z: 0 };

    // Estados de Calibração
    private isCalibrated: boolean = false;
    private gyroOffset: Vector3 = { x: 0, y: 0, z: 0 };
    private calibrationGravityBase: Vector3 = { x: 0, y: 0, z: 9.81 };

    // Histórico para detecção de SHAKE
    private peakTimestamps: number[] = [];
    private lastShakeTimestamp: number = 0;

    constructor(config: Partial<MotionConfig> = {}) {
        this.config = { ...DEFAULT_MOTION_CONFIG, ...config };
    }

    public calibrate(): void {
        this.gyroOffset = { ...this.filteredGyro };
        this.calibrationGravityBase = { ...this.estimatedGravity };
        this.isCalibrated = true;
    }

    public process(rawMotion: MotionData, timestamp: number): ProcessedMotionData {
        const rawAccel = rawMotion.accelerometer;
        const rawGyro = rawMotion.gyroscope;

        // 1. Filtragem Passa-Baixas (LPF) para isolar a gravidade
        const alphaG = this.config.gravityFilterAlpha;
        this.estimatedGravity = {
            x: alphaG * this.estimatedGravity.x + (1 - alphaG) * rawAccel.x,
            y: alphaG * this.estimatedGravity.y + (1 - alphaG) * rawAccel.y,
            z: alphaG * this.estimatedGravity.z + (1 - alphaG) * rawAccel.z,
        };

        // 2. Aceleração Linear (Aceleração Total - Gravidade Estimada)
        const linearAccel: Vector3 = {
            x: rawAccel.x - this.estimatedGravity.x,
            y: rawAccel.y - this.estimatedGravity.y,
            z: rawAccel.z - this.estimatedGravity.z,
        };

        // 3. Suavização do Giroscópio + Ajuste de Calibração (Offset)
        const alphaGyro = this.config.gyroFilterAlpha;
        const currentGyroCorrected = {
            x: rawGyro.x - this.gyroOffset.x,
            y: rawGyro.y - this.gyroOffset.y,
            z: rawGyro.z - this.gyroOffset.z,
        };

        this.filteredGyro = {
            x: alphaGyro * this.filteredGyro.x + (1 - alphaGyro) * currentGyroCorrected.x,
            y: alphaGyro * this.filteredGyro.y + (1 - alphaGyro) * currentGyroCorrected.y,
            z: alphaGyro * this.filteredGyro.z + (1 - alphaGyro) * currentGyroCorrected.z,
        };

        // 4. Magnitude do Movimento
        const motionMagnitude = Math.sqrt(
            linearAccel.x ** 2 + linearAccel.y ** 2 + linearAccel.z ** 2
        );

        // 5. Detecção de Estado (IDLE vs MOVING)
        const movementState: MovementState = 
            motionMagnitude >= this.config.movingThreshold ? 'MOVING' : 'IDLE';

        // 6. Detecção de SHAKE
        const shakeDetected = this.detectShake(motionMagnitude, timestamp);

        return {
            linearAcceleration: linearAccel,
            filteredGyroscope: this.filteredGyro,
            gravity: this.estimatedGravity,
            motionMagnitude,
            movementState,
            shakeDetected,
            isCalibrated: this.isCalibrated,
        };
    }

    private detectShake(magnitude: number, timestamp: number): boolean {
        // Ignora picos durante o cooldown
        if (timestamp - this.lastShakeTimestamp < this.config.shakeCooldownMs) {
            return false;
        }

        // Limpa picos antigos fora da janela temporal
        const windowStart = timestamp - this.config.shakeWindowMs;
        this.peakTimestamps = this.peakTimestamps.filter(t => t >= windowStart);

        // Registra novo pico se a magnitude ultrapassar o limiar
        if (magnitude >= this.config.shakeThreshold) {
            this.peakTimestamps.push(timestamp);
        }

        // Dispara o SHAKE se atingir a contagem mínima de picos na janela
        if (this.peakTimestamps.length >= this.config.shakeMinPeaks) {
            this.lastShakeTimestamp = timestamp;
            this.peakTimestamps = []; // Limpa o buffer de picos
            return true;
        }

        return false;
    }

    public isControlCalibrated(): boolean {
        return this.isCalibrated;
    }
}