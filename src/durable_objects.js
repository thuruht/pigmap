// src/durable_objects.js
// Uses WebSocket Hibernation API — connections survive Worker restarts/evictions.

export class LivestockReport {
    constructor(state, env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request) {
        const url = new URL(request.url);

        if (url.pathname.endsWith('/broadcast')) {
            const data = await request.json();
            this.broadcast(JSON.stringify(data));
            return new Response('Broadcasted', { status: 200 });
        }

        if (url.pathname.endsWith('/stats')) {
            return new Response(JSON.stringify({
                activeSessions: this.state.getWebSockets().length
            }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (request.headers.get('Upgrade') !== 'websocket') {
            return new Response('Expected a WebSocket connection', { status: 400 });
        }

        const [client, server] = Object.values(new WebSocketPair());
        // Hibernation API: the runtime manages sessions across evictions.
        this.state.acceptWebSocket(server);

        const activeUsers = this.state.getWebSockets().length;
        server.send(JSON.stringify({ type: 'welcome', activeUsers }));
        this.broadcast(JSON.stringify({ type: 'active_users', count: activeUsers }), server);

        return new Response(null, { status: 101, webSocket: client });
    }

    // Hibernation event handlers — called by the runtime.
    async webSocketMessage(ws, message) {
        try {
            const data = JSON.parse(message);
            if (data.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
            }
        } catch (e) {
            // ignore malformed messages
        }
    }

    async webSocketClose(ws, code, reason) {
        const count = this.state.getWebSockets().length;
        this.broadcast(JSON.stringify({ type: 'active_users', count }));
    }

    async webSocketError(ws, error) {
        console.error('WebSocket error in DO:', error);
    }

    broadcast(message, skipWs = null) {
        for (const ws of this.state.getWebSockets()) {
            if (ws === skipWs) continue;
            try {
                ws.send(message);
            } catch (e) {
                // Hibernation API handles cleanup automatically; ignore send errors.
            }
        }
    }
}
