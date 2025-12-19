'use client'

import { Leaf } from 'lucide-react'

interface LoadingProps {
  message?: string
  fullScreen?: boolean
}

export function Loading({ message = 'Loading...', fullScreen = true }: LoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center">
      {/* Leaf Icon */}
      <div className="mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
          <Leaf className="w-8 h-8 text-white" />
        </div>
      </div>
      
      {/* Horizontal Loading Bar */}
      <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full animate-loading-bar" />
      </div>
      
      {/* Message */}
      <p className="mt-4 text-gray-500 text-sm font-medium">{message}</p>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {content}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-20">
      {content}
    </div>
  )
}
