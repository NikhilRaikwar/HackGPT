import { Metadata } from 'next'
import { AuthForm } from '@/components/auth/auth-form'

export const metadata: Metadata = {
  title: 'Authentication',
  description: 'Sign in to your HackGPT account or create a new one.',
}

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 px-4">
      <div className="w-full max-w-md">
        <AuthForm />
      </div>
    </div>
  )
}