"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Search } from "lucide-react"
import { useLoading } from "@/components/ui/walking-loader"

export function AISearchBar() {
  const [query, setQuery] = useState("")
  const router = useRouter()
  const { showLoader, hideLoader } = useLoading()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      showLoader("AI searching through footage...")
      
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      hideLoader()
      router.push(`/search?q=${encodeURIComponent(query)}`)
    }
  }

  return (
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
            placeholder="Ask ALIVE..."
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
  )
}
