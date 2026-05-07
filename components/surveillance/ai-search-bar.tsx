"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Search } from "lucide-react"
import { SearchPinDialog } from "@/components/surveillance/search-pin-dialog"
import { useLoading } from "@/components/ui/walking-loader"
import { isSearchAuthorizedInSession } from "@/lib/search-auth"

export function AISearchBar() {
  const [query, setQuery] = useState("")
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pendingQuery, setPendingQuery] = useState<string | null>(null)
  const router = useRouter()
  const { showLoader } = useLoading()

  const runSearch = (nextQuery: string) => {
    showLoader("ALIVE is searching for matching pedestrians...")
    router.push(`/search?q=${encodeURIComponent(nextQuery)}`)
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    if (isSearchAuthorizedInSession()) {
      runSearch(trimmedQuery)
      return
    }

    setPendingQuery(trimmedQuery)
    setPinDialogOpen(true)
  }

  return (
    <>
      <div className="p-4 border-b border-border">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask Bantay… e.g. blue hat and blue shorts"
              className="w-full pl-11 pr-11 py-3 bg-secondary border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      <SearchPinDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        onAuthorized={() => {
          if (pendingQuery) {
            runSearch(pendingQuery)
          }
        }}
      />
    </>
  )
}
