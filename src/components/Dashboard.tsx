import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AppSidebar } from '@/components/AppSidebar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChatInterface } from './ChatInterface';
import { MagicCard } from '@/components/magicui/magic-card';
import { useTheme } from 'next-themes';
import { Brain } from 'lucide-react';
import { AIML_MODEL_CONFIG, DEFAULT_MODEL } from '@/config/modelConfig';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Event {
  id: string;
  name: string;
  description: string | null;
  original_url: string;
  status: 'pending' | 'crawling' | 'completed' | 'failed';
  created_at: string;
  model_id: string;
}

export const Dashboard = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventName, setSelectedEventName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventUrl, setEventUrl] = useState("");
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL);

  const getUserDisplayName = () => {
    return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'User';
  };

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents((data as any[]) || []);
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleEventSelect = (eventId: string) => {
    if (!eventId) {
      // Clear selected event and show the form
      setSelectedEventId(null);
      setSelectedEventName('');
      return;
    }
    
    const event = events.find(e => e.id === eventId);
    setSelectedEventId(eventId);
    setSelectedEventName(event?.name || '');
  };

  const handleDashboardClick = () => {
    // Clear selected event and show the form
    setSelectedEventId(null);
    setSelectedEventName('');
  };

  const handleSubmitUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Basic URL validation
      new URL(eventUrl);

      // Show loading state
      const loadingToast = toast.loading('Creating your event assistant...');

      const { data, error } = await supabase
        .from('events')
        .insert({
          user_id: user?.id,
          name: eventName || 'Untitled Event',
          original_url: eventUrl,
          status: 'pending',
          model_id: modelId,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Immediately open the chat view for the new event so the user can start talking
      setSelectedEventId(data.id);
      setSelectedEventName(data.name);

      // Update loading message while crawling runs in the background
      toast.loading('Crawling the event website with your selected AI model...', { id: loadingToast });

      // Start crawling process with default config (deeper crawl) using the selected model
      supabase.functions
        .invoke('crawl-event', {
          body: {
            eventId: data.id,
            url: eventUrl,
            maxDepth: 2,
            maxPages: 20,
            includeExternal: true,
            modelId,
          }
        })
        .then(({ error: crawlError }) => {
          if (crawlError) {
            console.error('Crawl error:', crawlError);
            toast.error('Failed to start crawling process', { id: loadingToast });
          } else {
            toast.success('Crawling started! You can chat while we index the event.', {
              id: loadingToast,
              duration: 5000,
            });
          }
        })
        .catch((err) => {
          console.error('Error invoking crawl-event:', err);
          toast.error('Failed to start crawling process', { id: loadingToast });
        });

      // Clear the form
      setEventName("");
      setEventUrl("");
      setModelId(DEFAULT_MODEL);
      
      // Refresh events list
      await loadEvents();
    } catch (error) {
      if (error instanceof TypeError) {
        toast.error('Please enter a valid URL');
      } else {
        console.error('Error submitting URL:', error);
        toast.error('Failed to submit URL');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar onEventSelect={handleEventSelect} selectedEventId={selectedEventId} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleDashboardClick();
                    }}
                    className="hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
                        <Brain className="w-3 h-3 text-primary-foreground" />
                      </div>
                      <span className="font-medium">HackGPT Dashboard</span>
                    </div>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {selectedEventName && (
                  <>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{selectedEventName}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
                {!selectedEventName && (
                  <>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Home</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {selectedEventId ? (
            <ChatInterface 
              eventId={selectedEventId} 
              onBack={() => {
                setSelectedEventId(null);
                setSelectedEventName('');
              }}
              onEventSelect={handleEventSelect}
              isEmbedded={true}
            />
          ) : (
            <>
              {/* Welcome Message */}
              <div className="text-center py-8 space-y-4">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                    <Brain className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
                  Welcome, {getUserDisplayName()}!
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Transform any hackathon into an intelligent AI assistant. Ask questions, get instant answers about rules, prizes, timelines, and more.
                </p>
                <div className="flex items-center justify-center gap-6 pt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>10+ AI Models</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span>Smart RAG Pipeline</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    <span>Real-time Crawling</span>
                  </div>
                </div>
              </div>

              {/* Event URL Form */}
              <div className="w-full max-w-lg mx-auto">
                <MagicCard
                  gradientColor={theme === "dark" ? "#1a1a1a" : "#f8fafc"}
                  className="relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
                  <div className="relative z-10">
                    <Card className="border-0 shadow-none bg-transparent">
                      <CardHeader className="text-center pb-6">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </div>
                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                          Add Event URL
                        </CardTitle>
                        <CardDescription className="text-base text-muted-foreground max-w-sm mx-auto">
                          Transform any hackathon URL into an intelligent Q&A chatbot
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-6 pb-6">
                        <form onSubmit={handleSubmitUrl} className="space-y-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="event-name" className="text-sm font-medium text-foreground">
                                Event Name
                              </Label>
                              <div className="relative group">
                                <Input
                                  id="event-name"
                                  type="text"
                                  placeholder="e.g., DevPost Hackathon 2024"
                                  value={eventName}
                                  onChange={(e) => setEventName(e.target.value)}
                                  required
                                  className="h-12 px-4 border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 group-hover:border-primary/30"
                                />
                                <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="event-url" className="text-sm font-medium text-foreground">
                                Event URL
                              </Label>
                              <div className="relative group">
                                <Input
                                  id="event-url"
                                  type="url"
                                  placeholder="https://example.com/hackathon"
                                  value={eventUrl}
                                  onChange={(e) => setEventUrl(e.target.value)}
                                  required
                                  className="h-12 px-4 border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 group-hover:border-primary/30"
                                />
                                <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="model-id" className="text-sm font-medium text-foreground">
                                AI Model for this Assistant
                              </Label>
                              <div className="relative group">
                                <Select value={modelId} onValueChange={setModelId}>
                                  <SelectTrigger className="h-12 w-full border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 group-hover:border-primary/30">
                                    <SelectValue placeholder="Select AI model" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[400px]">
                                    {Object.entries(AIML_MODEL_CONFIG).map(([key, model]) => (
                                      <SelectItem key={key} value={key} className="py-3">
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{model.name}</span>
                                            <span className="text-xs text-muted-foreground">({model.provider})</span>
                                          </div>
                                          <span className="text-xs text-muted-foreground">{model.description}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                          <div className="pt-2">
                            <Button 
                              type="submit" 
                              className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl" 
                              disabled={submitting}
                            >
                              {submitting ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                  <span>Processing...</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  <span>Create AI Assistant</span>
                                </div>
                              )}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  </div>
                </MagicCard>
              </div>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};