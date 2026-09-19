<#
.SYNOPSIS
  Ejecuta un archivo SQL con las credenciales configuradas.

.DESCRIPTION
  Lee las credenciales del archivo indicado en -ArchivoEnv y ejecuta el archivo
  SQL indicado. Todo el archivo se ejecuta dentro de una única transacción, así
  que un error no deja la base de datos a medias.

  Por ese motivo los archivos SQL no deben incluir BEGIN ni COMMIT: los gestiona
  este script.

.EXAMPLE
  .\ejecutar-sql.ps1 .\datos-de-ejemplo.sql

.EXAMPLE
  .\ejecutar-sql.ps1 .\datos-de-ejemplo.sql -BaseDeDatos pwa_tareas_03_pruebas
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory, Position = 0)][string]$Archivo,
  [string]$ArchivoEnv,
  [string]$RutaPsql,
  [string]$BaseDeDatos
)

$ErrorActionPreference = 'Stop'

$raizDatabase = $PSScriptRoot
$raizProyecto = Split-Path -Parent $raizDatabase

. (Join-Path $raizDatabase 'comun\utilidades-psql.ps1')

if (-not (Test-Path -LiteralPath $Archivo)) {
  throw "No existe el archivo SQL indicado: $Archivo"
}

$archivoSql = (Resolve-Path -LiteralPath $Archivo).Path

if (-not $ArchivoEnv) {
  $ArchivoEnv = Join-Path $raizProyecto 'backend\.env'
}

$psql = Resolver-Psql -RutaIndicada $RutaPsql

Write-Host "Archivo de credenciales: $ArchivoEnv"
Cargar-EntornoPostgres -Ruta $ArchivoEnv | Out-Null

# Permite ejecutar el archivo contra otra base de datos reutilizando las mismas
# credenciales, por ejemplo la de pruebas.
if ($BaseDeDatos) {
  $env:PGDATABASE = $BaseDeDatos
}

Assert-ConexionConfigurada | Out-Null

$conexion = "${env:PGUSER}@${env:PGHOST}:${env:PGPORT}/${env:PGDATABASE}"
Write-Host "Conexión: $conexion"
Write-Host "Ejecutando: $archivoSql"

$sql = Get-Content -LiteralPath $archivoSql -Raw

Invoke-Psql -Psql $psql -Sql $sql -ArgumentosExtra @('--single-transaction') -MostrarSalida

Write-Host 'Ejecución terminada.'
