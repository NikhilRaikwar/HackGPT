'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  MessageSquare, 
  Plus, 
  History, 
  Settings, 
  LogOut, 
  X,
  Zap,
  Home,
  User
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface DashboardSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'New Chat', href: '/dashboard/chat/new', icon: Plus },
  { name: 'Chat History', href: '/dashboard/history', icon: History },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

const recentChats = [
  { id: '1', title: 'React Hackathon Project', timestamp: '2 hours ago' },
  { id: '2', title: 'AI Integration Ideas', timestamp: '1 day ago' },
  { id: '3', title: 'Backend Architecture', timestamp: '2 days ago' },
  { id: '4', title: 'UI/UX Design Tips', timestamp: '3 days ago' },
]

export function DashboardSidebar({ open, onOpenChange }: DashboardSidebarProps) {
  const { user, signOut } = useAuth()

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-6">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">HackGPT</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Navigation */}
        <nav className="flex-1 px-6 py-4">
          <div className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                  'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="mr-3 h-4 w-4 shrink-0" />
                {item.name}
              </Link>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Recent Chats */}
          <div>
            <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Recent Chats
            </h3>
            <ScrollArea className="h-64">
              <div className="space-y-1">
                {recentChats.map((chat) => (
                  <Link
                    key={chat.id}
                    href={`/dashboard/chat/${chat.id}`}
                    className="group flex items-center rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <MessageSquare className="mr-3 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 truncate">
                      <div className="truncate text-sm font-medium">{chat.title}</div>
                      <div className="text-xs text-muted-foreground">{chat.timestamp}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </ScrollArea>
          </div>
        </nav>

        {/* User section */}
        <div className="shrink-0 border-t border-border p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {user?.user_metadata?.full_name || user?.email}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="ml-2"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={onOpenChange}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button
                    type="button"
                    className="-m-2.5 p-2.5"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="h-6 w-6 text-foreground" />
                  </button>
                </div>
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-background border-r border-border">
                  <SidebarContent />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-background">
          <SidebarContent />
        </div>
      </div>
    </>
  )
}