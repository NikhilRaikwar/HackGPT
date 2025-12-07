// @ts-ignore - Deno-specific import
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-ignore - Deno-specific import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno-specific import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore - Deno environment variable
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
// @ts-ignore - Deno environment variable
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// @ts-ignore - Deno environment variable
const aimlApiKey = Deno.env.get('AIMLAPI_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

const MODEL_CONFIG = {
  reasoning: {
    primary: 'deepseek/deepseek-r1',
    fast: 'gpt-4o',
    longForm: 'claude-3.7-sonnet-20250219',
    openSource: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
  },
  chat: {
    primary: 'gpt-4o',
    altFast: 'gpt-4o-mini',
  },
  embeddings: {
    primary: 'text-embedding-3-large',
    secondary: 'text-embedding-3-small',
    voyage: 'voyage-large-2-instruct',
    retrieval: 'togethercomputer/m2-bert-80M-32k-retrieval',
  },
} as const;

const createEmbedding = async (text: string): Promise<number[]> => {
  if (!aimlApiKey) {
    throw new Error('AIML API key not configured');
  }

  try {
    const response = await fetch('https://api.aimlapi.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aimlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_CONFIG.embeddings.primary,
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`AIML API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw error;
  }
};

const findRelevantContent = async (eventId: string, query: string, limit = 5): Promise<string[]> => {
  try {
    // First check if any content exists for this event
    const { count, error: countError } = await supabase
      .from('content_embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    if (countError) {
      console.error('Error checking content count:', countError);
    }

    if (count === 0) {
      console.log(`No content embeddings found for event ${eventId}`);
      return [];
    }

    // Create embedding for the query using AIML API
    const queryEmbedding = await createEmbedding(query);
    
    if (queryEmbedding.length === 0) {
      console.warn('Failed to create query embedding, using fallback');
      // Fallback: get recent content chunks
      const { data, error: fallbackError } = await supabase
        .from('content_embeddings')
        .select('content_chunk')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fallbackError) {
        console.error('Fallback query error:', fallbackError);
        return [];
      }
      return data?.map((item: { content_chunk: string }) => item.content_chunk) || [];
    }
    
    // Try vector similarity search first (if embeddings exist)
    const { count: embeddingCount } = await supabase
      .from('content_embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .not('embedding', 'is', null);

    if (embeddingCount && embeddingCount > 0 && queryEmbedding.length > 0) {
      // Use pgvector similarity via RPC to find the most relevant chunks
      const { data, error } = await supabase.rpc('match_event_content', {
        event_id: eventId,
        query_embedding: queryEmbedding,
        match_count: limit,
        match_threshold: 0.3, // Lower threshold for better recall
      });

      if (error) {
        console.error('RPC match_event_content error:', error);
        // Fall through to fallback
      } else {
        const results = (data as { content_chunk: string; similarity: number }[] | null) || [];
        
        // Filter out low similarity results and return content
        const relevantChunks = results
          .filter(item => item.similarity >= 0.3)
          .map(item => item.content_chunk);

        if (relevantChunks.length > 0) {
          return relevantChunks;
        }
      }
    }

    // Fallback: get content chunks (with or without embeddings)
    console.log('Using fallback: retrieving content chunks without vector search');
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('content_embeddings')
      .select('content_chunk')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Get more chunks for fallback

    if (fallbackError) {
      console.error('Fallback query error:', fallbackError);
      return [];
    }
    
    const fallbackChunks = fallbackData?.map((item: { content_chunk: string }) => item.content_chunk) || [];
    
    if (fallbackChunks.length === 0) {
      console.log(`No content chunks found at all for event ${eventId}`);
    }
    
    return fallbackChunks.slice(0, limit);
    
  } catch (error) {
    console.error('Error finding relevant content:', error);
    
    // Final fallback: get random content chunks
    try {
      const { data, error: fallbackError } = await supabase
        .from('content_embeddings')
        .select('content_chunk')
        .eq('event_id', eventId)
        .limit(limit);

      if (fallbackError) {
        console.error('Final fallback error:', fallbackError);
        return [];
      }
      return data?.map((item: { content_chunk: string }) => item.content_chunk) || [];
    } catch (finalError) {
      console.error('Final fallback failed:', finalError);
      return [];
    }
  }
};

const MODEL_MAP: Record<string, string> = {
  'grok-4-fast-reasoning': 'x-ai/grok-4-fast-reasoning',
  'gpt-4o': 'gpt-4o',
};

const resolveChatModel = (requestedModelId?: string): string => {
  if (!requestedModelId) {
    throw new Error('No model configured for this event');
  }

  // If the caller already passed a full model id (e.g. "deepseek/deepseek-r1"), trust it
  if (requestedModelId.includes('/') || requestedModelId.includes('.')) {
    return requestedModelId;
  }

  // Map short IDs to full model IDs
  const fullModelId = MODEL_MAP[requestedModelId];
  if (fullModelId) {
    return fullModelId;
  }

  // Fallback to default
  console.warn(`Unknown model id: ${requestedModelId}, using default grok-4-fast-reasoning`);
  return 'x-ai/grok-4-fast-reasoning';
};

// Function calling tools
const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_event_info",
      description: "Get detailed information about the event including rules, timeline, prizes, and participation details",
      parameters: {
        type: "object",
        properties: {
          info_type: {
            type: "string",
            enum: ["rules", "timeline", "prizes", "participation", "judging", "all"],
            description: "Type of information to retrieve"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_content",
      description: "Search for specific content within the event information",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query to find specific information"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "get_participation_guide",
      description: "Get a step-by-step guide on how to participate in this hackathon",
      parameters: {
        type: "object",
        properties: {
          focus_area: {
            type: "string",
            enum: ["registration", "submission", "teams", "technical", "all"],
            description: "Specific area of participation to focus on"
          }
        },
        required: []
      }
    }
  }
];

const generateResponse = async (context: string[], userMessage: string, modelId?: string): Promise<string> => {
  if (!aimlApiKey) {
    throw new Error('AIML API key not configured');
  }

  const contextText = context.join('\n\n');
  const systemPrompt = `You are an AI assistant specialized in answering questions about events, hackathons, and competitions. 

You have access to the following information about this specific event:

${contextText}

Based on this information, answer the user's question accurately and helpfully. If you can't find specific information in the provided context, say so clearly. Always cite your sources when possible and provide specific details from the event information.

Be conversational but informative. Focus on providing practical and actionable information that would be useful to someone interested in participating in or learning about this event.`;

  try {
    const model = resolveChatModel(modelId);

    const baseBody: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      // Slightly lower temperature for clearer, more factual answers
      temperature: 0.5,
      max_tokens: 900,
      // Enable function calling
      tools: TOOLS,
      tool_choice: "auto"
    };

    const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aimlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(baseBody),
    });

    if (!response.ok) {
      throw new Error(`AIML API error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices[0];
    
    // Handle function calling
    if (choice.message.tool_calls) {
      return await handleToolCalls(choice.message.tool_calls, context);
    }
    
    return choice.message.content;
  } catch (error) {
    console.error('Error generating tool response:', error);
    return `I found some information but encountered an error while processing it: ${(error as Error).message}`;
  }
};

const handleToolCalls = async (toolCalls: any[], context: string[]): Promise<string> => {
  const toolResults = [];
  
  for (const toolCall of toolCalls) {
    const { name, arguments: args } = toolCall.function;
    
    switch (name) {
      case 'get_event_info':
        const infoType = args?.info_type || 'all';
        const info = await getEventInfo(context, infoType);
        toolResults.push({
          tool_call_id: toolCall.id,
          output: info
        });
        break;
        
      case 'search_content':
        const query = args?.query;
        if (!query) {
          toolResults.push({
            tool_call_id: toolCall.id,
            output: 'Error: Search query is required'
          });
        } else {
          const searchResult = await searchEventContent(context, query);
          toolResults.push({
            tool_call_id: toolCall.id,
            output: searchResult
          });
        }
        break;
        
      case 'get_participation_guide':
        const focusArea = args?.focus_area || 'all';
        const guide = await getParticipationGuide(context, focusArea);
        toolResults.push({
          tool_call_id: toolCall.id,
          output: guide
        });
        break;
        
      default:
        toolResults.push({
          tool_call_id: toolCall.id,
          output: `Unknown tool: ${name}`
        });
    }
  }
  
  // Generate final response based on tool results
  const resultsText = toolResults.map(r => r.output).join('\n\n');
  
  if (!aimlApiKey) {
    throw new Error('AIML API key not configured');
  }
  
  try {
    const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aimlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'x-ai/grok-4-fast-reasoning',
        messages: [
          { 
            role: 'system', 
            content: 'You are an AI assistant. Based on the tool results provided, give a comprehensive and helpful answer to the user.' 
          },
          { 
            role: 'user', 
            content: `Based on these tool results, please provide a complete answer:\n\n${resultsText}` 
          }
        ],
        temperature: 0.5,
        max_tokens: 900,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`AIML API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating tool response:', error);
    return `I found some information but encountered an error while processing it: ${(error as Error).message}`;
  }
};

const getEventInfo = async (context: string[], infoType: string): Promise<string> => {
  const contextText = context.join('\n\n');
  
  switch (infoType) {
    case 'rules':
      return extractRules(contextText);
    case 'timeline':
      return extractTimeline(contextText);
    case 'prizes':
      return extractPrizes(contextText);
    case 'participation':
      return extractParticipation(contextText);
    case 'judging':
      return extractJudging(contextText);
    case 'all':
    default:
      return `Event Information:\n\n${contextText}`;
  }
};

const searchEventContent = async (context: string[], query: string): Promise<string> => {
  const contextText = context.join('\n\n');
  const queryLower = query.toLowerCase();
  
  // Simple keyword-based search in context
  const lines = contextText.split('\n');
  const matchingLines = lines.filter(line => 
    line.toLowerCase().includes(queryLower)
  );
  
  if (matchingLines.length === 0) {
    return `No specific information found for "${query}". Here's the general event information:\n\n${contextText}`;
  }
  
  return `Search results for "${query}":\n\n${matchingLines.join('\n')}`;
};

const getParticipationGuide = async (context: string[], focusArea: string): Promise<string> => {
  const contextText = context.join('\n\n');
  
  switch (focusArea) {
    case 'registration':
      return extractRegistrationGuide(contextText);
    case 'submission':
      return extractSubmissionGuide(contextText);
    case 'teams':
      return extractTeamGuide(contextText);
    case 'technical':
      return extractTechnicalGuide(contextText);
    case 'all':
    default:
      return `Complete Participation Guide:\n\n${contextText}`;
  }
};

// Helper functions for extracting specific information
const extractRules = (text: string): string => {
  // Look for rules-related keywords
  const rulesKeywords = ['rule', 'guideline', 'requirement', 'criteria', 'must', 'should'];
  const lines = text.split('\n');
  const rulesLines = lines.filter(line => 
    rulesKeywords.some(keyword => line.toLowerCase().includes(keyword))
  );
  
  return rulesLines.length > 0 
    ? `Event Rules:\n\n${rulesLines.join('\n')}`
    : `No specific rules found in the event information.`;
};

const extractTimeline = (text: string): string => {
  // Look for date/time patterns
  const datePattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/i;
  const lines = text.split('\n');
  const timelineLines = lines.filter(line => datePattern.test(line));
  
  return timelineLines.length > 0
    ? `Event Timeline:\n\n${timelineLines.join('\n')}`
    : `No specific timeline found in the event information.`;
};

const extractPrizes = (text: string): string => {
  // Look for prize-related keywords
  const prizeKeywords = ['prize', 'award', 'win', 'reward', 'cash', 'money', '$'];
  const lines = text.split('\n');
  const prizeLines = lines.filter(line => 
    prizeKeywords.some(keyword => line.toLowerCase().includes(keyword))
  );
  
  return prizeLines.length > 0
    ? `Prizes and Awards:\n\n${prizeLines.join('\n')}`
    : `No specific prize information found in the event information.`;
};

const extractParticipation = (text: string): string => {
  // Look for participation-related keywords
  const participationKeywords = ['participate', 'join', 'enter', 'register', 'sign up', 'who can'];
  const lines = text.split('\n');
  const participationLines = lines.filter(line => 
    participationKeywords.some(keyword => line.toLowerCase().includes(keyword))
  );
  
  return participationLines.length > 0
    ? `Participation Information:\n\n${participationLines.join('\n')}`
    : `No specific participation information found in the event information.`;
};

const extractJudging = (text: string): string => {
  // Look for judging-related keywords
  const judgingKeywords = ['judge', 'judging', 'criteria', 'evaluation', 'score', 'assessment'];
  const lines = text.split('\n');
  const judgingLines = lines.filter(line => 
    judgingKeywords.some(keyword => line.toLowerCase().includes(keyword))
  );
  
  return judgingLines.length > 0
    ? `Judging Information:\n\n${judgingLines.join('\n')}`
    : `No specific judging information found in the event information.`;
};

const extractRegistrationGuide = (text: string): string => {
  const registrationKeywords = ['register', 'registration', 'sign up', 'enroll'];
  const lines = text.split('\n');
  const registrationLines = lines.filter(line => 
    registrationKeywords.some(keyword => line.toLowerCase().includes(keyword))
  );
  
  return registrationLines.length > 0
    ? `Registration Guide:\n\n${registrationLines.join('\n')}`
    : `No specific registration information found. Please check the event website for registration details.`;
};

const extractSubmissionGuide = (text: string): string => {
  const submissionKeywords = ['submit', 'submission', 'deadline', 'deliverable'];
  const lines = text.split('\n');
  const submissionLines = lines.filter(line => 
    submissionKeywords.some(keyword => line.toLowerCase().includes(keyword))
  );
  
  return submissionLines.length > 0
    ? `Submission Guide:\n\n${submissionLines.join('\n')}`
    : `No specific submission information found. Please check the event website for submission guidelines.`;
};

const extractTeamGuide = (text: string): string => {
  const teamKeywords = ['team', 'group', 'collaborate', 'member'];
  const lines = text.split('\n');
  const teamLines = lines.filter(line => 
    teamKeywords.some(keyword => line.toLowerCase().includes(keyword))
  );
  
  return teamLines.length > 0
    ? `Team Information:\n\n${teamLines.join('\n')}`
    : `No specific team information found. Please check the event website for team guidelines.`;
};

const extractTechnicalGuide = (text: string): string => {
  const techKeywords = ['technology', 'tech stack', 'api', 'framework', 'library', 'tool'];
  const lines = text.split('\n');
  const techLines = lines.filter(line => 
    techKeywords.some(keyword => line.toLowerCase().includes(keyword))
  );
  
  return techLines.length > 0
    ? `Technical Information:\n\n${techLines.join('\n')}`
    : `No specific technical information found. Please check the event website for technical requirements.`;
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, eventId, message, modelId } = await req.json();

    if (!sessionId || !eventId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing chat for event ${eventId}, session ${sessionId}`);

    // Find relevant content based on the user's message
    const relevantContent = await findRelevantContent(eventId, message);

    let aiResponse: string;
    let resolvedModel: string;

    // Check event status to provide better context
    const { data: eventData } = await supabase
      .from('events')
      .select('status, crawl_data')
      .eq('id', eventId)
      .single();

    const eventStatus = eventData?.status || 'unknown';
    const crawlData = eventData?.crawl_data as any;

    if (relevantContent.length === 0) {
      // Graceful fallback when no content is available for this event
      resolvedModel = resolveChatModel(modelId);
      
      if (eventStatus === 'crawling') {
        aiResponse = `I'm currently crawling and indexing the content for this event. The process is still in progress, so I don't have all the information yet.

You can ask me questions now, and I'll do my best to answer based on what's been indexed so far. Once crawling completes, I'll have access to the full event details.

If you'd like, you can wait a moment and try again, or ask general questions about hackathons in the meantime.`;
      } else if (eventStatus === 'pending') {
        aiResponse = `The crawling process hasn't started yet for this event. This usually happens automatically, but if it's taking too long, you may want to check the event URL or recreate the assistant.

You can still ask me general questions about participating in hackathons, but I won't have specific details about this event until crawling completes.`;
      } else if (eventStatus === 'failed') {
        aiResponse = `Unfortunately, the crawling process failed for this event. This could be due to:
- The URL being inaccessible or behind a login
- Network issues during crawling
- The page structure not being compatible with our crawler

You can try recreating the assistant with the event URL, or ask me general questions about hackathons.`;
      } else {
        aiResponse = `I couldn't find any indexed content for this event yet. This usually means the crawl didn't extract readable text from the page or is still processing.

Here are a few things you can try:
- Recheck that the hackathon URL is publicly accessible and not behind a login.
- Recreate the assistant and make sure crawling completes.
- If the event page is mostly images or scripts, I may not be able to read detailed rules.

You can still ask me general questions about participating in hackathons, but I won't have specific details about this event until its content is available.`;
      }
    } else {
      // Generate AI response with the event's configured model using the retrieved context
      aiResponse = await generateResponse(relevantContent, message, modelId);
      resolvedModel = resolveChatModel(modelId);
    }

    // Save assistant message to database
    const { data: messageData, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: aiResponse,
        metadata: {
          context_chunks: relevantContent.length,
          model: resolvedModel,
        }
      })
      .select()
      .single();

    if (messageError) throw messageError;

    console.log(`Successfully generated response for session ${sessionId}`);

    return new Response(
      JSON.stringify({
        content: aiResponse,
        messageId: messageData.id,
        created_at: messageData.created_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});