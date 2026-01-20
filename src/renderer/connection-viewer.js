// Connection Viewer - Maneja las conexiones Guacamole
let guacamoleClient = null;
let currentConnection = null;
let isFullscreen = false;

// Estado de la conexión
const state = {
    connectionId: null,
    protocol: null,
    params: null,
    connected: false,
    connecting: false
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initializeConnection();
    setupEventListeners();
});

function initializeConnection() {
    // Obtener parámetros de conexión de la URL o localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const connectionId = urlParams.get('connection') || localStorage.getItem('currentConnection');
    
    if (!connectionId) {
        showError('No se especificó ninguna conexión');
        return;
    }

    // Obtener configuración de conexión
    window.electronAPI.getConnectionConfig(connectionId).then(config => {
        if (!config) {
            showError('Configuración de conexión no encontrada');
            return;
        }

        state.connectionId = connectionId;
        state.protocol = config.protocol;
        state.params = config.params;

        document.getElementById('connectionTitle').textContent = config.name || connectionId;
        
        // Conectar
        connect();
    }).catch(error => {
        console.error('Error obteniendo configuración:', error);
        showError('Error al obtener configuración de conexión');
    });
}

function setupEventListeners() {
    // Botón volver
    document.getElementById('backBtn').addEventListener('click', () => {
        disconnect();
        window.location.href = 'index.html';
    });

    // Botón desconectar
    document.getElementById('disconnectToolbarBtn').addEventListener('click', disconnect);
    document.getElementById('disconnectBtn').addEventListener('click', disconnect);

    // Botón reintentar
    document.getElementById('retryBtn').addEventListener('click', () => {
        hideError();
        connect();
    });

    // Botón pantalla completa
    document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);

    // Botón teclado virtual
    document.getElementById('keyboardBtn').addEventListener('click', toggleVirtualKeyboard);

    // Botón clipboard
    document.getElementById('clipboardBtn').addEventListener('click', handleClipboard);

    // Manejar salida de pantalla completa con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isFullscreen) {
            toggleFullscreen();
        }
    });
}

async function connect() {
    if (state.connecting || state.connected) {
        return;
    }

    state.connecting = true;
    updateStatus('connecting', 'Conectando...');
    showLoading();

    try {
        // Verificar que Guacamole esté disponible
        if (typeof Guacamole === 'undefined') {
            throw new Error('Guacamole-common-js no está cargado. Verifica la conexión a Internet o el CDN.');
        }
        
        console.log('Iniciando conexión para:', state.connectionId);
        
        // Obtener token encriptado del proceso principal
        const tokenResult = await window.electronAPI.generateConnectionToken(state.connectionId);
        
        if (!tokenResult.success) {
            throw new Error(tokenResult.error || 'No se pudo generar el token');
        }
        
        console.log('Token generado exitosamente, longitud:', tokenResult.token.length);
        
        // Crear cliente Guacamole con token encriptado
        // guacamole-lite requiere el token en el query string
        const wsUrl = `ws://localhost:8000/?token=${encodeURIComponent(tokenResult.token)}`;
        console.log('Conectando a WebSocket:', wsUrl.substring(0, 50) + '...');
        
        guacamoleClient = new Guacamole.Client(
            new Guacamole.WebSocketTunnel(wsUrl)
        );

        const display = document.getElementById('display');
        display.innerHTML = '';
        const element = guacamoleClient.getDisplay().getElement();
        display.appendChild(element);

        // Event listeners
        guacamoleClient.onstatechange = (status) => {
            handleStateChange(status);
        };

        guacamoleClient.onerror = (error) => {
            handleError(error);
        };

        // Conectar
        guacamoleClient.connect();

    } catch (error) {
        console.error('Error al crear cliente Guacamole:', error);
        showError(`Error de conexión: ${error.message}`);
        state.connecting = false;
        state.connected = false;
        updateStatus('disconnected', 'Error');
    }
}

function handleStateChange(status) {
    console.log('Estado de conexión:', status);

    const states = Guacamole.Client;
    
    if (status === states.CONNECTED) {
        state.connected = true;
        state.connecting = false;
        updateStatus('connected', 'Conectado');
        hideLoading();
        hideError();
        
        // Ajustar tamaño del display
        resizeDisplay();
    } else if (status === states.CONNECTING) {
        updateStatus('connecting', 'Conectando...');
    } else if (status === states.DISCONNECTED) {
        state.connected = false;
        state.connecting = false;
        updateStatus('disconnected', 'Desconectado');
        hideLoading();
    } else if (status === states.IDLE) {
        updateStatus('connecting', 'Esperando...');
    }
}

function handleError(error) {
    console.error('Error de Guacamole:', error);
    
    if (error.code === Guacamole.Status.Code.CLIENT_BAD_TYPE) {
        showError('Tipo de conexión no soportado');
    } else if (error.code === Guacamole.Status.Code.CLIENT_UNAUTHORIZED) {
        showError('No autorizado. Verifica las credenciales.');
    } else if (error.code === Guacamole.Status.Code.CLIENT_FORBIDDEN) {
        showError('Acceso prohibido');
    } else if (error.code === Guacamole.Status.Code.SERVER_ERROR) {
        showError('Error del servidor. Verifica que los servicios Docker estén corriendo.');
    } else {
        showError(`Error de conexión: ${error.message || 'Error desconocido'}`);
    }

    state.connected = false;
    state.connecting = false;
    updateStatus('disconnected', 'Error');
    hideLoading();
}

function disconnect() {
    if (guacamoleClient) {
        try {
            guacamoleClient.disconnect();
        } catch (error) {
            console.error('Error al desconectar:', error);
        }
        guacamoleClient = null;
    }

    state.connected = false;
    state.connecting = false;
    updateStatus('disconnected', 'Desconectado');
    
    // Limpiar display
    const display = document.getElementById('display');
    display.innerHTML = '';
}

function updateStatus(status, text) {
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    indicator.className = 'status-dot';
    if (status === 'connected') {
        indicator.classList.add('connected');
    } else if (status === 'connecting') {
        indicator.classList.add('connecting');
    }
    
    statusText.textContent = text;
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorOverlay').style.display = 'flex';
}

function hideError() {
    document.getElementById('errorOverlay').style.display = 'none';
}

function toggleFullscreen() {
    if (!isFullscreen) {
        document.body.requestFullscreen().catch(err => {
            console.error('Error al entrar en pantalla completa:', err);
        });
        document.body.classList.add('fullscreen');
        isFullscreen = true;
    } else {
        document.exitFullscreen().catch(err => {
            console.error('Error al salir de pantalla completa:', err);
        });
        document.body.classList.remove('fullscreen');
        isFullscreen = false;
    }
}

function toggleVirtualKeyboard() {
    const keyboard = document.getElementById('virtualKeyboard');
    const btn = document.getElementById('keyboardBtn');
    
    if (keyboard.style.display === 'none') {
        keyboard.style.display = 'block';
        btn.classList.add('active');
    } else {
        keyboard.style.display = 'none';
        btn.classList.remove('active');
    }
}

function handleClipboard() {
    if (!guacamoleClient || !state.connected) {
        alert('Debes estar conectado para usar el clipboard');
        return;
    }

    // Obtener texto del portapapeles del sistema
    navigator.clipboard.readText().then(text => {
        if (text && guacamoleClient) {
            // Enviar al servidor remoto
            guacamoleClient.sendKeyEvent(1, 0x0056); // Ctrl+V
            // Enviar cada carácter
            for (let i = 0; i < text.length; i++) {
                const codePoint = text.codePointAt(i);
                guacamoleClient.sendKeyEvent(1, codePoint);
                guacamoleClient.sendKeyEvent(0, codePoint);
            }
        }
    }).catch(err => {
        console.error('Error al leer clipboard:', err);
    });
}

function resizeDisplay() {
    if (!guacamoleClient || !state.connected) {
        return;
    }

    const display = guacamoleClient.getDisplay();
    const displayElement = document.getElementById('display');
    
    // Ajustar al tamaño del contenedor
    const container = displayElement.parentElement;
    const maxWidth = container.clientWidth - 40;
    const maxHeight = container.clientHeight - 40;
    
    const scaleX = maxWidth / display.getWidth();
    const scaleY = maxHeight / display.getHeight();
    const scale = Math.min(scaleX, scaleY, 1); // No ampliar más del 100%
    
    displayElement.style.transform = `scale(${scale})`;
    displayElement.style.transformOrigin = 'top left';
}

// Ajustar tamaño cuando cambia el tamaño de la ventana
window.addEventListener('resize', () => {
    if (state.connected) {
        resizeDisplay();
    }
});
