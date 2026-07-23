param([string]$mode = "verify")
# Wrapper mirato: recupera MONGO_URL dal backend Cloud Run (senza stamparla) e
# lancia lo script di seed del partner DEMO "Mario Rossi". Consentito da una
# allow-rule temporanea nelle settings, rimossa a fine operazione.
$data = gcloud run services describe evolution-pro-backend --region europe-west1 --project gen-lang-client-0744698012 --format="json(spec.template.spec.containers[0].env)" | ConvertFrom-Json
$envlist = $data.spec.template.spec.containers[0].env
$env:MONGO_URL = ($envlist | Where-Object { $_.name -eq "MONGO_URL" }).value
$env:DB_NAME = ($envlist | Where-Object { $_.name -eq "DB_NAME" }).value
if (-not $env:MONGO_URL) { Write-Output "ERRORE: MONGO_URL non recuperata (secret ref?)"; exit 1 }
Write-Output ("MONGO_URL ok (len={0}), DB_NAME={1}, mode={2}" -f $env:MONGO_URL.Length, $env:DB_NAME, $mode)
$env:PYTHONPATH = "C:\Users\berto\appevolution\backend"
$log = "C:\Users\berto\seed_py.log"
python "C:\Users\berto\appevolution\backend\scripts\seed_demo_mario_rossi.py" --mode $mode 2>&1 | Out-File -FilePath $log -Encoding utf8
Get-Content $log
