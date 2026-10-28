# Checks for CodeDaemon.ps1 that run without a window: parse, and the file writer.
# CI runs this with Windows PowerShell 5.1; `pwsh -File tests/host.tests.ps1` works too.
$ErrorActionPreference = 'Stop'
$file = Join-Path $PSScriptRoot '..\CodeDaemon.ps1'
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $file), [ref]$null, [ref]$errors)
if ($errors) { $errors | ForEach-Object { Write-Error "$($_.Extent.StartLineNumber): $($_.Message)" }; exit 1 }
'ok - CodeDaemon.ps1 parses'

function Import-HostFunction([string]$name) {
  $fn = $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $name }, $true) | Select-Object -First 1
  if (-not $fn) { throw "function $name not found" }
  . ([scriptblock]::Create($fn.Extent.Text))
  Set-Item "function:global:$name" (Get-Item "function:$name").ScriptBlock
}
Import-HostFunction 'Write-TextAtomic'
Import-HostFunction 'Test-ReadOnlyQuery'
$fails = 0
function Check([string]$what, [bool]$ok) { if ($ok) { "ok - $what" } else { "not ok - $what"; $script:fails++ } }

$dir = Join-Path ([IO.Path]::GetTempPath()) ("cd-host-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $dir | Out-Null
try {
  $p = Join-Path $dir 'save.json'
  Write-TextAtomic $p 'one'
  Check 'creates a new file' ((Get-Content $p -Raw) -eq 'one')
  Write-TextAtomic $p 'two'
  Check 'replaces an existing file (no backup)' ((Get-Content $p -Raw) -eq 'two' -and -not (Test-Path "$p.tmp") -and -not (Test-Path "$p.bak"))
  Write-TextAtomic $p 'three' -Backup
  Check 'replaces with -Backup and keeps the old version' ((Get-Content $p -Raw) -eq 'three' -and (Get-Content "$p.bak" -Raw) -eq 'two')
} finally { Remove-Item -LiteralPath $dir -Recurse -Force }

Check 'GraphQL query allowed' (Test-ReadOnlyQuery '{"query":"query($c:String){viewer{login}}"}')
Check 'GraphQL mutation rejected' (-not (Test-ReadOnlyQuery '{"query":"mutation{addStar(input:{}){clientMutationId}}"}'))
Check 'mutation after a query rejected' (-not (Test-ReadOnlyQuery '{"query":"query A{viewer{login}} mutation B{x}"}'))
Check 'mutation hidden after a comment rejected' (-not (Test-ReadOnlyQuery "{`"query`":`"# hi\nmutation{x}`"}"))
if ($fails) { exit 1 }
