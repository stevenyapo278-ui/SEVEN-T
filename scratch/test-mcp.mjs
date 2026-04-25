import { spawn } from 'child_process';

const cmd = 'npx';
const args = ['-y', 'https://api.motion.dev/registry.tgz?package=motion-studio-mcp&version=latest'];

const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });

let output = '';
child.stdout.on('data', (data) => {
    output += data.toString();
    console.log('STDOUT:', data.toString());
});

child.stderr.on('data', (data) => {
    console.log('STDERR:', data.toString());
});

const send = (msg) => {
    child.stdin.write(JSON.stringify(msg) + '\n');
};

// Step 1: Initialize
setTimeout(() => {
    console.log('Sending initialize...');
    send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0' }
        }
    });
}, 5000);

// Step 2: List tools
setTimeout(() => {
    console.log('Sending tools/list...');
    send({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
    });
}, 10000);

setTimeout(() => {
    child.kill();
    process.exit(0);
}, 15000);
