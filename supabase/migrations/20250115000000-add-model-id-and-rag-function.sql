-- Add model_id column to events table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'model_id'
  ) THEN
    ALTER TABLE public.events ADD COLUMN model_id TEXT;
  END IF;
END $$;

-- Create RPC function for RAG similarity search
CREATE OR REPLACE FUNCTION public.match_event_content(
  event_id UUID,
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  content_chunk TEXT,
  similarity FLOAT,
  url_id UUID,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.content_chunk,
    1 - (ce.embedding <=> query_embedding) AS similarity,
    ce.url_id,
    ce.metadata
  FROM public.content_embeddings ce
  WHERE ce.event_id = match_event_content.event_id
    AND ce.embedding IS NOT NULL
    AND (1 - (ce.embedding <=> query_embedding)) >= match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create index on content_embeddings for better similarity search performance
CREATE INDEX IF NOT EXISTS idx_content_embeddings_embedding 
ON public.content_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Add index on model_id for faster queries
CREATE INDEX IF NOT EXISTS idx_events_model_id ON public.events(model_id);

