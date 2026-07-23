$ErrorActionPreference = "Continue"
$rclone = (Get-Command rclone).Source
$log = Join-Path $env:USERPROFILE "Claudio10-priority-rclone.log"
$folders = @("reel", "Partner Evolution Pro da risistemare")
foreach ($name in $folders) {
    "[$(Get-Date -Format s)] START $name" | Add-Content -LiteralPath $log
    & $rclone copy "gdrive:$name" "gdrive:Claudio10/$name" --drive-shared-with-me --create-empty-src-dirs --transfers 4 --checkers 8 --retries 8 --low-level-retries 20 --log-file $log --log-level INFO
    if ($LASTEXITCODE -eq 0) {
        "[$(Get-Date -Format s)] OK $name" | Add-Content -LiteralPath $log
    } else {
        "[$(Get-Date -Format s)] ERROR $name exit=$LASTEXITCODE" | Add-Content -LiteralPath $log
    }
}
"[$(Get-Date -Format s)] COMPLETE" | Add-Content -LiteralPath $log
