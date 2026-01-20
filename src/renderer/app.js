// Estado de la aplicación
let statusCheckInterval;
let containersStatusInterval;

// Manejar errores globales
window.addEventListener('error', (event) => {
    console.error('Error global:', event.error);
    if (typeof addLog === 'function') {
        addLog('error', `Error: ${event.error?.message || event.message}`);
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rechazada:', event.reason);
    if (typeof addLog === 'function') {
        addLog('error', `Error de promesa: ${event.reason?.message || event.reason}`);
    }
});

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verificar que electronAPI esté disponible
        if (!window.electronAPI) {
            console.error('electronAPI no está disponible. Asegúrate de que el preload.js esté cargado correctamente.');
            addLog('error', 'Error: electronAPI no está disponible');
            return;
        }
        
        await initializeApp();
        setupEventListeners();
        startStatusMonitoring();
    } catch (error) {
        console.error('Error en inicialización:', error);
        addLog('error', `Error de inicialización: ${error.message}`);
    }
});

async function initializeApp() {
    addLog('info', 'Inicializando aplicación...');
    
    // Verificar Docker
    await checkDockerStatus();
    
    // Verificar estado de contenedores
    await updateContainersStatus();
    
    // Verificar Guacamole
    await checkGuacamoleStatus();
}

function setupEventListeners() {
    try {
        // Botones de control
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const refreshBtn = document.getElementById('refreshBtn');
        const openGuacamoleBtn = document.getElementById('openGuacamoleBtn');
        
        if (startBtn) startBtn.addEventListener('click', handleStartServices);
        if (stopBtn) stopBtn.addEventListener('click', handleStopServices);
        if (refreshBtn) refreshBtn.addEventListener('click', handleRefresh);
        if (openGuacamoleBtn) openGuacamoleBtn.addEventListener('click', handleOpenGuacamole);
    } catch (error) {
        console.error('Error configurando event listeners:', error);
        addLog('error', `Error configurando eventos: ${error.message}`);
    }
}

async function checkDockerStatus() {
    try {
        const result = await window.electronAPI.checkDocker();
        updateDockerStatus(result.available);
        
        if (!result.available) {
            addLog('error', `Docker no disponible: ${result.error}`);
            updateGlobalStatus('inactive');
        } else {
            addLog('success', 'Docker está disponible y funcionando');
        }
    } catch (error) {
        addLog('error', `Error verificando Docker: ${error.message}`);
        updateDockerStatus(false);
        updateGlobalStatus('inactive');
    }
}

async function updateContainersStatus() {
    try {
        const result = await window.electronAPI.dockerComposeStatus();
        
        if (!result.success) {
            // Solo mostrar advertencia una vez, no en cada actualización
            if (!updateContainersStatus._warningShown) {
                addLog('warning', `No se pudo obtener el estado de los contenedores: ${result.message || 'Error desconocido'}`);
                updateContainersStatus._warningShown = true;
            }
            updateContainerStatus('postgres', false);
            updateContainerStatus('guacd', false);
            updateContainerStatus('guacamole', false);
            return;
        }
        
        // Resetear el flag de advertencia si la consulta fue exitosa
        updateContainersStatus._warningShown = false;

        const containers = result.containers || [];
        const containersList = document.getElementById('containersList');
        containersList.innerHTML = '';

        if (containers.length === 0) {
            containersList.innerHTML = '<div style="color: var(--text-muted); padding: 2rem; text-align: center;">No hay contenedores ejecutándose</div>';
            updateContainerStatus('postgres', false);
            updateContainerStatus('guacd', false);
            updateContainerStatus('guacamole', false);
            return;
        }

        // Mapear contenedores conocidos
        const knownContainers = {
            'guacamole-postgres': { name: 'PostgreSQL', type: 'postgres' },
            'guacamole-guacd': { name: 'Guacd', type: 'guacd' },
            'guacamole-client': { name: 'Guacamole Web', type: 'guacamole' },
            'windows-rdp-target': { name: 'Windows RDP', type: 'target' },
            'ubuntu-vnc-target': { name: 'Ubuntu VNC', type: 'target' },
            'ubuntu-ssh-target': { name: 'Ubuntu SSH', type: 'target' }
        };

        let postgresRunning = false;
        let guacdRunning = false;
        let guacamoleRunning = false;

        containers.forEach(container => {
            // Obtener el nombre del contenedor - puede venir en diferentes formatos
            let containerName = container.Name || container.name || '';
            const originalName = containerName;
            
            // Buscar coincidencia en el mapa de contenedores conocidos
            // Primero intentar coincidencia exacta
            let known = knownContainers[containerName];
            
            // Si no hay coincidencia exacta, buscar por coincidencia parcial
            if (!known) {
                for (const [key, value] of Object.entries(knownContainers)) {
                    if (containerName.includes(key) || containerName.endsWith(key) || 
                        containerName === key.replace(/-/g, '_') ||
                        containerName.includes(key.replace(/-/g, '_'))) {
                        known = value;
                        containerName = key; // Normalizar el nombre
                        break;
                    }
                }
            }
            
            const isRunning = container.State === 'running' || 
                            (container.Status && container.Status.includes('Up'));
            
            if (known) {
                // Actualizar estado de servicios principales
                if (known.type === 'postgres') postgresRunning = isRunning;
                if (known.type === 'guacd') guacdRunning = isRunning;
                if (known.type === 'guacamole') guacamoleRunning = isRunning;

                // Agregar a la lista
                const containerDiv = document.createElement('div');
                containerDiv.className = 'container-item';
                containerDiv.innerHTML = `
                    <div>
                        <div class="container-name">${known.name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${originalName}</div>
                    </div>
                    <div class="container-status ${isRunning ? 'running' : 'stopped'}">
                        ${isRunning ? 'En ejecución' : 'Detenido'}
                    </div>
                `;
                containersList.appendChild(containerDiv);
            }
        });

        updateContainerStatus('postgres', postgresRunning);
        updateContainerStatus('guacd', guacdRunning);
        updateContainerStatus('guacamole', guacamoleRunning);

        // Actualizar estado global
        if (postgresRunning && guacdRunning && guacamoleRunning) {
            updateGlobalStatus('active');
        } else {
            updateGlobalStatus('inactive');
        }

    } catch (error) {
        addLog('error', `Error actualizando estado de contenedores: ${error.message}`);
    }
}

async function checkGuacamoleStatus() {
    try {
        const result = await window.electronAPI.checkGuacamole();
        const guacamoleStatusEl = document.getElementById('guacamoleStatus');
        const openBtn = document.getElementById('openGuacamoleBtn');
        
        if (result.available) {
            guacamoleStatusEl.textContent = 'Disponible';
            guacamoleStatusEl.className = 'status-value active';
            openBtn.style.display = 'block';
            // Solo loggear una vez cuando se detecta disponible
            if (!checkGuacamoleStatus._wasAvailable) {
                addLog('success', 'Guacamole Web está disponible');
                checkGuacamoleStatus._wasAvailable = true;
            }
        } else {
            guacamoleStatusEl.textContent = 'No disponible';
            guacamoleStatusEl.className = 'status-value inactive';
            openBtn.style.display = 'none';
            checkGuacamoleStatus._wasAvailable = false;
        }
    } catch (error) {
        // Silenciar errores repetitivos en el monitoreo automático
        if (!checkGuacamoleStatus._errorShown) {
            console.error('Error verificando Guacamole:', error);
            checkGuacamoleStatus._errorShown = true;
        }
    }
}

function updateDockerStatus(available) {
    const dockerStatusEl = document.getElementById('dockerStatus');
    if (available) {
        dockerStatusEl.textContent = 'Disponible';
        dockerStatusEl.className = 'status-value active';
    } else {
        dockerStatusEl.textContent = 'No disponible';
        dockerStatusEl.className = 'status-value inactive';
    }
}

function updateContainerStatus(type, running) {
    const statusMap = {
        'postgres': 'postgresStatus',
        'guacd': 'guacdStatus',
        'guacamole': 'guacamoleStatus'
    };

    const statusEl = document.getElementById(statusMap[type]);
    if (statusEl) {
        if (running) {
            statusEl.textContent = 'En ejecución';
            statusEl.className = 'status-value active';
        } else {
            statusEl.textContent = 'Detenido';
            statusEl.className = 'status-value inactive';
        }
    }
}

function updateGlobalStatus(status) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    statusDot.className = 'status-dot';
    
    if (status === 'active') {
        statusDot.classList.add('active');
        statusText.textContent = 'Todos los servicios activos';
    } else if (status === 'inactive') {
        statusDot.classList.add('inactive');
        statusText.textContent = 'Servicios no disponibles';
    } else {
        statusText.textContent = 'Verificando...';
    }
}

async function handleStartServices() {
    const btn = document.getElementById('startBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span><span>Iniciando...</span>';

    try {
        addLog('info', 'Iniciando servicios Docker Compose...');
        const result = await window.electronAPI.dockerComposeUp();
        
        if (result.success) {
            addLog('success', result.message);
            // Esperar un poco y actualizar estado
            setTimeout(async () => {
                await updateContainersStatus();
                await checkGuacamoleStatus();
            }, 3000);
        } else {
            addLog('error', result.message);
        }
    } catch (error) {
        addLog('error', `Error iniciando servicios: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">▶️</span><span>Iniciar Servicios</span>';
    }
}

async function handleStopServices() {
    const btn = document.getElementById('stopBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span><span>Deteniendo...</span>';

    try {
        addLog('info', 'Deteniendo servicios Docker Compose...');
        const result = await window.electronAPI.dockerComposeDown();
        
        if (result.success) {
            addLog('success', result.message);
            updateGlobalStatus('inactive');
            setTimeout(async () => {
                await updateContainersStatus();
                await checkGuacamoleStatus();
            }, 2000);
        } else {
            addLog('error', result.message);
        }
    } catch (error) {
        addLog('error', `Error deteniendo servicios: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">⏹️</span><span>Detener Servicios</span>';
    }
}

async function handleRefresh() {
    const btn = document.getElementById('refreshBtn');
    btn.disabled = true;
    
    addLog('info', 'Actualizando estado...');
    await checkDockerStatus();
    await updateContainersStatus();
    await checkGuacamoleStatus();
    
    btn.disabled = false;
    addLog('success', 'Estado actualizado');
}

async function handleOpenGuacamole() {
    try {
        const url = await window.electronAPI.getGuacamoleUrl();
        await window.electronAPI.openExternal(url);
        addLog('info', `Abriendo Guacamole en navegador: ${url}`);
    } catch (error) {
        addLog('error', `Error abriendo Guacamole: ${error.message}`);
    }
}

function startStatusMonitoring() {
    // Limpiar intervalo anterior si existe
    if (containersStatusInterval) {
        clearInterval(containersStatusInterval);
    }
    
    // Actualizar estado cada 15 segundos (menos frecuente para evitar sobrecarga)
    containersStatusInterval = setInterval(async () => {
        try {
            await updateContainersStatus();
            await checkGuacamoleStatus();
        } catch (error) {
            // Silenciar errores en el monitoreo automático para evitar spam
            console.error('Error en monitoreo automático:', error);
        }
    }, 15000);
}

function addLog(type, message) {
    try {
        const logsContainer = document.getElementById('logsContainer');
        if (!logsContainer) {
            console.log(`[${type.toUpperCase()}] ${message}`);
            return;
        }
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        
        const time = new Date().toLocaleTimeString('es-ES');
        logEntry.innerHTML = `
            <span class="log-time">[${time}]</span>
            <span class="log-message">${message}</span>
        `;
        
        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
        
        // Limitar a 100 logs
        const logs = logsContainer.querySelectorAll('.log-entry');
        if (logs.length > 100) {
            logs[0].remove();
        }
    } catch (error) {
        console.error('Error agregando log:', error);
    }
}

// Funciones para modal de información de conexión
// Función para abrir conexión
async function openConnection(connectionId) {
    try {
        addLog('info', `Abriendo conexión: ${connectionId}...`);
        const result = await window.electronAPI.openConnection(connectionId);
        
        if (result.success) {
            addLog('success', `Conexión ${connectionId} abierta correctamente`);
        } else {
            addLog('error', `Error abriendo conexión: ${result.error || 'Error desconocido'}`);
        }
    } catch (error) {
        addLog('error', `Error al abrir conexión: ${error.message}`);
    }
}

function showConnectionInfo(type) {
    const modal = document.getElementById('connectionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    const connectionInfo = {
        rdp: {
            title: 'Conexión RDP - Windows 11',
            details: {
                'Protocolo': 'RDP (Remote Desktop Protocol)',
                'Host': 'localhost',
                'Puerto': '3389',
                'Usuario': 'Administrator',
                'Contraseña': 'Windows123!',
                'Información': 'Este es un contenedor Docker con Windows 11. Puedes conectarte usando cualquier cliente RDP o configurar esta conexión en la interfaz web de Guacamole.',
                'Configuración Guacamole': 'En Guacamole, crea una nueva conexión tipo RDP con estos parámetros: hostname=windows-rdp-target, port=3389, username=Administrator, password=Windows123!'
            }
        },
        vnc: {
            title: 'Conexión VNC - Ubuntu Desktop',
            details: {
                'Protocolo': 'VNC (Virtual Network Computing)',
                'Host': 'localhost',
                'Puerto': '5900',
                'Contraseña VNC': 'Ubuntu123!',
                'Web VNC': 'http://localhost:6080',
                'Resolución': '1920x1080',
                'Información': 'Este contenedor proporciona un escritorio Ubuntu LXDE accesible vía VNC. Puedes acceder mediante cliente VNC o a través del visor web en el puerto 6080.',
                'Configuración Guacamole': 'En Guacamole, crea una nueva conexión tipo VNC con: hostname=ubuntu-vnc-target, port=5900, password=Ubuntu123!'
            }
        },
        ssh: {
            title: 'Conexión SSH - Ubuntu Server',
            details: {
                'Protocolo': 'SSH (Secure Shell)',
                'Host': 'localhost',
                'Puerto': '2222',
                'Usuario': 'sshuser',
                'Contraseña': 'Ubuntu123!',
                'Información': 'Servidor SSH Ubuntu para conexiones de terminal remotas. El usuario tiene privilegios sudo.',
                'Configuración Guacamole': 'En Guacamole, crea una nueva conexión tipo SSH con: hostname=ubuntu-ssh-target, port=2222, username=sshuser, password=Ubuntu123!',
                'Ejemplo de conexión': 'ssh -p 2222 sshuser@localhost'
            }
        }
    };
    
    const info = connectionInfo[type];
    if (!info) return;
    
    modalTitle.textContent = info.title;
    
    let html = '<div class="connection-details">';
    for (const [key, value] of Object.entries(info.details)) {
        html += `
            <div class="connection-detail-item">
                <h4>${key}</h4>
                <p>${value}</p>
            </div>
        `;
    }
    html += '</div>';
    
    modalBody.innerHTML = html;
    modal.classList.add('show');
}

function closeModal() {
    const modal = document.getElementById('connectionModal');
    modal.classList.remove('show');
}

// Cerrar modal al hacer clic fuera
document.getElementById('connectionModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'connectionModal') {
        closeModal();
    }
});
