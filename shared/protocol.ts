export type ButtonType = 
    | 'A' | 'B' | '1' | '2' 
    | 'DPAD_UP' | 'DPAD_DOWN' | 'DPAD_LEFT' | 'DPAD_RIGHT' 
    | 'PLUS' | 'MINUS' | 'HOME';

export type ButtonState = 'pressed' | 'released';

export interface ButtonMessage {
    type: 'BUTTON';
    button: ButtonType;
    state: ButtonState;
}

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface MotionData {
    accelerometer: Vector3;
    gyroscope: Vector3;
    interval?: number;
}

export interface MotionMessage {
    type: 'MOTION';
    version: 1;
    timestamp: number;
    motion: MotionData;
}

export interface CalibrateMessage {
    type: 'CALIBRATE';
}

export interface PingMessage {
    type: 'PING';
}

export interface PongMessage {
    type: 'PONG';
}

export type NetworkMessage = ButtonMessage | MotionMessage | CalibrateMessage | PingMessage | PongMessage;

export type MovementState = 'IDLE' | 'MOVING';

export interface ProcessedMotionData {
    linearAcceleration: Vector3;
    filteredGyroscope: Vector3;
    gravity: Vector3;
    motionMagnitude: number;
    movementState: MovementState;
    shakeDetected: boolean;
    isCalibrated: boolean;
}
