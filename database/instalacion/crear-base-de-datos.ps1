<#
.SYNOPSIS
  Crea el rol de aplicación y las bases de datos del proyecto.

.DESCRIPTION
  Se ejecuta conectando como superusuario de PostgreSQL. Las contraseñas se
  piden por consola y no se escriben en ningún archivo.

  La operación es repetible: si el rol o las bases ya existen, no se duplican.

.EXAMPLE
  .\crear-base-de-datos.ps1

.EXAMPLE
  .\crear-base-de-datos.ps1 -RutaPsql 'D:\PostgreSQL\17\bin\psql.exe'
#>
[CmdletBinding()]
param(
  [string]$NombreBase = 'pwa_tareas_03',
  [string]$NombreBasePruebas = 'pwa_tareas_03_pruebas',
  [string]$NombreRol = 'pwa_tareas_03_app',
  [string]$Servidor = 'localhost',
  [int]$Puerto = 5432,
  [string]$RutaPsql
)

$ErrorActionPreference = 'Stop'

$raizDatabase = Split-Path -Parent $PSScriptRoot

. (Join-Path $raizDatabase 'comun\utilidades-psql.ps1')

$psql = Resolver-Psql -RutaIndicada $RutaPsql

Write-Host 'Este script necesita la contraseña del superusuario de PostgreSQL.'
Write-Host 'Las contraseñas no se guardan en ningún archivo.'
Write-Host ''

$contrasenaSuperusuario = Read-Host -Prompt 'Contraseña del superusuario postgres' -AsSecureString
$contrasenaRol = Read-Host -Prompt "Contraseña para el rol $NombreRol" -AsSecureString

$textoSuperusuario = [System.Net.NetworkCredential]::new('', $contrasenaSuperusuario).Password
$textoRol = [System.Net.NetworkCredential]::new('', $contrasenaRol).Password

if ([string]::IsNullOrEmpty($textoSuperusuario)) {
  throw 'La contraseña del superusuario no puede estar vacía.'
}

if ([string]::IsNullOrEmpty($textoRol)) {
  throw 'La contraseña del rol no puede estar vacía.'
}

# Escapado de comillas simples para que la contraseña pueda usarse en SQL.
$rolEscapado = $textoRol.Replace("'", "''")

$env:PGHOST = $Servidor
$env:PGPORT = "$Puerto"
$env:PGUSER = 'postgres'
$env:PGPASSWORD = $textoSuperusuario
$env:PGDATABASE = 'postgres'

try {
  Write-Host ''
  Write-Host "Creando o actualizando el rol $NombreRol..."

  $sqlRol = @"
DO `$`$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$NombreRol') THEN
    ALTER ROLE $NombreRol WITH LOGIN PASSWORD '$rolEscapado';
  ELSE
    CREATE ROLE $NombreRol WITH LOGIN PASSWORD '$rolEscapado';
  END IF;
END
`$`$;
"@

  Invoke-Psql -Psql $psql -Sql $sqlRol

  foreach ($base in @($NombreBase, $NombreBasePruebas)) {
    $sqlExisteBase = "SELECT 1 FROM pg_database WHERE datname = '$base';"
    $existe = Invoke-Psql -Psql $psql -Sql $sqlExisteBase -ArgumentosExtra @('-tA') -Capturar

    if ("$existe".Trim() -eq '1') {
      Write-Host "La base de datos $base ya existe. No se modifica."
      continue
    }

    Write-Host "Creando la base de datos $base..."

    # CREATE DATABASE no puede ejecutarse dentro de una transacción ni en un bloque DO.
    $sqlCrearBase = "CREATE DATABASE $base OWNER $NombreRol;"

    Invoke-Psql -Psql $psql -Sql $sqlCrearBase
  }
}
finally {
  # Las credenciales se retiran del entorno del proceso al terminar.
  Remove-Item -Path env:PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Item -Path env:PGUSER -ErrorAction SilentlyContinue
  Remove-Item -Path env:PGDATABASE -ErrorAction SilentlyContinue
  Remove-Item -Path env:PGHOST -ErrorAction SilentlyContinue
  Remove-Item -Path env:PGPORT -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host 'Instalación terminada.'
Write-Host "El archivo backend\.env debe contener estas claves:"
Write-Host "  PGHOST=$Servidor"
Write-Host "  PGPORT=$Puerto"
Write-Host "  PGDATABASE=$NombreBase"
Write-Host "  PGUSER=$NombreRol"
Write-Host '  PGPASSWORD=<la contraseña que acabas de escribir>'
