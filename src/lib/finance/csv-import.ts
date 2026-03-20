/**
 * Bank CSV import — parses transaction CSVs from major banks.
 * Supports Chase, Wells Fargo, Apple Card, and Synchrony formats.
 */

export interface ParsedTransaction {
  date: string
  amount: number
  description: string
  category?: string
  merchantName?: string
}

type CSVFormat = "chase" | "wells_fargo" | "apple_card" | "synchrony" | "unknown"

// ─── CSV Line Parser (RFC 4180) ─────────────────────────────

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      fields.push(current.trim())
      current = ""
    } else {
      current += ch
    }
  }
  fields.push(current.trim())
  return fields
}

function splitLines(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      current += ch
    } else if (ch === "\n" && !inQuotes) {
      if (current.trim().length > 0) lines.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  if (current.trim().length > 0) lines.push(current)
  return lines
}

// ─── Format Detection ───────────────────────────────────────

function detectFormat(headerLine: string): CSVFormat {
  const lower = headerLine.toLowerCase()

  // Chase: "Transaction Date,Post Date,Description,Category,Type,Amount,Memo"
  if (lower.includes("transaction date") && lower.includes("post date") && lower.includes("description") && lower.includes("category") && lower.includes("amount")) {
    return "chase"
  }

  // Apple Card: "Transaction Date,Clearing Date,Description,Merchant,Category Name,Type,Amount (USD)"
  if (lower.includes("transaction date") && lower.includes("clearing date") && lower.includes("amount (usd)")) {
    return "apple_card"
  }

  // Synchrony: "Date,Description,Amount"
  if (lower.includes("date") && lower.includes("description") && lower.includes("amount")) {
    const fields = parseCSVLine(headerLine)
    if (fields.length <= 4) return "synchrony"
  }

  return "unknown"
}

function isWellsFargo(firstDataLine: string): boolean {
  // Wells Fargo: 5 columns, no header, first field is date-like
  const fields = parseCSVLine(firstDataLine)
  if (fields.length !== 5) return false
  return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fields[0].trim())
}

// ─── Amount Parsing ─────────────────────────────────────────

function parseAmount(str: string): number | null {
  const cleaned = str.replace(/[$,\s"]/g, "").trim()
  if (cleaned === "" || cleaned === "--") return null
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function formatDate(dateStr: string): string | null {
  const trimmed = dateStr.trim()

  // MM/DD/YYYY
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) {
    const [, m, d, y] = slash
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  return null
}

// ─── Parsers ────────────────────────────────────────────────

function parseChase(lines: string[]): ParsedTransaction[] {
  const headers = parseCSVLine(lines[0])
  const dateIdx = headers.findIndex((h) => h.toLowerCase().includes("transaction date"))
  const descIdx = headers.findIndex((h) => h.toLowerCase() === "description")
  const catIdx = headers.findIndex((h) => h.toLowerCase() === "category")
  const amtIdx = headers.findIndex((h) => h.toLowerCase() === "amount")

  const results: ParsedTransaction[] = []
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])
    if (fields.every((f) => f === "")) continue

    const date = formatDate(fields[dateIdx] ?? "")
    const amount = parseAmount(fields[amtIdx] ?? "")
    if (!date || amount == null) continue

    results.push({
      date,
      amount: -amount, // Chase: negative = expense, negate to positive = expense
      description: fields[descIdx] ?? "",
      category: catIdx >= 0 ? fields[catIdx] || undefined : undefined,
    })
  }
  return results
}

function parseWellsFargo(lines: string[]): ParsedTransaction[] {
  const results: ParsedTransaction[] = []
  for (const line of lines) {
    const fields = parseCSVLine(line)
    if (fields.length < 5 || fields.every((f) => f === "")) continue

    const date = formatDate(fields[0])
    const amount = parseAmount(fields[1])
    if (!date || amount == null) continue

    results.push({
      date,
      amount: -amount, // Wells Fargo: negative = expense
      description: fields[4] ?? "",
    })
  }
  return results
}

function parseAppleCard(lines: string[]): ParsedTransaction[] {
  const headers = parseCSVLine(lines[0])
  const dateIdx = headers.findIndex((h) => h.toLowerCase().includes("transaction date"))
  const descIdx = headers.findIndex((h) => h.toLowerCase() === "description")
  const merchantIdx = headers.findIndex((h) => h.toLowerCase() === "merchant")
  const catIdx = headers.findIndex((h) => h.toLowerCase().includes("category"))
  const amtIdx = headers.findIndex((h) => h.toLowerCase().includes("amount"))

  const results: ParsedTransaction[] = []
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])
    if (fields.every((f) => f === "")) continue

    const date = formatDate(fields[dateIdx] ?? "")
    const amount = parseAmount(fields[amtIdx] ?? "")
    if (!date || amount == null) continue

    results.push({
      date,
      amount, // Apple Card: positive = charge (expense)
      description: fields[descIdx] ?? "",
      category: catIdx >= 0 ? fields[catIdx] || undefined : undefined,
      merchantName: merchantIdx >= 0 ? fields[merchantIdx] || undefined : undefined,
    })
  }
  return results
}

function parseSynchrony(lines: string[]): ParsedTransaction[] {
  const headers = parseCSVLine(lines[0])
  const dateIdx = headers.findIndex((h) => h.toLowerCase().includes("date"))
  const descIdx = headers.findIndex((h) => h.toLowerCase().includes("description"))
  const amtIdx = headers.findIndex((h) => h.toLowerCase().includes("amount"))

  const results: ParsedTransaction[] = []
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])
    if (fields.every((f) => f === "")) continue

    const date = formatDate(fields[dateIdx] ?? "")
    const amount = parseAmount(fields[amtIdx] ?? "")
    if (!date || amount == null) continue

    results.push({
      date,
      amount, // Synchrony: positive = charge
      description: fields[descIdx] ?? "",
    })
  }
  return results
}

// ─── Main Exports ───────────────────────────────────────────

export function parseBankCSV(csvContent: string, format?: string): ParsedTransaction[] {
  const lines = splitLines(csvContent)
  if (lines.length < 1) return []

  const detected: CSVFormat = (format as CSVFormat) ?? detectFormat(lines[0])

  if (detected === "unknown" && isWellsFargo(lines[0])) {
    return parseWellsFargo(lines)
  }

  switch (detected) {
    case "chase": return parseChase(lines)
    case "wells_fargo": return parseWellsFargo(lines)
    case "apple_card": return parseAppleCard(lines)
    case "synchrony": return parseSynchrony(lines)
    default: return []
  }
}

/**
 * Remove parsed transactions that likely already exist in the database.
 * Match by: same date + same amount + similar description (first 20 chars).
 */
export function deduplicateTransactions(
  parsed: ParsedTransaction[],
  existingTxns: { date: Date; amount: number; name: string }[]
): ParsedTransaction[] {
  return parsed.filter((p) => {
    const pPrefix = p.description.slice(0, 20).toLowerCase()

    return !existingTxns.some((ex) => {
      const exDate = ex.date.toISOString().slice(0, 10)
      if (p.date !== exDate) return false
      if (Math.abs(p.amount - ex.amount) > 0.01) return false

      const exPrefix = ex.name.slice(0, 20).toLowerCase()
      return pPrefix === exPrefix
    })
  })
}
