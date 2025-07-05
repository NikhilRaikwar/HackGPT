import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && eventId) {
      initializeChat();
      loadEventDetails();
    }
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
        .select('name')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEventName(data.name);
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
        msg.id === userMessage.id ? { 
          id: savedUserMessage.id,
          role: savedUserMessage.role as 'user' | 'assistant',
          content: savedUserMessage.content,
          created_at: savedUserMessage.created_at
        } : msg
      ));

      // Call chatbot function
      const { data: response, error: chatError } = await supabase.functions.invoke('chat-with-event', {
        body: {
          sessionId,
          eventId,
          message: content
        }
      });

      if (chatError) throw chatError;

      // Add assistant response
      const assistantMessage: Message = {
        id: response.messageId,
        role: 'assistant',
        content: response.content,
        created_at: response.created_at
      };
      setMessages(prev => [...prev, assistantMessage]);

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
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Start a conversation by asking about the event details, prizes, rules, or anything else!
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <Avatar className="h-8 w-8 bg-primary/10">
                          <AvatarFallback className="text-primary text-xs">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                       <div
                         className={`max-w-[80%] rounded-lg px-4 py-2 ${
                           message.role === 'user'
                             ? 'bg-primary text-primary-foreground ml-12'
                             : 'bg-muted text-foreground mr-12'
                         }`}
                       >
                         <div 
                           className="text-sm whitespace-pre-wrap font-medium leading-relaxed"
                           dangerouslySetInnerHTML={{
                             __html: message.content
                               .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                               .replace(/\*(.*?)\*/g, '<em>$1</em>')
                               .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
                               .replace(/\n/g, '<br/>')
                           }}
                         />
                         <p className="text-xs opacity-50 mt-2">
                           {new Date(message.created_at).toLocaleTimeString()}
                         </p>
                       </div>
                      {message.role === 'user' && (
                        <Avatar className="h-8 w-8 bg-muted">
                          <AvatarFallback className="text-xs">
                            {user?.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))
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