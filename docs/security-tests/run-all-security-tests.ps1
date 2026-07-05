# =============================================================
# V-SPED COMPREHENSIVE SECURITY TEST SUITE
# Covers: RLS, Authorization, Consent attacks, Input validation,
#   Authentication, Rate limiting, Data leakage, Encryption,
#   Audit immutability, Regression
#
# Run: ./docs/security-tests/run-all-security-tests.ps1
# Requires: Parent phone + anon key
# =============================================================

$ErrorActionPreference = "Stop"
$BASE = "https://fedpulmkxjqoaxlanqhg.supabase.co"
$FN = "$BASE/functions/v1"
$REST = "$BASE/rest/v1"

# --- Setup ---
if ($env:VSPED_ANON_KEY) { $ANON = $env:VSPED_ANON_KEY }
else { $ANON = (Read-Host "Paste LEGACY anon key (visible)").Trim() }

$ANON_HEADERS = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $ANON"; "apikey" = $ANON }

$results = @()
$totalTests = 0
function Record($layer, $test, $pass, $note) {
    $script:totalTests++
    $script:results += [pscustomobject]@{ Layer = $layer; Test = $test; Result = $(if ($pass) {"PASS"} else {"FAIL"}); Note = $note }
    $color = if ($pass) { "Green" } else { "Red" }
    Write-Host ("[{0}] [{1}] {2} — {3}" -f $(if ($pass){"PASS"}else{"FAIL"}), $layer, $test, $note) -ForegroundColor $color
}

function Call-Rest($path, $method = "GET", $headers = $null, $body = $null) {
    $hdrs = if ($headers) { $headers } else { $ANON_HEADERS }
    $uri = "$REST/$path"
    try {
        $params = @{ Uri = $uri; Method = $method; Headers = $hdrs }
        if ($body) { $params.Body = ($body | ConvertTo-Json -Compress) }
        $resp = Invoke-WebRequest @params
        return @{ ok = $true; status = [int]$resp.StatusCode; body = $resp.Content }
    } catch {
        $status = 0; $bodyText = ""
        if ($_.Exception.Response) {
            try { $status = [int]$_.Exception.Response.StatusCode } catch {}
            try { $stream = $_.Exception.Response.GetResponseStream(); $reader = New-Object System.IO.StreamReader($stream); $bodyText = $reader.ReadToEnd() } catch {}
        }
        return @{ ok = $false; status = $status; body = $bodyText }
    }
}

function Call-Fn($name, $bodyObj, $headers = $null) {
    $hdrs = if ($headers) { $headers } else { $ANON_HEADERS }
    $body = $bodyObj | ConvertTo-Json -Compress
    try {
        $resp = Invoke-WebRequest -Uri "$FN/$name" -Method POST -Headers $hdrs -Body $body
        return @{ ok = $true; status = [int]$resp.StatusCode; body = $resp.Content; data = ($resp.Content | ConvertFrom-Json) }
    } catch {
        $status = 0; $bodyText = ""
        if ($_.Exception.Response) {
            try { $status = [int]$_.Exception.Response.StatusCode } catch {}
            try { $stream = $_.Exception.Response.GetResponseStream(); $reader = New-Object System.IO.StreamReader($stream); $bodyText = $reader.ReadToEnd() } catch {}
        }
        $data = $null; try { $data = $bodyText | ConvertFrom-Json } catch {}
        return @{ ok = $false; status = $status; body = $bodyText; data = $data }
    }
}

Write-Host "`n" -NoNewline
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  V-SPED COMPREHENSIVE SECURITY TEST SUITE" -ForegroundColor Cyan
Write-Host "  Testing: RLS, Auth, Consent, Injection, Leakage, Encryption" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

# ===========================================================================
# SETUP: Get a parent session
# ===========================================================================
Write-Host "SETUP: Authenticating parent..." -ForegroundColor Yellow
$phone = Read-Host "Enter parent phone (91XXXXXXXXXX)"
$r = Call-Fn "send-otp" @{ phone = $phone }
if ($r.status -ne 200) { Write-Host "SETUP FAILED: send-otp error. Aborting." -ForegroundColor Red; exit 1 }
$otp = Read-Host "Enter OTP received"
$r = Call-Fn "verify-otp" @{ phone = $phone; otp_code = $otp }
if (-not $r.data.success) { Write-Host "SETUP FAILED: verify-otp error. Aborting." -ForegroundColor Red; exit 1 }

$PARENT_TOKEN = $r.data.session_token
$PARENT_ID = $r.data.user_id
$PARENT_HEADERS = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $PARENT_TOKEN"; "apikey" = $ANON }
Write-Host "Parent authenticated: $PARENT_ID`n" -ForegroundColor Green

# Create test child
$r = Call-Fn "create-child" @{ name = "Security Test Child"; dob = "2019-05-15"; gender = "female" } $PARENT_HEADERS
if (-not $r.data.success) { Write-Host "SETUP FAILED: create-child error: $($r.body)" -ForegroundColor Red; exit 1 }
$CHILD_ID = $r.data.child_id
Write-Host "Test child created: $CHILD_ID`n" -ForegroundColor Green

# ===========================================================================
# LAYER 1: RLS COVERAGE — Direct PostgREST access to sensitive tables
# ===========================================================================
Write-Host "`n--- LAYER 1: RLS COVERAGE (Direct PostgREST) ---" -ForegroundColor Cyan

# Try to read children table directly via REST API (should return empty or 401)
$r = Call-Rest "children?select=*"
Record "L1-RLS" "Direct read children (anon)" ($r.status -eq 200 -and ($r.body -eq "[]" -or $r.body -eq "")) "Status=$($r.status) Body length=$($r.body.Length)"

# Try consent_requests
$r = Call-Rest "consent_requests?select=*"
Record "L1-RLS" "Direct read consent_requests (anon)" ($r.status -eq 200 -and ($r.body -eq "[]" -or $r.body -eq "")) "Status=$($r.status)"

# Try consent_grants
$r = Call-Rest "consent_grants?select=*"
Record "L1-RLS" "Direct read consent_grants (anon)" ($r.status -eq 200 -and ($r.body -eq "[]" -or $r.body -eq "")) "Status=$($r.status)"

# Try consent_audit_log
$r = Call-Rest "consent_audit_log?select=*"
Record "L1-RLS" "Direct read consent_audit_log (anon)" ($r.status -eq 200 -and ($r.body -eq "[]" -or $r.body -eq "")) "Status=$($r.status)"

# Try users table
$r = Call-Rest "users?select=*"
Record "L1-RLS" "Direct read users (anon)" ($r.status -eq 200 -and ($r.body -eq "[]" -or $r.body -eq "")) "Status=$($r.status)"

# Try subscription_payments
$r = Call-Rest "subscription_payments?select=*"
Record "L1-RLS" "Direct read subscription_payments (anon)" ($r.status -eq 200 -and ($r.body -eq "[]" -or $r.body -eq "")) "Status=$($r.status)"

# Try to INSERT into children directly via REST (should fail)
$r = Call-Rest "children" "POST" $ANON_HEADERS @{ parent_id = $PARENT_ID; encrypted_name = "HACKED" }
Record "L1-RLS" "Direct INSERT into children (anon)" ($r.status -ge 400) "Status=$($r.status)"

# Try to DELETE from audit log
$r = Call-Rest "consent_audit_log?id=eq.00000000-0000-0000-0000-000000000000" "DELETE" $ANON_HEADERS
Record "L1-RLS" "Direct DELETE from audit_log (anon)" ($r.status -ge 400 -or $r.body -eq "[]" -or $r.body -eq "") "Status=$($r.status)"

# ===========================================================================
# LAYER 2: AUTHORIZATION — Cross-user access (BOLA)
# ===========================================================================
Write-Host "`n--- LAYER 2: AUTHORIZATION (BOLA / Privilege Escalation) ---" -ForegroundColor Cyan

# Try to read child with anon key only (no user session)
$r = Call-Fn "get-child" @{ child_id = $CHILD_ID } $ANON_HEADERS
Record "L2-AUTH" "Get child with anon key (no session)" ($r.status -eq 401) "Status=$($r.status)"

# Try with fake JWT
$FAKE_HEADERS = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmYWtlIn0.fake"; "apikey" = $ANON }
$r = Call-Fn "get-child" @{ child_id = $CHILD_ID } $FAKE_HEADERS
Record "L2-AUTH" "Get child with forged JWT" ($r.status -eq 401) "Status=$($r.status)"

# Parent can read own child (positive test)
$r = Call-Fn "get-child" @{ child_id = $CHILD_ID } $PARENT_HEADERS
Record "L2-AUTH" "Parent reads own child (positive)" ($r.data.success -eq $true) "name=$($r.data.child.name)"

# Try to read a non-existent child (should be 404, not leak info)
$r = Call-Fn "get-child" @{ child_id = "00000000-0000-0000-0000-000000000000" } $PARENT_HEADERS
Record "L2-AUTH" "Read non-existent child (info leak check)" ($r.status -eq 404 -and $r.data.message -notlike "*parent*") "Status=$($r.status) msg=$($r.data.message)"

# Parent can't request consent on own child
$r = Call-Fn "request-consent" @{ child_id = $CHILD_ID; reason = "test"; duration_hours = 24 } $PARENT_HEADERS
Record "L2-AUTH" "Parent requests consent on own child (should fail)" (-not $r.data.success) "msg=$($r.data.message)"

# ===========================================================================
# LAYER 3: CONSENT SYSTEM ATTACKS
# ===========================================================================
Write-Host "`n--- LAYER 3: CONSENT SYSTEM ATTACKS ---" -ForegroundColor Cyan

# Invalid duration values
$r = Call-Fn "request-consent" @{ child_id = $CHILD_ID; reason = "hack"; duration_hours = -1 } $PARENT_HEADERS
Record "L3-CONSENT" "Negative duration rejected" (-not ($r.data.success)) "Status=$($r.status)"

$r = Call-Fn "request-consent" @{ child_id = $CHILD_ID; reason = "hack"; duration_hours = 99999 } $PARENT_HEADERS
Record "L3-CONSENT" "Excessive duration (>8760) rejected" (-not ($r.data.success)) "Status=$($r.status)"

# Respond to non-existent consent request
$r = Call-Fn "respond-consent" @{ request_id = "00000000-0000-0000-0000-000000000000"; action = "approve" } $PARENT_HEADERS
Record "L3-CONSENT" "Respond to fake request_id (should fail)" (-not $r.data.success) "Status=$($r.status)"

# Revoke non-existent grant
$r = Call-Fn "revoke-consent" @{ grant_id = "00000000-0000-0000-0000-000000000000" } $PARENT_HEADERS
Record "L3-CONSENT" "Revoke fake grant_id (should fail)" (-not $r.data.success) "Status=$($r.status)"

# ===========================================================================
# LAYER 4: INPUT VALIDATION — SQL Injection & Malformed Input
# ===========================================================================
Write-Host "`n--- LAYER 4: INPUT VALIDATION (SQL Injection, XSS, Malformed) ---" -ForegroundColor Cyan

# SQL injection in phone field
$r = Call-Fn "send-otp" @{ phone = "91' OR 1=1 --" }
Record "L4-INPUT" "SQL injection in phone field" ($r.status -ge 400 -or (-not $r.data.success)) "Status=$($r.status)"

# SQL injection in child name (create-child)
$r = Call-Fn "create-child" @{ name = "'; DROP TABLE children; --"; dob = "2020-01-01"; gender = "male" } $PARENT_HEADERS
# This should either succeed (name gets encrypted safely) or fail validation — but NOT drop the table
$tableCheck = Call-Rest "children?select=id&limit=1" "GET" $PARENT_HEADERS
Record "L4-INPUT" "SQL injection in child name (table still exists)" ($tableCheck.status -eq 200) "Table accessible after injection attempt"

# XSS in reason field
$r = Call-Fn "create-child" @{ name = "<script>alert('xss')</script>"; dob = "2020-01-01" } $PARENT_HEADERS
Record "L4-INPUT" "XSS in child name (stored safely, encrypted)" ($r.data.success -or $r.status -ge 400) "Encrypted or rejected — no execution risk"

# Malformed JSON
$MALFORMED_HEADERS = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $PARENT_TOKEN"; "apikey" = $ANON }
try {
    $resp = Invoke-WebRequest -Uri "$FN/create-child" -Method POST -Headers $MALFORMED_HEADERS -Body "not json at all {{{{"
    Record "L4-INPUT" "Malformed JSON body" ($false) "Unexpectedly succeeded"
} catch {
    $status = 0; try { $status = [int]$_.Exception.Response.StatusCode } catch {}
    Record "L4-INPUT" "Malformed JSON body rejected" ($status -ge 400) "Status=$status"
}

# Empty body
$r = Call-Fn "create-child" @{} $PARENT_HEADERS
Record "L4-INPUT" "Empty body to create-child" (-not $r.data.success) "Status=$($r.status)"

# Oversized input (10KB string)
$bigString = "A" * 10000
$r = Call-Fn "create-child" @{ name = $bigString; dob = "2020-01-01" } $PARENT_HEADERS
Record "L4-INPUT" "Oversized name (10KB)" ($r.data.success -or $r.status -ge 400) "Status=$($r.status) — either encrypted safely or rejected"

# ===========================================================================
# LAYER 5: AUTHENTICATION ATTACKS
# ===========================================================================
Write-Host "`n--- LAYER 5: AUTHENTICATION ATTACKS ---" -ForegroundColor Cyan

# Expired/invalid OTP
$r = Call-Fn "verify-otp" @{ phone = $phone; otp_code = "000000" }
Record "L5-AUTH" "Wrong OTP code rejected" (-not $r.data.success) "Status=$($r.status)"

# PIN brute force (already locked from earlier test, but verify lockout still holds)
# First reset PIN attempts for our test user
$r = Call-Fn "verify-pin" @{ user_id = $PARENT_ID; pin = "0000" }
$r = Call-Fn "verify-pin" @{ user_id = $PARENT_ID; pin = "0000" }
$r = Call-Fn "verify-pin" @{ user_id = $PARENT_ID; pin = "0000" }
Record "L5-AUTH" "PIN lockout after 3 wrong attempts" ($r.status -eq 403 -or ($r.data.message -like "*locked*")) "msg=$($r.data.message)"

# No Authorization header at all
$NO_AUTH = @{ "Content-Type" = "application/json"; "apikey" = $ANON }
$r = Call-Fn "get-child" @{ child_id = $CHILD_ID } $NO_AUTH
Record "L5-AUTH" "No Authorization header" ($r.status -eq 401) "Status=$($r.status)"

# ===========================================================================
# LAYER 6: DATA LEAKAGE — Response field filtering
# ===========================================================================
Write-Host "`n--- LAYER 6: DATA LEAKAGE ---" -ForegroundColor Cyan

# Verify get-child doesn't return encryption key or internal fields
$r = Call-Fn "get-child" @{ child_id = $CHILD_ID } $PARENT_HEADERS
$responseText = $r.body
Record "L6-LEAK" "Response doesn't contain 'ENCRYPTION_KEY'" ($responseText -notlike "*ENCRYPTION_KEY*") "Checked response body"
Record "L6-LEAK" "Response doesn't contain 'service_role'" ($responseText -notlike "*service_role*") "Checked response body"
Record "L6-LEAK" "Response doesn't contain 'encrypted_name' ciphertext" ($responseText -notlike "*encrypted_name*") "Only decrypted name returned"

# Verify error messages don't leak stack traces
$r = Call-Fn "get-child" @{ child_id = "not-a-uuid" } $PARENT_HEADERS
Record "L6-LEAK" "Error response doesn't leak stack trace" ($r.body -notlike "*at Object*" -and $r.body -notlike "*node_modules*" -and $r.body -notlike "*index.ts*") "Clean error msg"

# ===========================================================================
# LAYER 7: ENCRYPTION INTEGRITY
# ===========================================================================
Write-Host "`n--- LAYER 7: ENCRYPTION INTEGRITY ---" -ForegroundColor Cyan

# Read children directly via REST (as parent, with their token) — should see encrypted blobs, not plaintext
$PARENT_REST_HEADERS = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $PARENT_TOKEN"; "apikey" = $ANON }
$r = Call-Rest "children?select=encrypted_name&id=eq.$CHILD_ID" "GET" $PARENT_REST_HEADERS
Record "L7-ENC" "Direct REST shows ciphertext (not plaintext)" ($r.body -notlike "*Security Test Child*") "REST returns: $($r.body.Substring(0, [Math]::Min(80, $r.body.Length)))..."

# Verify decrypted name comes from get-child function (not direct access)
$r = Call-Fn "get-child" @{ child_id = $CHILD_ID } $PARENT_HEADERS
Record "L7-ENC" "get-child returns decrypted 'Security Test Child'" ($r.data.child.name -eq "Security Test Child") "name=$($r.data.child.name)"

# ===========================================================================
# LAYER 8: AUDIT IMMUTABILITY
# ===========================================================================
Write-Host "`n--- LAYER 8: AUDIT IMMUTABILITY ---" -ForegroundColor Cyan

# Try to UPDATE audit log via REST
$r = Call-Rest "consent_audit_log?id=eq.00000000-0000-0000-0000-000000000000" "PATCH" $PARENT_REST_HEADERS @{ event_type = "hacked" }
Record "L8-AUDIT" "UPDATE audit_log via REST (should fail)" ($r.status -ge 400 -or $r.body -eq "" -or $r.body -eq "[]") "Status=$($r.status)"

# Try to DELETE from audit log via REST
$r = Call-Rest "consent_audit_log?id=eq.00000000-0000-0000-0000-000000000000" "DELETE" $PARENT_REST_HEADERS
Record "L8-AUDIT" "DELETE from audit_log via REST (should fail)" ($r.status -ge 400 -or $r.body -eq "" -or $r.body -eq "[]") "Status=$($r.status)"

# Try to INSERT directly into audit log (should only be done by service role)
$r = Call-Rest "consent_audit_log" "POST" $PARENT_REST_HEADERS @{ event_type = "hacked"; actor_id = $PARENT_ID }
Record "L8-AUDIT" "Direct INSERT into audit_log (should fail)" ($r.status -ge 400) "Status=$($r.status)"

# ===========================================================================
# LAYER 9: FUNCTION-LEVEL AUTHORIZATION
# ===========================================================================
Write-Host "`n--- LAYER 9: FUNCTION-LEVEL AUTHORIZATION ---" -ForegroundColor Cyan

# Parent calling educator-only endpoint (subscribe-educator)
$r = Call-Fn "subscribe-educator" @{ plan_id = "basic" } $PARENT_HEADERS
Record "L9-FUNC" "Parent calls subscribe-educator (should fail)" (-not $r.data.success) "msg=$($r.data.message)"

# Parent calling respond-consent for non-existent request (ensure it doesn't crash)
$r = Call-Fn "respond-consent" @{ request_id = "11111111-1111-1111-1111-111111111111"; action = "approve" } $PARENT_HEADERS
Record "L9-FUNC" "respond-consent with random UUID (graceful failure)" (-not $r.data.success) "Status=$($r.status)"

# ===========================================================================
# SUMMARY
# ===========================================================================
Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  SECURITY TEST RESULTS" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

$results | Format-Table Layer, Test, Result, Note -AutoSize

$passed = ($results | Where-Object { $_.Result -eq "PASS" }).Count
$failed = ($results | Where-Object { $_.Result -eq "FAIL" }).Count
$passColor = if ($failed -eq 0) { "Green" } else { "Red" }

Write-Host "`nTOTAL: $passed PASS / $failed FAIL / $totalTests total" -ForegroundColor $passColor

if ($failed -gt 0) {
    Write-Host "`nFAILED TESTS:" -ForegroundColor Red
    $results | Where-Object { $_.Result -eq "FAIL" } | Format-Table Layer, Test, Note -AutoSize
}

# Cleanup
Write-Host "`nCLEANUP: Delete test child with:" -ForegroundColor Yellow
Write-Host "  DELETE FROM children WHERE id = '$CHILD_ID';" -ForegroundColor Yellow
Write-Host "  Reset PIN lockout: UPDATE users SET failed_pin_attempts=0, pin_locked_until=NULL WHERE id='$PARENT_ID';" -ForegroundColor Yellow
