# =============================================================
# V-SPED Auth Edge Function End-to-End Test
# Run from PowerShell:  ./docs/test-auth.ps1
# The anon key is read securely (masked) and never written to disk or git.
# =============================================================

$ErrorActionPreference = "Stop"
$BASE = "https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1"

# --- Anon key (from env var if present, otherwise prompted, visible) ---
if ($env:VSPED_ANON_KEY) {
    $ANON = $env:VSPED_ANON_KEY
    Write-Host "Using anon key from `$env:VSPED_ANON_KEY" -ForegroundColor DarkGray
} else {
    $ANON = Read-Host "Paste LEGACY anon key (will be visible in this terminal)"
}
$ANON = $ANON.Trim()

$HEADERS = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $ANON" }

function Invoke-Fn($name, $bodyObj) {
    $body = $bodyObj | ConvertTo-Json -Compress
    try {
        $resp = Invoke-RestMethod -Uri "$BASE/$name" -Method POST -Headers $HEADERS -Body $body
        return @{ ok = $true; data = $resp }
    } catch {
        $detail = $null
        if ($_.Exception.Response) {
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $detail = $reader.ReadToEnd()
            } catch {}
        }
        if (-not $detail -and $_.ErrorDetails -and $_.ErrorDetails.Message) { $detail = $_.ErrorDetails.Message }
        if (-not $detail) { $detail = $_.Exception.Message }
        # Try to parse JSON bodies so $r.data.success works on errors too
        try { return @{ ok = $false; data = ($detail | ConvertFrom-Json) } } catch { return @{ ok = $false; data = $detail } }
    }
}

$results = @()
function Record($step, $pass, $note) {
    $script:results += [pscustomobject]@{ Step = $step; Result = $(if ($pass) {"PASS"} else {"FAIL"}); Note = $note }
    $color = if ($pass) { "Green" } else { "Red" }
    Write-Host ("[{0}] {1} - {2}" -f $(if ($pass){"PASS"}else{"FAIL"}), $step, $note) -ForegroundColor $color
}

# --- Step 2: send-otp ---
$phone = Read-Host "Enter test phone (format 91XXXXXXXXXX, no +)"
$r = Invoke-Fn "send-otp" @{ phone = $phone }
Record "send-otp" ($r.ok -and $r.data.success) ($r.data | ConvertTo-Json -Compress)

# --- Step 3: verify-otp ---
$otp = Read-Host "Enter the OTP you received via SMS"
$r = Invoke-Fn "verify-otp" @{ phone = $phone; otp_code = $otp }
$userId = $null
if ($r.ok -and $r.data.success) {
    $userId = $r.data.user_id
    Record "verify-otp" $true ("user_id=$userId is_new_user=$($r.data.is_new_user) role=$($r.data.role)")
} else {
    Record "verify-otp" $false ($r.data | ConvertTo-Json -Compress)
}

if ($userId) {
    # --- Step 4: create-pin ---
    $r = Invoke-Fn "create-pin" @{ user_id = $userId; pin = "5678" }
    Record "create-pin" ($r.ok -and $r.data.success) ($r.data | ConvertTo-Json -Compress)

    # --- Step 5a: verify-pin (correct) ---
    $r = Invoke-Fn "verify-pin" @{ user_id = $userId; pin = "5678" }
    Record "verify-pin (correct)" ($r.ok -and $r.data.success) ($r.data | ConvertTo-Json -Compress)

    # --- Step 5b: verify-pin wrong x3 (expect lockout on 3rd) ---
    for ($i = 1; $i -le 3; $i++) {
        $r = Invoke-Fn "verify-pin" @{ user_id = $userId; pin = "0000" }
        Record "verify-pin (wrong #$i)" (-not ($r.ok -and $r.data.success)) ($r.data | ConvertTo-Json -Compress)
    }
    Write-Host "`nNOTE: After lockout test, reset with SQL if you want to re-test:" -ForegroundColor Yellow
    Write-Host "  UPDATE users SET failed_pin_attempts=0, pin_locked_until=NULL WHERE id='$userId';" -ForegroundColor Yellow
}

Write-Host "`n===== SUMMARY =====" -ForegroundColor Cyan
$results | Format-Table -AutoSize
Write-Host "Copy the table above back to Kiro to record results in docs/auth-test-results.md" -ForegroundColor Cyan
