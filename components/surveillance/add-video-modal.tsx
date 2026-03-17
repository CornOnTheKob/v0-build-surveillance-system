"use client"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Video, Upload, X, FileVideo } from "lucide-react"
import { useLoading } from "@/components/ui/walking-loader"

interface AddVideoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locations: Array<{ id: string; name: string }>
  onAddVideo?: (data: {
    file: File
    locationId: string
    date: string
    startTime: string
    endTime: string
  }) => void
}

export function AddVideoModal({ open, onOpenChange, locations, onAddVideo }: AddVideoModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [locationId, setLocationId] = useState("")
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showLoader, hideLoader } = useLoading()

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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === "video/mp4" || file.type === "video/x-msvideo" || file.name.endsWith('.avi')) {
        setSelectedFile(file)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleSubmit = async () => {
    if (selectedFile && locationId && date && startTime && endTime) {
      handleClose()
      showLoader("Uploading video and processing...")
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      onAddVideo?.({
        file: selectedFile,
        locationId,
        date,
        startTime,
        endTime,
      })
      
      hideLoader()
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setLocationId("")
    setDate("")
    setStartTime("")
    setEndTime("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Video className="w-5 h-5" />
            Add New Video
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Upload a video file and configure its metadata.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* File Upload Area */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Video File</label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                dragActive 
                  ? "border-primary bg-primary/5" 
                  : selectedFile 
                    ? "border-primary/50 bg-muted/50" 
                    : "border-border hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.avi,video/mp4,video/x-msvideo"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {selectedFile ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileVideo className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedFile(null)}
                    className="h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div 
                  className="flex flex-col items-center gap-2 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Drop video here or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">Supports MP4 and AVI formats</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Location</label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="bg-secondary border-border text-foreground">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id} className="text-foreground">
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Date</label>
            <Input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-secondary border-border text-foreground"
            />
          </div>
          
          {/* Time Coverage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Start Time</label>
              <Input 
                type="time" 
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">End Time</label>
              <Input 
                type="time" 
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="border-border text-foreground">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!selectedFile || !locationId || !date || !startTime || !endTime}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Add Video
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
