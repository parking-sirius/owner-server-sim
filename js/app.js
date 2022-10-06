const snakeToCamel = (str) => str.replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
const generateRandomId = () => Array(24).fill().map( () => Math.floor(Math.random()*36).toString(36) ).join('');

class WebSocketProtocol
{
    #ws = null;
    #state = null;
    #stateUpdateCallback = null;

    constructor(state, stateUpdateCallback) {
        this.#state = state;
        this.#stateUpdateCallback = stateUpdateCallback;
    }

    open(url) {
        this.close();
        this.#ws = new WebSocket(url);
        this.#ws.onmessage = (event) => this.#onmessage(event);
    }

    close() {
        this.#ws?.close();
    }

    #onmessage(event) {
        const packet = JSON.parse(event.data);

        // TODO: Add error handling
        this[snakeToCamel(packet.action)](packet);
    }

    #sendRawPacket(packet) {
        this.#ws.send(JSON.stringify(packet));
    }

    #sendPacket(action, data) {
        let packet = {
            'action': action,
            'id': generateRandomId(),
            'status': 'ok',
            'data': data
        };
        this.#sendRawPacket(packet);
    }

    #respondToPacket(packet, data) {
        let responsePacket = {
            'action': packet.action,
            'id': packet.id,
            'status': 'ok',
            'data': data
        };
        this.#sendRawPacket(responsePacket);
    }

    fullSync(packet) {
        this.#respondToPacket(packet, this.#state);
    }

    partSync(packet) {
        const resp = {};

        packet.data.forEach((slot) => {
            resp[slot] = this.#state[slot];
        });
        
        this.#respondToPacket(packet, resp);
    }

    updatePlaceStatus(packet) {
        Object.entries(packet.data).forEach((slot, state) => {
            this.#state[slot] = state;
        });
        this.#stateUpdateCallback?.();
    }
}

class ParkingCanvas {
    #ctx = document.getElementById('parking_canvas').getContext('2d');
    #state = null;

    constructor(state) {
        this.#state = state;
    }

    #drawSlotState(x, y, slot) {
        const state = this.#state[slot];
        if(!state) return;

        this.#ctx.fillStyle = state == 1 ? '#000000' : '#ee00007f';
        this.#ctx.fillRect(x + 4, y + 8, 56 - 8, 96 - 16)
    }

    redrawCanvas() {
        this.#ctx.translate(0.5, 0.5);
        
        this.#ctx.textBaseline = 'top';
        this.#ctx.font = '24px mono';
        
        for(let i = 0; i < 9; i++) {
            const x = 16 + i * 56;
            this.#ctx.beginPath();
            this.#ctx.moveTo(x, 64);
            this.#ctx.lineTo(x, 128 + 128);
            this.#ctx.stroke();
            
            // Yes.
            if(i != 8) {
                this.#ctx.fillStyle = '#999999';
                this.#ctx.fillText((i + 1).toString(), x + 4, 68);
                this.#ctx.fillText((i + 9).toString(), x + 4, 164);
                
                this.#drawSlotState(x, 64, (i + 1).toString());
                this.#drawSlotState(x, 160, (i + 9).toString());
            }
        }
        this.#ctx.beginPath();
        this.#ctx.moveTo(16, 160);
        this.#ctx.lineTo(464, 160);
        this.#ctx.stroke();
    }
}

class App {
    #parkingState = [...Array(16).keys()].map((_) => Math.round(Math.random()));
    #canvas = new ParkingCanvas(this.#parkingState);
    #ws = new WebSocketProtocol(this.#parkingState, this.redraw);

    #btnConnect = document.getElementById('btnConnect');
    #btnDisconnect = document.getElementById('btnDisconnect');
    
    constructor() {
        this.#btnConnect.onclick = () => this.#ws.open(document.getElementById('wsurlbox').value);
        this.#btnDisconnect.onclick = () => this.#ws.close();
    }

    redraw() {
        this.#canvas.redrawCanvas();
    }
}

const app = new App();
app.redraw();
