"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Loader2, RotateCcw, ZoomIn } from "lucide-react"
import type { TrafficPoint } from "@/lib/api"

interface LOSMovementChartProps {
  timeRange: string
  selectedDate: string
  data: TrafficPoint[]
  bucketMinutes: number
  zoomLevel: number
  canZoomIn: boolean
  focusTime?: string | null
  windowStart?: string | null
  windowEnd?: string | null
  loading?: boolean
  onTimeSelect?: (time: string) => void
  onResetZoom?: () => void
}

const DENSITY_LEVELS = [
  { score: 0, label: "Light", color: "#22C55E" },
  { score: 1, label: "Moderate", color: "#84CC16" },
  { score: 2, label: "Busy", color: "#F59E0B" },
  { score: 3, label: "Crowded", color: "#F97316" },
  { score: 4, label: "Very Crowded", color: "#EF4444" },
] as const

function formatTimeRangeLabel(timeRange: string) {
  return timeRange
    .replace("whole-day", "Whole Day")
    .replace("last-1h", "Last 1 Hour")
    .replace("last-3h", "Last 3 Hours")
    .replace("last-6h", "Last 6 Hours")
    .replace("last-12h", "Last 12 Hours")
    .replace("morning", "Morning")
    .replace("afternoon", "Afternoon")
    .replace("evening", "Evening")
}

function formatDateLabel(selectedDate: string) {
  return selectedDate
    ? new Date(selectedDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "All dates"
}

function densityFromLOS(point: TrafficPoint) {
  const losRank = typeof point.losRank === "number" ? point.losRank : point.losRank == null ? null : Number(point.losRank)
  if (losRank == null || Number.isNaN(losRank)) {
    return { score: null, label: "No data", color: "#52525B" }
  }
  if (losRank <= 1) return DENSITY_LEVELS[0]
  if (losRank === 2) return DENSITY_LEVELS[1]
  if (losRank === 3) return DENSITY_LEVELS[2]
  if (losRank === 4) return DENSITY_LEVELS[3]
  return DENSITY_LEVELS[4]
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function DensityTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: Record<string, string | number | null> }>
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) {
    return null
  }

  return (
    <div className="rounded-2xl border border-border bg-popover p-3 shadow-elevated">
      <p className="mb-2 text-sm font-medium text-foreground">{String(point.time ?? "--")}</p>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: String(point.densityColor ?? "#71717A") }} />
          <span className="text-muted-foreground">Crowd level:</span>
          <span className="font-medium text-foreground">{String(point.densityLabel ?? "No data")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">LOS:</span>
          <span className="font-medium text-foreground">{point.los ? `LOS ${String(point.los)}` : "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">PTSI:</span>
          <span className="font-medium text-foreground">{point.score != null ? `${Number(point.score).toFixed(1)}%` : "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Most affected place:</span>
          <span className="font-medium text-foreground">{point.worstLocation ? String(point.worstLocation) : "—"}</span>
        </div>
      </div>
    </div>
  )
}

export function LOSMovementChart({
  timeRange,
  selectedDate,
  data,
  bucketMinutes,
  zoomLevel,
  canZoomIn,
  focusTime,
  windowStart,
  windowEnd,
  loading = false,
  onTimeSelect,
  onResetZoom,
}: LOSMovementChartProps) {
  const chartData = useMemo(
    () => data.map((point) => ({
      ...point,
      score: point.score == null ? null : Number(point.score),
      densityScore: densityFromLOS(point).score,
      densityLabel: densityFromLOS(point).label,
      densityColor: densityFromLOS(point).color,
    })),
    [data],
  )
  const timeLabelsById = new Map(chartData.map((point) => [point.id, point.time]))
  const subtitle = zoomLevel > 0
    ? `Zoom level ${zoomLevel} · ${windowStart ?? focusTime ?? "--"}–${windowEnd ?? "--"}`
    : `${formatDateLabel(selectedDate)} - ${formatTimeRangeLabel(timeRange)}`

  const peakBucket = useMemo(
    () => chartData.reduce<typeof chartData[number] | null>((currentPeak, point) => {
      const pointScore = typeof point.densityScore === "number" ? point.densityScore : -1
      const currentScore = typeof currentPeak?.densityScore === "number" ? currentPeak.densityScore : -1
      if (pointScore > currentScore) return point
      if (pointScore === currentScore && Number(point.score ?? 0) > Number(currentPeak?.score ?? 0)) return point
      return currentPeak
    }, null),
    [chartData],
  )

  const commonLevel = useMemo(() => {
    const counts = new Map<string, number>()
    chartData.forEach((point) => {
      const key = String(point.densityLabel ?? "No data")
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No data"
  }, [chartData])

  const handleChartClick = (state: unknown) => {
    if (!canZoomIn || typeof onTimeSelect !== "function") {
      return
    }

    const activePayload = typeof state === "object" && state !== null && "activePayload" in state
      ? (state as { activePayload?: Array<{ payload?: TrafficPoint }> }).activePayload
      : undefined
    const candidate = activePayload?.find((entry) => typeof entry?.payload?.time === "string")?.payload?.time
    if (typeof candidate === "string" && candidate) {
      onTimeSelect(candidate)
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">Pedestrian Density Over Time</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          <p className="text-xs text-muted-foreground">Higher bars mean the area felt more crowded during that time bucket. LOS is kept as supporting context behind the density level.</p>
        </div>
        {zoomLevel > 0 && onResetZoom && (
          <Button variant="outline" size="sm" className="rounded-2xl" onClick={onResetZoom}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Zoom
          </Button>
        )}
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <SummaryChip label="Busiest time" value={peakBucket?.time ? String(peakBucket.time) : "No data"} />
        <SummaryChip label="Peak crowd level" value={peakBucket?.densityLabel ? String(peakBucket.densityLabel) : "No data"} />
        <SummaryChip label="Most affected place" value={peakBucket?.worstLocation ? String(peakBucket.worstLocation) : "—"} />
      </div>

      <div className="h-[320px]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading pedestrian density...
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 16, left: 4, bottom: 0 }} onClick={handleChartClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
              <XAxis
                dataKey="id"
                tickFormatter={(value) => timeLabelsById.get(String(value)) ?? String(value)}
                stroke="#71717A"
                tick={{ fill: "#71717A", fontSize: 12 }}
                axisLine={{ stroke: "#27272A" }}
              />
              <YAxis
                type="number"
                domain={[0, 4]}
                ticks={[0, 1, 2, 3, 4]}
                allowDecimals={false}
                tickFormatter={(value) => DENSITY_LEVELS.find((entry) => entry.score === Number(value))?.label ?? ""}
                stroke="#71717A"
                tick={{ fill: "#71717A", fontSize: 12 }}
                axisLine={{ stroke: "#27272A" }}
                width={94}
                label={{ value: "Crowd level", angle: -90, position: "insideLeft", fill: "#71717A", fontSize: 12 }}
              />
              <Tooltip content={<DensityTooltip />} />
              <Bar dataKey="densityScore" radius={[10, 10, 0, 0]} maxBarSize={30}>
                {chartData.map((point) => (
                  <Cell key={String(point.id)} fill={String(point.densityColor ?? "#52525B")} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border text-muted-foreground">
            No density trend data is available for this time range yet.
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">How to read:</span>
        {DENSITY_LEVELS.map((level) => (
          <div key={level.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: level.color }} />
            {level.label}
          </div>
        ))}
        <span>• Most common level today: {commonLevel}</span>
      </div>

      {canZoomIn && chartData.length > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border/70 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          <ZoomIn className="h-4 w-4" />
          Click a bar to zoom into a finer time interval for this same range.
        </div>
      )}
    </div>
  )
}