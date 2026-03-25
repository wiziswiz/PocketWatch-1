/**
 * Claude API tool schemas for PocketLLM.
 * Describes the 8 read-only financial query tools.
 */

export const TOOL_DEFINITIONS = [
  {
    name: "get_account_balances",
    description: "List all financial accounts with their current balances, types, and institution names.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_spending_summary",
    description: "Get spending grouped by category for a date range. Returns total spent per category.",
    input_schema: {
      type: "object" as const,
      properties: {
        startDate: { type: "string", description: "Start date (YYYY-MM-DD). Defaults to start of current month." },
        endDate: { type: "string", description: "End date (YYYY-MM-DD). Defaults to today." },
      },
      required: [] as string[],
    },
  },
  {
    name: "get_transactions",
    description: "Search and filter transactions. Use to find specific charges, merchants, or spending patterns.",
    input_schema: {
      type: "object" as const,
      properties: {
        search: { type: "string", description: "Search by merchant name or transaction description." },
        category: { type: "string", description: "Filter by category name." },
        startDate: { type: "string", description: "Start date (YYYY-MM-DD)." },
        endDate: { type: "string", description: "End date (YYYY-MM-DD)." },
        limit: { type: "number", description: "Max results (default 20, max 50)." },
      },
      required: [] as string[],
    },
  },
  {
    name: "get_budget_status",
    description: "Get all active budgets with current month spending, remaining amount, and percent used.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_subscriptions",
    description: "List active subscriptions with amounts, frequency, and next charge dates.",
    input_schema: {
      type: "object" as const,
      properties: {
        includeInactive: { type: "boolean", description: "Include cancelled subscriptions (default false)." },
      },
      required: [] as string[],
    },
  },
  {
    name: "get_net_worth",
    description: "Get the latest net worth snapshot with total assets, total debt, and net worth.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_investments",
    description: "Get investment holdings with security names, quantities, current values, and cost basis.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_credit_cards",
    description: "List credit card profiles with rewards type, points/cashback balance, annual fee, and bonus categories.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_flight_search_summary",
    description: "Get a summary of the user's most recent flight search — route, dates, total flights found, cabin/airline breakdowns, price ranges, recommendations, and points balances. Call this first when the user asks about flights.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_flight_results",
    description: "Search and filter the user's most recent flight search results. Returns matching flights with pricing, value scores, and booking links.",
    input_schema: {
      type: "object" as const,
      properties: {
        cabin: { type: "string", description: "Filter by cabin class: economy, premium_economy, business, or first." },
        airline: { type: "string", description: "Filter by airline name (case-insensitive partial match)." },
        type: { type: "string", description: "Filter by type: award or cash." },
        stops: { type: "number", description: "Maximum number of stops (0 for nonstop, 1, 2)." },
        max_points: { type: "number", description: "Maximum points cost." },
        min_value_score: { type: "number", description: "Minimum value score (0-100)." },
        sort_by: { type: "string", description: "Sort by: value_score (default), points, cash_price, duration, or cpp." },
        limit: { type: "number", description: "Max results to return (default 10, max 30)." },
      },
      required: [] as string[],
    },
  },
]
