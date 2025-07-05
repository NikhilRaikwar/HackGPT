import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Brain, MessageSquare, Database, Globe, Zap, Shield, Link as LinkIcon } from "lucide-react";
import Navigation from "@/components/Navigation";
import { MagicCard } from "@/components/magicui/magic-card";
import { DashboardPreview } from "@/components/DashboardPreview";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
                  Transform{" "}
                  <span className="text-primary">
                    Hackathon Data
                  </span>{" "}
                  Into Intelligent Conversations
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl">
                  Your AI-Powered Event Assistant That Makes Hackathon Information Instantly Accessible
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto">
                    Try HackGPT Free
                  </Button>
                </Link>
              </div>
            </div>

            {/* Chat Demo */}
            <div className="relative">
              <Card className="bg-card border-border shadow-card max-w-md ml-auto">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Brain className="w-3 h-3 text-primary-foreground" />
                    </div>
                    <span className="font-medium">HackGPT Assistant</span>
                    <div className="w-2 h-2 rounded-full bg-green-500 ml-auto"></div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm">What are the prizes for this hackathon?</p>
                    </div>
                    <div className="bg-primary rounded-lg p-3">
                      <p className="text-sm text-primary-foreground">
                        The hackathon offers $50,000 in total prizes including...
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm">When is the submission deadline?</p>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      AI is typing...
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Everything You Need to{" "}
              <span className="text-primary">
                Master Events
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Transform any hackathon or event URL into an intelligent, conversational knowledge base
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-card border-border shadow-card hover:shadow-hover transition-all duration-200">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Instant Event Intelligence</CardTitle>
                <CardDescription>
                  Submit any hackathon URL and our AI instantly crawls and processes all event information, making it searchable and accessible.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-card border-border shadow-card hover:shadow-hover transition-all duration-200">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Smart Q&A System</CardTitle>
                <CardDescription>
                  Ask questions in natural language and get intelligent, contextual answers powered by GPT technology and your event data.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-card border-border shadow-card hover:shadow-hover transition-all duration-200">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Database className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Unified Knowledge Hub</CardTitle>
                <CardDescription>
                  Manage multiple event URLs in one place with centralized chat history and intelligent knowledge management.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Your Command Center for{" "}
              <span className="text-primary">
                Event Intelligence
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Experience the power of HackGPT with our intuitive dashboard designed for event organizers and participants
            </p>
          </div>

          {/* Interactive Dashboard Preview */}
          <div className="mb-12">
            <DashboardPreview />
          </div>
          
          <div className="text-center">
            <Link to="/auth">
              <Button 
                variant="primary" 
                size="lg"
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
              >
                Experience This Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                HackGPT
              </span>
            </div>
            <p className="text-muted-foreground text-center max-w-md">
              AI-powered hackathon assistant making event information instantly accessible
            </p>
            <p className="text-sm text-muted-foreground">
              © 2024 HackGPT. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;