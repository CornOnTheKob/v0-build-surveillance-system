"use client"

import { useCallback, useEffect, useState } from "react"
import { KPICards } from "@/components/dashboard/kpi-cards"
import { PedestrianChart } from "@/components/dashboard/pedestrian-chart"
import { DirectionalCountsChart } from "@/components/dashboard/directional-counts-chart"
import { LOSMovementChart } from "@/components/dashboard/los-movement-chart"
import { OcclusionTrendsChart } from "../../components/dashboard/occlusion-trends-chart"
import { OcclusionMap } from "@/components/dashboard/occlusion-map"
import { AISynthesis } from "@/components/dashboard/ai-synthesis"
import { useUploadQueue } from "@/components/uploads/upload-queue-provider"
import { Button } from "@/components/ui/button"
import { FootageDatePicker } from "@/components/ui/footage-date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AlertCircle, Clock, Download, FileCode, Loader2, RefreshCw, Settings2, Upload } from "lucide-react"
import {
  downloadDashboardReport,
  getAISynthesis,
  getCurrentModel,
  getDashboardDirectionalCounts,
  getDashboardLOSTrends,
  getDashboardOcclusion,
  getDashboardOcclusionTrends,
  getDashboardSummary,
  getDashboardTraffic,
  getLocations,
  uploadModel,
  type AISynthesisResponse,
  type DirectionalCountsResponse,
  type DashboardSummary,
  type ModelInfo,
  type PTSIMapResponse,
  type PTSITrendResponse,
  type TrafficResponse,
} from "@/lib/api"

export default function DashboardPage() {
  const { settledUploadsVersion } = useUploadQueue()
  const [selectedDate, setSelectedDate] = useState("")
  const [timeRange, setTimeRange] = useState("whole-day")
  const [hourFilter, setHourFilter] = useState("all")
  const [focusTime, setFocusTime] = useState<string | undefined>(undefined)
  const [zoomLevel, setZoomLevel] = useState(0)
  const [modelDialogOpen, setModelDialogOpen] = useState(false)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [traffic, setTraffic] = useState<TrafficResponse | null>(null)
  const [directionalCounts, setDirectionalCounts] = useState<DirectionalCountsResponse | null>(null)
  const [occlusionTrends, setOcclusionTrends] = useState<PTSITrendResponse | null>(null)
  const [losTrends, setLosTrends] = useState<PTSITrendResponse | null>(null)
  const [occlusion, setOcclusion] = useState<PTSIMapResponse | null>(null)
  const [synthesis, setSynthesis] = useState<AISynthesisResponse | null>(null)
  const [footageDates, setFootageDates] = useState<string[]>([])
  const [footageDatesLoaded, setFootageDatesLoaded] = useState(false)
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [modelLoading, setModelLoading] = useState(true)
  const [modelUploading, setModelUploading] = useState(false)
  const [reportExporting, setReportExporting] = useState(false)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [modelError, setModelError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true)
    try {
      const [summaryResponse, trafficResponse, directionalCountsResponse, occlusionTrendsResponse, losTrendsResponse, occlusionResponse, synthesisResponse] = await Promise.all([
        getDashboardSummary(selectedDate || undefined),
        getDashboardTraffic(selectedDate || undefined, timeRange, focusTime, zoomLevel),
        getDashboardDirectionalCounts(selectedDate || undefined, timeRange, focusTime, zoomLevel),
        getDashboardOcclusionTrends(selectedDate || undefined, timeRange, focusTime, zoomLevel),
        getDashboardLOSTrends(selectedDate || undefined, timeRange, focusTime, zoomLevel),
        getDashboardOcclusion(selectedDate || undefined, timeRange),
        getAISynthesis(selectedDate, timeRange),
      ])

      setSummary(summaryResponse)
      setTraffic(trafficResponse)
      setDirectionalCounts(directionalCountsResponse)
      setOcclusionTrends(occlusionTrendsResponse)
      setLosTrends(losTrendsResponse)
      setOcclusion(occlusionResponse)
      setSynthesis(synthesisResponse)
      setDashboardError(null)
    } catch (error) {
      setSummary(null)
      setTraffic(null)
      setDirectionalCounts(null)
      setOcclusionTrends(null)
      setLosTrends(null)
      setOcclusion(null)
      setSynthesis(null)
      setDashboardError(error instanceof Error ? error.message : "Failed to load dashboard data.")
    } finally {
      setDashboardLoading(false)
    }
  }, [focusTime, selectedDate, timeRange, zoomLevel])

  const loadModelInfo = useCallback(async () => {
    setModelLoading(true)
    try {
      const response = await getCurrentModel()
      setModelInfo(response)
      setModelError(null)
    } catch (error) {
      setModelError(error instanceof Error ? error.message : "Failed to load model information.")
    } finally {
      setModelLoading(false)
    }
  }, [])

  const loadFootageDates = useCallback(async () => {
    try {
      const response = await getLocations()
      setFootageDates(Array.from(new Set(response.flatMap((location) => location.videos.map((video) => video.date)))).sort())
    } catch {
      // Leave existing date highlights untouched if this auxiliary request fails.
    } finally {
      setFootageDatesLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!footageDatesLoaded || (footageDates.length > 0 && !selectedDate)) {
      return
    }

    void loadDashboard()
  }, [footageDates.length, footageDatesLoaded, loadDashboard, selectedDate])

  useEffect(() => {
    void loadModelInfo()
  }, [loadModelInfo])

  useEffect(() => {
    void loadFootageDates()
  }, [loadFootageDates])

  useEffect(() => {
    const latestFootageDate = footageDates[footageDates.length - 1] ?? ""
    if (!footageDatesLoaded || !latestFootageDate) {
      return
    }

    if (!selectedDate || !footageDates.includes(selectedDate)) {
      setSelectedDate(latestFootageDate)
      setFocusTime(undefined)
      setZoomLevel(0)
    }
  }, [footageDates, footageDatesLoaded, selectedDate])

  useEffect(() => {
    if (settledUploadsVersion === 0) {
      return
    }

    void loadDashboard()
    void loadFootageDates()
  }, [loadDashboard, loadFootageDates, settledUploadsVersion])

  useEffect(() => {
    if (hourFilter !== "all" && !occlusion?.availableHours.includes(hourFilter)) {
      setHourFilter("all")
    }
  }, [hourFilter, occlusion])

  const handleModelUpload = async () => {
    if (!modelFile) {
      return
    }

    setModelUploading(true)
    try {
      const response = await uploadModel(modelFile)
      setModelInfo(response)
      setModelError(null)
      setModelDialogOpen(false)
      setModelFile(null)
    } catch (error) {
      setModelError(error instanceof Error ? error.message : "Failed to upload model.")
    } finally {
      setModelUploading(false)
    }
  }

  const handleExportReport = async () => {
    setReportExporting(true)
    setActionError(null)

    try {
      const { blob, filename } = await downloadDashboardReport(selectedDate, timeRange)
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to export report.")
    } finally {
      setReportExporting(false)
    }
  }

  const currentModelLabel = modelInfo?.currentModel ?? "No model uploaded yet"
  const currentModelTimestamp = modelInfo?.uploadedAt ? new Date(modelInfo.uploadedAt).toLocaleString("en-US") : null
  const bannerError = dashboardError ?? modelError ?? actionError

  const handleDateChange = (value: string) => {
    setSelectedDate(value)
    setFocusTime(undefined)
    setZoomLevel(0)
  }

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value)
    setFocusTime(undefined)
    setZoomLevel(0)
  }

  const handleAnalyticsZoom = (time: string) => {
    if (!(traffic?.canZoomIn ?? directionalCounts?.canZoomIn ?? occlusionTrends?.canZoomIn ?? losTrends?.canZoomIn ?? false)) {
      return
    }

    setFocusTime(time)
    setZoomLevel((current) => current + 1)
  }

  const handleResetZoom = () => {
    setFocusTime(undefined)
    setZoomLevel(0)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border bg-card/50 px-6 py-4 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-semibold text-foreground">System Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time pedestrian tracking metrics</p>
        </div>

        <div className="flex items-center gap-3">
          <FootageDatePicker
            value={selectedDate}
            onChange={handleDateChange}
            highlightedDates={footageDates}
            placeholder="Select date"
          />

          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-44 rounded-2xl border-border bg-secondary text-foreground">
              <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border bg-popover">
              <SelectItem value="whole-day" className="rounded-lg text-foreground">Whole Day</SelectItem>
              <SelectItem value="last-1h" className="rounded-lg text-foreground">Last 1 Hour</SelectItem>
              <SelectItem value="last-3h" className="rounded-lg text-foreground">Last 3 Hours</SelectItem>
              <SelectItem value="last-6h" className="rounded-lg text-foreground">Last 6 Hours</SelectItem>
              <SelectItem value="last-12h" className="rounded-lg text-foreground">Last 12 Hours</SelectItem>
              <SelectItem value="morning" className="rounded-lg text-foreground">Morning (6AM-12PM)</SelectItem>
              <SelectItem value="afternoon" className="rounded-lg text-foreground">Afternoon (12PM-6PM)</SelectItem>
              <SelectItem value="evening" className="rounded-lg text-foreground">Evening (6PM-12AM)</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-2xl border-border px-4 text-foreground hover:bg-secondary">
                <Settings2 className="mr-2 h-4 w-4" />
                Edit Model
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-3xl border-border bg-card">
              <DialogHeader>
                <DialogTitle className="text-foreground">Detection Model Settings</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Upload a PyTorch model file (.pt) for pedestrian detection
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                <div className="rounded-2xl border border-border bg-secondary p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
                      <FileCode className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Current Model</p>
                      <p className="text-xs text-muted-foreground">{modelLoading ? "Loading model..." : currentModelLabel}</p>
                      {currentModelTimestamp && (
                        <p className="mt-1 text-[11px] text-muted-foreground">Uploaded {currentModelTimestamp}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Upload New Model</label>
                  <div
                    className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                      modelFile ? "border-accent bg-accent/10" : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <input
                      type="file"
                      accept=".pt"
                      onChange={(e) => setModelFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="model-upload"
                    />
                    <label htmlFor="model-upload" className="cursor-pointer">
                      <Upload className={`mx-auto mb-2 h-8 w-8 ${modelFile ? "text-accent" : "text-muted-foreground"}`} />
                      {modelFile ? (
                        <p className="text-sm font-medium text-accent">{modelFile.name}</p>
                      ) : (
                        <>
                          <p className="text-sm text-foreground">Click to upload .pt file</p>
                          <p className="mt-1 text-xs text-muted-foreground">PyTorch model weights</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <Button
                  onClick={handleModelUpload}
                  disabled={!modelFile || modelUploading}
                  className="w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {modelUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading Model...
                    </>
                  ) : (
                    "Update Model"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            className="rounded-2xl border-border px-4 text-foreground hover:bg-secondary"
            onClick={() => {
              void loadDashboard()
              void loadModelInfo()
              void loadFootageDates()
            }}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${dashboardLoading || modelLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            className="rounded-2xl bg-accent px-4 text-accent-foreground shadow-elevated-sm hover:bg-accent/90"
            onClick={() => {
              void handleExportReport()
            }}
            disabled={reportExporting}
          >
            {reportExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {reportExporting ? "Exporting..." : "Export Report"}
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-6 overflow-auto p-6">
        {bannerError && (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{bannerError}</span>
          </div>
        )}

        <KPICards summary={summary} loading={dashboardLoading} />

        <div className="space-y-6">
          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.95fr)]">
            <div className="space-y-6">
              <PedestrianChart
                title="Estimated Unique Tracked Pedestrians (Per location)"
                description="Estimated cumulative unique tracked pedestrian count for each location over the selected timeline."
                timeRange={timeRange}
                selectedDate={selectedDate}
                data={traffic?.series ?? []}
                metricKey="cumulativeUniquePedestrians"
                metricLabel="Unique Pedestrians"
                seriesColor="#22C55E"
                locationTotals={traffic?.locationTotals ?? []}
                bucketMinutes={traffic?.bucketMinutes ?? 60}
                zoomLevel={traffic?.zoomLevel ?? 0}
                canZoomIn={traffic?.canZoomIn ?? false}
                focusTime={traffic?.focusTime}
                windowStart={traffic?.windowStart}
                windowEnd={traffic?.windowEnd}
                loading={dashboardLoading}
                onTimeSelect={handleAnalyticsZoom}
                onResetZoom={handleResetZoom}
              />
              <PedestrianChart
                title="Average Visible Pedestrians"
                description="Average number of pedestrians visible within each bucket, useful for spotting crowding changes."
                timeRange={timeRange}
                selectedDate={selectedDate}
                data={traffic?.series ?? []}
                metricKey="averageVisiblePedestrians"
                metricLabel="Average Visible"
                seriesColor="#06B6D4"
                bucketMinutes={traffic?.bucketMinutes ?? 60}
                zoomLevel={traffic?.zoomLevel ?? 0}
                canZoomIn={traffic?.canZoomIn ?? false}
                focusTime={traffic?.focusTime}
                windowStart={traffic?.windowStart}
                windowEnd={traffic?.windowEnd}
                loading={dashboardLoading}
                onTimeSelect={handleAnalyticsZoom}
                onResetZoom={handleResetZoom}
              />
            </div>
            <div className="xl:self-start">
              <OcclusionMap hourFilter={hourFilter} onHourFilterChange={setHourFilter} data={occlusion} loading={dashboardLoading} />
            </div>
          </div>

          <OcclusionTrendsChart
            timeRange={timeRange}
            selectedDate={selectedDate}
            data={occlusionTrends?.series ?? []}
            bucketMinutes={occlusionTrends?.bucketMinutes ?? 60}
            zoomLevel={occlusionTrends?.zoomLevel ?? 0}
            canZoomIn={occlusionTrends?.canZoomIn ?? false}
            focusTime={occlusionTrends?.focusTime}
            windowStart={occlusionTrends?.windowStart}
            windowEnd={occlusionTrends?.windowEnd}
            loading={dashboardLoading}
            onTimeSelect={handleAnalyticsZoom}
            onResetZoom={handleResetZoom}
          />

          <DirectionalCountsChart
            timeRange={timeRange}
            selectedDate={selectedDate}
            data={directionalCounts}
            loading={dashboardLoading}
            onTimeSelect={handleAnalyticsZoom}
            onResetZoom={handleResetZoom}
          />

          <LOSMovementChart
            timeRange={timeRange}
            selectedDate={selectedDate}
            data={losTrends?.series ?? []}
            bucketMinutes={losTrends?.bucketMinutes ?? 60}
            zoomLevel={losTrends?.zoomLevel ?? 0}
            canZoomIn={losTrends?.canZoomIn ?? false}
            focusTime={losTrends?.focusTime}
            windowStart={losTrends?.windowStart}
            windowEnd={losTrends?.windowEnd}
            loading={dashboardLoading}
            onTimeSelect={handleAnalyticsZoom}
            onResetZoom={handleResetZoom}
          />
        </div>

        <AISynthesis selectedDate={selectedDate} timeRange={timeRange} data={synthesis} loading={dashboardLoading} />
      </div>
    </div>
  )
}
