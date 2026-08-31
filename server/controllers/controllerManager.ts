import { ButtonType, MotionMessage, ProcessedMotionData } from '../../shared/protocol';
import { MotionProcessor } from '../processor/MotionProcessor';

export interface ButtonsState {
    A: boolean; B: boolean; One: boolean; Two: boolean;
    DPadUp: boolean; DPadDown: boolean; DPadLeft: boolean; DPadRight: boolean;
    Plus: boolean; Minus: boolean; Home: boolean;
}

export interface MotionState {
    rawAccelerometer: { x: number; y: number; z: number };
    rawGyroscope: { x: number; y: number; z: number };
    timestamp: number;
    interval: number;
    active: boolean;
}

export interface ControllerState {
    buttons: ButtonsState;
    motion: MotionState;
    processedMotion: ProcessedMotionData;
}

export class ControllerManager {
    private motionProcessor = new MotionProcessor();

    private state: ControllerState = {
        buttons: {
            A: false, B: false, One: false, Two: false,
            DPadUp: false, DPadDown: false, DPadLeft: false, DPadRight: false,
            Plus: false, Minus: false, Home: false,
        },
        motion: {
            rawAccelerometer: { x: 0, y: 0, z: 0 },
            rawGyroscope: { x: 0, y: 0, z: 0 },
            timestamp: 0,
            interval: 0,
            active: false,
        },
        processedMotion: {
            linearAcceleration: { x: 0, y: 0, z: 0 },
            filteredGyroscope: { x: 0, y: 0, z: 0 },
            gravity: { x: 0, y: 0, z: 9.81 },
            motionMagnitude: 0,
            movementState: 'IDLE',
            shakeDetected: false,
            isCalibrated: false,
        }
    };

    private buttonMap: Record<ButtonType, keyof ButtonsState> = {
        A: 'A', B: 'B', '1': 'One', '2': 'Two',
        DPAD_UP: 'DPadUp', DPAD_DOWN: 'DPadDown', DPAD_LEFT: 'DPadLeft', DPAD_RIGHT: 'DPadRight',
        PLUS: 'Plus', MINUS: 'Minus', HOME: 'Home',
    };

    public updateButton(button: string, state: string): boolean {
        if (!this.buttonMap[button as ButtonType] || (state !== 'pressed' && state !== 'released')) {
            return false;
        }

        const stateKey = this.buttonMap[button as ButtonType];
        const isPressed = state === 'pressed';

        if (this.state.buttons[stateKey] !== isPressed) {
            this.state.buttons[stateKey] = isPressed;
            return true;
        }

        return false;
    }

    public updateMotion(message: any): boolean {
        if (!message || typeof message !== 'object') return false;
        if (message.type !== 'MOTION' || message.version !== 1) return false;
        if (typeof message.timestamp !== 'number' || !Number.isFinite(message.timestamp)) return false;

        const motion = message.motion;
        if (!motion || typeof motion !== 'object') return false;

        const accel = motion.accelerometer;
        const gyro = motion.gyroscope;
        if (!accel || !gyro) return false;

        const isValidNum = (v: any) => typeof v === 'number' && Number.isFinite(v);

        if (!isValidNum(accel.x) || !isValidNum(accel.y) || !isValidNum(accel.z)) return false;
        if (!isValidNum(gyro.x) || !isValidNum(gyro.y) || !isValidNum(gyro.z)) return false;

        // Atualiza Motion Bruto
        this.state.motion = {
            rawAccelerometer: { x: accel.x, y: accel.y, z: accel.z },
            rawGyroscope: { x: gyro.x, y: gyro.y, z: gyro.z },
            timestamp: message.timestamp,
            interval: isValidNum(motion.interval) ? motion.interval : 0,
            active: true,
        };

        // Processa os dados através da camada isolada MotionProcessor
        this.state.processedMotion = this.motionProcessor.process(motion, message.timestamp);

        return true;
    }

    public calibrate(): void {
        this.motionProcessor.calibrate();
    }

    public getState(): Readonly<ControllerState> {
        return this.state;
    }
}
