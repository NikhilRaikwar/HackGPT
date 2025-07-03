'use client'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Menu } from 'lucide-react'

interface DashboardHeaderProps {
  onMenuClick: () => void
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:gap-x-6 sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="sm"
        className="-m-2.5 p-2.5 lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-6 w-6" />
      </Button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1" />
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}