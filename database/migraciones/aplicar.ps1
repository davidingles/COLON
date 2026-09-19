<#
.SYNOPSIS
  Aplica las migraciones pendientes de la base de datos.

.DESCRIPTION
  Lee las credenciales del archivo indicado en -ArchivoEnv, aplica en orden las
  migraciones que aún no estén registradas en la tabla esquema_migraciones y
  registra cada una dentro de la misma transacción.

  Si una migración falla, no queda registrada y la transacción se deshace.

.EXAMPLE
  .\aplicar.ps1

.EXAMPLE
  .\aplicar.ps1 -Simular

.EXAMPLE
  .\aplicar.ps1 -ArchivoEnv 'C:\ruta\a\otro\.env'

.EXAMPLE
  .\aplicar.ps1 -BaseDeDatos pwa_tareas_03_pruebas
#>
[CmdletBinding()]
param(
  [string]$ArchivoEnv,
  [string]$RutaPsql,
  [string]$BaseDeDatos,
  [switch]$Simular
)

$ErrorActionPreference = 'Stop'

$raizDatabase = Split-Path -Parent $PSScriptRoot
$raizProyecto = Split-Path -Parent $raizDatabase

. (Join-Path $raizDatabase 'comun\utilidades-psql.ps1')

if (-not $ArchivoEnv) {
  $ArchivoEnv = Join-Path $raizProyecto 'backend\.env'
}

$psql = Resolver-Psql -RutaIndicada $RutaPsql

Write-Host "Archivo de credenciales: $ArchivoEnv"
Cargar-EntornoPostgres -Ruta $ArchivoEnv | Out-Null

# Permite aplicar las migraciones a otra base de datos reutilizando las mismas
# credenciales, por ejemplo para preparar la base de pruebas.
if ($BaseDeDatos) {
  $env:PGDATABASE = $BaseDeDatos
}

Assert-ConexionConfigurada | Out-Null

$conexion = "${env:PGUSER}@${env:PGHOST}:${env:PGPORT}/${env:PGDATABASE}"
Write-Host "Conexión: $conexion"

# Tabla de control de versiones. Se crea si todavía no existe.
$sqlTablaVersiones = @'
CREATE TABLE IF NOT EXISTS esquema_migraciones (
  version integer PRIMARY KEY,
  nombre_archivo text NOT NULL,
  aplicada_en timestamptz NOT NULL DEFAULT now()
);
'@

$sqlVersionesAplicadas = 'SELECT version FROM esquema_migraciones ORDER BY version;'

if (-not $Simular) {
  Invoke-Psql -Psql $psql -Sql $sqlTablaVersiones
}

$aplicadas = @()
if (-not $Simular) {
  $salida = Invoke-Psql -Psql $psql -Sql $sqlVersionesAplicadas -ArgumentosExtra @('-tA') -Capturar

  foreach ($linea in $salida) {
    $texto = "$linea".Trim()

    if ($texto -match '^\d+$') {
      $aplicadas += [int]$texto
    }
  }
}

$pendientes = @()

foreach ($archivo in Get-ChildItem -Path $PSScriptRoot -Filter '*.sql' -File | Sort-Object -Property Name) {
  if ($archivo.Name -notmatch '^(\d+)_(.+)\.sql$') {
    Write-Warning "Se ignora '$($archivo.Name)': el nombre debe empezar por un número seguido de guion bajo."
    continue
  }

  $version = [int]$Matches[1]

  if ($aplicadas -contains $version) {
    continue
  }

  $pendientes += [PSCustomObject]@{
    Version = $version
    Archivo = $archivo
  }
}

if ($pendientes.Count -eq 0) {
  Write-Host 'No hay migraciones pendientes.'
  exit 0
}

if ($Simular) {
  Write-Host 'Simulación: no se modifica la base de datos.'
  Write-Host "Se aplicarían $($pendientes.Count) migraciones:"

  foreach ($pendiente in $pendientes) {
    Write-Host "  - $($pendiente.Archivo.Name)"
  }

  exit 0
}

foreach ($pendiente in $pendientes) {
  Write-Host "Aplicando $($pendiente.Archivo.Name)..."

  $contenido = Get-Content -LiteralPath $pendiente.Archivo.FullName -Raw

  # La migración y el registro de la versión se envían juntos para que psql los
  # ejecute dentro de la misma transacción.
  $sql = @"
$contenido

INSERT INTO esquema_migraciones (version, nombre_archivo)
VALUES ($($pendiente.Version), '$($pendiente.Archivo.Name)');
"@

  Invoke-Psql -Psql $psql -Sql $sql -ArgumentosExtra @('--single-transaction')

  Write-Host "  Aplicada la versión $($pendiente.Version)."
}

Write-Host "Migraciones aplicadas: $($pendientes.Count)."
