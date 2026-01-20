# 🚀 Cómo Ejecutar Guacamole Desktop

## Paso 1: Generar el Esquema de Base de Datos

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

## Paso 2: Ejecutar la Aplicación Electron

Desde la raíz del proyecto:
```bash
npm start
```

O en modo desarrollo con DevTools:
```bash
npm run dev
```

## Paso 3: Iniciar los Servicios Docker

Una vez que la aplicación se abra:

1. **Click en "Iniciar Servicios"** en la interfaz
   - Esto levantará todos los contenedores Docker
   - Espera 30-60 segundos a que todos los servicios estén listos

**O manualmente desde terminal:**
```bash
cd docker
docker-compose up -d
```

## Paso 4: Verificar Estado

En la interfaz de la aplicación, verifica que:
- ✅ Docker: Disponible
- ✅ PostgreSQL: En ejecución
- ✅ Guacd: En ejecución
- ✅ Guacamole Web: Disponible

## Paso 5: Conectar a una Máquina Remota

1. **Selecciona una conexión:**
   - Click en **"Conectar a Windows RDP"** (Windows 11)
   - Click en **"Conectar a Ubuntu VNC"** (Ubuntu Desktop)
   - Click en **"Conectar a Ubuntu SSH"** (Ubuntu Server)

2. **Espera la conexión:**
   - Aparecerá una pantalla de carga
   - La sesión remota se mostrará en el canvas
   - Puedes interactuar normalmente

## Paso 6: Controles Disponibles

En la vista de conexión:
- **← Volver**: Regresa al menú principal
- **⛶ Pantalla Completa**: Activa/desactiva pantalla completa
- **⌨️ Teclado Virtual**: Muestra/oculta teclado virtual
- **📋 Clipboard**: Copiar/pegar entre sistemas
- **Desconectar**: Cierra la conexión actual

## 🔧 Solución de Problemas

### La aplicación no inicia
```bash
# Verificar que las dependencias estén instaladas
npm install
```

### Error: "Servidor guacamole-lite no inició"
- Verifica que el puerto 8000 no esté en uso
- Revisa la consola de Electron para ver errores

### Los contenedores no inician
```bash
# Ver logs
cd docker
docker-compose logs

# Ver estado
docker-compose ps
```

### Error de conexión
- Verifica que guacd esté corriendo: `docker ps | grep guacd`
- Verifica que los contenedores objetivo estén listos (puede tardar varios minutos)
- Revisa los logs: `docker-compose logs guacamole`

### Pantalla en negro al conectar
- Espera 10-15 segundos (la conexión puede tardar)
- Verifica las credenciales en `src/backend/config.js`
- Verifica que los hostnames coincidan con los nombres de contenedores Docker

## 📝 Notas Importantes

1. **Primera vez**: Los contenedores pueden tardar varios minutos en iniciarse completamente
2. **Windows RDP**: Requiere mínimo 4GB RAM disponible
3. **Puertos necesarios**: Asegúrate de que los puertos 8000, 4822, 8080, 3389, 5900, 2222 estén libres
4. **Servidor guacamole-lite**: Se inicia automáticamente cuando abres la aplicación

## ✅ Checklist de Verificación

- [ ] Esquema de BD generado (`docker/initdb.sql` existe)
- [ ] Dependencias instaladas (`npm install`)
- [ ] Docker Desktop corriendo
- [ ] Aplicación Electron iniciada (`npm start`)
- [ ] Servicios Docker iniciados (botón "Iniciar Servicios")
- [ ] Todos los servicios muestran "En ejecución"
- [ ] Click en "Conectar" a una máquina
- [ ] Sesión remota visible en canvas

¡Listo para usar! 🎉
