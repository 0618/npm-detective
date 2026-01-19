const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let buffer = '';

server.stdout.on('data', (data) => {
  const chunk = data.toString();
  buffer += chunk;

  const lines = buffer.split('\n');
  while (lines.length > 1) {
    const line = lines.shift();
    if (!line.trim()) continue;

    try {
      const msg = JSON.parse(line);
      console.log(`[RCV] ID: ${msg.id} | Result: ${JSON.stringify(msg.result || msg.error).substring(0, 100)}...`);

      if (msg.id === 0) {
        // Initialize response received.
        // Send initialized notification
        server.stdin.write(JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized'
        }) + '\n');

        // Send tools/list
        console.log('[SND] tools/list');
        server.stdin.write(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list'
        }) + '\n');
      } else if (msg.id === 1) {
        // tools/list response received
        console.log('[SND] search_packages(zod)');
        server.stdin.write(JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'search_packages',
            arguments: {
              query: 'zod',
              size: 2
            }
          }
        }) + '\n');
      } else if (msg.id === 2) {
        // search_packages response received
        console.log('Search Results:', JSON.stringify(msg.result, null, 2));

        // Send get_package_metadata
        console.log('[SND] get_package_metadata(axios)');
        server.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
              name: 'get_package_metadata',
              arguments: {
                name: 'axios'
              }
            }
          }) + '\n');
      } else if (msg.id === 3) {
          console.log('Metadata Results:', JSON.stringify(msg.result, null, 2));
          console.log('Verification Passed!');
          process.exit(0);
      }
    } catch (e) {
      console.error('Error parsing:', e);
    }
  }
  buffer = lines[0];
});

const initReq = {
  jsonrpc: '2.0',
  id: 0,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'verifier', version: '0.1.0' }
  }
};

console.log('[SND] initialize');
server.stdin.write(JSON.stringify(initReq) + '\n');
