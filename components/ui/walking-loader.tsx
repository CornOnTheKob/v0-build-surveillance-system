"use client"

import { useEffect, useState } from "react"

interface WalkingLoaderProps {
  isVisible: boolean
  label: string
  onClose?: () => void
}

export function WalkingLoader({ isVisible, label, onClose }: WalkingLoaderProps) {
  const [frame, setFrame] = useState(0)
  
  useEffect(() => {
    if (!isVisible) return
    
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % 4)
    }, 200)
    
    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) return null

  // Walking stick figure frames
  const getStickFigure = (frameNum: number) => {
    const poses = [
      // Frame 0 - Right leg forward, left arm forward
      {
        leftArm: "M24 28 L18 36",
        rightArm: "M36 28 L42 34",
        leftLeg: "M26 48 L22 62 L18 68",
        rightLeg: "M34 48 L40 60 L44 68",
        body: "M30 28 L30 48",
        head: { cx: 30, cy: 20 }
      },
      // Frame 1 - Legs passing, arms neutral
      {
        leftArm: "M24 28 L20 38",
        rightArm: "M36 28 L40 38",
        leftLeg: "M26 48 L28 62 L28 68",
        rightLeg: "M34 48 L32 62 L32 68",
        body: "M30 28 L30 48",
        head: { cx: 30, cy: 20 }
      },
      // Frame 2 - Left leg forward, right arm forward
      {
        leftArm: "M24 28 L18 34",
        rightArm: "M36 28 L42 36",
        leftLeg: "M26 48 L20 60 L16 68",
        rightLeg: "M34 48 L38 62 L42 68",
        body: "M30 28 L30 48",
        head: { cx: 30, cy: 20 }
      },
      // Frame 3 - Legs passing other way
      {
        leftArm: "M24 28 L20 38",
        rightArm: "M36 28 L40 38",
        leftLeg: "M26 48 L32 62 L32 68",
        rightLeg: "M34 48 L28 62 L28 68",
        body: "M30 28 L30 48",
        head: { cx: 30, cy: 20 }
      },
    ]
    return poses[frameNum]
  }

  const pose = getStickFigure(frame)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 pointer-events-none">
      <div className="pointer-events-auto bg-card border border-border rounded-3xl shadow-elevated p-6 flex flex-col items-center gap-4 min-w-[280px]">
        {/* Walking Animation Container */}
        <div className="relative w-20 h-24 flex items-center justify-center">
          {/* Ground line with moving dots */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-border overflow-hidden">
            <div 
              className="absolute top-0 left-0 w-full h-full"
              style={{
                background: 'repeating-linear-gradient(90deg, transparent, transparent 8px, var(--primary) 8px, var(--primary) 12px)',
                animation: 'slideLeft 0.4s linear infinite',
              }}
            />
          </div>
          
          {/* Stick Figure */}
          <svg 
            viewBox="0 0 60 72" 
            className="w-16 h-20"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
          >
            {/* Head */}
            <circle 
              cx={pose.head.cx} 
              cy={pose.head.cy} 
              r="8" 
              fill="none" 
              stroke="url(#gradient)" 
              strokeWidth="3"
              strokeLinecap="round"
            />
            
            {/* Body */}
            <path 
              d={pose.body} 
              stroke="url(#gradient)" 
              strokeWidth="3" 
              strokeLinecap="round"
              fill="none"
            />
            
            {/* Arms */}
            <path 
              d={pose.leftArm} 
              stroke="url(#gradient)" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              fill="none"
            />
            <path 
              d={pose.rightArm} 
              stroke="url(#gradient)" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              fill="none"
            />
            
            {/* Legs */}
            <path 
              d={pose.leftLeg} 
              stroke="url(#gradient)" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path 
              d={pose.rightLeg} 
              stroke="url(#gradient)" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            
            {/* Gradient Definition */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#22D3EE" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        {/* Label */}
        <div className="text-center">
          <p className="text-sm font-medium text-white">{label}</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>

        {/* Optional close button */}
        {onClose && (
          <button 
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-white transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
      
      {/* CSS Animation */}
      <style jsx>{`
        @keyframes slideLeft {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-20px);
          }
        }
      `}</style>
    </div>
  )
}

// Loading context for app-wide loading state
import { createContext, useContext, ReactNode } from "react"

interface LoadingContextType {
  showLoader: (label: string) => void
  hideLoader: () => void
  isLoading: boolean
  loadingLabel: string
}

const LoadingContext = createContext<LoadingContextType | null>(null)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState("")

  const showLoader = (label: string) => {
    setLoadingLabel(label)
    setIsLoading(true)
  }

  const hideLoader = () => {
    setIsLoading(false)
    setLoadingLabel("")
  }

  return (
    <LoadingContext.Provider value={{ showLoader, hideLoader, isLoading, loadingLabel }}>
      {children}
      <WalkingLoader isVisible={isLoading} label={loadingLabel} />
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider")
  }
  return context
}
