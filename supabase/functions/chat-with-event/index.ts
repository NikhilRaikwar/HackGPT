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
        model: 'text-embedding-ada-002',
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
    
    // Search for similar content using vector similarity
    const { data, error } = await supabase
      .from('content_embeddings')
      .select('content_chunk, metadata')
      .eq('event_id', eventId)
      .neq('embedding', null)
      .limit(limit);

    if (error) throw error;

    // For now, return all content since we don't have vector similarity search set up
    // In a production environment, you'd use pgvector's similarity functions
    return data?.map(item => item.content_chunk) || [];
    
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

const generateResponse = async (context: string[], userMessage: string): Promise<string> => {
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
    const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aimlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
    const { sessionId, eventId, message } = await req.json();

    if (!sessionId || !eventId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing chat for event ${eventId}, session ${sessionId}`);

    // Find relevant content based on the user's message
    const relevantContent = await findRelevantContent(eventId, message);
    
    if (relevantContent.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No event content found. The event may still be processing.' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate AI response
    const aiResponse = await generateResponse(relevantContent, message);

    // Save assistant message to database
    const { data: messageData, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: aiResponse,
        metadata: {
          context_chunks: relevantContent.length,
          model: 'gpt-4o'
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