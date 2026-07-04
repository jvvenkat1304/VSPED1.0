# Diagnostic for create-child — shows full response body on error
$ErrorActionPreference = "Stop"
$BASE = "https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1"

if ($env:VSPED_ANON_KEY) { $ANON = $env:VSPED_ANON_KEY }
else { $ANON = (Read-Host "Paste LEGACY anon key (visible)").Trim() }

# First, get a parent session token
$phone = Read-Host "Enter parent phone (91XXXXXXXXXX)"
$body = @{ phone = $phone } | ConvertTo-Json -Compress
$hdrs = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $ANON"; "apikey" = $ANON }

Write-Host "`nSending OTP..." -ForegroundColor DarkGray
$resp = Invoke-RestMethod -Uri "$BASE/send-otp" -Method POST -Headers $hdrs -Body $body
Write-Host "OTP sent: $($resp | ConvertTo-Json -Compress)" -ForegroundColor Green

$otp = Read-Host "Enter the OTP"
$body = @{ phone = $phone; otp_code = $otp } | ConvertTo-Json -Compress
$resp = Invoke-RestMethod -Uri "$BASE/verify-otp" -Method POST -Headers $hdrs -Body $body
if (-not $resp.success) { Write-Host "Verify-OTP failed: $($resp | ConvertTo-Json -Compress)" -ForegroundColor Red; exit 1 }

$token = $resp.session_token
Write-Host "Got session token (first 20 chars): $($token.Substring(0,20))..." -ForegroundColor Green

# Now call create-child with the parent's session token
$authHdrs = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $token"; "apikey" = $ANON }
$childBody = @{ name = "Test Child Diag"; dob = "2020-01-01"; gender = "male" } | ConvertTo-Json -Compress

Write-Host "`nCalling create-child..." -ForegroundColor DarkGray
Write-Host "Body: $childBody" -ForegroundColor DarkGray
Write-Host "Auth: Bearer <session_token>" -ForegroundColor DarkGray

try {
    $resp = Invoke-WebRequest -Uri "$BASE/create-child" -Method POST -Headers $authHdrs -Body $childBody
    Write-Host "HTTP STATUS: $($resp.StatusCode)" -ForegroundColor Green
    Write-Host "RESPONSE BODY:" -ForegroundColor Green
    Write-Host $resp.Content
} catch {
    $status = $null; $bodyText = $null
    if ($_.Exception.Response) {
        try { $status = [int]$_.Exception.Response.StatusCode } catch {}
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $bodyText = $reader.ReadToEnd()
        } catch {}
    }
    if (-not $bodyText -and $_.ErrorDetails -and $_.ErrorDetails.Message) { $bodyText = $_.ErrorDetails.Message }
    if (-not $bodyText) { $bodyText = $_.Exception.Message }
    Write-Host "HTTP STATUS: $status" -ForegroundColor Red
    Write-Host "RESPONSE BODY:" -ForegroundColor Red
    Write-Host $bodyText
}
