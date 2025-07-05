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
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents((data as Event[]) || []);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      
      toast.success(`Deleted "${eventName}" successfully`);
      loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
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
              {events.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No chats yet
                </div>
              ) : (
                events.map((event) => (
                  <SidebarMenuItem key={event.id} className="group">
                    <SidebarMenuButton 
                      onClick={() => onEventSelect?.(event.id)}
                      className="w-full justify-between pr-1"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MessageSquare className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate text-sm">{event.name}</span>
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
                              Are you sure you want to delete "{event.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteEvent(event.id, event.name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
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