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
  embeddings: {
    primary: 'text-embedding-3-large',
    secondary: 'text-embedding-3-small',
    voyage: 'voyage-large-2-instruct',
    retrieval: 'togethercomputer/m2-bert-80M-32k-retrieval',
  },
} as const;

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
    hackathon_info?: any;
  };
}

// Enhanced text extraction for hackathon content
const extractTextFromHtml = (html: string): string => {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  
  // Convert common hackathon elements to readable text
  text = text.replace(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi, '\n\n$1\n');
  text = text.replace(/<strong[^>]*>([^<]+)<\/strong>/gi, '**$1**');
  text = text.replace(/<b[^>]*>([^<]+)<\/b>/gi, '**$1**');
  text = text.replace(/<em[^>]*>([^<]+)<\/em>/gi, '*$1*');
  text = text.replace(/<i[^>]*>([^<]+)<\/i>/gi, '*$1*');
  
  // Handle lists properly
  text = text.replace(/<ul[^>]*>/gi, '\n');
  text = text.replace(/<ol[^>]*>/gi, '\n');
  text = text.replace(/<\/ul>/gi, '\n');
  text = text.replace(/<\/ol>/gi, '\n');
  text = text.replace(/<li[^>]*>([^<]+)<\/li>/gi, '• $1\n');
  
  // Handle paragraphs and line breaks
  text = text.replace(/<p[^>]*>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<br[^>]*>/gi, '\n');
  
  // Remove remaining HTML tags
  text = text.replace(/<[^>]*>/g, ' ');
  
  // Clean up whitespace and formatting
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove excessive newlines
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
};

// Extract structured hackathon information
const extractHackathonInfo = (html: string, text: string): any => {
  const info: any = {};
  
  // Extract title with priority
  const titleSelectors = [
    /<h1[^>]*class=["'][^"']*(?:title|event-title|hackathon)[^"']*["'][^>]*>([^<]+)<\/h1>/i,
    /<title[^>]*>([^<]+)<\/title>/i,
    /<h1[^>]*>([^<]+)<\/h1>/i,
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
  ];
  
  for (const selector of titleSelectors) {
    const match = html.match(selector);
    if (match && match[1]) {
      info.title = match[1].trim();
      break;
    }
  }
  
  // Extract dates
  const datePatterns = [
    /(?:date|when|starts?|ends?|begins?)[\s:]*([\d]{1,2}[\/-][\d]{1,2}[\/-][\d]{2,4}|[\d]{4}[\/-][\d]{1,2}[\/-][\d]{1,2})/gi,
    /([\d]{1,2}[\/-][\d]{1,2}[\/-][\d]{2,4}|[\d]{4}[\/-][\d]{1,2}[\/-][\d]{1,2})\s*(?:to|until|till|-|–)\s*([\d]{1,2}[\/-][\d]{1,2}[\/-][\d]{2,4}|[\d]{4}[\/-][\d]{1,2}[\/-][\d]{1,2})/gi,
    /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)[\s\d]{1,30}/gi
  ];
  
  const dates = [];
  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      dates.push(...matches);
    }
  }
  if (dates.length > 0) {
    info.dates = [...new Set(dates)]; // Remove duplicates
  }
  
  // Extract prizes
  const prizePatterns = [
    /(?:prize|prize pool|award|reward|winning)[\s:]*[$]?[\d,]+(?:\s*(?:usd|dollars?|cash))?/gi,
    /\$[\d,]+(?:\s*(?:in prizes?|awards?|cash))?/gi,
    /(?:first|second|third|1st|2nd|3rd)\s+place[\s:]*[$]?[\d,]+/gi
  ];
  
  const prizes = [];
  for (const pattern of prizePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      prizes.push(...matches);
    }
  }
  if (prizes.length > 0) {
    info.prizes = [...new Set(prizes)];
  }
  
  // Extract registration/submission info
  const registrationPatterns = [
    /(?:register|registration|sign.?up)[\s:]*([\d]{1,2}[\/-][\d]{1,2}[\/-][\d]{2,4}|[\d]{4}[\/-][\d]{1,2}[\/-][\d]{1,2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\s\d]{1,30}/gi,
    /(?:deadline|due|submit)[\s:]*([\d]{1,2}[\/-][\d]{1,2}[\/-][\d]{2,4}|[\d]{4}[\/-][\d]{1,2}[\/-][\d]{1,2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\s\d]{1,30}/gi
  ];
  
  const deadlines = [];
  for (const pattern of registrationPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      deadlines.push(...matches);
    }
  }
  if (deadlines.length > 0) {
    info.deadlines = [...new Set(deadlines)];
  }
  
  // Extract location (virtual/physical)
  const locationPatterns = [
    /(?:location|venue|where)[\s:]*([^\n\r]{10,100})/gi,
    /(?:virtual|online|remote)/gi,
    /(?:\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+)/gi
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      info.location = match[0].trim();
      break;
    }
  }
  
  // Extract tech stack/technologies
  const techPatterns = [
    /(?:tech|technology|stack|tools)[\s:]*([^\n\r]{10,200})/gi,
    /(?:react|vue|angular|node|python|javascript|typescript|java|swift|kotlin|flutter|docker|kubernetes|aws|azure|gcp|firebase|mongodb|postgresql|mysql|graphql|rest api)/gi
  ];
  
  const technologies = [];
  for (const pattern of techPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      technologies.push(...matches);
    }
  }
  if (technologies.length > 0) {
    info.technologies = [...new Set(technologies)];
  }
  
  return info;
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
        'User-Agent': 'Mozilla/5.0 (compatible; HackathonBot/1.0; +https://hackgpt.ai)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const content = extractTextFromHtml(html);
    const hackathonInfo = extractHackathonInfo(html, content);
    const links = extractLinks(html, url);
    
    // Extract title with fallback to hackathon info
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = hackathonInfo.title || (titleMatch ? titleMatch[1].trim() : new URL(url).hostname);

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
        hackathon_info: hackathonInfo,
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

  if (!text || text.trim().length === 0) {
    console.warn('Empty text provided for embedding');
    return [];
  }

  try {
    // Truncate text to reasonable length for embedding (8k chars)
    const truncatedText = text.substring(0, 8000);
    
    const response = await fetch('https://api.aimlapi.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aimlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_CONFIG.embeddings.primary,
        input: truncatedText,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AIML API error: ${response.status} - ${errorText}`);
      throw new Error(`AIML API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      console.error('Invalid embedding response structure:', data);
      return [];
    }

    const embedding = data.data[0].embedding;
    
    // Validate embedding dimensions (should be 1536 for text-embedding-3-large)
    if (!Array.isArray(embedding) || embedding.length === 0) {
      console.error('Invalid embedding format');
      return [];
    }

    return embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    return [];
  }
};

const chunkText = (text: string, maxChunkSize = 1500): string[] => {
  // First, try to preserve semantic structure
  const sections = text.split(/\n\n+/); // Split by double newlines (paragraphs)
  const chunks: string[] = [];
  
  for (const section of sections) {
    const trimmedSection = section.trim();
    if (trimmedSection.length < 50) continue; // Skip very short sections
    
    // If section is small enough, keep it whole
    if (trimmedSection.length <= maxChunkSize) {
      chunks.push(trimmedSection);
      continue;
    }
    
    // For larger sections, try to split by sentences while preserving context
    const sentences = trimmedSection.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const testChunk = currentChunk + (currentChunk ? '. ' : '') + sentence;
      
      if (testChunk.length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk = testChunk;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
  }
  
  // Filter chunks and ensure minimum quality
  return chunks.filter(chunk => {
    const trimmed = chunk.trim();
    return trimmed.length >= 50 && trimmed.length <= 2000; // Reasonable chunk sizes
  });
};

interface CrawlConfig {
  maxDepth: number;
  maxPages: number;
  includeExternal: boolean;
  modelId?: string;
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
          metadata: {
            ...crawlData.metadata,
            hackathon_info: crawlData.metadata.hackathon_info || {}
          },
          crawl_status: 'completed',
        })
        .select()
        .single();

      if (urlError) {
        throw urlError;
      }

      const chunks = chunkText(crawlData.content);

      if (chunks.length === 0) {
        console.warn(`No chunks extracted from URL: ${current.url}`);
        continue;
      }

      // Process embeddings in batches to avoid overwhelming the API
      const batchSize = 5;
      let successfulInserts = 0;
      let failedInserts = 0;
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        const embeddingPromises = batch.map(async (chunk, batchIndex) => {
          const globalIndex = i + batchIndex;
          
          // Skip very short chunks
          if (chunk.trim().length < 50) {
            console.log(`Skipping chunk ${globalIndex}: too short (${chunk.length} chars)`);
            return { success: false, reason: 'too_short' };
          }

          try {
            const embedding = await createEmbedding(chunk);
            
            // Always insert the chunk, even if embedding failed (for fallback search)
            const insertData: any = {
              event_id: eventId,
              url_id: urlData.id,
              content_chunk: chunk,
              metadata: {
                chunk_index: globalIndex,
                chunk_length: chunk.length,
                url: current.url,
              },
            };

            // Only add embedding if we got a valid one
            if (embedding && embedding.length > 0) {
              insertData.embedding = embedding;
            } else {
              console.warn(`No embedding created for chunk ${globalIndex}, inserting without embedding`);
            }

            const { data, error } = await supabase
              .from('content_embeddings')
              .insert(insertData)
              .select('id')
              .single();

            if (error) {
              console.error(`Failed to insert chunk ${globalIndex}:`, error);
              return { success: false, error };
            }

            return { success: true, id: data?.id };
          } catch (err) {
            console.error(`Error processing chunk ${globalIndex}:`, err);
            return { success: false, error: err };
          }
        });

        const results = await Promise.all(embeddingPromises);
        
        // Count successes and failures
        results.forEach(result => {
          if (result.success) {
            successfulInserts++;
          } else {
            failedInserts++;
            if ((result as any).error) {
              console.error('Insert error:', (result as any).error);
            }
          }
        });

        // Log batch progress
        if (failedInserts > 0) {
          console.warn(`Batch ${i}-${i + batch.length}: ${successfulInserts} succeeded, ${failedInserts} failed`);
        }
      }

      console.log(`Processed ${chunks.length} chunks: ${successfulInserts} inserted successfully, ${failedInserts} failed`);

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
    const { eventId, url, maxDepth, maxPages, includeExternal, modelId } = await req.json();

    if (!eventId || !url) {
      return new Response(
        JSON.stringify({ error: 'Missing eventId or url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting crawl for event ${eventId}, URL: ${url}`);

    // Resolve effective modelId: require a configured model, do not fall back silently
    let effectiveModelId: string | null = null;

    if (typeof modelId === 'string' && modelId.length > 0) {
      effectiveModelId = modelId;
    } else {
      const { data: existingEvent, error: eventError } = await supabase
        .from('events')
        .select('model_id')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('Error loading event for model resolution:', eventError);
      }

      if (existingEvent && (existingEvent as any).model_id) {
        effectiveModelId = (existingEvent as any).model_id as string;
      }
    }

    if (!effectiveModelId) {
      console.error('No model configured for event, aborting crawl:', eventId);
      return new Response(
        JSON.stringify({ error: 'No model configured for this event. Please recreate the assistant with a model selected.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update event status to crawling and persist effective model id
    await supabase
      .from('events')
      .update({ status: 'crawling', model_id: effectiveModelId })
      .eq('id', eventId);

    try {
      const crawlConfig: CrawlConfig = {
        maxDepth: typeof maxDepth === 'number' ? maxDepth : 0,
        maxPages: typeof maxPages === 'number' ? maxPages : 1,
        includeExternal: typeof includeExternal === 'boolean' ? includeExternal : false,
        modelId: effectiveModelId,
      };

      const result = await crawlSite(eventId, url, crawlConfig);

      // Verify that we actually have content before marking as completed
      const { count: embeddingCount, error: countError } = await supabase
        .from('content_embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      if (countError) {
        console.error('Error counting embeddings:', countError);
      }

      const finalStatus = embeddingCount && embeddingCount > 0 ? 'completed' : 'failed';
      
      if (finalStatus === 'failed') {
        console.error(`Crawl failed: No embeddings created for event ${eventId}. Total chunks processed: ${result.totalChunks}`);
      } else {
        console.log(`Crawl succeeded: ${embeddingCount} embeddings created for event ${eventId}`);
      }
      
      // Update event with crawl data and mark as completed or failed
      await supabase
        .from('events')
        .update({
          status: finalStatus,
          crawl_data: {
            total_chunks: result.totalChunks,
            total_words: result.totalWords,
            crawled_at: new Date().toISOString(),
            urls_processed: result.urlsProcessed,
            embedding_count: embeddingCount || 0,
            config: crawlConfig,
            ...(finalStatus === 'failed' ? { 
              error: 'No content embeddings were created during crawl' 
            } : {})
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