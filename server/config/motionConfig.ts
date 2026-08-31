export interface MotionConfig {
    /** Coeficiente Alpha do Filtro Passa-Baixas para a gravidade (0.0 a 1.0) */
    gravityFilterAlpha: number;
    /** Coeficiente Alpha para suavização do giroscópio */
    gyroFilterAlpha: number;
    /** Limiar de magnitude (m/s²) para considerar estado MOVING */
    movingThreshold: number;
    /** Limiar de aceleração linear (m/s²) para considerar um pico de SHAKE */
    shakeThreshold: number;
    /** Quantidade mínima de picos para disparar o SHAKE */
    shakeMinPeaks: number;
    /** Janela de tempo (ms) para acumular os picos de SHAKE */
    shakeWindowMs: number;
    /** Tempo de espera (ms) após um SHAKE para permitir outro */
    shakeCooldownMs: number;
}

export const DEFAULT_MOTION_CONFIG: MotionConfig = {
    gravityFilterAlpha: 0.8,
    gyroFilterAlpha: 0.4,
    movingThreshold: 0.6,
    shakeThreshold: 13.0,
    shakeMinPeaks: 2,
    shakeWindowMs: 400,
    shakeCooldownMs: 750,
};