import { cache } from "react"
import { auth } from "@/lib/auth"

// Deduplicates auth() calls within a single request.
// Layout + page both call this — only one JWT verification actually runs.
export const getSession = cache(auth)
