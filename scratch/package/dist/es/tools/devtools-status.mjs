const description = `Returns the current status of the DevTools bridge connection.

Shows the number of connected DevTools clients, whether there is a pending animation update, and the WebSocket port.`;
function initDevToolsStatusTool(server, bridge) {
    server.tool("devtools-status", description, {}, async () => {
        bridge.ensureStarted();
        const status = bridge.getStatus();
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(status, null, 2),
                },
            ],
        };
    });
}

export { initDevToolsStatusTool };
