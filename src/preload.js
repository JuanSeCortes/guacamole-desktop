const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkDocker: () => ipcRenderer.invoke('check-docker'),
  dockerComposeUp: () => ipcRenderer.invoke('docker-compose-up'),
  dockerComposeDown: () => ipcRenderer.invoke('docker-compose-down'),
  dockerComposeStatus: () => ipcRenderer.invoke('docker-compose-status'),
  checkGuacamole: () => ipcRenderer.invoke('check-guacamole'),
  getGuacamoleUrl: () => ipcRenderer.invoke('get-guacamole-url'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getConnectionConfig: (connectionId) => ipcRenderer.invoke('get-connection-config', connectionId),
  getAllConnections: () => ipcRenderer.invoke('get-all-connections'),
  openConnection: (connectionId) => ipcRenderer.invoke('open-connection', connectionId),
  generateConnectionToken: (connectionId) => ipcRenderer.invoke('generate-connection-token', connectionId),
  
  // Event listeners
  onDockerStatusChange: (callback) => {
    ipcRenderer.on('docker-status-changed', (event, data) => callback(data));
  }
});
