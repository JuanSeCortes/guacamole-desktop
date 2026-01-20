// Configuración de conexiones disponibles
module.exports = {
  connections: {
    windows: {
      name: 'Windows 11 (RDP)',
      protocol: 'rdp',
      params: {
        hostname: 'windows-rdp-target',
        port: 3389,
        username: 'Administrator',
        password: 'Windows123!',
        'security': 'any',
        'ignore-cert': true,
        'enable-wallpaper': true,
        'enable-theming': true,
        'enable-font-smoothing': true,
        'enable-full-window-drag': true,
        'enable-desktop-composition': true,
        'enable-menu-animations': true,
        'disable-bitmap-caching': false,
        'disable-offscreen-caching': false,
        'disable-glyph-caching': false
      }
    },
    'ubuntu-vnc': {
      name: 'Ubuntu Desktop (VNC)',
      protocol: 'vnc',
      params: {
        hostname: 'ubuntu-vnc-target',
        port: 5900,
        password: 'Ubuntu123!'
      }
    },
    'ubuntu-ssh': {
      name: 'Ubuntu Server (SSH)',
      protocol: 'ssh',
      params: {
        hostname: 'ubuntu-ssh-target',
        port: 22,
        username: 'sshuser',
        password: 'Ubuntu123!'
      }
    }
  },
  
  // Configuración del servidor guacd
  guacd: {
    host: 'localhost',
    port: 4822
  },
  
  // Configuración del servidor WebSocket
  websocket: {
    port: 8000,
    host: 'localhost'
  },
  
  // Configuración de encriptación para tokens
  encryption: {
    cipher: 'aes-256-cbc',
    key: 'MySuperSecretKeyForParamsToken12' // En producción, usar una clave segura
  }
};
