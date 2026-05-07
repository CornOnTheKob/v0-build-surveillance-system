"use client"

import { useEffect, useMemo, useState } from "react"
import { Calendar, Clock, Pencil } from "lucide-react"
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
import type { VideoUpdatePayload } from "@/lib/api"

interface EditVideoMetadataModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialDate: string
  initialStartTime: string
  durationSeconds: number | null
  isSubmitting?: boolean
  onSubmit: (payload: VideoUpdatePayload) => Promise<void> | void
}

function formatHumanDuration(totalSeconds: number) {
  if (totalSeconds < 60) return `${totalSeconds} sec`
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours ? `${hours} hr${hours === 1 ? "" : "s"}` : null, minutes ? `${minutes} min` : null, seconds ? `${seconds} sec` : null]
    .filter(Boolean)
    .join(" ")
}

function computeSchedule(startTime: string, durationSeconds: number) {
  const [hoursPart, minutesPart, secondsPart = "0"] = startTime.split(":")
  const hours = Number(hoursPart)
  const minutes = Number(minutesPart)
  const seconds = Number(secondsPart)
  if (!startTime || !Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds) || durationSeconds <= 0) {
    return null
  }

  const includeSeconds = startTime.split(":").length === 3 || (durationSeconds % 60) !== 0
  const totalSeconds = (hours * 3600) + (minutes * 60) + seconds + durationSeconds
  const dayOffset = Math.floor(totalSeconds / (24 * 3600))
  const wrappedSeconds = ((totalSeconds % (24 * 3600)) + (24 * 3600)) % (24 * 3600)
  const endHours = Math.floor(wrappedSeconds / 3600)
  const endMinutes = Math.floor((wrappedSeconds % 3600) / 60)
  const endSeconds = wrappedSeconds % 60

  return {
    endTime: includeSeconds
      ? `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}:${endSeconds.toString().padStart(2, "0")}`
      : `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`,
    durationLabel: formatHumanDuration(durationSeconds),
    dayOffset,
  }
}

export function EditVideoMetadataModal({
  open,
  onOpenChange,
  initialDate,
  initialStartTime,
  durationSeconds,
  isSubmitting = false,
  onSubmit,
}: EditVideoMetadataModalProps) {
  const [date, setDate] = useState(initialDate)
  const [startTime, setStartTime] = useState(initialStartTime)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDate(initialDate)
    setStartTime(initialStartTime)
    setSubmitError(null)
  }, [initialDate, initialStartTime, open])

  const computedSchedule = useMemo(
    () => (durationSeconds === null ? null : computeSchedule(startTime, durationSeconds)),
    [durationSeconds, startTime],
  )

  const submitDisabledReason = useMemo(() => {
    if (isSubmitting) return "Saving the corrected schedule..."
    if (!date) return "Choose the corrected start date."
    if (!startTime) return "Choose the corrected start time."
    if (durationSeconds === null) return "This video does not have a usable stored duration yet."
    if (!computedSchedule) return "Enter a valid start time to preview the updated end time."
    return null
  }, [computedSchedule, date, durationSeconds, isSubmitting, startTime])

  const handleClose = () => {
    if (isSubmitting) return
    setSubmitError(null)
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (submitDisabledReason) return
    try {
      setSubmitError(null)
      await onSubmit({ date, startTime })
      onOpenChange(false)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to update video metadata.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? handleClose() : onOpenChange(nextOpen))}>
      <DialogContent showCloseButton={!isSubmitting} className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Pencil className="h-5 w-5" />
            Edit video schedule
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update only the recording date and start time. The footage, detections, and tracks stay untouched.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Start Date</label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="bg-secondary border-border pl-9 text-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Start Time</label>
            <div className="relative">
              <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="time" step="1" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="bg-secondary border-border pl-9 text-foreground" />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary/40 p-4">
            <p className="text-sm font-medium text-foreground">Scheduled coverage</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {computedSchedule
                ? `The video duration stays fixed at ${computedSchedule.durationLabel}. New end time: ${computedSchedule.endTime}${computedSchedule.dayOffset > 0 ? ` (+${computedSchedule.dayOffset} day)` : ""}.`
                : "Enter a valid time to preview the recalculated end time."}
            </p>
          </div>

          {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
          {!submitError && submitDisabledReason ? <p className="text-xs text-muted-foreground">{submitDisabledReason}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting} className="border-border text-foreground">
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={Boolean(submitDisabledReason)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}