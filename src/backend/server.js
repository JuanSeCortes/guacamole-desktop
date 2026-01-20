const GuacamoleLite = require('guacamole-lite');
const config = require('./config');

class GuacamoleServer {
  constructor() {
    this.server = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️  Servidor guacamole-lite ya está ejecutándose');
      return;
    }

    try {
      // Crear servidor guacamole-lite
      // guacamole-lite requiere 3 parámetros: websocketOptions, guacdOptions, clientOptions
      const websocketOptions = {
        port: config.websocket.port,
        host: config.websocket.host
      };
      
      const guacdOptions = {
        host: config.guacd.host,
        port: config.guacd.port
      };
      
      const clientOptions = {
        crypt: {
          cypher: config.encryption.cipher,
          key: config.encryption.key
        },
        connectionDefaultSettings: {
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
      };
      
      this.server = new GuacamoleLite(websocketOptions, guacdOptions, clientOptions);
      
      // Event listeners para debugging
      this.server.on('connection', (connection) => {
        console.log('✅ Nueva conexión WebSocket establecida:', connection.id || 'unknown');
      });
      
      this.server.on('error', (error) => {
        console.error('❌ Error en servidor guacamole-lite:', error);
      });

      this.isRunning = true;
      console.log(`✅ Servidor guacamole-lite iniciado en ws://${config.websocket.host}:${config.websocket.port}`);
      console.log(`✅ Conectado a guacd en ${config.guacd.host}:${config.guacd.port}`);
      return true;
    } catch (error) {
      console.error('❌ Error al iniciar servidor guacamole-lite:', error);
      this.isRunning = false;
      return false;
    }
  }

  stop() {
    if (!this.isRunning || !this.server) {
      return;
    }

    try {
      // Cerrar todas las conexiones
      if (this.server.close) {
        this.server.close();
      }
      this.server = null;
      this.isRunning = false;
      console.log('🛑 Servidor guacamole-lite detenido');
    } catch (error) {
      console.error('❌ Error al detener servidor guacamole-lite:', error);
    }
  }

  getConnectionConfig(connectionId) {
    return config.connections[connectionId];
  }

  getAllConnections() {
    return config.connections;
  }
}

module.exports = GuacamoleServer;
