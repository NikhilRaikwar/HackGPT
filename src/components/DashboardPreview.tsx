import React, { useState } from 'react';
import { Brain, MessageSquare, LinkIcon, ChevronRight, Plus, Menu, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MagicCard } from '@/components/magicui/magic-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Event {
  id: string;
  name: string;
  status: 'completed' | 'pending';
}

const mockEvents: Event[] = [
  { id: '1', name: 'TechCrunch Disrupt 2024', status: 'completed' },
  { id: '2', name: 'DevPost Hackathon', status: 'completed' },
];

const mockUser = {
  name: 'John Doe',
  email: 'john@example.com',
  avatar: null
};

export const DashboardPreview = () => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>('1');
  const [showForm, setShowForm] = useState(false);
  const [eventName, setEventName] = useState('TechCrunch Disrupt 2024');
  const [eventUrl, setEventUrl] = useState('https://techcrunch.com/events/disrupt-2024');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const selectedEvent = mockEvents.find(e => e.id === selectedEventId);

  const handleEventSelect = (eventId: string) => {
    if (!eventId) {
      setSelectedEventId(null);
      setShowForm(true);
      return;
    }
    setSelectedEventId(eventId);
    setShowForm(false);
    // Close sidebar on mobile after selection
    setSidebarOpen(false);
  };

  const handleLogoClick = () => {
    setSelectedEventId(null);
    setShowForm(true);
    // Close sidebar on mobile after logo click
    setSidebarOpen(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-background border border-border rounded-lg shadow-2xl overflow-hidden">
      {/* Mobile Header */}
      <div className="xl:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <button 
          onClick={handleLogoClick}
          className="flex items-center gap-2"
        >
          <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <Brain className="size-4" />
          </div>
          <div className="text-left">
            <div className="font-medium text-sm">HackGPT</div>
            <div className="text-xs text-muted-foreground">AI Assistant</div>
          </div>
        </button>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex h-[600px] lg:h-[600px] md:h-[500px] sm:h-[400px]">
        {/* Sidebar - Desktop Only */}
        <div className="hidden xl:flex w-64 border-r border-border bg-card flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <button 
              onClick={handleLogoClick}
              className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
            >
              <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Brain className="size-4" />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm">HackGPT</div>
                <div className="text-xs text-muted-foreground">AI Assistant</div>
              </div>
            </button>
          </div>
          
          {/* Chat History */}
          <div className="flex-1 p-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Chat History</h3>
              {mockEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => handleEventSelect(event.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer group ${
                    selectedEventId === event.id ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm text-left">{event.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {event.status}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={mockUser.avatar} />
                <AvatarFallback className="text-xs">
                  {mockUser.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{mockUser.name}</p>
                <p className="text-xs text-muted-foreground truncate">{mockUser.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="xl:hidden absolute inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col">
              {/* Mobile Sidebar Header */}
              <div className="p-4 border-b border-border">
                <button 
                  onClick={handleLogoClick}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                >
                  <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Brain className="size-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm">HackGPT</div>
                    <div className="text-xs text-muted-foreground">AI Assistant</div>
                  </div>
                </button>
              </div>
              
              {/* Mobile Chat History */}
              <div className="flex-1 p-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Chat History</h3>
                  {mockEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => handleEventSelect(event.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer group ${
                        selectedEventId === event.id ? 'bg-accent' : 'hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm text-left">{event.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {event.status}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Mobile Footer */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={mockUser.avatar} />
                    <AvatarFallback className="text-xs">
                      {mockUser.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{mockUser.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{mockUser.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Desktop Header */}
          <header className="hidden xl:flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 px-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">HackGPT Dashboard</span>
                {selectedEvent && (
                  <>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{selectedEvent.name}</span>
                  </>
                )}
                {!selectedEvent && (
                  <>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Home</span>
                  </>
                )}
              </div>
            </div>
          </header>
          
          {/* Content */}
          <div className="flex-1 p-4 lg:p-6 overflow-hidden">
            {showForm ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-full max-w-lg">
                  <MagicCard
                    gradientColor="#1a1a1a"
                    className="relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
                    <div className="relative z-10">
                      <Card className="border-0 shadow-none bg-transparent">
                        <CardHeader className="text-center pb-4 lg:pb-6">
                          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 lg:mb-4">
                            <LinkIcon className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                          </div>
                          <CardTitle className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                            Add Event URL
                          </CardTitle>
                          <CardDescription className="text-sm lg:text-base text-muted-foreground max-w-sm mx-auto">
                            Transform any hackathon URL into an intelligent Q&A chatbot
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="px-4 lg:px-6 pb-4 lg:pb-6">
                          <div className="space-y-4 lg:space-y-6">
                            <div className="space-y-3 lg:space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="preview-event-name" className="text-sm font-medium text-foreground">
                                  Event Name
                                </Label>
                                <div className="relative group">
                                  <Input
                                    id="preview-event-name"
                                    type="text"
                                    placeholder="e.g., DevPost Hackathon 2024"
                                    value={eventName}
                                    onChange={(e) => setEventName(e.target.value)}
                                    className="h-10 lg:h-12 px-3 lg:px-4 border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 group-hover:border-primary/30"
                                  />
                                  <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="preview-event-url" className="text-sm font-medium text-foreground">
                                  Event URL
                                </Label>
                                <div className="relative group">
                                  <Input
                                    id="preview-event-url"
                                    type="url"
                                    placeholder="https://example.com/hackathon"
                                    value={eventUrl}
                                    onChange={(e) => setEventUrl(e.target.value)}
                                    className="h-10 lg:h-12 px-3 lg:px-4 border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 group-hover:border-primary/30"
                                  />
                                  <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                </div>
                              </div>
                            </div>
                            <div className="pt-2">
                              <Button 
                                className="w-full h-10 lg:h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl" 
                                onClick={() => {
                                  // Simulate creating a new event
                                  const newEvent = { id: '4', name: eventName, status: 'completed' as const };
                                  mockEvents.unshift(newEvent);
                                  handleEventSelect(newEvent.id);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <Plus className="w-4 h-4" />
                                  <span>Create AI Assistant</span>
                                </div>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </MagicCard>
                </div>
              </div>
            ) : selectedEvent ? (
              <div className="h-full flex flex-col">
                <Card className="bg-card border-border shadow-card overflow-hidden flex-1">
                  <CardHeader className="border-b border-border/50 bg-card/50 backdrop-blur-sm p-4 lg:p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Brain className="w-3 h-3 lg:w-4 lg:h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base lg:text-lg truncate">Chat with Event Assistant</CardTitle>
                        <CardDescription className="truncate">{selectedEvent.name}</CardDescription>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex-1">
                    <div className="space-y-3 lg:space-y-4 p-4 lg:p-6 h-full overflow-y-auto">
                      <div className="space-y-3">
                        <div className="bg-muted rounded-lg p-3 max-w-[85%] lg:max-w-[80%]">
                          <p className="text-sm">What are the main tracks for this hackathon?</p>
                        </div>
                        <div className="bg-primary rounded-lg p-3 max-w-[90%] lg:max-w-[85%] ml-auto">
                          <p className="text-sm text-primary-foreground">
                            This hackathon features 5 main tracks: AI/ML, FinTech, HealthTech, Climate Tech, and Future of Work. Each track has specific judging criteria and specialized mentors.
                          </p>
                        </div>
                        <div className="bg-muted rounded-lg p-3 max-w-[80%] lg:max-w-[70%]">
                          <p className="text-sm">When is the demo day?</p>
                        </div>
                        <div className="bg-primary rounded-lg p-3 max-w-[85%] lg:max-w-[80%] ml-auto">
                          <p className="text-sm text-primary-foreground">
                            The demo day is scheduled for December 15th, 2024. Teams will have 5 minutes to present their projects to the judging panel.
                          </p>
                        </div>
                        <div className="bg-muted rounded-lg p-3 max-w-[75%]">
                          <p className="text-sm">What are the prizes?</p>
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
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4 px-4">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Brain className="w-6 h-6 lg:w-8 lg:h-8 text-primary" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-semibold">Welcome to HackGPT</h3>
                  <p className="text-muted-foreground max-w-sm text-sm lg:text-base">
                    Click on a chat from the sidebar or add a new event URL to get started
                  </p>
                  <Button 
                    onClick={() => setShowForm(true)}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Event
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 