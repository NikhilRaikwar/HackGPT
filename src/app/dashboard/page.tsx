import { Metadata } from 'next'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your HackGPT dashboard - manage your projects and chat with AI.',
}

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  )
}