// frontend/components/providers/QueryProvider.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState so the client is created once per component mount, not per render
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,     // 1 minute — don't refetch if data is fresh
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}