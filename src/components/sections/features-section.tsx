'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Brain, 
  Code, 
  Lightbulb, 
  Rocket, 
  Users, 
  Zap,
  Target,
  Clock,
  Trophy
} from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    description: 'Get intelligent suggestions and insights powered by advanced AI to accelerate your development process.',
    className: 'md:col-span-2',
  },
  {
    icon: Code,
    title: 'Smart Code Generation',
    description: 'Generate boilerplate code, APIs, and components instantly.',
    className: '',
  },
  {
    icon: Lightbulb,
    title: 'Idea Generator',
    description: 'Never run out of innovative project ideas for your hackathon.',
    className: '',
  },
  {
    icon: Rocket,
    title: 'Rapid Prototyping',
    description: 'Build and deploy prototypes faster than ever before with our integrated tools.',
    className: 'md:col-span-2',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Seamlessly collaborate with your team members in real-time.',
    className: '',
  },
  {
    icon: Target,
    title: 'Goal Tracking',
    description: 'Set and track your hackathon goals with precision.',
    className: '',
  },
  {
    icon: Clock,
    title: 'Time Management',
    description: 'Optimize your time with AI-powered scheduling and task prioritization.',
    className: '',
  },
  {
    icon: Trophy,
    title: 'Winning Strategies',
    description: 'Learn from successful hackathon projects and implement proven strategies.',
    className: 'md:col-span-2',
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to win hackathons
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Powerful features designed to give you the competitive edge in any hackathon
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={feature.className}
            >
              <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 group">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}