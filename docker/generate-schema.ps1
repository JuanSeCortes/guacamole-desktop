# Script PowerShell para generar el esquema SQL de Guacamole en Windows

Write-Host "Generando esquema de base de datos de Guacamole..." -ForegroundColor Cyan

# Descargar la imagen si no existe
Write-Host "Descargando imagen de Guacamole (si no existe)..." -ForegroundColor Yellow
docker pull guacamole/guacamole:latest | Out-Null

# Eliminar archivo anterior si existe
if (Test-Path "initdb.sql") {
    Remove-Item "initdb.sql" -Force
    Write-Host "Archivo initdb.sql anterior eliminado" -ForegroundColor Yellow
}

# Generar el esquema SQL usando --postgresql (no --postgres)
Write-Host "Generando esquema SQL..." -ForegroundColor Yellow

# Usar --postgresql como parámetro correcto
docker run --rm guacamole/guacamole /opt/guacamole/bin/initdb.sh --postgresql > initdb.sql 2>&1

# Verificar si el archivo se generó correctamente
if (Test-Path "initdb.sql" -PathType Leaf) {
    $fileSize = (Get-Item "initdb.sql").Length
    $firstLine = Get-Content initdb.sql -First 1
    
    # Verificar que no sea un mensaje de error
    if ($firstLine -match "Bad database type|USAGE:|ERROR") {
        Write-Host "ERROR - El comando falló. Revisa el archivo initdb.sql para ver el error" -ForegroundColor Red
        Get-Content initdb.sql -First 5
        exit 1
    } elseif ($fileSize -gt 5000) {
        Write-Host "OK - Esquema generado correctamente en initdb.sql" -ForegroundColor Green
        Write-Host "Tamaño del archivo: $fileSize bytes" -ForegroundColor Gray
        Write-Host "Ahora puedes ejecutar: docker-compose up -d" -ForegroundColor Yellow
    } else {
        Write-Host "ADVERTENCIA - El archivo parece muy pequeño ($fileSize bytes)" -ForegroundColor Yellow
        Write-Host "Primeras líneas del archivo:" -ForegroundColor Yellow
        Get-Content initdb.sql -First 5
    }
} else {
    Write-Host "ERROR - No se pudo generar el archivo initdb.sql" -ForegroundColor Red
    exit 1
}
