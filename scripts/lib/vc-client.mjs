// Minimal MCP stdio client for the VectorCraft CLI (`vectorcraft-cli mcp`).
// live: attaches to the app started with `vectorcraft.exe --control 7979`; otherwise headless.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

export const VC_CLI = process.env.VECTORCRAFT_CLI || 'E:/VectorCraft/app/vectorcraft-cli.exe';

export async function connect({ live = false, port = 7979 } = {}) {
  if (!existsSync(VC_CLI)) throw new Error(`VectorCraft CLI not found: ${VC_CLI} (set VECTORCRAFT_CLI)`);
  const args = live ? ['mcp', '--connect', `127.0.0.1:${port}`] : ['mcp', '--headless'];
  const p = spawn(VC_CLI, args, { stdio: ['pipe', 'pipe', 'pipe'] });
  let buf = '';
  let stderr = '';
  let nextId = 0;
  const waits = new Map();
  p.stderr.on('data', (d) => { stderr += d; });
  p.on('exit', (code) => {
    for (const [, w] of waits) w.reject(new Error(`VectorCraft exited (${code}): ${stderr.slice(-400)}`));
    waits.clear();
  });
  p.stdout.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      let m;
      try { m = JSON.parse(line); } catch { continue; }
      if (m.id != null && waits.has(m.id)) { waits.get(m.id).resolve(m); waits.delete(m.id); }
    }
  });
  const rpc = (method, params) => new Promise((resolve, reject) => {
    const id = ++nextId;
    waits.set(id, { resolve, reject });
    p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'panel-skill', version: '1' } });
  p.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

  const call = async (name, args = {}) => {
    const m = await rpc('tools/call', { name, arguments: args });
    if (m.error) throw new Error(`${name}: ${JSON.stringify(m.error)}`);
    const r = m.result;
    const text = (r.content || []).filter((x) => x.type === 'text').map((x) => x.text).join('\n');
    if (r.isError) throw new Error(`${name}: ${text}`);
    return { text, content: r.content || [] };
  };
  return { call, close: () => p.kill() };
}
