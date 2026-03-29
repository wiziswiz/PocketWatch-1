/**
 * Extracts bank name, card mask, account type, and statement date from filenames.
 * e.g. "KAST-2940-Card-Statement-03-03-2026.pdf" → { bank: "Kast", mask: "2940", type: "credit" }
 */

export interface FilenameMetadata {
  bank: string | null
  mask: string | null
  type: "credit" | "checking" | "savings" | null
  statementDate: string | null
}

const NOISE_WORDS = new Set([
  "card", "credit", "debit", "checking", "savings", "statement",
  "bank", "account", "activity", "summary", "transactions", "export",
  "download", "report", "monthly", "annual", "quarterly",
])

const BANK_ALIASES: Record<string, string> = {
  bofa: "Bank of America",
  boa: "Bank of America",
  bankofamerica: "Bank of America",
  amex: "American Express",
  americanexpress: "American Express",
  wellsfargo: "Wells Fargo",
  wf: "Wells Fargo",
  capitalone: "Capital One",
  cap1: "Capital One",
  citi: "Citibank",
  citibank: "Citibank",
  usbank: "US Bank",
  pnc: "PNC",
  td: "TD Bank",
  hsbc: "HSBC",
  schwab: "Charles Schwab",
  fidelity: "Fidelity",
  discover: "Discover",
  chase: "Chase",
}

const CREDIT_KEYWORDS = new Set(["card", "credit", "visa", "mastercard", "mc"])
const CHECKING_KEYWORDS = new Set(["checking", "check", "dda"])
const SAVINGS_KEYWORDS = new Set(["savings", "save", "sav", "money market", "mma"])

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

export function parseStatementFilename(filename: string): FilenameMetadata {
  // Strip extension
  const base = filename.replace(/\.[^.]+$/, "")
  // Split on separators
  const tokens = base.split(/[-_\s.]+/).filter(Boolean)
  const lower = tokens.map((t) => t.toLowerCase())

  // Extract mask: first standalone 4-digit group
  let mask: string | null = null
  for (const token of tokens) {
    if (/^\d{4}$/.test(token)) {
      mask = token
      break
    }
  }

  // Extract type from keywords
  let type: "credit" | "checking" | "savings" | null = null
  for (const t of lower) {
    if (CREDIT_KEYWORDS.has(t)) { type = "credit"; break }
    if (CHECKING_KEYWORDS.has(t)) { type = "checking"; break }
    if (SAVINGS_KEYWORDS.has(t)) { type = "savings"; break }
  }

  // Extract date: MM-DD-YYYY or YYYY-MM-DD patterns across adjacent tokens
  let statementDate: string | null = null
  const dateMatch = base.match(/(\d{1,2})[-.\/](\d{1,2})[-.\/](\d{4})/)
  if (dateMatch) {
    const [, a, b, year] = dateMatch
    const month = parseInt(a) <= 12 ? a.padStart(2, "0") : b.padStart(2, "0")
    const day = parseInt(a) <= 12 ? b.padStart(2, "0") : a.padStart(2, "0")
    statementDate = `${year}-${month}-${day}`
  } else {
    const isoMatch = base.match(/(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})/)
    if (isoMatch) {
      const [, year, month, day] = isoMatch
      statementDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }
  }

  // Extract bank name: tokens that aren't noise, digits, or date fragments
  const bankTokens: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    const t = lower[i]
    if (NOISE_WORDS.has(t)) continue
    if (/^\d+$/.test(tokens[i])) continue
    // Check alias first (joined with next token too)
    const joined = i < tokens.length - 1 ? `${t}${lower[i + 1]}` : ""
    if (BANK_ALIASES[t] || BANK_ALIASES[joined]) break // will be resolved below
    bankTokens.push(titleCase(tokens[i]))
    // Only take first contiguous bank name tokens (stop at noise/digits)
    if (i + 1 < tokens.length && (NOISE_WORDS.has(lower[i + 1]) || /^\d+$/.test(tokens[i + 1]))) break
  }

  // Resolve bank via aliases — exact token match only (no substring to avoid false positives)
  let bank: string | null = null
  for (const [alias, name] of Object.entries(BANK_ALIASES)) {
    if (lower.includes(alias)) {
      bank = name
      break
    }
    // For multi-word aliases (e.g., "capitalone"), check adjacent token pairs
    if (alias.length >= 4) {
      for (let i = 0; i < lower.length - 1; i++) {
        if (lower[i] + lower[i + 1] === alias) { bank = name; break }
      }
      if (bank) break
    }
  }
  if (!bank && bankTokens.length > 0) {
    bank = bankTokens.join(" ")
  }

  return { bank, mask, type, statementDate }
}
