"use client"

import { useState, useRef } from "react"
import { Upload, FileVideo } from "lucide-react"

interface QueueUploadZoneProps {
  onFilesAdded: (files: File[]) => void
}

export function QueueUploadZone({ onFilesAdded }: QueueUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.includes("video") || file.name.endsWith(".mp4") || file.name.endsWith(".avi")
    )
    if (files.length > 0) {
      onFilesAdded(files)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    if (files.length > 0) {
      onFilesAdded(files)
    }
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  return (
    <div
      className={`
        relative rounded-3xl border-2 border-dashed p-12 text-center transition-all cursor-pointer
        ${dragActive 
          ? "border-primary bg-primary/10" 
          : "border-border bg-card hover:border-primary/50 hover:bg-secondary/50"
        }
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".mp4,.avi,video/*"
        multiple
        onChange={handleChange}
        className="hidden"
      />
      
      <div className="flex flex-col items-center gap-4">
        <div className={`
          w-16 h-16 rounded-2xl flex items-center justify-center transition-colors
          ${dragActive ? "bg-primary/20" : "bg-secondary"}
        `}>
          <Upload className={`w-8 h-8 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        
        <div>
          <p className="text-white">
            <span className="text-primary font-semibold hover:underline">Click here</span>
            {" "}to upload your video or drag
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Supported Format: MP4, AVI (Max 10GB each)
          </p>
        </div>
      </div>

      {/* Decorative corner icon */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20">
        <FileVideo className="w-20 h-20 text-muted-foreground" />
      </div>
    </div>
  )
}
