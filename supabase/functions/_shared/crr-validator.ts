/**
 * CRR (Central Rehabilitation Register) Number Format Validator
 *
 * Pure validation module for RCI registration numbers.
 * No external dependencies — this is a pure function module for Deno edge functions.
 *
 * CRR numbers follow the pattern: [CATEGORY_PREFIX][SEPARATOR?][DIGITS][SEPARATOR?][SUFFIX?]
 * Example: SE12345, AST/001234, RPMR-98765A
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  normalized?: string;
  error?: string;
  errorComponent?: "prefix" | "category" | "digits" | "length" | "format";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * All 14 recognized RCI professional category codes.
 * Ordered longest-first to support greedy prefix matching.
 */
export const VALID_CATEGORY_CODES: string[] = [
  "RPMR", // Rehabilitation Practitioners in Mental Retardation (267)
  "HEMT", // Hearing Aid and Ear Mould Technician (44)
  "AST",  // Audiologist and Speech Therapist (16,162)
  "SHT",  // Speech & Hearing Technician (4,918)
  "CBR",  // Community Based Rehabilitation Professionals (2,421)
  "RCA",  // Rehabilitation Counsellors/Administrator (1,270)
  "MRT",  // Multi-Purpose Rehabilitation Therapists (795)
  "RSW",  // Rehabilitation Social Worker (781)
  "OMS",  // Orientation and Mobility Specialist (309)
  "RET",  // Rehabilitation Engineer and Technician (12)
  "SE",   // Special Educators (187,855)
  "CP",   // Clinical Psychologist (4,222)
  "RP",   // Rehabilitation Psychologist (3,012)
  "PO",   // Prosthetists and Orthotists (3,952)
];

/**
 * Legal self-attestation text that educators must accept.
 */
export const ATTESTATION_TEXT =
  "I hereby declare that the CRR number provided is genuine, currently valid, " +
  "and registered under my name with the Rehabilitation Council of India. " +
  "I understand that providing false information may result in permanent ban " +
  "from this platform and legal action under applicable Indian law including " +
  "the Information Technology Act, 2000 and Indian Penal Code.";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const MIN_LENGTH = 4;
const MAX_LENGTH = 20;
const MIN_DIGITS_AFTER_PREFIX = 3;

/** Check that a string contains at least one letter. */
function hasLetter(s: string): boolean {
  return /[A-Z]/.test(s);
}

/** Check that a string contains at least one digit. */
function hasDigit(s: string): boolean {
  return /[0-9]/.test(s);
}

/**
 * Attempt to extract a recognized category prefix from the start of the
 * normalized CRR string. Tries longest codes first (greedy match).
 * Returns the matched prefix or null.
 */
function extractCategoryPrefix(normalized: string): string | null {
  for (const code of VALID_CATEGORY_CODES) {
    if (normalized.startsWith(code)) {
      return code;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main validation function
// ---------------------------------------------------------------------------

/**
 * Validates a CRR number against known RCI patterns.
 *
 * Rules applied in order:
 * 1. Trim and uppercase the input
 * 2. Remove internal whitespace
 * 3. Length must be 4-20 characters
 * 4. Must contain at least one letter AND one digit
 * 5. Must start with a recognized category prefix
 * 6. After prefix (and optional separator), remaining portion must contain ≥3 digits
 * 7. Overall pattern must match: [A-Z]{2,4}[/-]?[0-9]{3,10}[/-]?[A-Z0-9]{0,6}
 */
export function validateCrrFormat(crrNumber: string): ValidationResult {
  // Step 1: Normalize — trim, uppercase, remove internal whitespace
  const normalized = crrNumber.trim().toUpperCase().replace(/\s+/g, "");

  // Step 2: Length check
  if (normalized.length < MIN_LENGTH || normalized.length > MAX_LENGTH) {
    return {
      valid: false,
      error:
        normalized.length < MIN_LENGTH
          ? `CRR number is too short (minimum ${MIN_LENGTH} characters)`
          : `CRR number is too long (maximum ${MAX_LENGTH} characters)`,
      errorComponent: "length",
    };
  }

  // Step 3: Must contain at least one letter and one digit
  if (!hasLetter(normalized)) {
    return {
      valid: false,
      error: "CRR number must contain at least one letter",
      errorComponent: "format",
    };
  }
  if (!hasDigit(normalized)) {
    return {
      valid: false,
      error: "CRR number must contain at least one digit",
      errorComponent: "format",
    };
  }

  // Step 4: Extract and validate category prefix
  const prefix = extractCategoryPrefix(normalized);
  if (!prefix) {
    return {
      valid: false,
      error: "CRR number does not start with a recognized RCI category code",
      errorComponent: "category",
    };
  }

  // Step 5: After prefix, strip optional separator (/ or -)
  let remainder = normalized.slice(prefix.length);
  if (remainder.length > 0 && (remainder[0] === "/" || remainder[0] === "-")) {
    remainder = remainder.slice(1);
  }

  // Step 6: Count digits in the remainder — must have at least 3
  const digitCount = (remainder.match(/[0-9]/g) || []).length;
  if (digitCount < MIN_DIGITS_AFTER_PREFIX) {
    return {
      valid: false,
      error: `CRR number must contain at least ${MIN_DIGITS_AFTER_PREFIX} digits after the category code`,
      errorComponent: "digits",
    };
  }

  // Step 7: Overall pattern match for the full normalized string
  // Pattern: 2-4 uppercase letters, optional separator, 3-10 digits, optional separator, 0-6 alphanumeric suffix
  const pattern = /^[A-Z]{2,4}[/\-]?[0-9]{3,10}[/\-]?[A-Z0-9]{0,6}$/;
  if (!pattern.test(normalized)) {
    return {
      valid: false,
      error: "CRR number format does not match the expected pattern",
      errorComponent: "format",
    };
  }

  // All checks passed
  return {
    valid: true,
    normalized,
  };
}
