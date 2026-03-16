export const AI_MODEL_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  ai_claude_cli: [
    { value: "sonnet", label: "Claude Sonnet 4.6 (recommended)" },
    { value: "opus", label: "Claude Opus 4.6" },
    { value: "haiku", label: "Claude Haiku 4.5 (fastest)" },
  ],
  ai_claude_api: [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
    { value: "claude-haiku-4-20251001", label: "Claude Haiku 4" },
  ],
  ai_openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  ai_gemini: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
}

export const AI_DEFAULT_MODELS: Record<string, string> = {
  ai_claude_cli: "sonnet",
  ai_claude_api: "claude-sonnet-4-20250514",
  ai_openai: "gpt-4o-mini",
  ai_gemini: "gemini-2.0-flash",
}
