# V-SPED Privacy Policy

**Effective Date:** [To be set at launch]
**Last Updated:** July 4, 2026
**Applicable Law:** Digital Personal Data Protection Act, 2023 (India)

---

## 1. Who We Are

V-SPED is operated by Vathsalya Child Neuro and Nurture Center ("we", "us", "our"). We are the **Data Fiduciary** under the DPDP Act — meaning we determine why and how personal data is collected and processed on this platform.

**Contact for data concerns:**
- Email: [to be added]
- In-app: Settings → Privacy → Contact Us

---

## 2. What This Policy Covers

This policy explains:
- What personal data we collect
- Why we collect it
- How we protect it (especially children's data)
- Who can access it and under what conditions
- Your rights as a user (Data Principal)

---

## 3. Data We Collect

### 3.1 Parent/Guardian Data
| Data | Purpose | Retention |
|------|---------|-----------|
| Phone number | Account creation, login (OTP), session invites | Until account deletion |
| Email (optional) | Notifications, receipts | Until account deletion or withdrawal |
| Full name | Profile display | Until account deletion |
| Payment info | Processed by Razorpay — we do NOT store card/UPI details | Razorpay retains per their policy |

### 3.2 Special Educator Data
| Data | Purpose | Retention |
|------|---------|-----------|
| Phone number | Account creation, login | Until account deletion |
| Full name, qualifications | Profile display, RCI verification | Until account deletion |
| RCI certificate number | Automated verification against RCI portal | Until account deletion |
| Subscription payment info | Processed by Razorpay | Razorpay retains per their policy |

### 3.3 Child Data (SPECIAL PROTECTION — see Section 5)
| Data | Purpose | Retention |
|------|---------|-----------|
| Name | Identification within parent's account only | Until parent requests deletion |
| Age / Date of birth | Age-appropriate content | Until parent requests deletion |
| Gender | Relevant for therapy context | Until parent requests deletion |
| Progress records | Track learning/therapy improvement | Until parent requests deletion |
| Session notes (by educator) | Therapy documentation | Duration of active consent only |
| Assessment results | Skill evaluation | Duration of active consent only |
| Game activity data | Educational progress tracking | Until parent requests deletion |

---

## 4. Legal Basis for Processing

Under the DPDP Act, we process personal data based on:

- **Consent** (Section 6) — You give us permission when you sign up and create profiles.
- **Legitimate use** (Section 7) — For fulfilling the service you requested (e.g., scheduling sessions).
- **Legal obligation** — Where Indian law requires us to retain certain records.

For **children's data specifically**, our sole legal basis is **verifiable parental consent** (Section 9).

---

## 5. Children's Data — Special Protections

This is the most important section of this policy. V-SPED deals with children's data and we treat it with the highest possible protection.

### 5.1 Verifiable Parental Consent
- Only a parent/guardian can create a child profile.
- The parent's verified phone number (authenticated via OTP) serves as the verifiable consent mechanism.
- No child data is collected without the parent actively creating the profile.

### 5.2 Default: Encrypted and Invisible
- All child personal data is **encrypted at rest**.
- By default, **only the parent** can see their child's data within their own app.
- No educator, therapist, teacher, school, admin, or platform operator can see any child data without explicit consent.

### 5.3 Access by Others Requires a Consent Request
If an educator or therapist needs to see your child's data (e.g., to plan sessions), they must:
1. Submit a request through the app specifying:
   - Their identity and role
   - The reason they need access
   - How long they need it (e.g., "for the 6-month session term")
2. You (the parent) receive a notification with these details.
3. You can **accept**, **modify** (e.g., shorten the duration), or **reject** the request.
4. Until you accept, they see nothing.

### 5.4 Time-Bound Access
- All granted access has an expiry date/time.
- When the time expires, access is **automatically revoked** — no action needed from you.
- The educator/therapist simply can no longer see the data after that point.

### 5.5 Instant Revocation
- You can revoke any granted access at any time, instantly, from your app.
- Go to: Your Child's Profile → Who Can See This Data → Revoke Access.
- Revocation takes effect immediately.

### 5.6 What Educators CAN and CANNOT Do
| Allowed (with active consent) | NOT Allowed (ever) |
|------|------|
| View child's progress during their session term | Download or export child data |
| Add session notes visible to the parent | Share data with third parties |
| View assessment results relevant to their sessions | Use data for advertising or testimonials (without separate explicit consent) |
| | Access data after consent expires |
| | Screenshot or screen-record session data (platform discourages; policy prohibits) |

### 5.7 No Tracking, Profiling, or Advertising
In compliance with Section 9(3) of the DPDP Act:
- We do NOT track children's behaviour for profiling.
- We do NOT serve targeted advertisements to children.
- We do NOT use children's data for any purpose beyond the stated educational/therapeutic purpose.
- Game progress and assessment data is used ONLY for educational feedback — never for behavioural profiling.

### 5.8 Platform Operators Cannot See Child Data
- Even the platform owners and administrators **cannot** view individual children's records.
- They can only see anonymous, aggregate data (e.g., "85% of users showed improvement") — never tied to a specific child.
- The sole exception: a formal legal order from a court or regulatory authority, handled with legal counsel.

---

## 6. Data Security

| Measure | Implementation |
|---------|---------------|
| Encryption at rest | All child PII fields encrypted in the database |
| Encryption in transit | All API calls over HTTPS/TLS |
| Access control | Row-Level Security (RLS) enforcing consent checks on every query |
| Authentication | Phone OTP + PIN (no password stored) |
| Audit logging | Every data access event logged (who, what, when, under which consent) |
| Breach response | Notification to Data Protection Board + affected users within 72 hours |

---

## 7. Your Rights (Data Principal Rights)

Under the DPDP Act, you have the right to:

| Right | How to Exercise |
|-------|----------------|
| **Access** — See what data we hold about you/your child | Settings → Privacy → My Data |
| **Correction** — Fix inaccurate data | Edit your profile / child profile directly |
| **Erasure** — Delete your/your child's data permanently | Settings → Privacy → Delete My Data |
| **Withdraw consent** — Stop us processing your data | Revoke specific consents or delete account |
| **Grievance** — Raise a complaint | Contact us (see Section 1) or approach the Data Protection Board of India |

**Response time:** We will respond to any rights request within 7 days.

---

## 8. Data Sharing

We share data ONLY with:

| Recipient | What | Why |
|-----------|------|-----|
| Razorpay | Payment transaction details (no child data) | Subscription processing |
| MSG91 | Phone number (for OTP delivery only) | Authentication |
| AWS (future) | Encrypted data in transit/storage | Infrastructure hosting |

We do NOT sell, rent, or share personal data with advertisers, analytics companies, or any third party for commercial purposes. Ever.

---

## 9. Data Retention & Deletion

| Data type | Retained until |
|-----------|---------------|
| Account data (parent/educator) | Account deletion requested |
| Child data | Parent requests deletion OR 90 days after last activity (whichever comes first per regulatory guidance) |
| Session notes (by educator) | Consent expiry (auto-deleted from educator's view) |
| Payment records | As required by Indian tax law (typically 8 years for financial records) |
| Audit logs | 3 years (for compliance investigation purposes) |

When you delete your account or your child's profile, we:
1. Immediately remove all data from active systems.
2. Remove from backups within 30 days.
3. Retain only what Indian law mandates (anonymised financial records).

---

## 10. Cookies & Tracking

- V-SPED is a mobile app — we do not use browser cookies.
- We do NOT use any third-party analytics or tracking SDKs that profile users.
- Any analytics we collect is strictly aggregate and anonymous (e.g., "X% of educators completed onboarding").

---

## 11. Changes to This Policy

If we change this policy, we will:
1. Notify you via in-app notification at least 14 days before the change takes effect.
2. Clearly explain what changed and why.
3. Give you the option to review and delete your data if you disagree with the changes.

---

## 12. Grievance Officer

**Name:** [To be appointed]
**Email:** [To be added]
**Response time:** Within 7 days of receiving your complaint.

If unsatisfied with our response, you may approach the **Data Protection Board of India** as constituted under the DPDP Act.

---

## 13. Governing Law

This policy is governed by the laws of India, specifically the Digital Personal Data Protection Act, 2023 and the DPDP Rules, 2025.

---

**By creating an account on V-SPED, you confirm that you have read and understood this Privacy Policy and consent to the collection and processing of your data as described herein.**

*For children's data: by creating a child profile, you (the parent/guardian) provide verifiable consent for the limited processing described in Section 5, and you understand that no third party will access your child's data without your explicit, time-bound approval.*
