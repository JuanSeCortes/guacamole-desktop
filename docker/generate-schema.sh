#!/bin/bash
# Script para generar el esquema SQL de Guacamole

echo "Generando esquema de base de datos de Guacamole..."

# Descargar la imagen si no existe
docker pull guacamole/guacamole:latest

# Generar el esquema SQL
docker run --rm guacamole/guacamole /opt/guacamole/bin/initdb.sh --postgres > initdb.sql

if [ $? -eq 0 ]; then
    echo "✓ Esquema generado correctamente en initdb.sql"
    echo "Ahora puedes ejecutar: docker-compose up -d"
else
    echo "✗ Error al generar el esquema"
    exit 1
fi
