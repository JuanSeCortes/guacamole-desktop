# 🚀 Guía de Inicio Rápido - Guacamole Desktop

## Paso 1: Verificar Requisitos

Asegúrate de tener instalado:
- ✅ Node.js (v18 o superior)
- ✅ Docker Desktop (corriendo)
- ✅ Git (opcional)

## Paso 2: Instalar Dependencias (si no lo has hecho)

```bash
npm install
```

## Paso 3: Generar el Esquema de Base de Datos

**Primera vez solo:**

```powershell
cd docker
.\generate-schema.ps1
```

Esto generará el archivo `initdb.sql` necesario para PostgreSQL.

## Paso 4: Ejecutar la Aplicación

```bash
npm start
```

O en modo desarrollo con DevTools:

```bash
npm run dev
```

## Paso 5: En la Interfaz de la Aplicación

1. **Verifica el estado de Docker:**
   - Debe mostrar "Docker: Disponible" ✅

2. **Inicia los servicios Docker:**
   - Click en el botón **"Iniciar Servicios"** ▶️
   - Espera 30-60 segundos a que todos los contenedores estén listos

3. **Verifica que todos los servicios estén corriendo:**
   - PostgreSQL: En ejecución ✅
   - Guacd: En ejecución ✅
   - Guacamole Web: Disponible ✅

4. **Conecta a una máquina remota:**
   - Click en **"Conectar a Windows RDP"** 🪟
   - O **"Conectar a Ubuntu VNC"** 🐧
   - O **"Conectar a Ubuntu SSH"** 💻

## Paso 6: Usar la Conexión Remota

- La sesión remota aparecerá en el canvas
- Puedes interactuar normalmente (mouse, teclado)
- Usa **"← Volver"** para regresar al menú principal

---

## 🔧 Comandos Útiles

### Detener servicios Docker:
```bash
cd docker
docker-compose down
```

### Ver logs de los contenedores:
```bash
cd docker
docker-compose logs -f
```

### Reiniciar todo:
```bash
# Detener servicios
cd docker
docker-compose down

# Reiniciar aplicación Electron (Ctrl+C y luego npm start)
```

---

## ❗ Troubleshooting

### Error: "Puerto 8000 ya en uso"
- Cierra otras instancias de la aplicación
- O cambia el puerto en `src/backend/config.js`

### Error: "Docker no disponible"
- Asegúrate de que Docker Desktop esté corriendo
- Verifica: `docker ps`

### Error: "Servidor guacamole-lite no inició"
- Revisa la consola de Electron
- Verifica que el puerto 8000 esté libre

### Pantalla en negro al conectar:
- Espera 10-15 segundos (las conexiones pueden tardar)
- Verifica que los contenedores objetivo estén corriendo
- Revisa los logs: `docker-compose logs`

---

## 📝 Checklist de Verificación

Antes de conectar, verifica:

- [ ] Docker Desktop está corriendo
- [ ] `initdb.sql` existe en `docker/`
- [ ] Aplicación Electron inició correctamente
- [ ] Servidor guacamole-lite inició (mensaje en consola)
- [ ] Servicios Docker están en "En ejecución"
- [ ] Contenedores objetivo están listos (puede tardar varios minutos)

---

## ✅ Todo Listo

Si todo está correcto, deberías poder:
1. Ver la interfaz principal con las 3 tarjetas de conexión
2. Click en "Conectar" a cualquier máquina
3. Ver la sesión remota en el canvas
4. Interactuar con el sistema remoto

¡Disfruta de tu aplicación Guacamole Desktop! 🎉
