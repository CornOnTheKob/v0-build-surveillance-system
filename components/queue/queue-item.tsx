"use client"

import { FileVideo, Trash2, RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import type { QueueFile } from "@/app/queue/page"

interface QueueItemProps {
  file: QueueFile
  onRetry: (id: string) => void
  onDelete: (id: string) => void
}

export function QueueItem({ file, onRetry, onDelete }: QueueItemProps) {
  const getStatusIcon = () => {
    switch (file.status) {
      case "uploading":
        return (
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <FileVideo className="w-5 h-5 text-primary" />
          </div>
        )
      case "processing":
        return (
          <div className="w-10 h-10 rounded-xl bg-chart-4/20 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-chart-4 animate-spin" />
          </div>
        )
      case "success":
        return (
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-accent" />
          </div>
        )
      case "error":
        return (
          <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-destructive" />
          </div>
        )
    }
  }

  const getProgressBarColor = () => {
    switch (file.status) {
      case "uploading":
        return "bg-primary"
      case "processing":
        return "bg-chart-4"
      case "success":
        return "bg-accent"
      case "error":
        return "bg-destructive"
    }
  }

  const getStatusText = () => {
    switch (file.status) {
      case "uploading":
        return `${Math.round(file.progress)}%`
      case "processing":
        return "Processing with ALIVE..."
      case "success":
        return "Processing Complete!"
      case "error":
        return file.errorMessage || "Error occurred"
    }
  }

  return (
    <div className="p-4 rounded-2xl bg-card border border-border shadow-elevated-sm hover:border-border/80 transition-all">
      <div className="flex items-start gap-4">
        {/* Status Icon */}
        {getStatusIcon()}

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-white truncate pr-4">{file.name}</h3>
            
            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {file.status === "error" ? (
                <button
                  onClick={() => onRetry(file.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Try Again
                  <RefreshCw className="w-4 h-4" />
                </button>
              ) : file.status === "success" ? (
                <div className="p-1.5 rounded-lg bg-accent/20">
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                </div>
              ) : null}
              
              <button
                onClick={() => onDelete(file.id)}
                className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor()}`}
              style={{ width: `${file.progress}%` }}
            />
          </div>

          {/* Status Text */}
          <div className="flex items-center justify-between text-sm">
            <span className={`
              ${file.status === "error" ? "text-destructive" : "text-muted-foreground"}
            `}>
              {file.status === "success" ? getStatusText() : file.status === "error" ? file.errorMessage : file.size}
            </span>
            <span className={`
              font-medium
              ${file.status === "success" ? "text-accent" : ""}
              ${file.status === "error" ? "text-destructive" : ""}
              ${file.status === "uploading" ? "text-primary" : ""}
              ${file.status === "processing" ? "text-chart-4" : ""}
            `}>
              {getStatusText()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
