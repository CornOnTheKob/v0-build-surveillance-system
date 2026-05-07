"use client"

import { useEffect, useState } from "react"
import { Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { authorizeAISearch } from "@/lib/api"
import { setSearchAuthorizedInSession } from "@/lib/search-auth"

interface SearchPinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAuthorized: () => void
}

export function SearchPinDialog({ open, onOpenChange, onAuthorized }: SearchPinDialogProps) {
  const [pin, setPin] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setPin("")
      setSubmitting(false)
      setError(null)
    }
  }, [open])

  const handleAuthorize = async () => {
    if (pin.trim().length !== 4) {
      setError("Enter the 4-digit security PIN to continue.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await authorizeAISearch(pin.trim())
      if (!response.authorized) {
        setError("That PIN is incorrect. Please try again.")
        return
      }

      setSearchAuthorizedInSession(true)
      onOpenChange(false)
      onAuthorized()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to verify the search PIN.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Secure AI Search
          </DialogTitle>
          <DialogDescription>
            Enter the 4-digit security PIN before running an AI pedestrian search.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="0000"
            maxLength={4}
            className="text-center text-lg tracking-[0.4em]"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void handleAuthorize()
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Demo default PIN: <span className="font-medium text-foreground">0000</span>
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleAuthorize()} disabled={submitting || pin.trim().length !== 4}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Unlock Search
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
