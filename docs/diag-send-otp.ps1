# Focused diagnostic for send-otp. Prints the FULL response body and status code.
$ErrorActionPreference = "Stop"
$BASE = "https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1"

if ($env:VSPED_ANON_KEY) {
    $ANON = $env:VSPED_ANON_KEY
} else {
    $ANON = Read-Host "Paste LEGACY anon key (will be visible in this terminal)"
}
$ANON = $ANON.Trim()
$HEADERS = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $ANON" }

# Safe key-format check: shows only the prefix + length, never the full secret.
$prefix = if ($ANON.Length -ge 4) { $ANON.Substring(0,4) } else { $ANON }
Write-Host "Key starts with: '$prefix...'  (length: $($ANON.Length))" -ForegroundColor Cyan
if ($prefix -like "eyJ*") {
    Write-Host "-> Looks like a LEGACY JWT key. Good." -ForegroundColor Green
} elseif ($prefix -like "sb_*") {
    Write-Host "-> This is a NEW-format key (sb_...). Edge Functions need the LEGACY 'eyJ...' anon key instead." -ForegroundColor Red
} else {
    Write-Host "-> Unrecognized key format. Expected a legacy anon key starting with 'eyJ'." -ForegroundColor Yellow
}

$phone = Read-Host "Enter test phone (format 91XXXXXXXXXX, no +, no spaces)"
$body  = @{ phone = $phone } | ConvertTo-Json -Compress

Write-Host "`nSending body: $body" -ForegroundColor DarkGray
Write-Host "To: $BASE/send-otp`n" -ForegroundColor DarkGray

try {
    $resp = Invoke-WebRequest -Uri "$BASE/send-otp" -Method POST -Headers $HEADERS -Body $body
    Write-Host "HTTP STATUS: $($resp.StatusCode)" -ForegroundColor Green
    Write-Host "RESPONSE BODY:" -ForegroundColor Green
    Write-Host $resp.Content
} catch {
    $status = $null
    $bodyText = $null
    if ($_.Exception.Response) {
        try { $status = [int]$_.Exception.Response.StatusCode } catch {}
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $bodyText = $reader.ReadToEnd()
        } catch {}
    }
    if (-not $bodyText -and $_.ErrorDetails -and $_.ErrorDetails.Message) {
        $bodyText = $_.ErrorDetails.Message
    }
    Write-Host "HTTP STATUS: $status" -ForegroundColor Red
    Write-Host "RESPONSE BODY:" -ForegroundColor Red
    Write-Host $bodyText
}
