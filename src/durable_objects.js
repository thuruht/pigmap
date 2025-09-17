// src/durable_objects.js

export class LivestockReport {
    constructor(state, env) {
        this.state = state;
        // The state object is still available for managing WebSocket sessions,
        // but we'll use a simple in-memory array for this example.
        // For hibernation support, you would manage sessions in this.state.storage.
        this.sessions = [];
    }

    async fetch(request) {
        const url = new URL(request.url);

        if (url.pathname.endsWith('/broadcast')) {
            const data = await request.json();
            this.broadcast(JSON.stringify(data));
            return new Response('Broadcasted', { status: 200 });
        }
        
        if (request.headers.get('Upgrade') !== 'websocket') {
            return new Response('Expected a WebSocket connection', { status: 400 });
        }
        
        const [client, server] = Object.values(new WebSocketPair());
        this.handleSession(server);
        
        return new Response(null, { status: 101, webSocket: client });
    }

    handleSession(webSocket) {
        webSocket.accept();
        this.sessions.push(webSocket);

        const closeOrErrorHandler = () => {
            this.sessions = this.sessions.filter(session => session !== webSocket);
        };
        webSocket.addEventListener('close', closeOrErrorHandler);
        webSocket.addEventListener('error', closeOrErrorHandler);
    }

    broadcast(message) {
        this.sessions = this.sessions.filter(session => {
            try {
                session.send(message);
                return true;
            } catch (err) {
                // Connection is broken, filter it out.
                return false;
            }
        });
    }
}
