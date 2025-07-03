# HackGPT - Production-Ready SaaS Application

A modern, production-ready SaaS web application built with Next.js 15.2.2, React 19, and TypeScript 5. HackGPT is designed to supercharge hackathon experiences with AI-powered insights and tools.

## 🚀 Features

- **Modern Tech Stack**: Next.js 15.2.2, React 19, TypeScript 5, TailwindCSS 4
- **Responsive Design**: Mobile-first approach with seamless cross-device experience
- **Authentication System**: Secure user authentication with Supabase
- **Dynamic Header**: Shrinking header with blur effect on scroll
- **Animated Components**: Smooth animations with Framer Motion 12.5
- **Theme Support**: Light/dark mode with next-themes 0.4.6
- **Accessibility**: WCAG 2.1 compliant with proper ARIA labels
- **SEO Optimized**: Comprehensive meta tags and structured data
- **Performance Optimized**: Image optimization and proper caching strategies

## 🛠️ Tech Stack

- **Framework**: Next.js 15.2.2
- **Frontend**: React 19, TypeScript 5
- **Styling**: TailwindCSS 4, Radix UI, shadcn/ui
- **Animations**: Framer Motion 12.5
- **Theming**: next-themes 0.4.6
- **Backend**: Supabase (Database, Auth, Storage)
- **Deployment**: Vercel (recommended)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hackgpt
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js 13+ app directory
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable components
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard components
│   ├── layout/            # Layout components
│   ├── providers/         # Context providers
│   ├── sections/          # Page sections
│   └── ui/                # UI components (shadcn/ui)
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
└── types/                 # TypeScript type definitions
```

## 🎨 Design System

### Colors
- **Primary**: Blue (#3b82f6)
- **Secondary**: Slate (#64748b)
- **Accent**: Emerald (#10b981)
- **Background**: Dynamic (light/dark mode)

### Typography
- **Font**: Inter (Google Fonts)
- **Headings**: 120% line height
- **Body**: 150% line height
- **Weights**: 400, 500, 600, 700

### Spacing
- **System**: 8px base unit
- **Breakpoints**: 
  - Mobile: 320px+
  - Tablet: 768px+
  - Desktop: 1024px+

## 🔐 Authentication

The application uses Supabase for authentication with the following features:

- **Sign Up**: Email/password registration
- **Sign In**: Email/password login
- **Session Management**: Automatic token refresh
- **Protected Routes**: Dashboard requires authentication
- **User Profiles**: Extended user information storage

## 📱 Responsive Design

- **Mobile-first**: Designed for mobile devices first
- **Breakpoints**: Responsive across all screen sizes
- **Touch-friendly**: Optimized for touch interactions
- **No horizontal scroll**: Ensures proper mobile experience

## ♿ Accessibility

- **WCAG 2.1 AA**: Compliant with accessibility standards
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Color Contrast**: Meets contrast ratio requirements
- **Reduced Motion**: Respects user motion preferences

## 🚀 Performance

- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Automatic code splitting and lazy loading
- **Bundle Analysis**: Optimized bundle size
- **Caching**: Proper caching strategies
- **Core Web Vitals**: Optimized for Google's Core Web Vitals

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy** automatically on push to main branch

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📊 SEO & Analytics

- **Meta Tags**: Comprehensive meta tag implementation
- **Open Graph**: Social media sharing optimization
- **Structured Data**: JSON-LD structured data
- **Sitemap**: Automatic sitemap generation
- **Analytics**: Google Analytics integration ready

## 🔧 Development

### Code Quality
- **ESLint**: Code linting and formatting
- **TypeScript**: Type safety and better DX
- **Prettier**: Code formatting (recommended)
- **Husky**: Git hooks for quality checks

### Environment Variables
```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional
NEXT_PUBLIC_GA_ID=your_google_analytics_id
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support, email support@hackgpt.com or join our Discord community.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Radix UI](https://www.radix-ui.com/) - Low-level UI primitives
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [Supabase](https://supabase.com/) - Backend as a Service