# Requirements Document

## Introduction

The RCI Verification System replaces the placeholder `verify-rci` edge function in V-SPED with a proper multi-stage verification pipeline. Since the RCI portal (rciregistration.nic.in) has no public API and uses CAPTCHA-protected JSP pages, automated real-time verification is not feasible. The system uses a Format Validation + Self-Attestation + Delayed Manual Audit approach: educators submit their CRR (Central Rehabilitation Register) number, the system validates its format against known RCI numbering patterns, the educator provides a legally binding self-attestation, and the platform team manually audits registrations over time. This balances MVP speed with fraud deterrence.

## Glossary

- **RCI**: Rehabilitation Council of India — the statutory body that registers rehabilitation professionals
- **CRR_Number**: Central Rehabilitation Register number — the unique registration identifier issued by RCI to each professional
- **Verification_System**: The V-SPED subsystem responsible for validating educator credentials and managing verification state transitions
- **Educator**: A registered user on V-SPED with the role `special_educator` who holds (or claims to hold) a valid RCI registration
- **Self_Attestation**: A legally binding declaration by the educator confirming the authenticity of their CRR number, stored with timestamp
- **Verification_Status**: An enum representing the lifecycle state of an educator's verification: `pending`, `provisionally_verified`, `verified`, `rejected`
- **Audit_Trail**: An immutable log of all verification state transitions, recording who changed what, when, and why
- **Platform_Admin**: A V-SPED team member authorized to perform manual verification audits and state transitions
- **Category_Code**: A code within the CRR number identifying the professional category (e.g., Special Educator, Audiologist, Clinical Psychologist)
- **Rate_Limiter**: The existing PostgreSQL-based sliding-window rate limiting system in V-SPED

## Requirements

### Requirement 1: CRR Number Format Validation

**User Story:** As a platform operator, I want CRR numbers to be validated against known RCI numbering patterns, so that obviously invalid or fabricated numbers are rejected at submission time.

#### Acceptance Criteria

1. WHEN an educator submits a CRR number, THE Verification_System SHALL validate the number against the expected format pattern consisting of a state code prefix, category code, and sequential registration digits
2. WHEN a CRR number fails format validation, THE Verification_System SHALL return a descriptive error message indicating which component of the number is invalid
3. THE Verification_System SHALL recognize all 14 RCI professional category codes: Special Educators, Audiologist and Speech Therapist, Clinical Psychologist, Rehabilitation Psychologist, Prosthetists and Orthotists, Speech and Hearing Technician, Community Based Rehabilitation Professionals, Rehabilitation Counsellors and Administrator, Multi-Purpose Rehabilitation Therapists, Rehabilitation Social Worker, Rehabilitation Practitioners in Mental Retardation, Orientation and Mobility Specialist, Hearing Aid and Ear Mould Technician, and Rehabilitation Engineer and Technician
4. WHEN a CRR number passes format validation, THE Verification_System SHALL normalize the number by trimming whitespace and converting to uppercase before storage
5. IF a CRR number is already associated with a different educator profile on V-SPED, THEN THE Verification_System SHALL reject the submission with a duplicate number error

### Requirement 2: Self-Attestation Declaration

**User Story:** As a platform operator, I want educators to provide a legally binding self-attestation when submitting their CRR number, so that fraudulent claims carry legal consequences.

#### Acceptance Criteria

1. WHEN an educator submits their CRR number for verification, THE Verification_System SHALL require a self-attestation declaration to be accepted before proceeding
2. THE Verification_System SHALL store the exact attestation text, the timestamp of acceptance, and the educator's user ID as an immutable record
3. THE Verification_System SHALL present the attestation text stating that the educator declares their CRR number is genuine, currently valid, registered under their name, and that providing false information may result in permanent ban and legal action under applicable Indian law
4. WHEN an educator has not accepted the self-attestation, THE Verification_System SHALL prevent the verification status from advancing beyond `pending`

### Requirement 3: Verification Status Lifecycle

**User Story:** As a platform operator, I want a multi-stage verification lifecycle, so that educators can start using the platform quickly while maintaining long-term verification integrity.

#### Acceptance Criteria

1. WHEN an educator profile is first created with a CRR number, THE Verification_System SHALL set the verification_status to `pending`
2. WHEN a CRR number passes format validation AND the educator accepts the self-attestation, THE Verification_System SHALL transition the verification_status to `provisionally_verified`
3. WHEN a Platform_Admin manually confirms an educator's credentials, THE Verification_System SHALL transition the verification_status to `verified`
4. WHEN a Platform_Admin determines a CRR number is fraudulent or invalid, THE Verification_System SHALL transition the verification_status to `rejected` with a mandatory rejection reason
5. IF an educator's verification_status is `rejected`, THEN THE Verification_System SHALL prevent any further verification attempts for that educator account
6. THE Verification_System SHALL only allow the following state transitions: `pending` to `provisionally_verified`, `pending` to `rejected`, `provisionally_verified` to `verified`, `provisionally_verified` to `rejected`

### Requirement 4: Marketplace Visibility Rules

**User Story:** As a parent, I want to see only credentialed educators in the marketplace, so that I can trust the professionals available on the platform.

#### Acceptance Criteria

1. WHILE an educator's verification_status is `provisionally_verified`, THE Verification_System SHALL allow marketplace visibility with a "Verification Pending" badge displayed on their profile
2. WHILE an educator's verification_status is `verified`, THE Verification_System SHALL allow marketplace visibility with a "RCI Verified ✓" badge displayed on their profile
3. WHILE an educator's verification_status is `pending` or `rejected`, THE Verification_System SHALL exclude the educator from marketplace search results and browsing
4. THE Verification_System SHALL enforce that marketplace visibility requires BOTH an appropriate verification_status (`provisionally_verified` or `verified`) AND an active subscription

### Requirement 5: Verification Audit Trail

**User Story:** As a platform operator, I want all verification state changes logged immutably, so that I can investigate fraud cases and maintain compliance with DPDP Act audit requirements.

#### Acceptance Criteria

1. WHEN any verification_status transition occurs, THE Verification_System SHALL create an audit log entry containing the educator ID, previous status, new status, timestamp, the actor who initiated the change, and a reason for the change
2. THE Verification_System SHALL store audit trail entries in an append-only manner where existing entries are never modified or deleted
3. WHEN a Platform_Admin rejects an educator, THE Verification_System SHALL require the admin to provide a reason that is stored in both the audit trail and the educator profile
4. THE Verification_System SHALL record the IP address or session context of the actor performing the state transition

### Requirement 6: Manual Audit Administration

**User Story:** As a platform admin, I want tools to review provisionally verified educators, so that I can perform manual verification and catch fraudulent registrations.

#### Acceptance Criteria

1. THE Verification_System SHALL provide an endpoint to list all educators with verification_status `provisionally_verified` ordered by submission date
2. WHEN a Platform_Admin reviews an educator, THE Verification_System SHALL allow transitioning the status to either `verified` or `rejected`
3. THE Verification_System SHALL support filtering the audit queue by category code, city, and submission date range
4. WHEN a Platform_Admin rejects an educator as fraudulent, THE Verification_System SHALL mark the rejection reason as `fraudulent_crr` and record it as a permanent ban

### Requirement 7: TOS Enforcement and Fraud Handling

**User Story:** As a platform operator, I want fraudulent CRR submissions to result in permanent bans, so that the platform maintains trust and deters abuse.

#### Acceptance Criteria

1. WHEN an educator's verification_status is set to `rejected` with reason `fraudulent_crr`, THE Verification_System SHALL permanently prevent that account from re-attempting verification
2. THE Verification_System SHALL store the rejection reason on the educator profile so that any future login or profile access shows the banned state
3. IF a rejected educator attempts to call the verification endpoint, THEN THE Verification_System SHALL return an error indicating the account is permanently banned without revealing specific rejection details

### Requirement 8: Rate Limiting for Verification Attempts

**User Story:** As a platform operator, I want verification attempts rate-limited, so that automated abuse and brute-force submission attacks are prevented.

#### Acceptance Criteria

1. THE Verification_System SHALL limit verification attempts to 3 per user per 60-minute window using the existing Rate_Limiter infrastructure
2. WHEN a rate limit is exceeded, THE Verification_System SHALL return a 429 status with a message indicating the user should retry after the window expires
3. THE Verification_System SHALL use the educator's user_id as the rate limit identifier and `verify_rci` as the action identifier

### Requirement 9: Backward Compatibility with Existing Infrastructure

**User Story:** As a developer, I want the new verification system to work with the existing database schema and edge functions, so that deployment does not require a full system migration.

#### Acceptance Criteria

1. THE Verification_System SHALL add a `verification_status` column to the existing `educator_profiles` table as a text enum with values `pending`, `provisionally_verified`, `verified`, `rejected`
2. THE Verification_System SHALL add columns `self_attestation_at`, `attestation_text`, `rejection_reason`, `verified_by`, and `audit_notes` to the existing `educator_profiles` table
3. THE Verification_System SHALL maintain backward compatibility with the existing `is_verified` column by setting it to TRUE when verification_status transitions to `verified` or `provisionally_verified`
4. THE Verification_System SHALL update the existing `verify-rci` edge function to implement the new validation and attestation logic
5. THE Verification_System SHALL update the existing `create-educator-profile` edge function to set initial verification_status to `pending`
6. THE Verification_System SHALL use the pinned import format `https://esm.sh/@supabase/supabase-js@2.49.1` consistent with existing edge functions
7. THE Verification_System SHALL update the existing RLS policy `educator_profiles_public_browse` to check for verification_status IN ('provisionally_verified', 'verified') instead of only `is_verified = TRUE`
