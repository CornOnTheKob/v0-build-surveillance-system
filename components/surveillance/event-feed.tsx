"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowRight, Loader2, User } from "lucide-react"
import type { ActiveTrackRecord, EventRecord } from "@/lib/api"

interface EventFeedProps {
  filteredVideoId?: string
  events?: EventRecord[]
  activeTracks?: ActiveTrackRecord[]
  loading?: boolean
  selectedEventId?: string
  selectedTrackId?: string
  onEventSelect?: (event: EventRecord) => void
  onTrackSelect?: (track: ActiveTrackRecord) => void
}

export function EventFeed({
  filteredVideoId,
  events = [],
  activeTracks,
  loading = false,
  selectedEventId,
  selectedTrackId,
  onEventSelect,
  onTrackSelect,
}: EventFeedProps) {
  const router = useRouter()
  const isTrackMode = Boolean(filteredVideoId && activeTracks)

  const displayEvents = useMemo(() => {
    if (filteredVideoId) {
      return [...events].sort((left, right) => {
        const leftOffset = typeof left.offsetSeconds === "number" ? left.offsetSeconds : Number.POSITIVE_INFINITY
        const rightOffset = typeof right.offsetSeconds === "number" ? right.offsetSeconds : Number.POSITIVE_INFINITY
        return leftOffset - rightOffset
      })
    }

    return [...events].reverse()
  }, [events, filteredVideoId])

  const displayTracks = useMemo(
    () => [...(activeTracks ?? [])].sort((left, right) => (left.pedestrianId ?? Number.MAX_SAFE_INTEGER) - (right.pedestrianId ?? Number.MAX_SAFE_INTEGER)),
    [activeTracks],
  )

  const handleEventSelect = (event: EventRecord) => {
    if (onEventSelect) {
      onEventSelect(event)
      return
    }

    if (!event.videoId) {
      return
    }

    const params = new URLSearchParams({ eventId: event.id })
    if (typeof event.offsetSeconds === "number") {
      params.set("seek", String(event.offsetSeconds))
    }

    const query = params.toString()
    router.push(query ? `/video/${event.videoId}?${query}` : `/video/${event.videoId}`)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">{isTrackMode ? "Active Pedestrians" : "Event Feed"}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isTrackMode
            ? "Updates with the current playback time. Click a pedestrian to read the AI description."
            : filteredVideoId
              ? "Click an event to seek within this recording"
              : "Open detections directly in the relevant footage"}
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full p-6 text-muted-foreground">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading events...
          </div>
        ) : isTrackMode ? (
          displayTracks.length > 0 ? (
            <div className="p-2 space-y-2">
              {displayTracks.map((track) => (
                <ActiveTrackCard
                  key={track.trackId}
                  track={track}
                  active={selectedTrackId === track.trackId}
                  onSelect={() => onTrackSelect?.(track)}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              No pedestrian tracks are active at this moment in the footage.
            </div>
          )
        ) : displayEvents.length > 0 ? (
          <div className="p-2 space-y-2">
            {displayEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                active={selectedEventId === event.id}
                interactive={Boolean(onEventSelect || event.videoId)}
                onSelect={() => handleEventSelect(event)}
              />
            ))}
          </div>
        ) : (
          <div className="p-6 text-sm text-muted-foreground">
            No events available yet.
          </div>
        )}
      </div>
    </div>
  )
}

function formatTrackWindow(track: ActiveTrackRecord) {
  return `${track.visibleAt} · ${Math.round(track.firstOffsetSeconds)}s–${Math.round(track.lastOffsetSeconds)}s`
}

function roiStatusLabel(track: ActiveTrackRecord) {
  if (track.roiStatus === "inside-roi") return "Inside ROI"
  if (track.roiStatus === "outside-roi") return "Outside ROI"
  return "ROI unavailable"
}

function ActiveTrackCard({
  track,
  active,
  onSelect,
}: {
  track: ActiveTrackRecord
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full rounded-2xl border p-3 text-left transition-all",
        active ? "border-primary bg-primary/10 shadow-elevated-sm" : "border-border bg-secondary/50 hover:border-primary/30 hover:bg-secondary",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="w-14 h-10 rounded-xl bg-[#1C1C1E] flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-accent" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground truncate">
              {typeof track.pedestrianId === "number" ? `Track #${track.pedestrianId}` : track.trackId}
            </p>
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {track.appearanceSummary || "Tap to generate an AI physical description for this active pedestrian track."}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{formatTrackWindow(track)}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{roiStatusLabel(track)}</span>
            {track.occlusionLabel ? (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">{track.occlusionLabel}</span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  )
}

function formatOffset(event: EventRecord) {
  if (typeof event.offsetSeconds === "number") {
    const minutes = Math.floor(event.offsetSeconds / 60)
    const seconds = Math.floor(event.offsetSeconds % 60)
    return `Jump to ${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  if (typeof event.frame === "number") {
    return `Frame ${event.frame}`
  }

  return "Open footage"
}

function EventCard({
  event,
  active,
  interactive,
  onSelect,
}: {
  event: EventRecord
  active: boolean
  interactive: boolean
  onSelect: () => void
}) {
  const isDetection = event.type === "detection"

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!interactive}
      className={[
        "w-full rounded-2xl border p-3 text-left transition-all",
        active ? "border-primary bg-primary/10 shadow-elevated-sm" : "border-border bg-secondary/50 hover:border-primary/30 hover:bg-secondary",
        interactive ? "cursor-pointer" : "cursor-default opacity-80",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="w-14 h-10 rounded-xl bg-[#1C1C1E] flex items-center justify-center shrink-0">
          {isDetection ? <User className="w-4 h-4 text-accent" /> : <AlertCircle className="w-4 h-4 text-chart-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground truncate">{event.location}</p>
            {interactive && <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{event.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{event.timestamp}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{formatOffset(event)}</span>
            {typeof event.pedestrianId === "number" && (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 font-medium text-accent">ID #{event.pedestrianId}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
