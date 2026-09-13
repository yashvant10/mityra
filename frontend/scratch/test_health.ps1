try {
    $r = Invoke-WebRequest -Uri 'http://44.220.126.206:8000/health' -TimeoutSec 15 -UseBasicParsing
    Write-Host "Status: $($r.StatusCode)"
    Write-Host "Body: $($r.Content)"
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}
