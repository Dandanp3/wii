import { WebSocketServer, WebSocket } from 'ws';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ControllerManager } from './controllers/controllerManager';
import { NetworkMessage } from '../shared/protocol';

const PORT = 8080;
const controllerManager = new ControllerManager();

let motionPacketCount = 0;
let currentHz = 0;

// Exibição Periódica dos Logs
setInterval(() => {
    currentHz = motionPacketCount;
    motionPacketCount = 0;

    const state = controllerManager.getState();
    if (state.motion.active) {
        const p = state.processedMotion;
        const cal = p.isCalibrated ? '[CALIBRATED]' : '[UNCALIBRATED]';
        console.log(`[MOTION] ${currentHz} Hz | Status: ${p.movementState} | Mag: ${p.motionMagnitude.toFixed(2)} m/s² | ${cal}`);
    }
}, 1000);

function getLocalIPAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        if (!iface) continue;
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '127.0.0.1';
}

const certPath = path.join(__dirname, '../certs/cert.pem');
const keyPath = path.join(__dirname, '../certs/key.pem');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.error(`[ERROR] Certificados SSL não encontrados em ${path.join(__dirname, '../certs')}`);
    process.exit(1);
}

const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
};

const server = https.createServer(httpsOptions, (req, res) => {
    let filePath = path.join(__dirname, '../public', req.url === '/' ? 'index.html' : req.url!);
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('Arquivo não encontrado');
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
        }
    });
});

const wss = new WebSocketServer({ server });
const hostIP = getLocalIPAddress();

server.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(`[SERVER] Fase 5 - Processamento de Movimento Rodando!`);
    console.log(`[SERVER] Celular HTTPS: https://${hostIP}:${PORT}`);
    console.log(`=============================================================\n`);
});

wss.on('connection', (ws: WebSocket, req) => {
    const clientIP = req.socket.remoteAddress;
    console.log(`[SERVER] Controller connected: ${clientIP}\n`);

    ws.on('message', (rawMessage: Buffer) => {
        try {
            const message: NetworkMessage = JSON.parse(rawMessage.toString());

            if (message.type === 'PING') {
                ws.send(JSON.stringify({ type: 'PONG' }));
            } else if (message.type === 'BUTTON') {
                const mudou = controllerManager.updateButton(message.button, message.state);
                if (mudou) {
                    console.log(`[BUTTON] [${message.button}] ${message.state.toUpperCase()}`);
                }
            } else if (message.type === 'CALIBRATE') {
                controllerManager.calibrate();
                console.log(`\n=============================================================`);
                console.log(`[CALIBRATION] Controle Calibrado com sucesso!`);
                console.log(`=============================================================\n`);
            } else if (message.type === 'MOTION') {
                const valid = controllerManager.updateMotion(message);
                if (valid) {
                    motionPacketCount++;
                    const processed = controllerManager.getState().processedMotion;
                    
                    // Notificação de evento pontual de SHAKE no servidor
                    if (processed.shakeDetected) {
                        console.log(`\n⚡ [EVENT] SHAKE DETECTED! (Mag: ${processed.motionMagnitude.toFixed(2)} m/s²)\n`);
                    }
                }
            }
        } catch (error) {
            console.log(`[SERVER] Invalid JSON received`);
        }
    });

    ws.on('close', () => {
        console.log(`[SERVER] Controller disconnected: ${clientIP}\n`);
    });
});
