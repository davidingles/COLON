# Utilidades compartidas por los scripts de base de datos.
#
# Este archivo no se ejecuta por sí solo: se carga con dot-sourcing desde los
# scripts de instalacion/ y migraciones/.

$ErrorActionPreference = 'Stop'

# psql debe interpretar el texto que recibe como UTF-8.
$env:PGCLIENTENCODING = 'UTF8'
$OutputEncoding = New-Object System.Text.UTF8Encoding($false)

# psql devuelve la salida en UTF-8. Sin esto, la consola de Windows la
# interpretaría con su propia página de códigos y los acentos se verían mal.
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

# Variables de PostgreSQL que los scripts aceptan leer de un archivo de entorno.
# Se limita la lista para que ninguna otra variable del archivo afecte a psql.
$script:VARIABLES_POSTGRES_PERMITIDAS = @(
  'PGHOST',
  'PGPORT',
  'PGDATABASE',
  'PGUSER',
  'PGPASSWORD',
  'PGSSLMODE'
)

<#
.SYNOPSIS
  Localiza el ejecutable psql.

.DESCRIPTION
  Busca en la ruta indicada, después en el PATH y por último en las rutas
  habituales de instalación en Windows.
#>
function Resolver-Psql {
  [CmdletBinding()]
  param(
    [string]$RutaIndicada
  )

  if ($RutaIndicada) {
    if (-not (Test-Path -LiteralPath $RutaIndicada)) {
      throw "No existe el ejecutable indicado en -RutaPsql: $RutaIndicada"
    }

    return (Resolve-Path -LiteralPath $RutaIndicada).Path
  }

  $encontrado = Get-Command psql -ErrorAction SilentlyContinue
  if ($encontrado) {
    return $encontrado.Source
  }

  $instalaciones = Get-ChildItem -Path 'C:\Program Files\PostgreSQL' -Directory -ErrorAction SilentlyContinue |
    Sort-Object -Property Name -Descending

  foreach ($instalacion in $instalaciones) {
    $candidata = Join-Path $instalacion.FullName 'bin\psql.exe'

    if (Test-Path -LiteralPath $candidata) {
      return $candidata
    }
  }

  throw 'No se ha encontrado psql.exe. Indica su ruta con el parámetro -RutaPsql.'
}

<#
.SYNOPSIS
  Carga en el entorno las variables de conexión de PostgreSQL.

.DESCRIPTION
  Lee un archivo con formato CLAVE=valor y aplica solo las variables estándar de
  PostgreSQL. El contenido de los valores nunca se muestra por pantalla.
#>
function Cargar-EntornoPostgres {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)][string]$Ruta
  )

  if (-not (Test-Path -LiteralPath $Ruta)) {
    throw "No existe el archivo de credenciales: $Ruta"
  }

  $encontradas = @()

  foreach ($linea in Get-Content -LiteralPath $Ruta) {
    $texto = $linea.Trim()

    if ($texto -eq '' -or $texto.StartsWith('#')) {
      continue
    }

    if ($texto -notmatch '^([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
      continue
    }

    $nombre = $Matches[1].ToUpperInvariant()
    if ($script:VARIABLES_POSTGRES_PERMITIDAS -notcontains $nombre) {
      continue
    }

    $valor = $Matches[2].Trim().Trim('"').Trim("'")

    Set-Item -Path "env:$nombre" -Value $valor
    $encontradas += $nombre
  }

  if ($encontradas.Count -eq 0) {
    throw ("El archivo $Ruta no define ninguna variable de PostgreSQL. " +
      'Se esperan líneas con el formato PGHOST=valor, PGDATABASE=valor, etc.')
  }

  return $encontradas
}

<#
.SYNOPSIS
  Ejecuta una sentencia o un script SQL con psql.

.DESCRIPTION
  El SQL se envía por la entrada estándar para que no aparezca en la línea de
  comandos del proceso. Con -Capturar se devuelve la salida de psql; sin él, la
  salida se muestra por pantalla.

  Siempre se activa ON_ERROR_STOP para que un error detenga la ejecución.
#>
function Invoke-Psql {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)][string]$Psql,
    [Parameter(Mandatory)][string]$Sql,
    [string[]]$ArgumentosExtra = @(),
    [switch]$Capturar,
    [switch]$MostrarSalida
  )

  $argumentos = @('--no-psqlrc', '--quiet', '-v', 'ON_ERROR_STOP=1') + $ArgumentosExtra + @('-f', '-')

  if ($Capturar) {
    $salida = $Sql | & $Psql @argumentos

    if ($LASTEXITCODE -ne 0) {
      throw "psql ha fallado con el código $LASTEXITCODE al ejecutar una consulta."
    }

    return $salida
  }

  if ($MostrarSalida) {
    # La salida se deja que la escriba psql en un archivo y se lee después
    # indicando UTF-8. Si se canaliza directamente, PowerShell la decodifica con
    # la página de códigos de la consola y los acentos se ven mal.
    $archivoSalida = [System.IO.Path]::GetTempFileName()

    try {
      $Sql | & $Psql @argumentos '-o' $archivoSalida | Out-Null

      if ($LASTEXITCODE -ne 0) {
        throw "psql ha fallado con el código $LASTEXITCODE. Revisa el mensaje anterior."
      }

      Get-Content -LiteralPath $archivoSalida -Encoding utf8
    }
    finally {
      Remove-Item -LiteralPath $archivoSalida -Force -ErrorAction SilentlyContinue
    }

    return
  }

  $Sql | & $Psql @argumentos | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw "psql ha fallado con el código $LASTEXITCODE. Revisa el mensaje anterior."
  }
}

<#
.SYNOPSIS
  Comprueba que hay datos suficientes para conectarse.
#>
function Assert-ConexionConfigurada {
  [CmdletBinding()]
  param(
    [string]$NombreBase,
    [string]$NombreUsuario
  )

  if (-not $env:PGDATABASE -and $NombreBase) {
    $env:PGDATABASE = $NombreBase
  }

  if (-not $env:PGUSER -and $NombreUsuario) {
    $env:PGUSER = $NombreUsuario
  }

  if (-not $env:PGDATABASE -or -not $env:PGUSER) {
    throw ('Faltan datos de conexión: hace falta PGDATABASE y PGUSER. ' +
      'Revisa el archivo de credenciales antes de continuar.')
  }
}
