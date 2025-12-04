"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useNavigate } from "react-router-dom"
import { Brain, MessageSquare, Trash2 } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { NavMain } from "@/components/NavMain"
import { NavUser } from "@/components/NavUser"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

interface Event {
  id: string;
  name: string;
  description: string | null;
  original_url: string;
  status: 'pending' | 'crawling' | 'completed' | 'failed';
  created_at: string;
}

interface ChatSession {
  id: string;
  event_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  event?: {
    name: string;
    status: string;
  };
}

export function AppSidebar({ 
  onEventSelect, 
  selectedEventId,
  ...props 
}: React.ComponentProps<typeof Sidebar> & { 
  onEventSelect?: (eventId: string) => void;
  selectedEventId?: string | null;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (user) {
      loadChatSessions();
      
      // Subscribe to new chat sessions
      const channel = supabase
        .channel('chat-sessions-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_sessions',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadChatSessions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, refreshKey]);

  // Expose refresh function via window for ChatInterface to call
  useEffect(() => {
    (window as any).refreshChatHistory = () => {
      setRefreshKey(prev => prev + 1);
    };
    return () => {
      delete (window as any).refreshChatHistory;
    };
  }, []);

  const loadChatSessions = async () => {
    if (!user) return;
    
    try {
      // First get chat sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('id, event_id, title, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (sessionsError) throw sessionsError;
      
      if (!sessionsData || sessionsData.length === 0) {
        setChatSessions([]);
        return;
      }

      // Get event IDs and fetch event details
      const eventIds = sessionsData.map(s => s.event_id);
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, name, status')
        .in('id', eventIds);

      // Create a map for quick lookup
      const eventsMap = new Map(
        (eventsData || []).map((e: any) => [e.id, { name: e.name, status: e.status }])
      );
      
      // Combine sessions with event data
      const sessions = sessionsData.map((session: any) => ({
        id: session.id,
        event_id: session.event_id,
        title: session.title,
        created_at: session.created_at,
        updated_at: session.updated_at,
        event: eventsMap.get(session.event_id) || null,
      }));
      
      setChatSessions(sessions as ChatSession[]);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      setChatSessions([]);
    }
  };

  const handleDeleteChatSession = async (sessionId: string, sessionTitle: string) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      
      toast.success(`Deleted chat "${sessionTitle}" successfully`);
      loadChatSessions();
    } catch (error) {
      console.error('Error deleting chat session:', error);
      toast.error('Failed to delete chat');
    }
  };


  const userData = {
    name: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'User',
    email: user?.email || '',
    avatar: user?.user_metadata?.avatar_url
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => {
              // Clear any selected event and navigate to dashboard
              if (onEventSelect) {
                onEventSelect('');
              }
              navigate('/dashboard');
            }}>
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Brain className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">HackGPT</span>
                <span className="truncate text-xs">AI Assistant</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chat History</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {chatSessions.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No chats yet. Start a conversation to see it here.
                </div>
              ) : (
                chatSessions.map((session) => {
                  const displayName = session.event?.name || session.title || 'Untitled Chat';
                  const isSelected = selectedEventId === session.event_id;
                  
                  return (
                    <SidebarMenuItem key={session.id} className="group">
                      <SidebarMenuButton 
                        onClick={() => onEventSelect?.(session.event_id)}
                        className={`w-full justify-between pr-1 ${isSelected ? 'bg-accent' : ''}`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <MessageSquare className="h-4 w-4 flex-shrink-0" />
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="truncate text-sm font-medium">{displayName}</span>
                            {session.event && (
                              <span className="truncate text-xs text-muted-foreground">
                                {new Date(session.updated_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this chat? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteChatSession(session.id, displayName)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  );
}