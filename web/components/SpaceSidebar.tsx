'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  FileText,
  GraduationCap,
  X
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SpaceSidebarProps {
  spaceId: string
  spaceName: string
  onClose?: () => void
  isMobile?: boolean
}

const sidebarItems = [
  { name: 'Overview', href: '', icon: Search, description: 'AI Search & Insights' },
  { name: 'Notes', href: '/notes', icon: FileText, description: 'Your notes' },
  { name: 'Study', href: '/study', icon: GraduationCap, description: 'Flashcards & Quizzes' },
]

export default function SpaceSidebar({ spaceId, spaceName, onClose, isMobile = false }: SpaceSidebarProps) {
  const pathname = usePathname()

  const isActiveRoute = (href: string) => {
    const fullPath = `/project/${spaceId}${href}`
    return pathname === fullPath
  }

  return (
    <aside className={`h-full bg-neutral-950 border-r border-neutral-800 flex flex-col ${isMobile ? 'w-full' : 'w-[220px]'}`}>
      {/* Space Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">{spaceName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-semibold text-sm truncate">{spaceName}</h2>
            <p className="text-neutral-500 text-xs">Space</p>
          </div>
        </div>
        {isMobile && onClose && (
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {sidebarItems.map((item) => {
          const isActive = isActiveRoute(item.href)
          const Icon = item.icon
          return (
            <Tooltip key={item.name}>
              <TooltipTrigger asChild>
                <Link
                  href={`/project/${spaceId}${item.href}`}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                    isActive
                      ? 'bg-white text-black'
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-black' : 'text-neutral-500 group-hover:text-white'}`} />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-black" />
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="lg:hidden">
                {item.description}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </nav>

      {/* Space Quick Stats */}
      <div className="p-4 border-t border-neutral-800">
        <div className="bg-neutral-900 rounded-xl p-3">
          <p className="text-neutral-500 text-xs font-medium mb-2">QUICK STATS</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-neutral-800 rounded-lg p-2 text-center">
              <p className="text-white font-bold text-lg">—</p>
              <p className="text-neutral-500 text-[10px]">Notes</p>
            </div>
            <div className="bg-neutral-800 rounded-lg p-2 text-center">
              <p className="text-white font-bold text-lg">—</p>
              <p className="text-neutral-500 text-[10px]">Study Sets</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
