/**
 * Points balances hook for the travel module.
 */

import { useQuery } from "@tanstack/react-query"
import { travelFetch, travelKeys } from "./shared"
import type { PointsBalance } from "@/types/travel"

export function useTravelBalances() {
  return useQuery({
    queryKey: travelKeys.balances(),
    queryFn: () => travelFetch<{ balances: PointsBalance[] }>("/balances"),
  })
}
