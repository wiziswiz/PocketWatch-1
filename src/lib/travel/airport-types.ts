export interface Airport {
  readonly iata: string
  readonly name: string
  readonly city: string
  readonly country: string
  readonly keywords?: readonly string[]
}
