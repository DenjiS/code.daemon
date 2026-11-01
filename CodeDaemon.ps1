<#
  code.daemon - desktop pet widget host
  Windows PowerShell 5.1 + Microsoft Edge WebView2.

  The window is frameless and stays on top. The pet UI lives in ui\widget.html.
  This host only does what a web page cannot:
    - stores your GitHub / GitLab tokens encrypted with Windows DPAPI (current user)
    - calls the GitHub / GitLab APIs for the page, adding the token itself
    - saves the pet to %APPDATA%\CodeDaemon\save.json
    - window dragging, tray icon, start with Windows

  Start it with "Start code.daemon.vbs". Use "Start code.daemon (debug).cmd" to see errors.
#>
param([switch]$DevTools)

$ErrorActionPreference = 'Stop'
$Root     = $PSScriptRoot
$DataDir  = Join-Path $env:APPDATA 'CodeDaemon'
$CacheDir = Join-Path $env:LOCALAPPDATA 'CodeDaemon'
$SavePath = Join-Path $DataDir 'save.json'
$SetPath  = Join-Path $DataDir 'settings.json'
$LogPath  = Join-Path $CacheDir 'host.log'
$StartupLnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'code.daemon.lnk'
# The UI is served from this virtual host. .example is reserved (RFC 6761); .local can stall navigations.
$VHost = 'daemon.example'
$Origin = "https://$VHost/"
New-Item -ItemType Directory -Force -Path $DataDir, $CacheDir | Out-Null

function Write-Log([string]$msg) {
  try { Add-Content -LiteralPath $LogPath -Value ('{0:yyyy-MM-dd HH:mm:ss} {1}' -f (Get-Date), $msg) -Encoding UTF8 } catch {}
}

Add-Type -AssemblyName System.Windows.Forms, System.Drawing, System.Web
[System.Windows.Forms.Application]::EnableVisualStyles()
[System.Windows.Forms.Application]::SetUnhandledExceptionMode([System.Windows.Forms.UnhandledExceptionMode]::CatchException)

function Show-Error([string]$msg) {
  Write-Log "ERROR $msg"
  [void][System.Windows.Forms.MessageBox]::Show($msg, 'code.daemon', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
}

# ---------- one instance per user ----------
$createdNew = $false
$Mutex = New-Object System.Threading.Mutex($true, 'Local\CodeDaemonWidget', [ref]$createdNew)
if (-not $createdNew) { exit 0 }

# Files extracted from a downloaded zip carry a "blocked" flag that stops .NET from loading the DLLs.
# Only the folders the host loads from are unblocked.
foreach ($d in @('lib', 'ui')) {
  try { Get-ChildItem -LiteralPath (Join-Path $Root $d) -Recurse -File | Unblock-File -ErrorAction SilentlyContinue } catch {}
}

# ---------- native helpers ----------
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class CdNative {
  [DllImport("user32.dll")] public static extern bool ReleaseCapture();
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr value);
  [DllImport("user32.dll")] public static extern uint GetDpiForSystem();
  [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr hwnd);
  [DllImport("dwmapi.dll")] public static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size);
  public static void Drag(IntPtr h) { ReleaseCapture(); SendMessage(h, 0xA1, (IntPtr)2, IntPtr.Zero); }
  public static void RoundCorners(IntPtr h) { int pref = 2; try { DwmSetWindowAttribute(h, 33, ref pref, 4); } catch { } }
  public static void EnableDpi() {
    try { if (SetProcessDpiAwarenessContext((IntPtr)(-4))) return; } catch { }
    try { SetProcessDPIAware(); } catch { }
  }
  public static double Scale() { try { return GetDpiForSystem() / 96.0; } catch { return 1.0; } }
  // DPI of the monitor the window is on (Windows 10 1607+); falls back to the system DPI.
  public static double ScaleFor(IntPtr h) { try { uint d = GetDpiForWindow(h); if (d > 0) return d / 96.0; } catch { } return Scale(); }
}
'@
[CdNative]::EnableDpi()
$Scale = [CdNative]::Scale()

# ---------- WebView2 ----------
$Arch = switch ($env:PROCESSOR_ARCHITECTURE) { 'ARM64' { 'win-arm64' } 'x86' { 'win-x86' } default { 'win-x64' } }
$LibDir = Join-Path $Root 'lib'
$NativeDir = Join-Path $LibDir "runtimes\$Arch\native"
if (-not (Test-Path -LiteralPath (Join-Path $NativeDir 'WebView2Loader.dll'))) {
  Show-Error "Missing $NativeDir\WebView2Loader.dll.`nCopy the whole code.daemon folder again."; exit 1
}
$env:PATH = "$NativeDir;$env:PATH"
try {
  Add-Type -LiteralPath (Join-Path $LibDir 'Microsoft.Web.WebView2.Core.dll')
  Add-Type -LiteralPath (Join-Path $LibDir 'Microsoft.Web.WebView2.WinForms.dll')
} catch { Show-Error "Could not load the WebView2 libraries.`n$($_.Exception.Message)"; exit 1 }
try { [Microsoft.Web.WebView2.Core.CoreWebView2Environment]::SetLoaderDllFolderPath($NativeDir) } catch { Write-Log "SetLoaderDllFolderPath: $($_.Exception.Message)" }
try { $null = [Microsoft.Web.WebView2.Core.CoreWebView2Environment]::GetAvailableBrowserVersionString($null) }
catch { Show-Error "Microsoft Edge WebView2 Runtime is not installed.`nInstall it from https://go.microsoft.com/fwlink/p/?LinkId=2124703 and start code.daemon again."; exit 1 }

# ---------- files ----------
# -Backup keeps the previous version as <file>.bak (used for the save, not for settings: those hold tokens).
function Write-TextAtomic([string]$path, [string]$text, [switch]$Backup) {
  $tmp = "$path.tmp"
  [IO.File]::WriteAllText($tmp, $text, (New-Object System.Text.UTF8Encoding($false)))
  if (Test-Path -LiteralPath $path) {
    # PowerShell turns a plain $null into "" for string parameters, and File.Replace rejects "" as a path.
    # [NullString]::Value passes a real null: replace without a backup file.
    try {
      if ($Backup) { [IO.File]::Replace($tmp, $path, "$path.bak") }
      else { [IO.File]::Replace($tmp, $path, [NullString]::Value) }
    } catch { [IO.File]::Copy($tmp, $path, $true); [IO.File]::Delete($tmp) }
  } else { [IO.File]::Move($tmp, $path) }
}

# Older versions could not replace an existing file, so the newest data stayed in "<file>.tmp".
# If such a .tmp is newer than the file and is valid JSON, take it.
function Restore-FromTmp([string]$path) {
  $tmp = "$path.tmp"
  if (-not (Test-Path -LiteralPath $tmp)) { return }
  try {
    $text = [IO.File]::ReadAllText($tmp)
    if (-not $text.Trim()) { throw 'empty file' }
    $null = $text | ConvertFrom-Json
    $newer = -not (Test-Path -LiteralPath $path) -or ((Get-Item -LiteralPath $tmp).LastWriteTimeUtc -gt (Get-Item -LiteralPath $path).LastWriteTimeUtc)
    if ($newer) { Write-TextAtomic $path $text; Write-Log "restored $path from .tmp" }
    else { [IO.File]::Delete($tmp) }
  } catch { Write-Log "skip $tmp`: $($_.Exception.Message)" }
}
Restore-FromTmp $SetPath
Restore-FromTmp $SavePath

function Read-Settings {
  $s = @{ ghToken = $null; glToken = $null; glUrl = 'https://gitlab.com'; topmost = $true; expanded = $false; x = $null; y = $null }
  if (Test-Path -LiteralPath $SetPath) {
    try {
      $o = [IO.File]::ReadAllText($SetPath) | ConvertFrom-Json
      foreach ($k in @('ghToken', 'glToken', 'glUrl', 'topmost', 'expanded', 'x', 'y')) { if ($null -ne $o.$k) { $s[$k] = $o.$k } }
    } catch {
      # Keep the broken file instead of overwriting it with empty tokens on the next save.
      Write-Log "settings unreadable: $($_.Exception.Message)"
      try { Copy-Item -LiteralPath $SetPath -Destination "$SetPath.broken" -Force } catch {}
    }
  }
  return $s
}
function Write-Settings { try { Write-TextAtomic $SetPath ($Settings | ConvertTo-Json -Compress) } catch { Write-Log "settings write: $($_.Exception.Message)" } }

# Tokens are encrypted with DPAPI: only this Windows user on this PC can decrypt them.
function Protect-Token([string]$plain) { ConvertTo-SecureString -String $plain -AsPlainText -Force | ConvertFrom-SecureString }
function Unprotect-Token([string]$enc) {
  if (-not $enc) { return $null }
  try {
    $ss = ConvertTo-SecureString -String $enc
    $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ss)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
  } catch { Write-Log 'token could not be decrypted'; return $null }
}

function Get-PublicSettings {
  return @{
    gh = @{ connected = [bool]$Settings.ghToken }
    gl = @{ connected = [bool]$Settings.glToken; url = [string]$Settings.glUrl }
    topmost = [bool]$Settings.topmost
    expanded = [bool]$Settings.expanded
    autostart = (Test-Path -LiteralPath $StartupLnk)
    dataDir = $DataDir
  }
}

function Set-Autostart([bool]$on) {
  if ($on) {
    $sh = New-Object -ComObject WScript.Shell
    $lnk = $sh.CreateShortcut($StartupLnk)
    $lnk.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
    $lnk.Arguments = '"' + (Join-Path $Root 'Start code.daemon.vbs') + '"'
    $lnk.WorkingDirectory = $Root
    $lnk.Description = 'code.daemon desktop pet'
    $lnk.Save()
  } else {
    Remove-Item -LiteralPath $StartupLnk -ErrorAction SilentlyContinue
  }
}

# ---------- API proxy (runs requests off the UI thread) ----------
$HttpScript = {
  param([string]$Method, [string]$Url, [hashtable]$Headers, [string]$Body, [string]$Accept)
  $resp = $null
  try {
    $req = [Net.HttpWebRequest]::Create($Url)
    $req.Method = $Method
    $req.UserAgent = 'code-daemon-widget/1.0'
    $req.Accept = $Accept
    $req.Timeout = 30000
    $req.ReadWriteTimeout = 30000
    # A redirect would carry the token headers to whatever host it points at.
    $req.AllowAutoRedirect = $false
    $req.AutomaticDecompression = [Net.DecompressionMethods]::GZip -bor [Net.DecompressionMethods]::Deflate
    foreach ($k in $Headers.Keys) { $req.Headers[$k] = $Headers[$k] }
    if ($Body) {
      $bytes = [Text.Encoding]::UTF8.GetBytes($Body)
      $req.ContentType = 'application/json'
      $req.ContentLength = $bytes.Length
      $st = $req.GetRequestStream(); $st.Write($bytes, 0, $bytes.Length); $st.Close()
    }
    try { $resp = $req.GetResponse() }
    catch [Net.WebException] {
      $resp = $_.Exception.Response
      if ($null -eq $resp) { return @{ status = 0; body = ''; error = $_.Exception.Message } }
    }
    $code = [int]$resp.StatusCode
    if ($code -ge 300 -and $code -lt 400) { return @{ status = 0; body = ''; error = "The server redirected to another address ($code). Check the URL." } }
    $rd = New-Object IO.StreamReader($resp.GetResponseStream(), [Text.Encoding]::UTF8)
    try { $text = $rd.ReadToEnd() } finally { $rd.Dispose() }
    $hdr = @{}
    foreach ($h in @('X-RateLimit-Remaining', 'X-RateLimit-Reset', 'RateLimit-Remaining', 'X-Next-Page')) { $v = $resp.Headers[$h]; if ($v) { $hdr[$h] = $v } }
    return @{ status = $code; body = $text; headers = $hdr }
  } catch {
    return @{ status = 0; body = ''; error = $_.Exception.Message }
  } finally {
    if ($null -ne $resp) { try { $resp.Close() } catch {} }
  }
}
# .NET Framework allows 2 connections per host by default; the page runs 3 scans in parallel.
[Net.ServicePointManager]::DefaultConnectionLimit = 8
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
$Pool = [RunspaceFactory]::CreateRunspacePool(1, 4)
$Pool.Open()
$Pending = New-Object System.Collections.ArrayList

function Send-Raw([string]$json) {
  if ($script:Core) { try { $script:Core.PostWebMessageAsJson($json) } catch { Write-Log "post: $($_.Exception.Message)" } }
}
function Send-ToPage($obj) { Send-Raw ($obj | ConvertTo-Json -Compress -Depth 6) }
# Large strings (API bodies, the save file) are encoded directly instead of going through ConvertTo-Json.
function ConvertTo-JsString([string]$s) {
  if ($null -eq $s) { return 'null' }
  return [System.Web.HttpUtility]::JavaScriptStringEncode($s, $true)
}

# The page may only read: GitHub GraphQL queries (no mutations) and GET requests to the GitLab REST API.
function Test-ReadOnlyQuery([string]$body) {
  $q = $null
  try { $q = [string](($body | ConvertFrom-Json).query) } catch { return $false }
  if (-not $q) { return $false }
  $q = $q -replace '#[^\r\n]*', ''
  return ($q.TrimStart() -match '^(query\b|\{)') -and ($q -notmatch '\b(mutation|subscription)\b')
}
function Start-Api($m) {
  $id = $m.id
  $path = [string]$m.path
  $reject = { param($why) Send-ToPage @{ type = 'api'; id = $id; status = 0; error = $why } }
  if (-not $path.StartsWith('/') -or $path.Contains('..') -or $path.Contains('://') -or $path.Contains('@') -or $path.Contains('\')) {
    & $reject 'Rejected path'; return
  }
  $headers = @{}
  $accept = 'application/json'
  $tok = $null
  $method = 'GET'
  $body = ''
  if ($m.prov -eq 'gh') {
    if ([string]$m.method -ne 'POST' -or $path -ne '/graphql') { & $reject 'Only GitHub GraphQL is allowed'; return }
    $body = [string]$m.body
    if (-not (Test-ReadOnlyQuery $body)) { & $reject 'Only read-only GitHub queries are allowed'; return }
    $method = 'POST'
    $tok = Unprotect-Token $Settings.ghToken
    $base = 'https://api.github.com'
    $headers['Authorization'] = "Bearer $tok"
    $headers['X-GitHub-Api-Version'] = '2022-11-28'
    $accept = 'application/vnd.github+json'
  } elseif ($m.prov -eq 'gl') {
    if (-not $path.StartsWith('/api/v4/')) { & $reject 'Only the GitLab API is allowed'; return }
    $tok = Unprotect-Token $Settings.glToken
    $base = ([string]$Settings.glUrl).TrimEnd('/')
    $headers['PRIVATE-TOKEN'] = $tok
  } else {
    & $reject 'Unknown provider'; return
  }
  if (-not $tok) { & $reject 'Not connected'; return }
  $ps = [PowerShell]::Create()
  $ps.RunspacePool = $Pool
  [void]$ps.AddScript($HttpScript.ToString()).AddArgument($method).AddArgument($base + $path).AddArgument($headers).AddArgument($body).AddArgument($accept)
  [void]$Pending.Add(@{ id = $id; ps = $ps; handle = $ps.BeginInvoke() })
}

# ---------- window ----------
$Settings = Read-Settings
$form = New-Object System.Windows.Forms.Form
$form.Text = 'code.daemon'
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$form.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::None
$form.ShowInTaskbar = $false
$form.TopMost = [bool]$Settings.topmost
$form.BackColor = [System.Drawing.Color]::FromArgb(21, 25, 32)
$form.ClientSize = New-Object System.Drawing.Size([int][Math]::Round(300 * $Scale), [int][Math]::Round(392 * $Scale))

function Set-StartPosition {
  $wa = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
  $x = $wa.Right - $form.Width - [int](20 * $Scale)
  $y = $wa.Bottom - $form.Height - [int](20 * $Scale)
  if ($null -ne $Settings.x -and $null -ne $Settings.y) {
    $r = New-Object System.Drawing.Rectangle([int]$Settings.x, [int]$Settings.y, $form.Width, 40)
    foreach ($sc in [System.Windows.Forms.Screen]::AllScreens) {
      if ($sc.WorkingArea.IntersectsWith($r)) { $x = [int]$Settings.x; $y = [int]$Settings.y; break }
    }
  }
  $form.Location = New-Object System.Drawing.Point($x, $y)
}
function Save-Position { $Settings.x = $form.Left; $Settings.y = $form.Top; Write-Settings }
$script:CssHeight = 392
function Set-WidgetHeight([int]$cssHeight) {
  $script:CssHeight = $cssHeight
  $h = [int][Math]::Round($cssHeight * $script:Scale)
  $wa = [System.Windows.Forms.Screen]::FromControl($form).WorkingArea
  $h = [Math]::Max(120, [Math]::Min($h, $wa.Height - 8))
  $y = $form.Top
  if ($y + $h -gt $wa.Bottom) { $y = [Math]::Max($wa.Top, $wa.Bottom - $h) }
  $form.SetBounds($form.Left, $y, $form.Width, $h)
}
# Follows the DPI of the monitor the widget is on, so it keeps its size when dragged to another screen.
function Update-Scale {
  if (-not $form.IsHandleCreated) { return }
  $s = [CdNative]::ScaleFor($form.Handle)
  if ([Math]::Abs($s - $script:Scale) -lt 0.01) { return }
  $script:Scale = $s
  $form.Width = [int][Math]::Round(300 * $s)
  Set-WidgetHeight $script:CssHeight
}
function Show-Widget { $form.Show(); $form.Activate() }
function Switch-Widget { if ($form.Visible) { $form.Hide() } else { Show-Widget } }

# Quitting asks the page to write its save first; the timer closes anyway if the page doesn't answer.
$script:Quitting = $false
$script:PageReady = $false
$QuitTimer = New-Object System.Windows.Forms.Timer
$QuitTimer.Interval = 1500
$QuitTimer.add_Tick({ $QuitTimer.Stop(); $form.Close() })
function Request-Quit {
  if ($script:Quitting) { return }
  $script:Quitting = $true
  if ($script:Core -and $script:PageReady) { Send-ToPage @{ type = 'quit' }; $QuitTimer.Start() } else { $form.Close() }
}

$wv = New-Object Microsoft.Web.WebView2.WinForms.WebView2
$wv.Dock = [System.Windows.Forms.DockStyle]::Fill
$props = New-Object Microsoft.Web.WebView2.WinForms.CoreWebView2CreationProperties
$props.UserDataFolder = Join-Path $CacheDir 'WebView2'
$wv.CreationProperties = $props
$wv.DefaultBackgroundColor = $form.BackColor
$form.Controls.Add($wv)
$script:Core = $null

function Receive-PageMessage([string]$json) {
  $m = $json | ConvertFrom-Json
  switch ([string]$m.type) {
    'ready' {
      $script:PageReady = $true
      $saveText = $null
      if (Test-Path -LiteralPath $SavePath) { $saveText = [IO.File]::ReadAllText($SavePath) }
      Send-Raw ('{"type":"init","save":' + (ConvertTo-JsString $saveText) + ',"settings":' + ((Get-PublicSettings) | ConvertTo-Json -Compress -Depth 4) + '}')
    }
    'drag' { [CdNative]::Drag($form.Handle); Save-Position }
    'resize' { Set-WidgetHeight ([int]$m.h) }
    'api' { Start-Api $m }
    'setToken' {
      $tok = ([string]$m.token).Trim()
      if ($m.prov -eq 'gh') {
        $Settings.ghToken = if ($tok) { Protect-Token $tok } else { $null }
      } elseif ($m.prov -eq 'gl') {
        $url = ([string]$m.url).Trim().TrimEnd('/')
        if (-not $url) { $url = 'https://gitlab.com' }
        # https only: the token travels in a header. Plain http is allowed for a GitLab on this PC.
        $okUrl = ($url -match '^https://[A-Za-z0-9.\-]+(:\d+)?(/[A-Za-z0-9._~\-/]*)?$') -or
                 ($url -match '^http://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(/[A-Za-z0-9._~\-/]*)?$')
        if (-not $okUrl) {
          Send-ToPage @{ type = 'notice'; prov = 'gl'; key = 'glUrl'; text = 'GitLab URL should look like https://gitlab.com (http only for localhost)' }; return
        }
        $Settings.glUrl = $url
        $Settings.glToken = if ($tok) { Protect-Token $tok } else { $null }
      }
      Write-Settings
      Send-ToPage @{ type = 'settings'; settings = (Get-PublicSettings); connected = [string]$m.prov }
    }
    'clearToken' {
      if ($m.prov -eq 'gh') { $Settings.ghToken = $null } elseif ($m.prov -eq 'gl') { $Settings.glToken = $null }
      Write-Settings
      Send-ToPage @{ type = 'settings'; settings = (Get-PublicSettings) }
    }
    'topmost' {
      $Settings.topmost = [bool]$m.on; $form.TopMost = $Settings.topmost; Write-Settings
      Send-ToPage @{ type = 'settings'; settings = (Get-PublicSettings) }
    }
    'expanded' { $Settings.expanded = [bool]$m.on; Write-Settings }
    'autostart' { Set-Autostart ([bool]$m.on); Send-ToPage @{ type = 'settings'; settings = (Get-PublicSettings) } }
    'openData' { Start-Process explorer.exe $DataDir }
    'menu' {
      # Tray menu labels in the widget's language. Plain text only, kept short.
      foreach ($k in @('show', 'rescan', 'data', 'quit')) {
        $txt = [string]$m.items.$k
        if ($txt -and $txt.Length -le 60 -and $MenuItems[$k]) { $MenuItems[$k].Text = $txt }
      }
    }
    'hide' { $form.Hide() }
    'quit' { $script:Quitting = $true; $form.Close() }
  }
}

$wv.add_CoreWebView2InitializationCompleted({
  param($src, $e)
  try {
    if (-not $e.IsSuccess) { Show-Error "WebView2 could not start.`n$($e.InitializationException.Message)"; $form.Close(); return }
    $script:Core = $wv.CoreWebView2
    $cs = $script:Core.Settings
    $cs.AreDevToolsEnabled = [bool]$DevTools
    $cs.AreDefaultContextMenusEnabled = [bool]$DevTools
    $cs.AreBrowserAcceleratorKeysEnabled = [bool]$DevTools
    $cs.IsStatusBarEnabled = $false
    $cs.IsZoomControlEnabled = $false
    $script:Core.SetVirtualHostNameToFolderMapping($VHost, (Join-Path $Root 'ui'), [Microsoft.Web.WebView2.Core.CoreWebView2HostResourceAccessKind]::Deny)
    $script:Core.add_WebMessageReceived({
      param($s, $a)
      try {
        if (-not ([string]$a.Source).StartsWith($Origin)) { Write-Log "message from $($a.Source) ignored"; return }
        $str = $null
        try { $str = $a.TryGetWebMessageAsString() } catch { $str = $null }
        if ($null -ne $str) {
          if ($str.StartsWith('SAVE:')) { Write-TextAtomic $SavePath $str.Substring(5) -Backup }
        } else {
          Receive-PageMessage $a.WebMessageAsJson
        }
      } catch { Write-Log "message: $($_.Exception.Message)" }
    })
    $script:Core.add_NewWindowRequested({
      param($s, $a)
      $a.Handled = $true
      try { if ($a.Uri -match '^https://') { Start-Process $a.Uri } } catch {}
    })
    $script:Core.add_NavigationStarting({
      param($s, $a)
      if (-not ([string]$a.Uri).StartsWith($Origin)) {
        $a.Cancel = $true
        try { if ($a.Uri -match '^https://') { Start-Process $a.Uri } } catch {}
      }
    })
    # A crashed page reloads (up to 3 times in 5 minutes); a crashed browser process ends the widget.
    $script:Core.add_ProcessFailed({
      param($s, $a)
      try {
        $kind = [string]$a.ProcessFailedKind
        Write-Log "WebView2 process failed: $kind"
        if ($kind -eq 'BrowserProcessExited') {
          $script:Quitting = $true
          Show-Error "The WebView2 browser process stopped.`nStart code.daemon again."; $form.Close(); return
        }
        if ($kind -ne 'RenderProcessExited' -and $kind -ne 'RenderProcessUnresponsive') { return }
        $now = Get-Date
        $script:Crashes = @(@($script:Crashes) + $now | Where-Object { $_ -and ($now - $_).TotalMinutes -lt 5 })
        if ($script:Crashes.Count -gt 3) {
          $script:Quitting = $true
          Show-Error "The pet page keeps crashing.`nSee $LogPath"; $form.Close(); return
        }
        $script:PageReady = $false
        $script:Core.Reload()
      } catch { Write-Log "process failed handler: $($_.Exception.Message)" }
    })
    $script:Core.Navigate($Origin + 'widget.html')
    if ($DevTools) { $script:Core.OpenDevToolsWindow() }
  } catch { Show-Error "WebView2 setup failed.`n$($_.Exception.Message)" }
})

# ---------- poll finished API calls ----------
$Timer = New-Object System.Windows.Forms.Timer
$Timer.Interval = 120
$Timer.add_Tick({
  try {
    for ($i = $Pending.Count - 1; $i -ge 0; $i--) {
      $p = $Pending[$i]
      if (-not $p.handle.IsCompleted) { continue }
      $Pending.RemoveAt($i)
      $res = $null
      try {
        $out = $p.ps.EndInvoke($p.handle)
        if ($out.Count -gt 0) { $res = $out[$out.Count - 1] }
      } catch { $res = @{ status = 0; body = ''; error = $_.Exception.Message } }
      $p.ps.Dispose()
      if (-not $res) { $res = @{ status = 0; body = ''; error = 'No response' } }
      $hdr = if ($res.headers) { $res.headers | ConvertTo-Json -Compress } else { '{}' }
      Send-Raw ('{"type":"api","id":' + [int]$p.id + ',"status":' + [int]$res.status + ',"error":' + (ConvertTo-JsString $res.error) + ',"headers":' + $hdr + ',"body":' + (ConvertTo-JsString $res.body) + '}')
    }
  } catch { Write-Log "poll: $($_.Exception.Message)" }
})

# ---------- tray ----------
function New-PetIcon {
  $rows = @(
    '................',
    '................',
    '.....######.....',
    '...##########...',
    '..############..',
    '..###oo##oo###..',
    '.####oo##oo####.',
    '.##############.',
    '.######oo######.',
    '.##############.',
    '..############..',
    '...##########...',
    '....##....##....',
    '....##....##....',
    '................',
    '................')
  $bmp = New-Object System.Drawing.Bitmap(16, 16)
  $c1 = [System.Drawing.Color]::FromArgb(255, 180, 225, 92)
  $c2 = [System.Drawing.Color]::FromArgb(255, 13, 16, 21)
  for ($y = 0; $y -lt 16; $y++) {
    for ($x = 0; $x -lt 16; $x++) {
      $ch = $rows[$y][$x]
      if ($ch -eq '#') { $bmp.SetPixel($x, $y, $c1) } elseif ($ch -eq 'o') { $bmp.SetPixel($x, $y, $c2) }
    }
  }
  return [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
}
$Tray = New-Object System.Windows.Forms.NotifyIcon
$Tray.Icon = New-PetIcon
$Tray.Text = 'code.daemon'
$Menu = New-Object System.Windows.Forms.ContextMenuStrip
# Labels start in English; the page sends them in its language ('menu' message).
$MenuItems = @{}
$MenuItems.show = $Menu.Items.Add('Show / hide', $null, [EventHandler]{ Switch-Widget })
$MenuItems.rescan = $Menu.Items.Add('Rescan GitHub / GitLab', $null, [EventHandler]{ Show-Widget; Send-ToPage @{ type = 'rescan' } })
$MenuItems.data = $Menu.Items.Add('Open save folder', $null, [EventHandler]{ Start-Process explorer.exe $DataDir })
[void]$Menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))
$MenuItems.quit = $Menu.Items.Add('Quit', $null, [EventHandler]{ Request-Quit })
$Tray.ContextMenuStrip = $Menu
$Tray.add_MouseClick({
  param($s, $e)
  if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) { Switch-Widget }
})

# ---------- run ----------
$form.add_Load({ [CdNative]::RoundCorners($form.Handle) })
$form.add_Shown({
  Update-Scale
  try { [void]$wv.EnsureCoreWebView2Async($null) } catch { Show-Error "WebView2 could not start.`n$($_.Exception.Message)" }
})
$form.add_Move({ try { Update-Scale } catch {} })
$form.add_FormClosing({
  param($s, $e)
  # Alt+F4 and similar go through the page first, so its last change is saved.
  if (-not $script:Quitting -and $e.CloseReason -eq [System.Windows.Forms.CloseReason]::UserClosing) { $e.Cancel = $true; Request-Quit; return }
  try { Save-Position } catch {}
  try { $Timer.Stop(); $QuitTimer.Stop(); $Tray.Visible = $false; $Tray.Dispose() } catch {}
})
[System.Windows.Forms.Application]::add_ThreadException({ param($s, $e) Write-Log "unhandled: $($e.Exception.Message)" })

Set-StartPosition
$Tray.Visible = $true
$Timer.Start()
Write-Log "start (scale $Scale, $Arch)"
try { [System.Windows.Forms.Application]::Run($form) }
catch { Show-Error "code.daemon stopped.`n$($_.Exception.Message)" }
finally {
  try { $Pool.Close() } catch {}
  try { $Mutex.ReleaseMutex() } catch {}
  Write-Log 'stop'
}
