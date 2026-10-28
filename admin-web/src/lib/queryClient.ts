import axios from 'axios'
import { QueryClient } from '@tanstack/react-query'

const status = (e: unknown) => (axios.isAxiosError(e) ? e.response?.status : undefined)

// Never retry client errors (400/401/403/404/409/423): they will not succeed on a second try.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: (count, e) => { const s = status(e); return count < 1 && (s === undefined || s >= 500) } },
    mutations: { retry: false },
  },
})
 