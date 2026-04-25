import { z } from 'zod';

const description = `Waits for animation updates from Motion DevTools.

When connected, the Motion DevTools Chrome extension automatically streams animation changes to this server as the user edits (debounced ~1s). Each update contains the full current-vs-original diff, so it is always self-contained. This tool long-polls for those updates.

The first response includes instructions for how to interpret and apply diffs. After applying the changes from an update, call this tool again to wait for the next update. Continue calling until the user asks you to stop.

Returns the animation diff describing what to change, or "no pending updates" if the timeout elapses.`;
const scaffold = `The user has edited an animation in Motion DevTools. Search the codebase for the source animation matching the details below and apply only the changed values. Do not change anything that has not changed.

## Rules for interpreting keyframes

- A single value means "animate to this value" (e.g. \`animate={{ x: 100 }}\`)
- \`null\` in a keyframe list means "animate from current value" — use \`null\` in the keyframe array (e.g. \`animate={{ x: [null, 100, 200] }}\`)
- Only use a keyframe array when there are more than two keyframes (including null). Two keyframes where the first is null should collapse to a single target value.
- Percentage offsets map to \`transition.times\` (as 0-1 fractions)

## Rules for applying changes

- Match existing code patterns. If the code uses \`useCycle\`, keep \`useCycle\`. If it uses \`animate\` prop, keep \`animate\` prop.
- Prefer minimal changes. Don't refactor surrounding code.
- If the diff mentions an auto-generated selector like \`div 1\`, find the corresponding element by matching the URL, DOM path, and animation values — not by selector name.
- Don't add comments explaining the changes.
- Don't wrap single target values in arrays.

## Self-audit

After applying changes, verify:
- Did you change the right file and the right animation?
- Did you preserve the existing code structure?
- Did you avoid introducing keyframe arrays when a single target value suffices?
- Did you only change what the diff describes?`;
const args = {
    timeout: z
        .number()
        .min(0)
        .max(60000)
        .default(30000)
        .describe("How long to wait for an update in milliseconds (0-60000, default 30000)"),
};
function initDevToolsUpdateTool(server, bridge) {
    let hasReturnedScaffold = false;
    server.tool("get-devtools-update", description, args, async ({ timeout }) => {
        bridge.ensureStarted();
        if (!bridge.isListening) {
            const status = bridge.getStatus();
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `DevTools bridge failed to start. ${status.error ?? "WebSocket server is not running."}\n\nTell the user to check for other Motion Studio MCP processes and kill them, then restart this MCP server.`,
                    },
                ],
            };
        }
        const update = await bridge.waitForUpdate(timeout);
        if (!update) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No pending updates. Call this tool again to continue waiting.",
                    },
                ],
            };
        }
        bridge.consumeUpdate(update.timestamp);
        const content = [];
        if (!hasReturnedScaffold) {
            hasReturnedScaffold = true;
            content.push({
                type: "text",
                text: scaffold,
            });
        }
        content.push({
            type: "text",
            text: update.prompt,
        });
        return { content };
    });
}

export { initDevToolsUpdateTool };
