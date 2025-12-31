'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FolderKanban, 
  BookOpen, 
  Calendar,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  User,
  CreditCard,
  LogOut
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SidebarProps {
  onCreateProject?: () => void
}

const mainNavItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Projects',
    href: '/dashboard',
    icon: FolderKanban,
  },
  {
    title: 'Study Schedule',
    href: '/dashboard',
    icon: Calendar,
  },
]

const bottomNavItems = [
  {
    title: 'Profile',
    href: '/settings',
    icon: User,
  },
  {
    title: 'Billing',
    href: '/settings?section=tokens',
    icon: CreditCard,
  },
  {
    title: 'Support',
    href: '/support',
    icon: HelpCircle,
  },
]

export default function Sidebar({ onCreateProject }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-[#FDF8F3] border-r border-orange-100 transition-all duration-300 flex flex-col",
          collapsed ? "w-[70px]" : "w-[260px]"
        )}
      >
        {/* Logo Section */}
        <div className={cn(
          "flex items-center h-16 px-4 border-b border-orange-100",
          collapsed ? "justify-center" : "justify-between"
        )}>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            {!collapsed && (
              <span className="text-lg font-bold text-gray-900">Leaflearning</span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-orange-100",
              collapsed && "absolute -right-3 top-6 bg-white border shadow-sm rounded-full"
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Create New Project Button */}
        <div className="p-4">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onCreateProject}
                  className="w-full h-10 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white rounded-xl"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Create new project</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              onClick={onCreateProject}
              className="w-full h-10 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white rounded-xl gap-2"
            >
              <Plus className="h-5 w-5" />
              Create new project
            </Button>
          )}
        </div>

        {/* Main Navigation */}
        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              if (collapsed) {
                return (
                  <Tooltip key={item.title}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-center h-10 rounded-xl transition-all",
                          isActive
                            ? "bg-orange-100 text-orange-600"
                            : "text-gray-600 hover:bg-orange-50 hover:text-gray-900"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.title}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 h-10 rounded-xl transition-all",
                    isActive
                      ? "bg-orange-100 text-orange-600 font-medium"
                      : "text-gray-600 hover:bg-orange-50 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Bottom Navigation */}
        <div className="mt-auto border-t border-orange-100 p-3">
          <nav className="space-y-1">
            {bottomNavItems.map((item) => {
              const Icon = item.icon

              if (collapsed) {
                return (
                  <Tooltip key={item.title}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className="flex items-center justify-center h-10 rounded-xl text-gray-600 hover:bg-orange-50 hover:text-gray-900 transition-all"
                      >
                        <Icon className="h-5 w-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.title}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex items-center gap-3 px-3 h-10 rounded-xl text-gray-600 hover:bg-orange-50 hover:text-gray-900 transition-all"
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </nav>

          {/* Help Button */}
          <div className="mt-4 pt-4 border-t border-orange-100">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full h-10 rounded-xl text-orange-500 hover:bg-orange-50"
                  >
                    <HelpCircle className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Help & Support</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full h-10 justify-start gap-2 rounded-xl text-orange-500 hover:bg-orange-50 hover:text-orange-600"
              >
                <HelpCircle className="h-5 w-5" />
                Help & Support
              </Button>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
