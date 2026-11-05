param(
  [Parameter(Mandatory = $true)]
  [string]$Version,
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '../dist')
)

$ErrorActionPreference = 'Stop'
# A version is also a tag and part of a Windows filename. Reject paths and shell syntax.
if ($Version.Length -gt 100 -or $Version -cnotmatch '\A[A-Za-z0-9][A-Za-z0-9._+-]*\z' -or
    $Version.Contains('..') -or $Version.EndsWith('.') -or $Version.EndsWith('.lock')) {
  throw 'Use a version of up to 100 ASCII letters, digits, dots, underscores, pluses or hyphens (for example v1.2.3).'
}

$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$output = [IO.Path]::GetFullPath($OutputDirectory)
$archiveName = "code-daemon-$Version.zip"
$archivePath = Join-Path $output $archiveName

# Allow only runtime assets. New development files cannot enter the ZIP by default.
$files = @('CodeDaemon.ps1', 'Start code.daemon.vbs', 'ui/widget.html')
$files += Get-ChildItem -LiteralPath (Join-Path $root 'ui') -File -Filter '*.js' |
  ForEach-Object { 'ui/' + $_.Name }
$files += Get-ChildItem -LiteralPath (Join-Path $root 'ui/i18n') -File -Filter '*.js' |
  ForEach-Object { 'ui/i18n/' + $_.Name }
$files += Get-ChildItem -LiteralPath (Join-Path $root 'ui/fonts') -File |
  Where-Object { $_.Extension -eq '.woff2' -or $_.Name -like 'OFL-*.txt' } |
  ForEach-Object { 'ui/fonts/' + $_.Name }
$files += Get-ChildItem -LiteralPath (Join-Path $root 'lib') -Recurse -File -Filter '*.dll' |
  ForEach-Object { $_.FullName.Substring($root.Length + 1).Replace('\', '/') }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Directory]::CreateDirectory($output) | Out-Null
# CreateNew protects a previous package from accidental replacement.
$stream = [IO.File]::Open($archivePath, [IO.FileMode]::CreateNew)
try {
  $zip = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create, $true)
  try {
    foreach ($file in ($files | Sort-Object -Unique)) {
      [IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $zip, (Join-Path $root $file), $file, [IO.Compression.CompressionLevel]::Optimal
      ) | Out-Null
    }
  } finally { $zip.Dispose() }
} finally { $stream.Dispose() }

$hash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
$checksumPath = Join-Path $output "code-daemon-$Version.SHA256-$hash.txt"
[IO.File]::WriteAllText($checksumPath, "$hash  $archiveName`n", [Text.Encoding]::ASCII)

[PSCustomObject]@{ Archive = $archivePath; Checksum = $checksumPath; SHA256 = $hash }
