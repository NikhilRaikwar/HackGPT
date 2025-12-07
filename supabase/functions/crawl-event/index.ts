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

    // First try direct fetch as it's usually fastest and most reliable
    try {
      const directResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        },
      });

      if (!directResponse.ok) {
        throw new Error(`Failed to fetch ${url}: ${directResponse.status} ${directResponse.statusText}`);
      }

      const html = await directResponse.text();
      const text = extractTextFromHtml(html);
      const hackathonInfo = extractHackathonInfo(html, text);
      const links = extractLinks(html, url);

      return {
        title: hackathonInfo.title || new URL(url).hostname,
        content: text,
        html,
        links,
        metadata: {
          url,
          crawled_at: new Date().toISOString(),
          word_count: text.split(/\s+/).length,
          internal_links: links.internal.length,
          external_links: links.external.length,
          hackathon_info: hackathonInfo,
        },
      };
    } catch (directError) {
      console.warn('Direct fetch failed, trying AIML crawl API:', directError);

      // Fallback to AIML crawl API if configured
      if (!aimlApiKey) {
        throw directError;
      }

      const response = await fetch('https://api.aimlapi.com/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aimlApiKey}`,
        },
        body: JSON.stringify({
          url,
          wait_for: 2000,
          extract: ['title', 'text', 'links', 'metadata'],
          options: {
            user_agent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            block_ads: true,
            block_trackers: true,
            remove_duplicates: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`AIML crawl API failed with status ${response.status}`);
      }

      const result = await response.json();

      const text = result.text || '';
      const title = result.title || new URL(url).hostname;
      const links = result.links || { internal: [], external: [] };
      const hackathonInfo = result.html ? extractHackathonInfo(result.html, text) : {};

      return {
        title,
        content: text,
        html: result.html || '',
        links: {
          internal: Array.isArray(links.internal) ? links.internal : [],
          external: Array.isArray(links.external) ? links.external : [],
        },
        metadata: {
          url,
          crawled_at: new Date().toISOString(),
          word_count: text.split(/\s+/).length,
          internal_links: Array.isArray(links.internal) ? links.internal.length : 0,
          external_links: Array.isArray(links.external) ? links.external.length : 0,
          hackathon_info: { ...hackathonInfo, ...(result.metadata || {}) },
        },
      };
    }
  } catch (error) {
  try {
    // Prefer AIML embeddings if key is configured
    if (aimlApiKey) {
      try {
        const response = await fetch('https://api.aimlapi.com/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aimlApiKey}`,
          },
          body: JSON.stringify({
            model: MODEL_CONFIG.embeddings.primary,
            input: text,
            options: {
              normalize: true,
              truncate: true,
            },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          return result.data[0].embedding;
        }

        console.warn('AIML embedding request failed, falling back to OpenAI:', response.status, await response.text());
      } catch (aimlError) {
        console.warn('AIML embedding request threw, falling back to OpenAI:', aimlError);
      }
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('No embedding provider configured: both AIMLAPI_KEY and OPENAI_API_KEY are missing or invalid');
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-large',
        input: text,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      throw new Error(`Failed to create embedding with OpenAI: ${error}`);
    }

    const { data } = await openaiResponse.json();
    return data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw error;
  }
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
): Promise<{ totalChunks: number; totalWords: number; urlsProcessed: number }> => {
  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [
    { url: rootUrl, depth: 0 },
  ];
  let totalChunks = 0;
  let totalWords = 0;
  let urlsProcessed = 0;
  const EMBEDDING_BATCH_SIZE = 10;

  try {
    // Initialize crawl_data
    await supabase
      .from('events')
      .update({
        status: 'crawling',
        crawl_data: {
          started_at: new Date().toISOString(),
          status: 'crawling',
          processed: 0,
          total: 1,
        },
      })
      .eq('id', eventId);

    while (queue.length > 0 && urlsProcessed < config.maxPages) {
      const current = queue.shift();
      if (!current) break;

      const normalizedUrl = new URL(current.url).href;
      if (visited.has(normalizedUrl) || current.depth > config.maxDepth) {
        continue;
      }

      visited.add(normalizedUrl);

      try {
        const crawlData = await crawlUrl(normalizedUrl);
        urlsProcessed += 1;

        const { data: urlRow, error: urlError } = await supabase
          .from('event_urls')
          .insert({
            event_id: eventId,
            url: normalizedUrl,
            title: crawlData.title,
            content: crawlData.content,
            metadata: crawlData.metadata,
            crawl_status: 'completed',
          })
          .select()
          .single();

        if (urlError) {
          console.error('Error inserting event_url:', urlError);
          continue;
        }

        const urlId = urlRow.id as string;

        const words = crawlData.content.split(/\s+/).filter(Boolean);
        const MAX_WORDS_PER_CHUNK = 300;
        const chunks: string[] = [];
        for (let i = 0; i < words.length; i += MAX_WORDS_PER_CHUNK) {
          const chunkWords = words.slice(i, i + MAX_WORDS_PER_CHUNK);
          if (chunkWords.length > 0) {
            chunks.push(chunkWords.join(' '));
          }
        }

        let successfulInserts = 0;
        let failedInserts = 0;

        for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
          const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);

          const embeddingPromises = batch.map(async (chunk, index) => {
            const globalIndex = i + index;
            try {
              const embedding = await createEmbedding(chunk);
              const { error: insertError } = await supabase
                .from('content_embeddings')
                .insert({
                  event_id: eventId,
                  url_id: urlId,
                  content_chunk: chunk,
                  embedding,
                  metadata: {
                    url: normalizedUrl,
                    order: globalIndex,
                    word_count: chunk.split(/\s+/).filter(Boolean).length,
                  },
                });

              if (insertError) {
                console.error('Error inserting embedding:', insertError);
                return { success: false, error: insertError };
              }

              return { success: true };
            } catch (err) {
              console.error('Error creating embedding or inserting chunk:', err);
              return { success: false, error: err };
            }
          });

          const results = await Promise.all(embeddingPromises);

          results.forEach((result) => {
            if (result.success) {
              successfulInserts += 1;
            } else {
              failedInserts += 1;
              if ((result as any).error) {
                console.error('Insert error:', (result as any).error);
              }
            }
          });
        }

        const pageWordCount = crawlData.metadata.word_count || words.length;
        totalChunks += successfulInserts;
        totalWords += pageWordCount;

        // Enqueue new links if within depth and page limits
        if (current.depth < config.maxDepth) {
          const nextDepth = current.depth + 1;
          const nextUrls: string[] = [];
          nextUrls.push(...crawlData.links.internal);
          if (config.includeExternal) {
            nextUrls.push(...crawlData.links.external);
          }
          for (const nextUrl of nextUrls) {
            if (!visited.has(nextUrl) && queue.length + urlsProcessed < config.maxPages) {
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
  } catch (error) {
    console.error('Error in crawlSite:', error);
    throw error;
  }
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

    // Persist effective model id
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