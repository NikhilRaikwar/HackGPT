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
  html: string;
  links: {
    internal: string[];
    external: string[];
  };
  metadata: {
    url: string;
    crawled_at: string;
    word_count: number;
    internal_links: number;
    external_links: number;
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

const extractLinks = (html: string, baseUrl: string): { internal: string[]; external: string[] } => {
  const internal: string[] = [];
  const external: string[] = [];
  const anchorRegex = /<a[^>]+href=["']([^"'#]+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;

  const base = new URL(baseUrl);

  while ((match = anchorRegex.exec(html)) !== null) {
    try {
      const href = match[1];
      const absolute = new URL(href, base).toString();
      const hostMatches = new URL(absolute).hostname === base.hostname;
      if (hostMatches) {
        if (!internal.includes(absolute)) internal.push(absolute);
      } else {
        if (!external.includes(absolute)) external.push(absolute);
      }
    } catch {
      continue;
    }
  }

  return { internal, external };
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
    const links = extractLinks(html, url);
    
    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;

    return {
      title,
      content,
      html,
      links,
      metadata: {
        url,
        crawled_at: new Date().toISOString(),
        word_count: content.split(/\s+/).length,
        internal_links: links.internal.length,
        external_links: links.external.length,
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
        model: 'text-embedding-3-large',
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

interface CrawlConfig {
  maxDepth: number;
  maxPages: number;
  includeExternal: boolean;
}

const crawlSite = async (
  eventId: string,
  rootUrl: string,
  config: CrawlConfig,
) => {
  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [{ url: rootUrl, depth: 0 }];
  let totalChunks = 0;
  let totalWords = 0;
  let urlsProcessed = 0;

  while (queue.length > 0 && urlsProcessed < config.maxPages) {
    const current = queue.shift()!;
    if (visited.has(current.url)) {
      continue;
    }
    visited.add(current.url);

    try {
      const crawlData = await crawlUrl(current.url);

      const { data: urlData, error: urlError } = await supabase
        .from('event_urls')
        .insert({
          event_id: eventId,
          url: current.url,
          title: crawlData.title,
          content: crawlData.content,
          metadata: crawlData.metadata,
          crawl_status: 'completed',
        })
        .select()
        .single();

      if (urlError) {
        throw urlError;
      }

      const chunks = chunkText(crawlData.content);

      const embeddingPromises = chunks.map(async (chunk, index) => {
        const embedding = await createEmbedding(chunk);

        return supabase
          .from('content_embeddings')
          .insert({
            event_id: eventId,
            url_id: urlData.id,
            content_chunk: chunk,
            embedding: embedding.length > 0 ? embedding : null,
            metadata: {
              chunk_index: index,
              chunk_length: chunk.length,
            },
          });
      });

      await Promise.all(embeddingPromises);

      totalChunks += chunks.length;
      totalWords += crawlData.metadata.word_count;
      urlsProcessed += 1;

      if (current.depth < config.maxDepth) {
        const nextDepth = current.depth + 1;
        const nextUrls: string[] = [];
        nextUrls.push(...crawlData.links.internal);
        if (config.includeExternal) {
          nextUrls.push(...crawlData.links.external);
        }
        for (const nextUrl of nextUrls) {
          if (!visited.has(nextUrl)) {
            queue.push({ url: nextUrl, depth: nextDepth });
          }
        }
      }
    } catch (error) {
      console.error('Error processing URL in crawlSite:', error);
      continue;
    }
  }

  return {
    totalChunks,
    totalWords,
    urlsProcessed,
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId, url, maxDepth, maxPages, includeExternal } = await req.json();

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
      const crawlConfig: CrawlConfig = {
        maxDepth: typeof maxDepth === 'number' ? maxDepth : 0,
        maxPages: typeof maxPages === 'number' ? maxPages : 1,
        includeExternal: typeof includeExternal === 'boolean' ? includeExternal : false,
      };

      const result = await crawlSite(eventId, url, crawlConfig);

      // Update event with crawl data and mark as completed
      await supabase
        .from('events')
        .update({
          status: 'completed',
          crawl_data: {
            total_chunks: result.totalChunks,
            total_words: result.totalWords,
            crawled_at: new Date().toISOString(),
            urls_processed: result.urlsProcessed,
            config: crawlConfig,
          }
        })
        .eq('id', eventId);

      console.log(`Successfully completed crawl for event ${eventId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          chunks_created: result.totalChunks,
          words_processed: result.totalWords,
          urls_processed: result.urlsProcessed,
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