import WebSocket from 'ws';
import readline from 'readline';
import { ButtonType, ButtonState, NetworkMessage } from '../shared/protocol';

const SERVER_IP = 'localhost';
const SERVER_PORT = 8080;
const SERVER_URL = `ws://${SERVER_IP}:${SERVER_PORT}`;

// Mantém o estado atual de cada botão no cliente para fazer o "toggle" (Aperta/Solta)
const clientButtonState: Record<ButtonType, boolean> = {
    A: false, B: false, '1': false, '2': false,
    DPAD_UP: false, DPAD_DOWN: false, DPAD_LEFT: false, DPAD_RIGHT: false,
    PLUS: false, MINUS: false, HOME: false
};

console.log(`[CLIENT] Tentando conectar em ${SERVER_URL}...`);

const ws = new WebSocket(SERVER_URL);

ws.on('open', () => {
    console.log(`[CLIENT] Conexão estabelecida com sucesso!\n`);
    printControlsMenu();
    setupKeyboardInput();
});

ws.on('close', () => {
    console.log(`\n[CLIENT] Desconectado do servidor.`);
    process.exit(0);
});

ws.on('error', (error) => {
    console.error(`[CLIENT] Erro de conexão:`, error.message);
});

function toggleAndSendButton(button: ButtonType) {
    if (ws.readyState !== WebSocket.OPEN) return;

    // Inverte o estado local (Toggle)
    clientButtonState[button] = !clientButtonState[button];
    const newState: ButtonState = clientButtonState[button] ? 'pressed' : 'released';

    const message: NetworkMessage = {
        type: 'BUTTON',
        button,
        state: newState,
    };
    
    ws.send(JSON.stringify(message));
    console.log(`[CLIENT] Sent: ${button} -> ${newState.toUpperCase()}`);
}

function printControlsMenu() {
    console.log(`===================================================`);
    console.log(`    WII REMOTE VIRTUAL - CONTROLES (MODO TOGGLE)   `);
    console.log(`   (Aperte a tecla 1x para PRESSED, 2x para RELEASED) `);
    console.log(`===================================================`);
    console.log(`  [a] -> Botão A        [b] -> Botão B             `);
    console.log(`  [1] -> Botão 1        [2] -> Botão 2             `);
    console.log(`  [+] -> Botão Plus (+) [-] -> Botão Minus (-)     `);
    console.log(`  [h] -> Botão Home                                `);
    console.log(`  [Seta Cima]    -> D-Pad Up                       `);
    console.log(`  [Seta Baixo]   -> D-Pad Down                     `);
    console.log(`  [Seta Esquerda]-> D-Pad Left                     `);
    console.log(`  [Seta Direita] -> D-Pad Right                    `);
    console.log(`  [q] -> Sair                                      `);
    console.log(`===================================================\n`);
}

function setupKeyboardInput() {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }

    process.stdin.on('keypress', (str, key) => {
        if (key.ctrl && key.name === 'c') {
            process.exit();
        }

        if (key.name === 'q') {
            console.log(`[CLIENT] Encerrando...`);
            ws.close();
            return;
        }

        let buttonToTrigger: ButtonType | null = null;

        switch (key.name) {
            case 'up': buttonToTrigger = 'DPAD_UP'; break;
            case 'down': buttonToTrigger = 'DPAD_DOWN'; break;
            case 'left': buttonToTrigger = 'DPAD_LEFT'; break;
            case 'right': buttonToTrigger = 'DPAD_RIGHT'; break;
        }

        if (!buttonToTrigger) {
            switch (str) {
                case 'a': case 'A': buttonToTrigger = 'A'; break;
                case 'b': case 'B': buttonToTrigger = 'B'; break;
                case '1': buttonToTrigger = '1'; break;
                case '2': buttonToTrigger = '2'; break;
                case '+': case '=': buttonToTrigger = 'PLUS'; break;
                case '-': case '_': buttonToTrigger = 'MINUS'; break;
                case 'h': case 'H': buttonToTrigger = 'HOME'; break;
            }
        }

        if (buttonToTrigger) {
            toggleAndSendButton(buttonToTrigger);
        }
    });
}