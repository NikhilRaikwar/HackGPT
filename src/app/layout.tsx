import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/components/providers/auth-provider'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'HackGPT - Supercharge Your Hackathon Experience',
    template: '%s | HackGPT'
  },
  description: 'Supercharge Your Hackathon Experience with AI-Powered Insights — Instantly Discover, Plan, and Build with HackGPT!',
  keywords: ['hackathon', 'AI', 'GPT', 'development', 'coding', 'innovation'],
  authors: [{ name: 'HackGPT Team' }],
  creator: 'HackGPT',
  publisher: 'HackGPT',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://hackgpt.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://hackgpt.com',
    title: 'HackGPT - Supercharge Your Hackathon Experience',
    description: 'Supercharge Your Hackathon Experience with AI-Powered Insights — Instantly Discover, Plan, and Build with HackGPT!',
    siteName: 'HackGPT',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'HackGPT - AI-Powered Hackathon Assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HackGPT - Supercharge Your Hackathon Experience',
    description: 'Supercharge Your Hackathon Experience with AI-Powered Insights — Instantly Discover, Plan, and Build with HackGPT!',
    images: ['/og-image.jpg'],
    creator: '@hackgpt',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}