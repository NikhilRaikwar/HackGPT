import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Send, Bot } from 'lucide-react';
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && eventId) {
      initializeChat();
      loadEventDetails();
    }
    // eslint-disable-next-line
  }, [user, eventId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const loadEventDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('name, status, model_id')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEventName(data.name);
      setEventStatus(data.status as 'pending' | 'crawling' | 'completed' | 'failed');
      setModelId((data as any).model_id ?? null);
    } catch (error) {
      console.error('Error loading event details:', error);
    }
  };

  const initializeChat = async () => {
    try {
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
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user?.id,
            event_id: eventId,
            title: `Chat about ${eventName || 'Event'}`
          })
          .select()
          .single();

        if (createError) throw createError;
        currentSessionId = newSession.id;
      }

      setSessionId(currentSessionId);

      // Load existing messages
      const { data: existingMessages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', currentSessionId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages((existingMessages as Message[]) || []);

    } catch (error) {
      console.error('Error initializing chat:', error);
      toast.error('Failed to initialize chat');
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sessionId) return;

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

      // Call chatbot function and display response instantly
      const { data: response, error: chatError } = await supabase.functions.invoke('chat-with-event', {
        body: {
          sessionId,
          eventId,
          message: content,
          modelId: modelId || 'gpt-4o',
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
            <div>
              <h1 className="text-lg font-semibold">Chat with Event Assistant</h1>
              <p className="text-sm text-muted-foreground">{eventName}</p>
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
