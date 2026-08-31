import { WebSocketServer, WebSocket } from 'ws';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ControllerManager } from './controllers/controllerManager';
import { NetworkMessage } from '../shared/protocol';

const PORT = 8080;
const controllerManager = new ControllerManager();

// Estatísticas de Frequência de Pacotes
let motionPacketCount = 0;
let currentHz = 0;

// Log periódico da taxa de recepção
setInterval(() => {
    currentHz = motionPacketCount;
    motionPacketCount = 0;

    const state = controllerManager.getState();
    if (state.motion.active) {
        const a = state.motion.accelerometer;
        const g = state.motion.gyroscope;
        console.log(`[MOTION STREAM] Rate: ${currentHz} pkts/s | Accel X:${a.x.toFixed(2)} Y:${a.y.toFixed(2)} Z:${a.z.toFixed(2)} | Gyro X:${g.x.toFixed(2)} Y:${g.y.toFixed(2)} Z:${g.z.toFixed(2)}`);
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

// Carrega os certificados SSL
const certPath = path.join(__dirname, '../certs/cert.pem');
const keyPath = path.join(__dirname, '../certs/key.pem');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.error(`[ERROR] Certificados SSL não encontrados em ${path.join(__dirname, '../certs')}`);
    console.error(`Gere-os com o comando openssl antes de iniciar o servidor.`);
    process.exit(1);
}

const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
};

// Servidor Web HTTPS Estático para servir public/index.html
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

// Servidor WebSocket acoplado ao HTTPS
const wss = new WebSocketServer({ server });
const hostIP = getLocalIPAddress();

server.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(`[SERVER] Servidor HTTPS & WebSocket rodando!`);
    console.log(`[SERVER] Abra no navegador do celular: https://${hostIP}:${PORT}`);
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
            } else if (message.type === 'MOTION') {
                const valid = controllerManager.updateMotion(message);
                if (valid) {
                    motionPacketCount++;
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