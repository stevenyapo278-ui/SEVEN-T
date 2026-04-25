#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { initPlusDocsResources } from './resources/docs-plus.mjs';
import { initDocsResources } from './resources/docs.mjs';
import { initCodexTool } from './tools/codex.mjs';
import { initGenerateBounceEasingTool } from './tools/generate-bounce-easing.mjs';
import { initGenerateSpringTool } from './tools/generate-spring.mjs';
import { initVisualiseCubicBezierTool } from './tools/visualise-cubic-bezier.mjs';
import { initVisualiseSpringTool } from './tools/visualise-spring.mjs';
import { DevToolsBridge } from './devtools-bridge.mjs';
import { initDevToolsUpdateTool } from './tools/devtools-update.mjs';
import { initDevToolsStatusTool } from './tools/devtools-status.mjs';

const server = new McpServer({
    name: "Motion Studio",
    version: "0.0.1",
}, {
    capabilities: {
        resources: {},
        tools: {},
    },
});
// Free tier: docs only
initDocsResources(server);
const token = process.env.TOKEN;
if (token) {
    const response = await fetch("https://api.motion.dev/me/is-valid-token", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (response.ok) {
        const data = (await response.json());
        if (data.isAIKit) {
            // AI Kit tier: spring/bounce generators + visualisations
            initGenerateSpringTool(server);
            initGenerateBounceEasingTool(server);
            initVisualiseSpringTool(server);
            initVisualiseCubicBezierTool(server);
        }
        if (data.isPlus) {
            // Plus tier: codex with docs + examples, plus docs
            initCodexTool(server, token, { includeExamples: true });
            initPlusDocsResources(server);
            // DevTools bridge: lazy-started on first tool call
            const bridge = new DevToolsBridge();
            initDevToolsUpdateTool(server, bridge);
            initDevToolsStatusTool(server, bridge);
        }
        else if (data.isAIKit) {
            // AI Kit tier: codex with docs only
            initCodexTool(server, token, { includeExamples: false });
        }
    }
}
// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
