# FlutterFlow Auth Wiring Sheet

Goal: connect your existing Phone / OTP / PIN-create / PIN-entry pages to the deployed Supabase edge functions, with role-based routing.

You already have the pages built. This sheet only covers **wiring** (API calls + button actions + navigation). Everything you need to type is spelled out — no guesswork.

> Replace `YOUR_ANON_KEY` everywhere below with your legacy anon key (Settings → API → Legacy anon key, starts with `eyJ`). It's safe to use in the app; just don't commit it to git.

---

## Part 1 — App State variables (create these first)

In FlutterFlow left panel: **App Values → App State → + Add Field**. Create:

| Name | Type | Persisted |
|------|------|-----------|
| authPhone | String | yes |
| authUserId | String | yes |
| authRole | String | yes |
| authSessionToken | String | no |
| authRefreshToken | String | no |
| authIsNewUser | Boolean | no |

---

## Part 2 — API Library (define each call once)

Go to left panel **API Calls → + Add → API Call**. Create these four. All are **POST**.
For every call, add these three **Headers**:

```
Content-Type: application/json
Authorization: Bearer YOUR_ANON_KEY
apikey: YOUR_ANON_KEY
```

Set **Body** type to **JSON**.

### 2.1 — `sendOtp`
- URL: `https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1/send-otp`
- Body:
  ```json
  { "phone": "[phone]" }
  ```
- Variables: `phone` (String)
- JSON response paths to define:
  | Name | Path |
  |------|------|
  | success | `$.success` |
  | message | `$.message` |

### 2.2 — `verifyOtp`
- URL: `https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1/verify-otp`
- Body:
  ```json
  { "phone": "[phone]", "otp_code": "[otpCode]" }
  ```
- Variables: `phone` (String), `otpCode` (String)
- JSON response paths:
  | Name | Path |
  |------|------|
  | success | `$.success` |
  | user_id | `$.user_id` |
  | session_token | `$.session_token` |
  | refresh_token | `$.refresh_token` |
  | is_new_user | `$.is_new_user` |
  | role | `$.role` |

### 2.3 — `createPin`
- URL: `https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1/create-pin`
- Body:
  ```json
  { "user_id": "[userId]", "pin": "[pin]" }
  ```
- Variables: `userId` (String), `pin` (String)
- JSON response paths:
  | Name | Path |
  |------|------|
  | success | `$.success` |
  | message | `$.message` |

### 2.4 — `verifyPin`
- URL: `https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1/verify-pin`
- Body:
  ```json
  { "user_id": "[userId]", "pin": "[pin]" }
  ```
- Variables: `userId` (String), `pin` (String)
- JSON response paths:
  | Name | Path |
  |------|------|
  | success | `$.success` |
  | user_id | `$.user_id` |
  | role | `$.role` |
  | message | `$.message` |

Tip: use FlutterFlow's "Test" tab on each API call with a real phone to confirm the response paths light up green before wiring buttons.
