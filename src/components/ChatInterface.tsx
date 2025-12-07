import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Send, Bot, Trash2, Settings, Sparkles } from 'lucide-react';
import { ModelSelector } from '@/components/ModelSelector';
import { AIML_MODEL_CONFIG, DEFAULT_MODEL } from '@/config/modelConfig';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatInterfaceProps {
  eventId: string;
  onBack: () => void;
  onEventSelect?: (eventId: string) => void;
  isEmbedded?: boolean;
}

export const ChatInterface = ({ eventId, onBack, onEventSelect, isEmbedded = false }: ChatInterfaceProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string>('');
  const [eventStatus, setEventStatus] = useState<'pending' | 'crawling' | 'completed' | 'failed' | ''>('');
  const [modelId, setModelId] = useState<string | null>(null);
  const [chatModelId, setChatModelId] = useState<string | null>(null);
  const [hasTriggeredRecrawl, setHasTriggeredRecrawl] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && eventId) {
      // Only initialize chat after verifying the event exists
      const init = async () => {
        const eventExists = await loadEventDetails();
        if (eventExists) {
          await initializeChat();
        }
      };
      init();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, eventId]);

  // Subscribe to event status changes for real-time updates
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`event-status-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any).status;
          setEventStatus(newStatus);
          if (newStatus === 'completed') {
            // Refresh content when crawling completes
            console.log('Event crawling completed');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const loadEventDetails = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('name, status, model_id, original_url, crawl_data')
        .eq('id', eventId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error('Event not found. It may have been deleted.');
        onBack();
        return false;
      }
      
      const eventData = data as any;
      setEventName(eventData.name);
      setEventStatus(eventData.status as 'pending' | 'crawling' | 'completed' | 'failed');
      const eventModelId = eventData.model_id ?? null;
      setModelId(eventModelId);
      setChatModelId(eventModelId || DEFAULT_MODEL);

      // Only trigger recrawl if:
      // 1. Event status is 'pending' or 'failed' (needs initial crawl or retry)
      // 2. Event status is 'completed' but no content exists (crawl may have failed silently)
      // 3. We haven't already triggered a recrawl in this session
      const shouldRecrawl = 
        !hasTriggeredRecrawl && 
        eventData.original_url && 
        eventData.model_id &&
        (eventData.status === 'pending' || 
         eventData.status === 'failed' || 
         (eventData.status === 'completed' && !eventData.crawl_data));

      if (shouldRecrawl) {
        setHasTriggeredRecrawl(true);
        // Check if content already exists before recrawling
        const { count } = await supabase
          .from('content_embeddings')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId);

        // Only crawl if no content exists or status indicates it's needed
        if (count === 0 || eventData.status === 'pending' || eventData.status === 'failed') {
          supabase.functions
            .invoke('crawl-event', {
              body: {
                eventId,
                url: eventData.original_url,
                maxDepth: 2,
                maxPages: 20,
                includeExternal: true,
                modelId: eventData.model_id as string,
              },
            })
            .then(({ error }) => {
              if (error) {
                console.error('Background recrawl failed:', error);
              } else {
                console.log('Background recrawl started successfully');
              }
            })
            .catch((err) => {
              console.error('Error invoking background recrawl:', err);
            });
        }
      }
      return true;
    } catch (error) {
      console.error('Error loading event details:', error);
      toast.error('Failed to load event details');
      onBack();
      return false;
    }
  };

  const deleteChatSession = async () => {
    if (!sessionId) return;

    const confirmed = window.confirm('Are you sure you want to delete this chat? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Chat deleted successfully');
      setMessages([]);
      setSessionId(null);
      // Refresh sidebar by calling onEventSelect with empty string
      if (onEventSelect) {
        onEventSelect('');
      }
      onBack();
    } catch (error) {
      console.error('Error deleting chat session:', error);
      toast.error('Failed to delete chat');
    }
  };

  const initializeChat = async () => {
    if (!eventId) {
      toast.error('No event selected');
      onBack();
      return;
    }

    try {
      // First verify the event exists
      const eventExists = await loadEventDetails();
      if (!eventExists) {
        console.error('Event does not exist, cannot initialize chat');
        return;
      }

      // Check for existing session
      const { data: existingSessions, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', user?.id)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (sessionError) throw sessionError;

      let currentSessionId: string;

      if (existingSessions && existingSessions.length > 0) {
        currentSessionId = existingSessions[0].id;
      } else {
        // Create new session only if we have a valid eventId
        if (!eventId) {
          throw new Error('Cannot create chat session: eventId is missing');
        }

        const { data: newSession, error: createError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user?.id,
            event_id: eventId,
            title: `Chat about ${eventName || 'Event'}`
          })
          .select()
          .single();

        if (createError) {
          console.error('Failed to create chat session:', createError);
          throw createError;
        }
        
        if (!newSession) {
          throw new Error('Failed to create chat session: No session data returned');
        }
        
        currentSessionId = newSession.id;
      }

      setSessionId(currentSessionId);

      // Update session title if it's the default
      if (existingSessions && existingSessions.length === 0) {
        // New session created - update title with event name
        await supabase
          .from('chat_sessions')
          .update({ title: `Chat about ${eventName || 'Event'}` })
          .eq('id', currentSessionId);
      }

      // Load existing messages
      const { data: existingMessages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', currentSessionId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages((existingMessages as Message[]) || []);
      
      // Refresh sidebar chat history
      if ((window as any).refreshChatHistory) {
        (window as any).refreshChatHistory();
      }

    } catch (error) {
      console.error('Error initializing chat:', error);
      toast.error('Failed to initialize chat');
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sessionId) return;

    if (!modelId) {
      toast.error('This event has no model configured. Please recreate the assistant with a model selected.');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const content = formData.get('message') as string;

    if (!content.trim()) return;

    setLoading(true);

    // Add user message to UI immediately
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    // Clear input
    (e.target as HTMLFormElement).reset();

    try {
      // Save user message to database
      const { data: savedUserMessage, error: userError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role: 'user',
          content
        })
        .select()
        .single();

      if (userError) throw userError;

      // Update the temp message with real ID
      setMessages(prev => prev.map(msg =>
        msg.id === userMessage.id ?
          {
            id: savedUserMessage.id,
            role: savedUserMessage.role as 'user' | 'assistant',
            content: savedUserMessage.content,
            created_at: savedUserMessage.created_at
          }
          : msg
      ));

      // Call chatbot function and display response instantly, using the selected chat model
      const effectiveModelId = chatModelId || modelId || DEFAULT_MODEL;
      const { data: response, error: chatError } = await supabase.functions.invoke('chat-with-event', {
        body: {
          sessionId,
          eventId,
          message: content,
          modelId: effectiveModelId,
        }
      });

      if (chatError) throw chatError;

      const aiMessage: Message = {
        id: response.messageId,
        role: 'assistant',
        content: response.content,
        created_at: response.created_at
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      // Remove the user message if there was an error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const ChatContent = () => (
    <>
      {/* Header */}
      {!isEmbedded && (
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center h-16 gap-4 px-4">
            <Button variant="ghost" onClick={onBack} size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Chat with Event Assistant</h1>
              <p className="text-sm text-muted-foreground">{eventName}</p>
              {chatModelId && AIML_MODEL_CONFIG[chatModelId] && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Using {AIML_MODEL_CONFIG[chatModelId].name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={showModelSelector} onOpenChange={setShowModelSelector}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Model
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Switch AI Model</DialogTitle>
                    <DialogDescription>
                      Choose a different AI model for this chat session. This only affects new messages.
                    </DialogDescription>
                  </DialogHeader>
                  <ModelSelector
                    value={chatModelId || DEFAULT_MODEL}
                    onChange={(newModelId) => {
                      setChatModelId(newModelId);
                      setShowModelSelector(false);
                      toast.success(`Switched to ${AIML_MODEL_CONFIG[newModelId].name}`);
                    }}
                  />
                </DialogContent>
              </Dialog>
              {sessionId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={deleteChatSession}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Chat Area */}
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-sm text-muted-foreground">
              Ask anything about this event!
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
              <div className="space-y-4 pb-4">
                {/* Initial agent message about crawling status and URLs */}
                <div className="flex w-full gap-3 mb-3 justify-start">
                  <Avatar className="h-8 w-8 bg-primary/10 mt-1">
                    <AvatarFallback className="text-primary text-xs">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 max-w-[95vw] rounded-2xl bg-muted/60 px-4 py-3 text-[15px] leading-relaxed shadow-sm">
                    <p className="mb-2">
                      {eventStatus === 'completed'
                        ? 'HackGPT has finished crawling the pages for this hackathon. You can ask anything about the rules, prizes, timeline, or FAQs.'
                        : 'HackGPT is crawling this hackathon and indexing its pages. You can already start asking questions while crawling continues in the background.'}
                    </p>
                  </div>
                </div>

                {messages.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">
                      Start a conversation by asking about the event details, prizes, rules, or anything else!
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex w-full gap-2 sm:gap-3 mb-3 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <Avatar className="h-8 w-8 bg-primary/10 mt-auto">
                            <AvatarFallback className="text-primary text-xs">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {message.role === 'user' ? (
                          <div className="flex w-full gap-2 sm:gap-3 mb-3 justify-end">
                            <div
                              className="max-w-[75vw] sm:max-w-[45%] rounded-2xl px-4 py-3 text-[17px] leading-relaxed shadow-md transition-colors duration-200 font-medium whitespace-pre-wrap bg-primary text-primary-foreground ml-2 sm:ml-12 rounded-br-md"
                              style={{
                                wordBreak: 'break-word',
                                lineHeight: 1.7,
                                padding: '14px 18px',
                                fontSize: '17px',
                                fontFamily: 'Times New Roman, Times, serif'
                              }}
                            >
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: message.content
                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                    .replace(/`(.*?)`/g, '<code class=\"bg-muted px-1 py-0.5 rounded text-xs\">$1</code>')
                                    .replace(/\n/g, '<br/>')
                                }}
                              />
                              <p className="text-xs opacity-50 mt-2 text-right select-none" style={{ fontSize: '12px', lineHeight: 1.2, fontFamily: 'Times New Roman, Times, serif' }}>
                                {new Date(message.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                            <Avatar className="h-8 w-8 bg-muted mt-auto">
                              {user?.user_metadata?.avatar_url ? (
                                <AvatarImage src={user.user_metadata.avatar_url} alt={user?.email || 'User'} />
                              ) : null}
                              <AvatarFallback className="text-xs">
                                {user?.user_metadata?.full_name
                                  ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('')
                                  : user?.user_metadata?.name
                                    ? user.user_metadata.name.split(' ').map((n: string) => n[0]).join('')
                                    : user?.email
                                      ? user.email.charAt(0).toUpperCase()
                                      : 'U'}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        ) : (
                          <div
                            className="ai-response text-[17px] font-normal whitespace-pre-wrap text-foreground"
                            style={{
                              maxWidth: '95vw',
                              marginLeft: 'auto',
                              marginRight: 'auto',
                              paddingLeft: 10,
                              paddingRight: 10,
                              wordBreak: 'break-word',
                              lineHeight: 1.7,
                              fontSize: '17px',
                              fontFamily: 'Times New Roman, Times, serif'
                            }}
                          >
                            <div
                              dangerouslySetInnerHTML={{
                                __html: message.content
                                  // Bold headings: Markdown #, ##, or lines surrounded by ** ** at start
                                  .replace(/^(#+\s*)(.*)$/gm, (m, hashes, title) => `<strong>${title}</strong>`) // Markdown headings
                                  .replace(/^\*\*(.+?)\*\*$/gm, '<strong>$1</strong>') // Standalone bold lines
                                  .replace(/\*\*(.*?)\*\*/g, '$1') // Remove other bold
                                  // Bullet points: lines starting with - or *
                                  .replace(/(^|\n)[\-\*]\s+(.*?)(?=\n|$)/g, '$1<ul><li>$2</li></ul>')
                                  // Merge consecutive <ul> tags
                                  .replace(/<\/ul>\s*<ul>/g, '')
                                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                  .replace(/`(.*?)`/g, '<code class=\"bg-muted px-1 py-0.5 rounded text-xs\">$1</code>')
                                  .replace(/\n/g, '<br/>')
                              }}
                            />
                            <p className="text-xs opacity-50 mt-2 text-left select-none" style={{ fontSize: '12px', lineHeight: 1.2, fontFamily: 'Times New Roman, Times, serif' }}>
                              {new Date(message.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Input Form */}
            <div className="border-t border-border/50 p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  name="message"
                  placeholder="Ask about event details, prizes, rules..."
                  disabled={loading}
                  className="flex-1"
                  autoComplete="off"
                />
                <Button type="submit" disabled={loading} size="sm">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );

  if (isEmbedded) {
    return <ChatContent />;
  }

  return (
    <SidebarProvider>
      <AppSidebar onEventSelect={onEventSelect || (() => {})} />
      <SidebarInset>
        <ChatContent />
      </SidebarInset>
    </SidebarProvider>
  );
};
