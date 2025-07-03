'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, Plus, Zap, TrendingUp, Clock, Users } from 'lucide-react'
import Link from 'next/link'

const stats = [
  { name: 'Total Chats', value: '12', icon: MessageSquare, change: '+2.1%' },
  { name: 'Active Projects', value: '3', icon: Zap, change: '+15.3%' },
  { name: 'Hours Saved', value: '24', icon: Clock, change: '+8.2%' },
  { name: 'Team Members', value: '5', icon: Users, change: '+12.5%' },
]

const recentActivity = [
  {
    id: 1,
    title: 'Started new chat about React optimization',
    time: '2 hours ago',
    type: 'chat',
  },
  {
    id: 2,
    title: 'Generated API documentation',
    time: '4 hours ago',
    type: 'generation',
  },
  {
    id: 3,
    title: 'Completed hackathon project setup',
    time: '1 day ago',
    type: 'project',
  },
  {
    id: 4,
    title: 'Shared project with team',
    time: '2 days ago',
    type: 'collaboration',
  },
]

export function DashboardContent() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your projects.
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Get started with your hackathon project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild className="flex-1">
                  <Link href="/dashboard/chat/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Start New Chat
                  </Link>
                </Button>
                <Button variant="outline" asChild className="flex-1">
                  <Link href="/dashboard/projects/new">
                    <Zap className="mr-2 h-4 w-4" />
                    Create Project
                  </Link>
                </Button>
                <Button variant="outline" asChild className="flex-1">
                  <Link href="/dashboard/templates">
                    Browse Templates
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="mb-8"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <stat.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="ml-4 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-muted-foreground truncate">
                            {stat.name}
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-foreground">
                              {stat.value}
                            </div>
                            <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {stat.change}
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest actions and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 * index }}
                    className="flex items-center space-x-4 p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {activity.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activity.time}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}