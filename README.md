# HackGPT - AI-Powered Hackathon Assistant

## 🚀 About HackGPT

HackGPT is an intelligent AI assistant designed to transform hackathon data into conversational knowledge. Our platform allows users to submit any hackathon URL and instantly create an AI-powered chatbot that can answer questions about event details, prizes, rules, and more.

## ✨ Features

- **Instant Event Intelligence**: Submit any hackathon URL and our AI instantly crawls and processes all event information
- **Smart Q&A System**: Ask questions in natural language and get intelligent, contextual answers powered by GPT technology
- **Unified Knowledge Hub**: Manage multiple event URLs in one place with centralized chat history
- **Responsive Design**: Fully optimized for mobile, tablet, and desktop devices
- **Real-time Chat**: Interactive chat interface with typing indicators and message history

## 🔮 Coming Soon (Future Roadmap)

We’re constantly improving HackGPT to become the ultimate AI-powered hackathon companion. Some exciting features in the pipeline:

- **Multi-LLM Support**: Seamless integration with multiple large language models (AIML API, Anthropic, Llama 3, Mistral, etc.)  
- **Pluggable AI/ML APIs**: Connect custom ML models and APIs for truly personalized event insights  
- **Prize & Project Recommendations**: AI-powered suggestions for best-fit prizes and team projects  
- **Organizers’ Dashboard**: Dedicated analytics and participant insights for organizers  
- **Collaboration Tools**: Team-based chat with shared hackathon event knowledge  
- **Voice Interaction**: Talk to HackGPT naturally using voice commands  


## 🛠️ Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Build Tool**: Vite
- **Authentication**: Supabase Auth with Google OAuth
- **Database**: Supabase PostgreSQL
- **AI Integration**: AIML API GPT with custom event data processing
- **Deployment**: Vercel-ready with environment configuration

## 🎯 Key Components

- **Dashboard**: Centralized event management and chat interface
- **Event Form**: URL submission with intelligent crawling
- **Chat Interface**: Real-time conversation with event-specific AI
- **Responsive Sidebar**: Mobile-optimized navigation
- **Landing Page**: Professional showcase with interactive preview

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- AIML API key (for AI functionality)

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Start development server: `npm run dev`

### Environment Variables

Create a `.env.local` file with:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_AUTH_REDIRECT_URL=your_redirect_url
```

## 📱 Responsive Design

HackGPT is built with a mobile-first approach and includes:

- **Mobile Optimization**: Touch-friendly interfaces and optimized layouts
- **Tablet Support**: Adaptive design for medium screens
- **Desktop Experience**: Full-featured dashboard with sidebar navigation
- **Cross-Platform**: Consistent experience across all devices

## 🔐 Authentication

- **Google OAuth**: Seamless sign-in with Google accounts
- **Email/Password**: Traditional authentication option
- **Session Management**: Persistent login with automatic token refresh
- **Secure Redirects**: Environment-aware authentication flows

## 🎨 Design System

- **Modern UI**: Clean, professional interface with smooth animations
- **Consistent Branding**: HackGPT brain logo and color scheme throughout
- **Accessibility**: WCAG compliant with proper contrast and navigation
- **Dark/Light Mode**: Theme support with system preference detection

## 📊 Performance

- **Fast Loading**: Optimized bundle size and lazy loading
- **Real-time Updates**: Instant message delivery and status updates
- **Efficient Caching**: Smart data caching for improved performance
- **Mobile Optimized**: Reduced payload sizes for mobile networks

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

### Project Structure

```
src/
├── components/     # React components
├── hooks/         # Custom React hooks
├── integrations/  # External service integrations
├── pages/         # Page components
└── lib/           # Utility functions
```

## 🌟 Contributing

We welcome contributions! Please ensure:

- Code follows TypeScript best practices
- Components are responsive and accessible
- Tests are included for new features
- Documentation is updated

## 📄 License

This project is licensed under the MIT License.

## 🤝 Support

For support and questions, please reach out through our project channels.

---

**Built with ❤️ for the hackathon community**
