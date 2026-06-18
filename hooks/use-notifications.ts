"use client"

import { useQuery } from "@tanstack/react-query"

export function useNotificationCount() {
  const { data } = useQuery({
    queryKey: ["notification-count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/count")
      return res.json() as Promise<{ count: number }>
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  })

  return { count: data?.count ?? 0 }
}
