const http = require('http');
const net = require('net');
const fs = require('fs');
const { spawn } = require('child_process');

console.log('[LobeHub SSO Init] Initializing Keycloak SSO proxy and auto-login bridge...');

// 1. Start TCP forwarder for Keycloak (127.0.0.1:4000 -> host.docker.internal:4000)
try {
  const kcProxy = net.createServer((clientSocket) => {
    const upstream = net.connect(4000, 'host.docker.internal');
    clientSocket.pipe(upstream).pipe(clientSocket);
    clientSocket.on('error', () => {});
    upstream.on('error', () => {});
  });

  kcProxy.listen(4000, '127.0.0.1', () => {
    console.log('[LobeHub SSO Init] ✅ Keycloak TCP proxy active on 127.0.0.1:4000 -> host.docker.internal:4000');
  });

  kcProxy.on('error', (err) => {
    console.warn('[LobeHub SSO Init] ⚠️ Keycloak TCP proxy notice:', err.message);
  });
} catch (e) {
  console.error('[LobeHub SSO Init] ❌ Failed to start Keycloak TCP proxy:', e);
}

// 2. Start SSO Bridge Reverse-Proxy on port 3210 (forwards to internal Next.js on port 3211)
const INTERNAL_PORT = 3211;
const PUBLIC_PORT = 3210;

const ssoBridgeServer = http.createServer((req, res) => {
  const host = req.headers.host || 'localhost:3210';
  const parsedUrl = new URL(req.url, `http://${host}`);

  // Handle direct SSO launch: /sso?token=...&sig=...
  if (parsedUrl.pathname === '/sso') {
    const token = parsedUrl.searchParams.get('token');
    const sig = parsedUrl.searchParams.get('sig');
    const redirectUrl = parsedUrl.searchParams.get('redirect') || '/';

    if (token && sig) {
      console.log('[LobeHub SSO Init] 🔑 Authenticating SSO session for user...');
      res.writeHead(302, {
        'Set-Cookie': `better-auth.session_token=${token}.${sig}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
        'Location': redirectUrl,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      });
      return res.end();
    }
  }

  // Forward all standard HTTP requests to internal Next.js server on port 3211
  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: INTERNAL_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    }
  );

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Waiting for LobeHub server to initialize...');
    }
  });

  req.pipe(proxyReq, { end: true });
});

// Support WebSockets / upgrade requests
ssoBridgeServer.on('upgrade', (req, clientSocket, head) => {
  const upstream = net.connect(INTERNAL_PORT, '127.0.0.1', () => {
    upstream.write(
      `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
        Object.entries(req.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\r\n') +
        '\r\n\r\n'
    );
    if (head && head.length) upstream.write(head);
    clientSocket.pipe(upstream).pipe(clientSocket);
  });

  upstream.on('error', () => clientSocket.destroy());
  clientSocket.on('error', () => upstream.destroy());
});

ssoBridgeServer.listen(PUBLIC_PORT, '0.0.0.0', () => {
  console.log(`[LobeHub SSO Init] 🚀 SSO Bridge Proxy listening on 0.0.0.0:${PUBLIC_PORT} -> 127.0.0.1:${INTERNAL_PORT}`);
});

// 3. Start Next.js on internal port 3211
console.log(`[LobeHub SSO Init] Launching internal LobeHub server on port ${INTERNAL_PORT}...`);
const appEnv = {
  ...process.env,
  PORT: String(INTERNAL_PORT),
};

const child = spawn('/bin/node', ['/app/startServer.js'], {
  stdio: 'inherit',
  env: appEnv,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
