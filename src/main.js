const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs').promises;
const axios = require('axios');
const Docker = require('dockerode');
const GuacamoleServer = require('./backend/server');
const config = require('./backend/config');

let mainWindow;
let docker;
let dockerComposePath = path.join(__dirname, '..', 'docker', 'docker-compose.yml');
let guacamoleServer = null;

// Inicializar Docker
try {
  docker = new Docker();
  console.log('Docker inicializado correctamente');
} catch (error) {
  console.warn('Advertencia: No se pudo inicializar Docker. Algunas funciones pueden no estar disponibles.');
  console.warn('Error:', error.message);
  docker = null;
}

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    titleBarStyle: 'default',
    autoHideMenuBar: true
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Manejar errores de carga de página
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Error cargando página:', errorCode, errorDescription);
  });

  // Manejar errores de consola del renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 2) { // Solo errores y advertencias
      console.log(`[Renderer ${level}] ${message}`, sourceId ? `at ${sourceId}:${line}` : '');
    }
  });

  // Abrir DevTools en modo desarrollo
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Iniciar servidor guacamole-lite
  startGuacamoleServer();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Detener servidor guacamole-lite
  if (guacamoleServer) {
    guacamoleServer.stop();
    guacamoleServer = null;
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Iniciar servidor guacamole-lite
function startGuacamoleServer() {
  try {
    console.log('Iniciando servidor guacamole-lite...');
    guacamoleServer = new GuacamoleServer();
    const started = guacamoleServer.start();
    
    if (started) {
      console.log('✅ Servidor guacamole-lite iniciado correctamente');
      
      // Verificar que guacd esté disponible después de unos segundos
      setTimeout(async () => {
        try {
          if (docker) {
            const containers = await docker.listContainers({ all: false });
            const guacdRunning = containers.some(c => 
              c.Names && c.Names.some(name => name.includes('guacd'))
            );
            if (guacdRunning) {
              console.log('✅ Guacd está corriendo');
            } else {
              console.warn('⚠️  Guacd no está corriendo aún. Inicia los servicios Docker.');
            }
          }
        } catch (error) {
          console.warn('No se pudo verificar estado de guacd:', error.message);
        }
      }, 2000);
    } else {
      console.error('❌ No se pudo iniciar el servidor guacamole-lite');
    }
  } catch (error) {
    console.error('❌ Error al iniciar servidor guacamole-lite:', error);
    console.error('Stack:', error.stack);
  }
}

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rechazada sin manejar:', reason);
});

// IPC Handlers
ipcMain.handle('check-docker', async () => {
  try {
    if (!docker) {
      return { available: false, error: 'Docker no está inicializado' };
    }
    await docker.ping();
    return { available: true, error: null };
  } catch (error) {
    return { available: false, error: error.message };
  }
});

ipcMain.handle('docker-compose-up', async () => {
  return new Promise((resolve, reject) => {
    const dockerComposeDir = path.dirname(dockerComposePath);
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'docker-compose' : 'docker compose';
    
    const child = spawn(command, ['up', '-d'], {
      cwd: dockerComposeDir,
      shell: true,
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, message: 'Docker Compose iniciado correctamente' });
      } else {
        reject({ success: false, message: `Error al iniciar Docker Compose. Código: ${code}` });
      }
    });

    child.on('error', (error) => {
      reject({ success: false, message: `Error ejecutando Docker Compose: ${error.message}` });
    });
  });
});

ipcMain.handle('docker-compose-down', async () => {
  return new Promise((resolve, reject) => {
    const dockerComposeDir = path.dirname(dockerComposePath);
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'docker-compose' : 'docker compose';
    
    const child = spawn(command, ['down'], {
      cwd: dockerComposeDir,
      shell: true,
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, message: 'Docker Compose detenido correctamente' });
      } else {
        reject({ success: false, message: `Error al detener Docker Compose. Código: ${code}` });
      }
    });

    child.on('error', (error) => {
      reject({ success: false, message: `Error ejecutando Docker Compose: ${error.message}` });
    });
  });
});

ipcMain.handle('docker-compose-status', async () => {
  return new Promise((resolve) => {
    let resolved = false;
    const dockerComposeDir = path.dirname(dockerComposePath);
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'docker-compose' : 'docker compose';
    
    // Usar formato legible y parsear manualmente para mayor compatibilidad
    const child = exec(`${command} ps`, {
      cwd: dockerComposeDir,
      shell: true,
      timeout: 8000 // Timeout de 8 segundos
    }, (error, stdout, stderr) => {
      if (resolved) return;
      resolved = true;
      
      if (error) {
        // Si no hay contenedores, no es necesariamente un error
        if (error.code === 1 || (stdout && stdout.includes('No such service'))) {
          resolve({ success: true, containers: [] });
          return;
        }
        resolve({ success: false, message: error.message || 'Error desconocido' });
        return;
      }
      
      try {
        const containers = [];
        const lines = stdout ? stdout.trim().split('\n').slice(1) : []; // Omitir la línea de encabezado
        
        lines.forEach(line => {
          if (line.trim()) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
              const name = parts[0];
              const status = line.includes('Up') ? 'running' : 'stopped';
              containers.push({
                Name: name,
                name: name,
                State: status,
                Status: line.substring(line.indexOf(parts[1]))
              });
            }
          }
        });
        
        resolve({ success: true, containers });
      } catch (parseError) {
        console.warn('Error parseando salida de docker-compose:', parseError);
        resolve({ success: true, containers: [] });
      }
    });
    
    // Timeout de seguridad
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          child.kill();
        } catch (e) {
          // Ignorar errores al matar el proceso
        }
        resolve({ success: false, message: 'Timeout al obtener estado de contenedores' });
      }
    }, 8000);
    
    // Limpiar timeout si se resuelve antes
    child.on('exit', () => {
      clearTimeout(timeoutId);
    });
  });
});

ipcMain.handle('check-guacamole', async () => {
  try {
    const response = await axios.get('http://localhost:8080/guacamole', {
      timeout: 5000,
      validateStatus: (status) => status < 500
    });
    return { 
      available: response.status === 200 || response.status === 302, 
      status: response.status 
    };
  } catch (error) {
    return { available: false, error: error.message };
  }
});

ipcMain.handle('get-guacamole-url', () => {
  return 'http://localhost:8080/guacamole';
});

ipcMain.handle('open-external', async (event, url) => {
  const { shell } = require('electron');
  await shell.openExternal(url);
});

// Handlers para conexiones Guacamole
ipcMain.handle('get-connection-config', async (event, connectionId) => {
  if (!guacamoleServer) {
    return null;
  }
  const config = guacamoleServer.getConnectionConfig(connectionId);
  if (config) {
    return {
      name: config.name,
      protocol: config.protocol,
      params: config.params
    };
  }
  return null;
});

ipcMain.handle('get-all-connections', async () => {
  if (!guacamoleServer) {
    return {};
  }
  return guacamoleServer.getAllConnections();
});

ipcMain.handle('open-connection', async (event, connectionId) => {
  if (!mainWindow) {
    return { success: false, error: 'Ventana principal no disponible' };
  }

  try {
    const connectionPath = path.join(__dirname, 'renderer', 'connections.html');
    
    // Cargar la página de conexión en la ventana principal
    if (mainWindow) {
      mainWindow.loadFile(connectionPath, { query: { connection: connectionId } });
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Generar token encriptado para la conexión
ipcMain.handle('generate-connection-token', async (event, connectionId) => {
  try {
    if (!guacamoleServer) {
      console.error('guacamoleServer no está inicializado');
      return { success: false, error: 'Servidor guacamole-lite no está inicializado' };
    }
    
    const config = require('./backend/config');
    const { encryptToken } = require('./backend/token-helper');
    
    const connectionConfig = guacamoleServer.getConnectionConfig(connectionId);
    if (!connectionConfig) {
      console.error('Conexión no encontrada:', connectionId);
      return { success: false, error: `Conexión ${connectionId} no encontrada` };
    }
    
    console.log('Generando token para conexión:', connectionId, 'Protocolo:', connectionConfig.protocol);
    
    const token = encryptToken({
      protocol: connectionConfig.protocol,
      params: connectionConfig.params
    }, config.encryption.key);
    
    console.log('Token generado exitosamente, longitud:', token.length);
    return { success: true, token };
  } catch (error) {
    console.error('Error generando token:', error);
    return { success: false, error: error.message };
  }
});
