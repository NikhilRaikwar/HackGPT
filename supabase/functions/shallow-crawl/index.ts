import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShallowCrawlResult {
  url: string;
  title: string;
  linkCount: number;
  internal: number;
  external: number;
  links: {
    internal: string[];
    external: string[];
  };
  error?: string;
}

const extractTextFromHtml = (html: string): string => {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<[^>]*>/g, " ");
  text = text.replace(/\s+/g, " ").trim();
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "Missing url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HackGPTBot/1.0)",
      },
    });

    if (!response.ok) {
      const fallback: ShallowCrawlResult = {
        url,
        title: new URL(url).hostname,
        linkCount: 0,
        internal: 0,
        external: 0,
        links: {
          internal: [],
          external: [],
        },
        error: `HTTP ${response.status}: ${response.statusText}`,
      };

      return new Response(
        JSON.stringify(fallback),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;

    const { internal, external } = extractLinks(html, url);
    const result: ShallowCrawlResult = {
      url,
      title,
      linkCount: internal.length + external.length,
      internal: internal.length,
      external: external.length,
      links: {
        internal: internal.slice(0, 20),
        external: external.slice(0, 20),
      },
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Shallow crawl error:", error);

    const fallback: ShallowCrawlResult = {
      url: "",
      title: "",
      linkCount: 0,
      internal: 0,
      external: 0,
      links: {
        internal: [],
        external: [],
      },
      error: error?.message ?? "Unknown error",
    };

    return new Response(
      JSON.stringify(fallback),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
