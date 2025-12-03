import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
    // Create embedding for the query
    const queryEmbedding = await createEmbedding(query);
    
    // Use pgvector similarity via RPC to find the most relevant chunks
    const { data, error } = await supabase.rpc('match_event_content', {
      event_id: eventId,
      query_embedding: queryEmbedding,
      match_count: limit,
    });

    if (error) throw error;

    return (data as { content_chunk: string }[] | null)?.map(item => item.content_chunk) || [];
    
  } catch (error) {
    console.error('Error finding relevant content:', error);
    
    // Fallback: get random content chunks
    const { data, error: fallbackError } = await supabase
      .from('content_embeddings')
      .select('content_chunk')
      .eq('event_id', eventId)
      .limit(limit);

    if (fallbackError) throw fallbackError;
    return data?.map(item => item.content_chunk) || [];
  }
};

const resolveChatModel = (requestedModelId?: string): string => {
  if (!requestedModelId) {
    throw new Error('No model configured for this event');
  }

  // If the caller already passed a full model id (e.g. "deepseek/deepseek-r1"), trust it
  if (requestedModelId.includes('/')) return requestedModelId;

  // Map short IDs stored in events.model_id / dashboard select to concrete provider models
  switch (requestedModelId) {
    case 'deepseek-r1':
      return MODEL_CONFIG.reasoning.primary;
    case 'gpt-4o':
      return MODEL_CONFIG.chat.primary;
    case 'claude-sonnet':
      return MODEL_CONFIG.reasoning.longForm;
    case 'llama-405b':
      return MODEL_CONFIG.reasoning.openSource;
    default:
      throw new Error(`Unknown model id for event: ${requestedModelId}`);
  }
};

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
    const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aimlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AIML API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
};

serve(async (req) => {
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

    if (relevantContent.length === 0) {
      // Graceful fallback when no content is available for this event
      resolvedModel = resolveChatModel(modelId);
      aiResponse = `I couldn't find any indexed content for this event yet. This usually means the crawl didn't extract readable text from the page or is still processing.

Here are a few things you can try:
- Recheck that the hackathon URL is publicly accessible and not behind a login.
- Recreate the assistant and make sure crawling completes.
- If the event page is mostly images or scripts, I may not be able to read detailed rules.

You can still ask me general questions about participating in hackathons, but I won't have specific details about this event until its content is available.`;
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