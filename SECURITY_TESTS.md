# Access Control & Security Test Checklist

> Manual test plan for verifying Deed AI security controls.
> Run these tests after each deployment or security change.

---

## 1. Authentication (Middleware)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1.1 | Unauthenticated dashboard access | Open `/dashboard` in incognito (no login) | Redirected to `/login` |
| 1.2 | Unauthenticated app access | Open `/app` in incognito (no login) | Redirected to `/login` |
| 1.3 | Unauthenticated API call | `curl -X POST /api/chat -H "Content-Type: application/json" -d '{"message":"test"}'` | 401 Unauthorized |
| 1.4 | Expired session | Let session expire, then try to navigate | Redirected to `/login` |
| 1.5 | Public pages accessible | Open `/`, `/login`, `/signup` without auth | Pages load normally |

## 2. IDOR / Row-Level Security

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 2.1 | Cannot read other user's agreements | User A creates agreement. User B queries `agreements` table. | User B sees 0 rows from User A |
| 2.2 | Cannot delete other user's agreement | User A gets agreement ID. User B calls delete with that ID. | Delete affects 0 rows (RLS blocks) |
| 2.3 | Cannot rename other user's agreement | User B tries to update User A's agreement name. | Update affects 0 rows |
| 2.4 | Auto-save scoped to own user | In LLPApp, modify data. Check Supabase logs. | Upsert includes `user_id` filter |
| 2.5 | RLS on direct SQL | In Supabase SQL Editor (as anon role): `SELECT * FROM agreements;` | Returns 0 rows (FORCE RLS active) |

## 3. Input Validation (Zod)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 3.1 | Chat: empty message | POST `/api/chat` with `{ "message": "", "data": {}, "step": 0 }` | 400 with validation error |
| 3.2 | Chat: oversized message | POST `/api/chat` with message > 10,000 chars | 400 with validation error |
| 3.3 | Chat: XSS in message | POST with `message: "<script>alert(1)</script>"` | Accepted (sanitized by AI), no XSS in response |
| 3.4 | Chat: invalid step | POST with `step: -1` or `step: 999` | 400 with validation error |
| 3.5 | Chat: extra fields | POST with unexpected fields like `{ "admin": true }` | Extra fields stripped by Zod |
| 3.6 | Render: missing data | POST `/api/render-deed` with `{}` | 400 with validation error |
| 3.7 | Render: invalid numPartners | POST with `numPartners: 100` | 400 (max 10 partners) |
| 3.8 | Download DOCX: no body | POST `/api/download-docx` with empty body | 400 with validation error |
| 3.9 | Download PDF: XSS in HTML | POST `/api/download-pdf` with `html: "<script>alert(1)</script>"` | Script tags stripped by sanitizeHtml |
| 3.10 | Download PDF: oversized HTML | POST with html > 5MB | 400 with validation error |

## 4. Rate Limiting

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 4.1 | Chat: 21st request in 1 hour | Send 21 POST requests to `/api/chat` rapidly | 21st returns 429 with `Retry-After` header |
| 4.2 | Render: 61st request | Send 61 POST requests to `/api/render-deed` | 61st returns 429 |
| 4.3 | DOCX: 31st request | Send 31 POST requests to `/api/download-docx` | 31st returns 429 |
| 4.4 | PDF: 31st request | Send 31 POST requests to `/api/download-pdf` | 31st returns 429 |
| 4.5 | Rate limit per user | User A hits limit. User B sends request. | User B is not rate limited |
| 4.6 | Retry-After header | Trigger 429 response | Response has `Retry-After` header with seconds |

## 5. Security Headers

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 5.1 | HSTS present | Check response headers on any page | `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` |
| 5.2 | X-Frame-Options | Check response headers | `X-Frame-Options: DENY` |
| 5.3 | CSP present | Check response headers | `Content-Security-Policy` header with full policy |
| 5.4 | No MIME sniffing | Check response headers | `X-Content-Type-Options: nosniff` |
| 5.5 | Clickjacking test | Try embedding app in `<iframe>` on external page | Iframe blocked (DENY) |
| 5.6 | CSP blocks inline script | Inject `<script>` tag via browser DevTools | Blocked by CSP |

**Quick header check command:**
```bash
curl -sI https://your-app.vercel.app/ | grep -iE "(strict-transport|x-frame|content-security|x-content-type|referrer-policy|permissions-policy)"
```

## 6. Environment Variables

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 6.1 | No secrets in client bundle | In browser DevTools > Sources, search for `GEMINI` | Not found |
| 6.2 | No secrets in git | `git log --all -p -- .env*` | Only `.env.example` appears (no real secrets) |
| 6.3 | Supabase URL is public | Check `NEXT_PUBLIC_SUPABASE_URL` in client JS | Present (this is expected and safe) |
| 6.4 | Service role key server-only | Search client bundle for `service_role` or `SUPABASE_SERVICE_ROLE_KEY` | Not found |

## 7. Storage Security (Proactive — Bucket Not Yet Used)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 7.1 | Bucket is private | Check Supabase Dashboard > Storage > `documents` | Public access: OFF |
| 7.2 | Cannot list other user's files | Call `storage.from('documents').list('other-user-id/')` | Empty or error (RLS blocks) |
| 7.3 | Signed URL expires | Generate signed URL, wait 6 minutes, try to access | 403 Forbidden (5-min expiry) |
| 7.4 | File size limit | Try uploading >10MB file | Rejected by bucket policy |

## 8. Data Protection (DPDP Act)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 8.1 | Audit logs recorded | Perform any API action, check `audit_logs` table | Entry with user_id, action, timestamp |
| 8.2 | Data retention cleanup | Check for agreements older than 30 days | Should be flagged/deleted by retention function |
| 8.3 | Aadhaar data not persisted | Check `agreements.data` JSONB for Aadhaar images | No base64 image data stored (transient only) |
| 8.4 | No PII in server logs | Check Vercel function logs after chat | No Aadhaar numbers, names, or addresses logged |

---

## Running the Tests

### Prerequisites
- Two separate user accounts (User A and User B)
- `curl` or Postman for API testing
- Browser DevTools for header inspection
- Supabase Dashboard access for RLS/storage verification

### Quick Smoke Test Script
```bash
# Replace with your actual values
BASE_URL="https://your-app.vercel.app"

# Test 1: Unauthenticated API should return 401
echo "=== Test: Unauth API ==="
curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"test","data":{},"step":0}'
echo ""  # Should print 401

# Test 2: Security headers present
echo "=== Test: Security Headers ==="
curl -sI "$BASE_URL/" | grep -iE "(strict-transport|x-frame|content-security|x-content-type)"

# Test 3: Invalid input returns 400
echo "=== Test: Zod Validation ==="
# (Requires valid auth cookie — use browser or session token)
```

---

*Last updated: Section 8 of 10 — Security Audit*
