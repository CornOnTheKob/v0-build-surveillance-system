"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { ChevronLeft, HelpCircle, Settings, Filter, Upload, FileVideo, Trash2, RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { QueueUploadZone } from "@/components/queue/upload-zone"
import { QueueItem } from "@/components/queue/queue-item"

export interface QueueFile {
  id: string
  name: string
  size: string
  progress: number
  status: "uploading" | "processing" | "success" | "error"
  errorMessage?: string
}

// Mock initial queue data
const initialQueue: QueueFile[] = [
  {
    id: "1",
    name: "NorthGate_March13_Morning.mp4",
    size: "1.2 GB",
    progress: 70,
    status: "uploading",
  },
  {
    id: "2", 
    name: "MainHall_March12_Afternoon.mp4",
    size: "856 MB",
    progress: 100,
    status: "success",
  },
  {
    id: "3",
    name: "ParkingLot_March11_Evening.avi",
    size: "2.1 GB",
    progress: 45,
    status: "error",
    errorMessage: "Upload failed! Please try again.",
  },
  {
    id: "4",
    name: "SouthEntrance_March10_Night.mp4",
    size: "1.8 GB",
    progress: 35,
    status: "processing",
  },
]

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueFile[]>(initialQueue)

  const handleAddFiles = (files: File[]) => {
    const newFiles: QueueFile[] = files.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      name: file.name,
      size: formatFileSize(file.size),
      progress: 0,
      status: "uploading" as const,
    }))
    setQueue(prev => [...newFiles, ...prev])
    
    // Simulate upload progress
    newFiles.forEach(file => {
      simulateUpload(file.id)
    })
  }

  const simulateUpload = (fileId: string) => {
    const interval = setInterval(() => {
      setQueue(prev => prev.map(file => {
        if (file.id === fileId && file.status === "uploading") {
          const newProgress = Math.min(file.progress + Math.random() * 15, 100)
          if (newProgress >= 100) {
            clearInterval(interval)
            return { ...file, progress: 100, status: "processing" as const }
          }
          return { ...file, progress: newProgress }
        }
        return file
      }))
    }, 500)

    // After upload completes, simulate processing
    setTimeout(() => {
      setQueue(prev => prev.map(file => {
        if (file.id === fileId && file.status === "processing") {
          return { ...file, status: "success" as const }
        }
        return file
      }))
    }, 8000)
  }

  const handleRetry = (fileId: string) => {
    setQueue(prev => prev.map(file => {
      if (file.id === fileId) {
        return { ...file, progress: 0, status: "uploading" as const, errorMessage: undefined }
      }
      return file
    }))
    simulateUpload(fileId)
  }

  const handleDelete = (fileId: string) => {
    setQueue(prev => prev.filter(file => file.id !== fileId))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Surveillance
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Video Processing Queue</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your video uploads and track processing status
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2.5 rounded-2xl bg-secondary border border-border hover:bg-secondary/80 transition-colors">
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="p-2.5 rounded-2xl bg-secondary border border-border hover:bg-secondary/80 transition-colors">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="p-2.5 rounded-2xl bg-secondary border border-border hover:bg-secondary/80 transition-colors">
              <Filter className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 max-w-4xl mx-auto">
        {/* Upload Zone */}
        <QueueUploadZone onFilesAdded={handleAddFiles} />

        {/* Queue List */}
        <div className="mt-6 space-y-3">
          {queue.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileVideo className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No videos in queue</p>
              <p className="text-sm">Upload videos to start processing</p>
            </div>
          ) : (
            queue.map(file => (
              <QueueItem
                key={file.id}
                file={file}
                onRetry={handleRetry}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}
