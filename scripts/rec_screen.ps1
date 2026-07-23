<#
.SYNOPSIS
  Registra lo schermo (desktop intero o una singola finestra) in MP4 con ffmpeg.

.DESCRIPTION
  Strumento generale di cattura schermo per Windows, basato su ffmpeg gdigrab
  (già installato). Utile per demo di prodotto, videocorsi, bug report.

.EXAMPLE
  # Elenca i titoli delle finestre registrabili
  .\rec_screen.ps1 -List

.EXAMPLE
  # Registra 60 secondi della finestra Chrome
  .\rec_screen.ps1 -Window "Ciak — Area Partner - Google Chrome" -Seconds 60 -Out C:\temp\demo.mp4

.EXAMPLE
  # Registra tutto il desktop per 30 secondi a 30 fps
  .\rec_screen.ps1 -Desktop -Seconds 30 -Fps 30 -Out C:\temp\desktop.mp4

.NOTES
  - La finestra da registrare deve essere visibile (non minimizzata).
  - Il cursore viene incluso (-draw_mouse 1). Usa -NoMouse per escluderlo.
  - Ctrl+C interrompe la registrazione salvando comunque il file.
#>
param(
    [string]$Window,
    [switch]$Desktop,
    [int]$Seconds = 60,
    [int]$Fps = 25,
    [string]$Out = "$env:USERPROFILE\Videos\rec_$(Get-Random).mp4",
    [switch]$NoMouse,
    [switch]$List
)

if ($List) {
    Write-Host "`nFinestre registrabili (usa il titolo esatto con -Window):`n" -ForegroundColor Cyan
    Get-Process | Where-Object { $_.MainWindowTitle -ne "" } |
        Select-Object @{N='Processo';E={$_.ProcessName}}, @{N='Titolo finestra';E={$_.MainWindowTitle}} |
        Format-Table -AutoSize
    return
}

if (-not $Window -and -not $Desktop) {
    Write-Host "Specifica -Window '<titolo>' oppure -Desktop. Usa -List per vedere le finestre." -ForegroundColor Yellow
    return
}

$mouse = if ($NoMouse) { "0" } else { "1" }

$dir = Split-Path -Parent $Out
if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }

# ── Modalità finestra: si cattura la REGIONE di schermo occupata dalla finestra.
# gdigrab con "title=..." restituisce un video NERO per le app accelerate via GPU
# (Chrome, Edge, Electron): BitBlt non legge il loro buffer. La cattura della
# regione dal desktop invece funziona sempre, purché la finestra sia in primo piano.
$geom = @()
if ($Window) {
    Add-Type @"
using System;
using System.Runtime.InteropServices;
public class RecWinRect {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@ -ErrorAction SilentlyContinue

    $proc = Get-Process | Where-Object { $_.MainWindowTitle -eq $Window } | Select-Object -First 1
    if (-not $proc) {
        Write-Host "Finestra '$Window' non trovata. Usa -List per i titoli esatti." -ForegroundColor Red
        return
    }
    $r = New-Object RecWinRect+RECT
    [void][RecWinRect]::GetWindowRect($proc.MainWindowHandle, [ref]$r)

    # Clamp: una finestra massimizzata ha bordi negativi e sborda dallo schermo.
    $scrW = [System.Windows.Forms.SystemInformation]::VirtualScreen.Width
    $scrH = [System.Windows.Forms.SystemInformation]::VirtualScreen.Height
    if (-not $scrW) { $scrW = 1920; $scrH = 1080 }
    $x = [Math]::Max(0, $r.Left)
    $y = [Math]::Max(0, $r.Top)
    $w = [Math]::Min($r.Right, $scrW) - $x
    $h = [Math]::Min($r.Bottom, $scrH) - $y
    if ($w % 2) { $w-- }
    if ($h % 2) { $h-- }
    $geom = @("-offset_x", $x, "-offset_y", $y, "-video_size", "${w}x${h}")
    Write-Host "Finestra '$Window' -> regione x=$x y=$y ${w}x${h}" -ForegroundColor DarkGray
    Write-Host "La finestra deve restare IN PRIMO PIANO per tutta la registrazione." -ForegroundColor Yellow
}

Write-Host "Registro per $Seconds s a $Fps fps..." -ForegroundColor Green
Write-Host "Output: $Out`n" -ForegroundColor DarkGray

ffmpeg -hide_banner -loglevel error `
    -f gdigrab -framerate $Fps -draw_mouse $mouse @geom -t $Seconds -i desktop `
    -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -y $Out

if (Test-Path $Out) {
    $kb = [int]((Get-Item $Out).Length / 1KB)
    Write-Host "`nFatto: $Out ($kb KB)" -ForegroundColor Green
} else {
    Write-Host "`nRegistrazione fallita: nessun file prodotto." -ForegroundColor Red
}
