import { WebSocketServer, WebSocket } from 'ws';

class DevToolsBridge {
    constructor(port) {
        this.wss = null;
        this.authenticatedClients = new Set();
        this.pendingUpdate = null;
        this.waitingResolvers = [];
        this.startError = null;
        this.started = false;
        this.port = port ?? parseInt(process.env.DEVTOOLS_PORT || "9778", 10);
    }
    get isListening() {
        return this.wss !== null && this.startError === null;
    }
    ensureStarted() {
        if (this.started)
            return;
        this.started = true;
        this.start();
    }
    start() {
        try {
            this.wss = new WebSocketServer({ port: this.port });
        }
        catch (err) {
            if (err?.code === "EADDRINUSE") {
                this.startError = `Port ${this.port} is already in use by another process. Kill the other process or set DEVTOOLS_PORT to use a different port.`;
                return;
            }
            throw err;
        }
        this.wss.on("error", (err) => {
            if (err?.code === "EADDRINUSE") {
                this.startError = `Port ${this.port} is already in use by another process. Kill the other process or set DEVTOOLS_PORT to use a different port.`;
                this.wss = null;
            }
        });
        this.wss.on("connection", (ws) => {
            let authenticated = false;
            const authTimeout = setTimeout(() => {
                if (!authenticated) {
                    ws.close(4001, "Auth timeout");
                }
            }, 5000);
            ws.on("message", async (data) => {
                let msg;
                try {
                    msg = JSON.parse(data.toString());
                }
                catch {
                    return;
                }
                if (!authenticated) {
                    if (msg.type === "auth") {
                        clearTimeout(authTimeout);
                        const valid = await this.validateToken(msg.token);
                        if (valid) {
                            authenticated = true;
                            this.authenticatedClients.add(ws);
                            ws.send(JSON.stringify({
                                type: "auth-result",
                                success: true,
                                serverVersion: "0.0.1",
                            }));
                        }
                        else {
                            ws.send(JSON.stringify({
                                type: "auth-result",
                                success: false,
                            }));
                            ws.close(4003, "Auth failed");
                        }
                    }
                    return;
                }
                if (msg.type === "animation-update") {
                    this.pendingUpdate = {
                        prompt: msg.prompt,
                        timestamp: msg.timestamp,
                    };
                    // Resolve any waiting long-poll requests
                    for (const waiter of this.waitingResolvers) {
                        clearTimeout(waiter.timer);
                        waiter.resolve(this.pendingUpdate);
                    }
                    this.waitingResolvers = [];
                }
            });
            ws.on("close", () => {
                clearTimeout(authTimeout);
                this.authenticatedClients.delete(ws);
            });
        });
    }
    async validateToken(token) {
        try {
            const res = await fetch("https://api.motion.dev/me/is-valid-token", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok)
                return false;
            const data = (await res.json());
            return !!data.isPlus;
        }
        catch {
            return false;
        }
    }
    waitForUpdate(timeoutMs) {
        // If there's already a pending update, return it immediately
        if (this.pendingUpdate) {
            const update = this.pendingUpdate;
            return Promise.resolve(update);
        }
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                const idx = this.waitingResolvers.findIndex((w) => w.resolve === resolve);
                if (idx !== -1)
                    this.waitingResolvers.splice(idx, 1);
                resolve(null);
            }, timeoutMs);
            this.waitingResolvers.push({ resolve, timer });
        });
    }
    consumeUpdate(timestamp) {
        if (this.pendingUpdate?.timestamp === timestamp) {
            this.pendingUpdate = null;
        }
        // Notify devtools clients that the update was consumed
        for (const client of this.authenticatedClients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: "update-consumed",
                    timestamp,
                }));
            }
        }
    }
    getStatus() {
        return {
            listening: this.isListening,
            error: this.startError,
            connected: this.authenticatedClients.size,
            hasPendingUpdate: this.pendingUpdate !== null,
            port: this.port,
        };
    }
    stop() {
        for (const waiter of this.waitingResolvers) {
            clearTimeout(waiter.timer);
            waiter.resolve(null);
        }
        this.waitingResolvers = [];
        this.wss?.close();
        this.wss = null;
    }
}

export { DevToolsBridge };
