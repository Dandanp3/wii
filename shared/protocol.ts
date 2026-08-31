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

export interface PingMessage {
    type: 'PING';
}

export interface PongMessage {
    type: 'PONG';
}

export type NetworkMessage = ButtonMessage | MotionMessage | PingMessage | PongMessage;