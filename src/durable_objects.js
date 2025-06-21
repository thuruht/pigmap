// PigMap.org - Durable Objects for Real-time Updates

export class LivestockReport {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.storage = state.storage;
    this.sessions = new Map(); // WebSocket sessions
    
    // Initialize report storage if needed
    this.state.blockConcurrencyWhile(async () => {
      const storedReports = await this.storage.get('reports');
      if (!storedReports) {
        await this.storage.put('reports', []);
      }
    });
  }
  
  // Handle HTTP requests to the Durable Object
  async fetch(request) {
    const url = new URL(request.url);
    
    // WebSocket connection
    if (url.pathname === '/connect') {
      // Upgrade the request to a WebSocket connection
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 400 });
      }
      
      // Create WebSocket pair
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();
      
      // Generate a unique session ID
      const sessionId = crypto.randomUUID();
      this.sessions.set(sessionId, server);
      
      // Send initial data
      const reports = await this.storage.get('reports') || [];
      if (reports.length > 0) {
        server.send(JSON.stringify({ type: 'initial', reports }));
      }
      
      // Set up event handlers
      server.addEventListener('message', async (event) => {
        // Handle incoming messages (if needed)
        try {
          const data = JSON.parse(event.data);
          // Process any client messages if needed
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });
      
      // Handle connection close
      const closeHandler = () => {
        this.sessions.delete(sessionId);
      };
      
      server.addEventListener('close', closeHandler);
      server.addEventListener('error', closeHandler);
      
      // Return the WebSocket client
      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }
    
    // Broadcast a message to all connected clients
    if (url.pathname === '/broadcast') {
      const report = await request.json();
      
      // Store recent reports (keep max 100)
      let reports = await this.storage.get('reports') || [];
      reports.unshift(report);
      reports = reports.slice(0, 100);
      await this.storage.put('reports', reports);
      
      // Broadcast to all connected WebSocket sessions
      const message = JSON.stringify({ type: 'update', report });
      this.sessions.forEach((session) => {
        try {
          session.send(message);
        } catch (error) {
          // Ignore errors - session will be cleaned up on next 'close' event
        }
      });
      
      return new Response('Broadcast sent', { status: 200 });
    }
    
    // Get recent reports
    if (url.pathname === '/reports') {
      const reports = await this.storage.get('reports') || [];
      return new Response(JSON.stringify(reports), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  }
}
