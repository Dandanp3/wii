import { Vector3, OrientationData, MotionData } from '../../shared/protocol';
import { PoseState } from '../../shared/pose';

export interface TrackerConfig {
    accelVarThreshold: number; // Limiar de variância para ZUPT
    gyroMagThreshold: number;  // Limiar de rotação para ZUPT (deg/s)
    deadZone: number;          // Zona morta para remoção de ruído (m/s²)
    biasAlpha: number;         // Taxa de aprendizado do viés
}

export const DEFAULT_TRACKER_CONFIG: TrackerConfig = {
    accelVarThreshold: 0.08,
    gyroMagThreshold: 15.0,
    deadZone: 0.05,
    biasAlpha: 0.05,
};

export class InertialTracker {
    private config: TrackerConfig;
    
    private position: Vector3 = { x: 0, y: 0, z: 0 };
    private velocity: Vector3 = { x: 0, y: 0, z: 0 };
    private prevWorldAccel: Vector3 = { x: 0, y: 0, z: 0 };
    private prevVelocity: Vector3 = { x: 0, y: 0, z: 0 };
    private bias: Vector3 = { x: 0, y: 0, z: 0 };

    private isStationary: boolean = true;
    private lastTimestamp: number = 0;

    private windowSize = 12;
    private accelMagHistory: number[] = [];
    private gyroMagHistory: number[] = [];

    private lastOrientation: OrientationData = { alpha: 0, beta: 0, gamma: 0 };
    private lastWorldAccel: Vector3 = { x: 0, y: 0, z: 0 };

    constructor(config: Partial<TrackerConfig> = {}) {
        this.config = { ...DEFAULT_TRACKER_CONFIG, ...config };
    }

    public reset(): void {
        this.position = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.prevWorldAccel = { x: 0, y: 0, z: 0 };
        this.prevVelocity = { x: 0, y: 0, z: 0 };
        this.bias = { x: 0, y: 0, z: 0 };
        this.accelMagHistory = [];
        this.gyroMagHistory = [];
        this.isStationary = true;
    }

    /**
     * Transforma vetor do referencial do Celular (Device) para o Mundo (World)
     * usando a Matriz de Rotação R = Rz(alpha) * Rx(beta) * Ry(gamma)
     */
    public transformDeviceToWorld(deviceVector: Vector3, orientation: OrientationData): Vector3 {
        const degToRad = Math.PI / 180;
        const alpha = orientation.alpha * degToRad; // Yaw
        const beta = orientation.beta * degToRad;   // Pitch
        const gamma = orientation.gamma * degToRad; // Roll

        const ca = Math.cos(alpha), sa = Math.sin(alpha);
        const cb = Math.cos(beta),  sb = Math.sin(beta);
        const cg = Math.cos(gamma), sg = Math.sin(gamma);

        const R = [
            [ca * cg - sa * sb * sg, -sa * cb, ca * sg + sa * sb * cg],
            [sa * cg + ca * sb * sg,  ca * cb, sa * sg - ca * sb * cg],
            [-cb * sg,               sb,       cb * cg]
        ];

        const x = R[0][0] * deviceVector.x + R[0][1] * deviceVector.y + R[0][2] * deviceVector.z;
        const y = R[1][0] * deviceVector.x + R[1][1] * deviceVector.y + R[1][2] * deviceVector.z;
        const z = R[2][0] * deviceVector.x + R[2][1] * deviceVector.y + R[2][2] * deviceVector.z;

        return { x, y, z };
    }

    public update(motion: MotionData, timestamp: number): PoseState {
        const orientation = motion.orientation || this.lastOrientation;
        this.lastOrientation = { ...orientation };

        // 1. Delta Time (limitado entre 1ms e 100ms)
        let dt = 0;
        if (this.lastTimestamp > 0 && timestamp > this.lastTimestamp) {
            dt = (timestamp - this.lastTimestamp) / 1000;
        }
        this.lastTimestamp = timestamp;
        dt = Math.max(0.001, Math.min(0.1, dt));

        // 2. Transforma aceleração local em aceleração mundial
        const rawWorldAccel = this.transformDeviceToWorld(motion.accelerometer, orientation);

        // 3. Atualiza buffers estatísticos para ZUPT
        const accelMag = Math.sqrt(
            rawWorldAccel.x * rawWorldAccel.x +
            rawWorldAccel.y * rawWorldAccel.y +
            rawWorldAccel.z * rawWorldAccel.z
        );

        const gyroMag = Math.sqrt(
            motion.gyroscope.x * motion.gyroscope.x +
            motion.gyroscope.y * motion.gyroscope.y +
            motion.gyroscope.z * motion.gyroscope.z
        );

        this.accelMagHistory.push(accelMag);
        this.gyroMagHistory.push(gyroMag);

        if (this.accelMagHistory.length > this.windowSize) this.accelMagHistory.shift();
        if (this.gyroMagHistory.length > this.windowSize) this.gyroMagHistory.shift();

        const accelMean = this.accelMagHistory.reduce((a, b) => a + b, 0) / this.accelMagHistory.length;
        const accelVar = this.accelMagHistory.reduce((sum, val) => sum + Math.pow(val - accelMean, 2), 0) / this.accelMagHistory.length;
        const gyroMean = this.gyroMagHistory.reduce((a, b) => a + b, 0) / this.gyroMagHistory.length;

        // Decisão de ZUPT (Zero-Velocity Update)
        this.isStationary = (accelVar < this.config.accelVarThreshold) && (gyroMean < this.config.gyroMagThreshold);

        if (this.isStationary) {
            // ZUPT: Força velocidade zero e calcula viés dinâmico do acelerômetro
            this.velocity = { x: 0, y: 0, z: 0 };
            this.prevVelocity = { x: 0, y: 0, z: 0 };

            this.bias.x = (1 - this.config.biasAlpha) * this.bias.x + this.config.biasAlpha * rawWorldAccel.x;
            this.bias.y = (1 - this.config.biasAlpha) * this.bias.y + this.config.biasAlpha * rawWorldAccel.y;
            this.bias.z = (1 - this.config.biasAlpha) * this.bias.z + this.config.biasAlpha * rawWorldAccel.z;

            this.lastWorldAccel = { x: 0, y: 0, z: 0 };
            this.prevWorldAccel = { x: 0, y: 0, z: 0 };
        } else {
            // Em Movimento: Remove viés dinâmico
            let netAccel = {
                x: rawWorldAccel.x - this.bias.x,
                y: rawWorldAccel.y - this.bias.y,
                z: rawWorldAccel.z - this.bias.z,
            };

            // Aplica Zona Morta (Dead Zone)
            if (Math.abs(netAccel.x) < this.config.deadZone) netAccel.x = 0;
            if (Math.abs(netAccel.y) < this.config.deadZone) netAccel.y = 0;
            if (Math.abs(netAccel.z) < this.config.deadZone) netAccel.z = 0;

            this.lastWorldAccel = netAccel;

            // Integração Trapezoidal: Aceleração -> Velocidade
            this.velocity.x += ((netAccel.x + this.prevWorldAccel.x) / 2) * dt;
            this.velocity.y += ((netAccel.y + this.prevWorldAccel.y) / 2) * dt;
            this.velocity.z += ((netAccel.z + this.prevWorldAccel.z) / 2) * dt;

            // Integração Trapezoidal: Velocidade -> Posição
            this.position.x += ((this.velocity.x + this.prevVelocity.x) / 2) * dt;
            this.position.y += ((this.velocity.y + this.prevVelocity.y) / 2) * dt;
            this.position.z += ((this.velocity.z + this.prevVelocity.z) / 2) * dt;

            this.prevWorldAccel = { ...netAccel };
            this.prevVelocity = { ...this.velocity };
        }

        return this.getPose(timestamp);
    }

    public getPose(timestamp: number = Date.now()): PoseState {
        return {
            position: { ...this.position },
            velocity: { ...this.velocity },
            worldAcceleration: { ...this.lastWorldAccel },
            orientation: {
                yaw: this.lastOrientation.alpha,
                pitch: this.lastOrientation.beta,
                roll: this.lastOrientation.gamma,
            },
            bias: { ...this.bias },
            isStationary: this.isStationary,
            timestamp: timestamp,
        };
    }
}