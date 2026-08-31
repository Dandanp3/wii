export interface PointerConfig {
    screenWidth: number;
    screenHeight: number;
    sensitivityX: number;
    sensitivityY: number;
    sensitivity6DofX: number; // Pixels por metro de deslocamento X
    sensitivity6DofY: number; // Pixels por metro de deslocamento Y
    smoothingFactor: number;
    invertX: boolean;
    invertY: boolean;
}

export const DEFAULT_POINTER_CONFIG: PointerConfig = {
    screenWidth: 1280,
    screenHeight: 720,
    sensitivityX: 28,
    sensitivityY: 28,
    sensitivity6DofX: 1200, // 1 metro de deslocamento no ar = 1200 pixels na tela
    sensitivity6DofY: 1200,
    smoothingFactor: 0.2,
    invertX: true,
    invertY: true,
};