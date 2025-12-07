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
      return data?.map(item => item.content_chunk) || [];
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
    
    const fallbackChunks = fallbackData?.map(item => item.content_chunk) || [];
    
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
      return data?.map(item => item.content_chunk) || [];
    } catch (finalError) {
      console.error('Final fallback failed:', finalError);
      return [];
    }
  }
};

const MODEL_MAP: Record<string, string> = {
  // Reasoning models
  'deepseek-r1': 'deepseek/deepseek-r1',
  // Chat models
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini',
  // Claude models
  'claude-sonnet': 'claude-3.7-sonnet-20250219',
  'claude-opus': 'claude-3-opus-20240229',
  'claude-haiku': 'claude-3-haiku-20240307',
  // Llama models
  'llama-405b': 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
  'llama-70b': 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
  // Other models
  'gemini-pro': 'google/gemini-pro-1.5',
  'mistral-large': 'mistralai/mistral-large-2407',
  // Perplexity models
  'sonar': 'perplexity/sonar',
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
  console.warn(`Unknown model id: ${requestedModelId}, using default gpt-4o`);
  return 'gpt-4o';
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

    const baseBody: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      // Slightly lower temperature for clearer, more factual answers
      temperature: 0.5,
      max_tokens: 900,
    };

    // If we're using Perplexity Sonar, enable web search options for crawling/answering
    if (model === 'perplexity/sonar') {
      Object.assign(baseBody, {
        search_mode: 'web',
        web_search_options: {
          search_context_size: 'medium',
        },
        // Prefer reasonably recent information while still allowing older docs
        search_recency_filter: 'year',
        return_images: false,
        return_related_questions: false,
      });
    }

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