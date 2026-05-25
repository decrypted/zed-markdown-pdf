#!/usr/bin/env node
// Smoke-test the built sidecar over stdio: spawn it, perform the LSP `initialize`
// handshake, and assert the server advertises the `markdown.exportToPdf`
// execute-command. Zed silently drops code-action commands that are NOT listed in
// `executeCommandProvider.commands`, so this catches the most damaging regression.
//
// Usage: node scripts/smoke-lsp.mjs <path-to-server.js>
// Exits 0 on success, non-zero (with a reason) on failure.

import { spawn } from "node:child_process";

const EXPECTED_COMMAND = "markdown.exportToPdf";
const TIMEOUT_MS = 15_000;
const serverPath = process.argv[2] ?? "sidecar/dist/server.js";

function frame(message) {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`;
}

const child = spawn(process.execPath, [serverPath, "--stdio"], {
  stdio: ["pipe", "pipe", "inherit"],
});

const fail = (reason) => {
  console.error(`✗ sidecar smoke test failed: ${reason}`);
  child.kill("SIGKILL");
  process.exit(1);
};

const timer = setTimeout(() => fail(`no valid initialize response within ${TIMEOUT_MS}ms`), TIMEOUT_MS);

let buffer = "";
child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  buffer += chunk;
  // Pull complete Content-Length framed messages out of the stream.
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) return;
    const header = buffer.slice(0, headerEnd);
    const match = /Content-Length:\s*(\d+)/i.exec(header);
    if (!match) return fail("malformed LSP header from server");
    const length = Number(match[1]);
    const start = headerEnd + 4;
    if (buffer.length < start + length) return; // wait for the rest
    const body = buffer.slice(start, start + length);
    buffer = buffer.slice(start + length);

    let msg;
    try {
      msg = JSON.parse(body);
    } catch {
      return fail("invalid JSON in server response");
    }

    if (msg.id !== 1) continue; // ignore log/notification traffic
    const commands = msg.result?.capabilities?.executeCommandProvider?.commands ?? [];
    if (!commands.includes(EXPECTED_COMMAND)) {
      return fail(`executeCommandProvider does not advertise "${EXPECTED_COMMAND}" (got: ${JSON.stringify(commands)})`);
    }
    clearTimeout(timer);
    console.log(`✓ sidecar advertises "${EXPECTED_COMMAND}"`);
    child.kill("SIGTERM");
    process.exit(0);
  }
});

child.on("error", (err) => fail(`could not spawn server: ${err.message}`));
child.on("exit", (code) => {
  if (code !== null && code !== 0) fail(`server exited early with code ${code}`);
});

child.stdin.write(
  frame({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { processId: process.pid, rootUri: null, capabilities: {} },
  }),
);
