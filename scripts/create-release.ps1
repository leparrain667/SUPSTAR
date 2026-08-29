param(
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
if (-not $OutputPath) {
  $OutputPath = Join-Path (Split-Path $projectRoot -Parent) 'SUPSTAR-rendu.zip'
}
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)

if (Test-Path -LiteralPath $resolvedOutput) {
  throw "Le fichier existe déjà : $resolvedOutput. Choisissez un autre chemin ou supprimez-le volontairement."
}

$temporaryBase = [System.IO.Path]::GetTempPath()
$temporaryRoot = Join-Path $temporaryBase ("supstar-release-" + [guid]::NewGuid().ToString('N'))
$stagingRoot = Join-Path $temporaryRoot 'supstar-fullstack'
$excludedDirectories = @('node_modules', 'dist', '.git', '.idea', '.vscode', 'coverage')

try {
  New-Item -ItemType Directory -Path $stagingRoot | Out-Null

  Get-ChildItem -LiteralPath $projectRoot -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Substring($projectRoot.Length).TrimStart([char[]]@(
      [System.IO.Path]::DirectorySeparatorChar,
      [System.IO.Path]::AltDirectorySeparatorChar
    ))
    $segments = $relativePath -split '[\\/]'
    $isExcludedDirectory = @($segments | Where-Object { $excludedDirectories -contains $_ }).Count -gt 0
    $isExcludedFile = $_.Name -eq '.env' -or $_.Extension -eq '.log' -or $_.Extension -eq '.zip'

    if (-not $isExcludedDirectory -and -not $isExcludedFile) {
      $target = Join-Path $stagingRoot $relativePath
      $targetDirectory = Split-Path $target -Parent
      if (-not (Test-Path -LiteralPath $targetDirectory)) {
        New-Item -ItemType Directory -Path $targetDirectory | Out-Null
      }
      Copy-Item -LiteralPath $_.FullName -Destination $target
    }
  }

  Compress-Archive -LiteralPath $stagingRoot -DestinationPath $resolvedOutput -CompressionLevel Optimal
  Write-Output "Archive créée : $resolvedOutput"
} finally {
  $safeTemporaryRoot = [System.IO.Path]::GetFullPath($temporaryRoot)
  if ($safeTemporaryRoot.StartsWith($temporaryBase, [System.StringComparison]::OrdinalIgnoreCase) -and
      (Split-Path $safeTemporaryRoot -Leaf).StartsWith('supstar-release-')) {
    Remove-Item -LiteralPath $safeTemporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
