# Guacamole Desktop

Aplicación de escritorio multiplataforma (Windows, macOS, Linux) que permite conectarse remotamente a diferentes sistemas operativos utilizando los protocolos RDP, VNC y SSH. La aplicación empaqueta un cliente Guacamole completo en un ejecutable standalone que se conecta a una infraestructura Docker local.

## 🚀 Características

- **Multiplataforma**: Funciona en Windows, macOS y Linux
- **Protocolos Soportados**: RDP, VNC y SSH
- **Interfaz Moderna**: UI moderna y dinámica con tema oscuro
- **Gestión Integrada**: Control completo de la infraestructura Docker desde la aplicación
- **Contenedores Incluidos**: Windows 11 (RDP), Ubuntu Desktop (VNC) y Ubuntu Server (SSH)

## 📋 Requisitos Previos

- **Node.js** (v18 o superior)
- **Docker Desktop** o Docker Engine con Docker Compose
- **Git** (opcional, para clonar el repositorio)

## 🛠️ Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd guacamole
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Generar el esquema de base de datos

Antes de iniciar los contenedores Docker, necesitas generar el esquema de PostgreSQL:

**Windows (PowerShell):**
```powershell
cd docker
.\generate-schema.ps1
```

**Linux/macOS:**
```bash
cd docker
chmod +x generate-schema.sh
./generate-schema.sh
```

O manualmente:
```bash
docker run --rm guacamole/guacamole /opt/guacamole/bin/initdb.sh --postgres > docker/initdb.sql
```

### 4. Iniciar la infraestructura Docker

```bash
cd docker
docker-compose up -d
```

Esto iniciará:
- PostgreSQL (Base de datos)
- Guacd (Daemon de Guacamole)
- Guacamole Web (Puerto 8080)
- Windows 11 RDP (Puerto 3389)
- Ubuntu Desktop VNC (Puerto 5900)
- Ubuntu Server SSH (Puerto 2222)

## 🎮 Uso

### Modo Desarrollo

```bash
npm run dev
```

### Ejecutar la aplicación

```bash
npm start
```

### Construir ejecutables

**Windows:**
```bash
npm run build:win
```

**macOS:**
```bash
npm run build:mac
```

**Linux:**
```bash
npm run build:linux
```

Los ejecutables se generarán en la carpeta `dist/`.

## 📖 Configuración Inicial de Guacamole

1. Inicia la aplicación Electron
2. Haz clic en "Iniciar Servicios" para levantar los contenedores Docker
3. Espera a que todos los servicios estén activos
4. Haz clic en "Abrir Interfaz" para acceder a Guacamole Web
5. **Primera vez**: Usuario y contraseña por defecto son `guacadmin` / `guacadmin`
6. **Cambia la contraseña** después del primer acceso

### Configurar Conexiones en Guacamole

#### Windows RDP
- **Tipo**: RDP
- **Nombre**: Windows 11
- **Hostname**: `windows-rdp-target`
- **Puerto**: `3389`
- **Usuario**: `Administrator`
- **Contraseña**: `Windows123!`

#### Ubuntu VNC
- **Tipo**: VNC
- **Nombre**: Ubuntu Desktop
- **Hostname**: `ubuntu-vnc-target`
- **Puerto**: `5900`
- **Contraseña**: `Ubuntu123!`

#### Ubuntu SSH
- **Tipo**: SSH
- **Nombre**: Ubuntu Server
- **Hostname**: `ubuntu-ssh-target`
- **Puerto**: `2222`
- **Usuario**: `sshuser`
- **Contraseña**: `Ubuntu123!`

## 🏗️ Estructura del Proyecto

```
guacamole/
├── src/
│   ├── main.js              # Proceso principal de Electron
│   ├── preload.js           # Script de precarga seguro
│   └── renderer/
│       ├── index.html       # Interfaz principal
│       ├── styles.css       # Estilos CSS
│       └── app.js           # Lógica de la aplicación
├── docker/
│   ├── docker-compose.yml   # Configuración de servicios
│   ├── initdb.sql           # Esquema de base de datos (generado)
│   ├── generate-schema.sh   # Script de generación (Linux/macOS)
│   └── generate-schema.ps1  # Script de generación (Windows)
├── assets/                  # Iconos y recursos
├── package.json             # Configuración de npm
└── README.md                # Este archivo
```

## 🔧 Troubleshooting

### Docker no está disponible
- Asegúrate de que Docker Desktop esté ejecutándose
- Verifica que Docker esté en el PATH del sistema

### Error al generar initdb.sql
- Asegúrate de tener conexión a Internet para descargar la imagen
- Verifica que Docker esté funcionando: `docker ps`

### Contenedores no inician
- Verifica los logs: `docker-compose logs`
- Asegúrate de que los puertos no estén en uso
- Revisa que tengas suficiente memoria RAM (mínimo 6GB recomendado)

### Guacamole no responde
- Espera unos segundos después de iniciar los servicios
- Verifica que el contenedor esté corriendo: `docker ps`
- Revisa los logs: `docker-compose logs guacamole`

## 📝 Notas

- Los contenedores de destino (Windows, Ubuntu) pueden tardar varios minutos en iniciarse completamente
- El contenedor de Windows requiere al menos 4GB de RAM
- Las contraseñas predeterminadas son solo para desarrollo. Cámbialas en producción
- Los datos de PostgreSQL se almacenan en `docker/data/postgres` para persistencia

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue o un pull request.

## 📄 Licencia

MIT License

## 🙏 Créditos

- [Apache Guacamole](https://guacamole.apache.org/) - Gateway de escritorio remoto
- [Electron](https://www.electronjs.org/) - Framework para aplicaciones de escritorio
