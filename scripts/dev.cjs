const { spawn } = require('child_process');
const net = require('net');
const os = require('os');

const tunnel = process.argv.includes('--tunnel');
const clear = process.argv.includes('--clear') || process.argv.includes('-c');

async function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(false));
    server.listen({ port, host: '0.0.0.0' }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findFreePort(startPort = 8082, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const port = startPort + i;
    const free = await isPortFree(port);
    if (free) {
      return port;
    }
  }
  throw new Error(
    `No encontre puertos libres entre ${startPort} y ${startPort + maxAttempts - 1}.`,
  );
}

function spawnProcess(command, label, extraEnv = {}) {
  const child = spawn(command, {
    stdio: 'inherit',
    shell: true,
    windowsHide: false,
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
  child.on('error', (error) => {
    console.error(`[${label}] Error al iniciar:`, error.message);
  });
  return child;
}

function getLocalIpv4() {
  const interfaces = os.networkInterfaces();
  for (const values of Object.values(interfaces)) {
    if (!values) {
      continue;
    }
    for (const item of values) {
      if (item && item.family === 'IPv4' && !item.internal) {
        return item.address;
      }
    }
  }
  return null;
}

function terminate(child) {
  if (!child || child.killed) {
    return;
  }
  child.kill('SIGTERM');
}

async function main() {
  const port = await findFreePort(Number(process.env.EXPO_PORT || 8082));
  console.log(`[DEV] Expo usara el puerto ${port}.`);
  const backendPort = Number(process.env.BACKEND_PORT || 3001);
  const backendHost = process.env.BACKEND_HOST || '0.0.0.0';
  const detectedApiHost = process.env.EXPO_PUBLIC_API_HOST || getLocalIpv4() || 'localhost';
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL || `http://${detectedApiHost}:${backendPort}`;
  console.log(`[DEV] Mobile usara backend en ${apiUrl}.`);

  const backendPortFree = await isPortFree(backendPort);
  const backend = backendPortFree
    ? spawnProcess('npm run start:dev --prefix backend', 'BACKEND', {
        PORT: String(backendPort),
        HOST: backendHost,
      })
    : null;
  if (!backendPortFree) {
    console.log(
      `[DEV] Puerto ${backendPort} ocupado: asumo backend ya levantado, no inicio otro.`,
    );
  }
  const mobileCommand = tunnel
    ? `npm run start --prefix mobile -- --port ${port} --tunnel${clear ? ' --clear' : ''}`
    : `npm run start --prefix mobile -- --port ${port}${clear ? ' --clear' : ''}`;
  const mobile = spawnProcess(mobileCommand, 'MOBILE', {
    EXPO_PUBLIC_API_URL: apiUrl,
  });

  let shuttingDown = false;
  const shutdown = (code = 0) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    terminate(backend);
    terminate(mobile);
    setTimeout(() => process.exit(code), 250);
  };

  if (backend) {
    backend.on('exit', (code) => {
      if (!shuttingDown) {
        console.error(`[BACKEND] Termino con codigo ${code ?? 0}`);
        shutdown(code ?? 0);
      }
    });
  }

  mobile.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[MOBILE] Termino con codigo ${code ?? 0}`);
      shutdown(code ?? 0);
    }
  });

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
}

main().catch((error) => {
  console.error('[DEV] Error:', error.message);
  process.exit(1);
});
