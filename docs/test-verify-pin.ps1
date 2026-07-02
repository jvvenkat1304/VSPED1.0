# Focused test for verify-pin role source.
# Calls verify-pin once with a known user_id + PIN and prints the returned role.
$ErrorActionPreference = "Stop"
$BASE = "https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1"

if ($env:VSPED_ANON_KEY) {
    $ANON = $env:VSPED_ANON_KEY
} else {
    $ANON = Read-Host "Paste LEGACY anon key (will be visible)"
}
$ANON = $ANON.Trim()
$HEADERS = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $ANON" }

$userId = "a12d11e4-3e26-424f-a5b4-6a87108020c6"
$pin    = "5678"
$body   = @{ user_id = $userId; pin = $pin } | ConvertTo-Json -Compress

try {
    $resp = Invoke-RestMethod -Uri "$BASE/verify-pin" -Method POST -Headers $HEADERS -Body $body
    Write-Host "RESPONSE:" -ForegroundColor Green
    $resp | ConvertTo-Json
    Write-Host "`nRole returned: $($resp.role)" -ForegroundColor Cyan
    if ($resp.role -eq "special_educator") {
        Write-Host "PASS - verify-pin returned the role from public.users" -ForegroundColor Green
    } else {
        Write-Host "CHECK - expected special_educator, got '$($resp.role)'" -ForegroundColor Yellow
    }
} catch {
    $detail = $null
    if ($_.Exception.Response) {
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $detail = $reader.ReadToEnd()
        } catch {}
    }
    if (-not $detail) { $detail = $_.Exception.Message }
    Write-Host "ERROR: $detail" -ForegroundColor Red
}
