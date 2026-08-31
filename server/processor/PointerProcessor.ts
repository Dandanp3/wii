import { OrientationData, PointerState, PointerMode } from '../../shared/protocol';
import { PoseState } from '../../shared/pose';
import { PointerConfig, DEFAULT_POINTER_CONFIG } from '../config/pointerConfig';

export class PointerProcessor {
    private config: PointerConfig;
    
    private currentX: number;
    private currentY: number;
    private isCalibrated: boolean = false;
    private mode: PointerMode = 'ROTATION';

    private calibrationOffset = {
        alpha: 0,
        beta: 0,
        gamma: 0,
    };

    private calibrationPosePosition = { x: 0, y: 0, z: 0 };
    private lastOrientation: OrientationData = { alpha: 0, beta: 0, gamma: 0 };

    constructor(config: Partial<PointerConfig> = {}) {
        this.config = { ...DEFAULT_POINTER_CONFIG, ...config };
        this.currentX = this.config.screenWidth / 2;
        this.currentY = this.config.screenHeight / 2;
    }

    public setMode(mode: PointerMode): void {
        this.mode = mode;
    }

    public getMode(): PointerMode {
        return this.mode;
    }

    public calibrate(orientation?: OrientationData, pose?: PoseState): void {
        const targetOrientation = orientation || this.lastOrientation;
        
        this.calibrationOffset = {
            alpha: targetOrientation.alpha,
            beta: targetOrientation.beta,
            gamma: targetOrientation.gamma,
        };

        if (pose) {
            this.calibrationPosePosition = { ...pose.position };
        }
        
        this.currentX = this.config.screenWidth / 2;
        this.currentY = this.config.screenHeight / 2;
        this.isCalibrated = true;
    }

    public process(orientation: OrientationData | undefined, pose?: PoseState): PointerState {
        if (!orientation) {
            return this.getState();
        }

        this.lastOrientation = { ...orientation };

        if (!this.isCalibrated) {
            return this.getState();
        }

        // 1. Componente de Rotação (Yaw / Pitch)
        let deltaAlpha = orientation.alpha - this.calibrationOffset.alpha;
        if (deltaAlpha > 180) deltaAlpha -= 360;
        if (deltaAlpha < -180) deltaAlpha += 360;

        let deltaBeta = orientation.beta - this.calibrationOffset.beta;
        if (deltaBeta > 180) deltaBeta -= 360;
        if (deltaBeta < -180) deltaBeta += 360;

        const dirX = this.config.invertX ? -1 : 1;
        const dirY = this.config.invertY ? -1 : 1;

        let targetX = (this.config.screenWidth / 2) + (deltaAlpha * this.config.sensitivityX * dirX);
        let targetY = (this.config.screenHeight / 2) + (deltaBeta * this.config.sensitivityY * dirY);

        // 2. Adiciona componente 6-DOF (Deslocamento Inercial Físico) se ativo
        if (this.mode === '6DOF' && pose) {
            const deltaPosX = pose.position.x - this.calibrationPosePosition.x;
            const deltaPosY = pose.position.y - this.calibrationPosePosition.y;

            // Translação no ar: Subir o celular diminui o Y da tela
            targetX += (deltaPosX * this.config.sensitivity6DofX * dirX);
            targetY -= (deltaPosY * this.config.sensitivity6DofY * dirY);
        }

        // 3. Suavização (Low-Pass Filter)
        const alphaFilter = 1 - this.config.smoothingFactor;
        const smoothedX = this.currentX + alphaFilter * (targetX - this.currentX);
        const smoothedY = this.currentY + alphaFilter * (targetY - this.currentY);

        // 4. Clamping
        this.currentX = Math.max(0, Math.min(this.config.screenWidth, smoothedX));
        this.currentY = Math.max(0, Math.min(this.config.screenHeight, smoothedY));

        return this.getState();
    }

    public getState(): PointerState {
        return {
            x: Math.round(this.currentX),
            y: Math.round(this.currentY),
            visible: this.isCalibrated,
            mode: this.mode,
            isCalibrated: this.isCalibrated,
            rawOrientation: { ...this.lastOrientation },
            calibrationOffset: { ...this.calibrationOffset },
        };
    }
}