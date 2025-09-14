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

interface CrawlData {
  title: string;
  content: string;
  metadata: {
    url: string;
    crawled_at: string;
    word_count: number;
  };
}

// Simple text extraction function
const extractTextFromHtml = (html: string): string => {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, ' ');
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
};

const crawlUrl = async (url: string): Promise<CrawlData> => {
  try {
    console.log(`Crawling URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EventInsightBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const content = extractTextFromHtml(html);
    
    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;

    return {
      title,
      content,
      metadata: {
        url,
        crawled_at: new Date().toISOString(),
        word_count: content.split(/\s+/).length,
      }
    };
  } catch (error) {
    console.error(`Error crawling ${url}:`, error);
    throw error;
  }
};

const createEmbedding = async (text: string): Promise<number[]> => {
  if (!aimlApiKey) {
    console.warn('AIML API key not found, skipping embedding generation');
    return [];
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
        input: text.substring(0, 8000), // Limit to 8k chars
      }),
    });

    if (!response.ok) {
      throw new Error(`AIML API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    return [];
  }
};

const chunkText = (text: string, maxChunkSize = 1000): string[] => {
  const sentences = text.split(/[.!?]+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 50); // Filter out very short chunks
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId, url } = await req.json();

    if (!eventId || !url) {
      return new Response(
        JSON.stringify({ error: 'Missing eventId or url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting crawl for event ${eventId}, URL: ${url}`);

    // Update event status to crawling
    await supabase
      .from('events')
      .update({ status: 'crawling' })
      .eq('id', eventId);

    try {
      // Crawl the main URL
      const crawlData = await crawlUrl(url);

      // Save URL data
      const { data: urlData, error: urlError } = await supabase
        .from('event_urls')
        .insert({
          event_id: eventId,
          url: url,
          title: crawlData.title,
          content: crawlData.content,
          metadata: crawlData.metadata,
          crawl_status: 'completed'
        })
        .select()
        .single();

      if (urlError) throw urlError;

      // Chunk the content and create embeddings
      const chunks = chunkText(crawlData.content);
      console.log(`Created ${chunks.length} content chunks`);

      const embeddingPromises = chunks.map(async (chunk, index) => {
        const embedding = await createEmbedding(chunk);
        
        return supabase
          .from('content_embeddings')
          .insert({
            event_id: eventId,
            url_id: urlData.id,
            content_chunk: chunk,
            embedding: embedding.length > 0 ? JSON.stringify(embedding) : null,
            metadata: {
              chunk_index: index,
              chunk_length: chunk.length,
            }
          });
      });

      await Promise.all(embeddingPromises);

      // Update event with crawl data and mark as completed
      await supabase
        .from('events')
        .update({
          status: 'completed',
          crawl_data: {
            total_chunks: chunks.length,
            total_words: crawlData.metadata.word_count,
            crawled_at: new Date().toISOString(),
            urls_processed: 1
          }
        })
        .eq('id', eventId);

      console.log(`Successfully completed crawl for event ${eventId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          chunks_created: chunks.length,
          words_processed: crawlData.metadata.word_count
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (crawlError) {
      console.error('Crawl error:', crawlError);
      
      // Mark event as failed
      await supabase
        .from('events')
        .update({ 
          status: 'failed',
          crawl_data: {
            error: crawlError.message,
            failed_at: new Date().toISOString()
          }
        })
        .eq('id', eventId);

      return new Response(
        JSON.stringify({ error: 'Crawling failed: ' + crawlError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});