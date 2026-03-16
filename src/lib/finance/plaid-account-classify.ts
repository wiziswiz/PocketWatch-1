/** Plaid account classification — business detection, type mapping, name sanitization */

const BUSINESS_SUBTYPES = new Set(["business", "commercial", "business_checking", "business_savings"])
const BUSINESS_NAME_KEYWORDS = ["business", "commercial", "ink ", "ink cash", "ink preferred", "ink unlimited"]

// Generic names Plaid returns instead of actual product names
const GENERIC_NAMES = new Set(["credit card", "checking", "savings", "total checking", "debit card"])

// Names that are clearly card/account product names (not cardholder PII)
const KNOWN_ACCOUNT_PATTERNS = /^(credit card|checking|savings|total checking|platinum|gold|everyday|preferred|freedom|sapphire|reserve|self-directed|money market|cd |certificate)/i

export function mapPlaidType(type: string, subtype: string | null, name: string): string {
  const biz = isBizAccount(subtype, name)
  if (type === "credit") return biz ? "business_credit" : "credit"
  if (type === "loan") return subtype === "mortgage" ? "mortgage" : "loan"
  if (type === "investment") return "investment"
  if (subtype === "savings") return biz ? "business_savings" : "savings"
  if (type === "depository" && biz) return "business_checking"
  return "checking"
}

export function isBizAccount(subtype: string | null, name: string): boolean {
  if (subtype && BUSINESS_SUBTYPES.has(subtype)) return true
  const lower = name.toLowerCase()
  if (BUSINESS_NAME_KEYWORDS.some((kw) => lower.includes(kw))) return true
  // Short names that don't match known product names are likely cardholder PII
  // from business accounts (e.g. "Z. KAL" instead of "CREDIT CARD")
  if (name.length <= 15 && !KNOWN_ACCOUNT_PATTERNS.test(name) && /[A-Z]\.?\s/.test(name)) return true
  return false
}

/**
 * Pick the best display name for an account.
 * Prefers officialName over generic Plaid names like "CREDIT CARD".
 * Sanitizes PII (cardholder initials) from business accounts.
 */
export function bestAccountName(
  name: string,
  officialName: string | null,
  type: string,
  mask: string | null,
): string {
  // If name looks like cardholder PII, replace entirely
  if (name.length <= 20 && /^[A-Z]\.?\s/.test(name)) {
    // Try officialName first
    if (officialName && !isGenericName(officialName)) return officialName
    return type === "credit" ? "Business Credit Card" : "Business Account"
  }

  // If name is generic (like "CREDIT CARD"), prefer officialName
  if (isGenericName(name) && officialName && !isGenericName(officialName)) {
    return officialName
  }

  return name
}

function isGenericName(name: string): boolean {
  return GENERIC_NAMES.has(name.toLowerCase())
}
