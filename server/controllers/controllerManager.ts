import { ButtonType, ProcessedMotionData, PointerState, PointerMode } from '../../shared/protocol';
import { PoseState } from '../../shared/pose';
import { MotionProcessor } from '../processor/MotionProcessor';
import { PointerProcessor } from '../processor/PointerProcessor';
import { InertialTracker } from '../tracker/InertialTracker';

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
    pointer: PointerState;
    pose: PoseState;
}

export class ControllerManager {
    private motionProcessor = new MotionProcessor();
    private pointerProcessor = new PointerProcessor();
    private inertialTracker = new InertialTracker();

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
        },
        pointer: {
            x: 640,
            y: 360,
            visible: false,
            isCalibrated: false,
            mode: 'ROTATION',
            rawOrientation: { alpha: 0, beta: 0, gamma: 0 },
            calibrationOffset: { alpha: 0, beta: 0, gamma: 0 },
        },
        pose: {
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            worldAcceleration: { x: 0, y: 0, z: 0 },
            orientation: { yaw: 0, pitch: 0, roll: 0 },
            bias: { x: 0, y: 0, z: 0 },
            isStationary: true,
            timestamp: 0,
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

        this.state.motion = {
            rawAccelerometer: { x: accel.x, y: accel.y, z: accel.z },
            rawGyroscope: { x: gyro.x, y: gyro.y, z: gyro.z },
            timestamp: message.timestamp,
            interval: isValidNum(motion.interval) ? motion.interval : 0,
            active: true,
        };

        // 1. Processa aceleração e shake
        this.state.processedMotion = this.motionProcessor.process(motion, message.timestamp);

        // 2. Processa rastreamento inercial (InertialTracker)
        this.state.pose = this.inertialTracker.update(motion, message.timestamp);

        // 3. Processa posição 2D do ponteiro
        if (motion.orientation) {
            this.state.pointer = this.pointerProcessor.process(motion.orientation, this.state.pose);
        }

        return true;
    }

    public setPointerMode(mode: PointerMode): void {
        this.pointerProcessor.setMode(mode);
        this.state.pointer.mode = mode;
    }

    public calibrateMotion(): void {
        this.motionProcessor.calibrate();
        this.inertialTracker.reset();
    }

    public calibratePointer(): void {
        this.inertialTracker.reset();
        this.pointerProcessor.calibrate(undefined, this.state.pose);
        this.state.pointer = this.pointerProcessor.getState();
        this.state.pose = this.inertialTracker.getPose();
    }

    public getState(): Readonly<ControllerState> {
        return this.state;
    }
}
