-- Helper function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for storing Nexus AI Constitutions / Core Versions
CREATE TABLE IF NOT EXISTS public.ai_core_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_number INTEGER NOT NULL,
    core_instructions TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure only one active version at a time
CREATE UNIQUE INDEX IF NOT EXISTS ai_core_versions_active_idx ON public.ai_core_versions (is_active) WHERE is_active = true;

-- Enable RLS for ai_core_versions
ALTER TABLE public.ai_core_versions ENABLE ROW LEVEL SECURITY;

-- Admins can read and write core versions
DROP POLICY IF EXISTS "Admins can manage ai_core_versions" ON public.ai_core_versions;
CREATE POLICY "Admins can manage ai_core_versions" ON public.ai_core_versions
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Authenticated users can read the active core version
DROP POLICY IF EXISTS "Users can read active ai_core_version" ON public.ai_core_versions;
CREATE POLICY "Users can read active ai_core_version" ON public.ai_core_versions
    FOR SELECT
    TO authenticated
    USING (is_active = true);


-- Table for storing RAG knowledge chunks
CREATE TABLE IF NOT EXISTS public.ai_knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL, -- e.g. 'note', 'resource', 'attachment'
    source_id UUID NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding VECTOR(1536), -- Assuming text-embedding-3-small (1536 dims)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for vector search (using HNSW for better performance if possible, otherwise ivfflat)
-- Assuming pgvector is installed, we create an HNSW index on the embedding column
CREATE INDEX IF NOT EXISTS ai_knowledge_chunks_embedding_idx ON public.ai_knowledge_chunks USING hnsw (embedding vector_cosine_ops);

-- Enable RLS for ai_knowledge_chunks
ALTER TABLE public.ai_knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Users can read their own chunks or global chunks (user_id IS NULL)
DROP POLICY IF EXISTS "Users can read own or global knowledge chunks" ON public.ai_knowledge_chunks;
CREATE POLICY "Users can read own or global knowledge chunks" ON public.ai_knowledge_chunks
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can insert/update/delete their own chunks
DROP POLICY IF EXISTS "Users can insert own knowledge chunks" ON public.ai_knowledge_chunks;
CREATE POLICY "Users can insert own knowledge chunks" ON public.ai_knowledge_chunks
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own knowledge chunks" ON public.ai_knowledge_chunks;
CREATE POLICY "Users can update own knowledge chunks" ON public.ai_knowledge_chunks
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own knowledge chunks" ON public.ai_knowledge_chunks;
CREATE POLICY "Users can delete own knowledge chunks" ON public.ai_knowledge_chunks
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Admins can manage global chunks (user_id IS NULL)
DROP POLICY IF EXISTS "Admins can manage global knowledge chunks" ON public.ai_knowledge_chunks;
CREATE POLICY "Admins can manage global knowledge chunks" ON public.ai_knowledge_chunks
    FOR ALL
    TO authenticated
    USING (public.is_admin() AND user_id IS NULL)
    WITH CHECK (public.is_admin() AND user_id IS NULL);


-- RPC for retrieving the most relevant chunks using vector similarity
-- Drop existing function first to prevent return type mismatch errors (42P13)
DROP FUNCTION IF EXISTS public.match_knowledge_chunks CASCADE;

CREATE OR REPLACE FUNCTION match_knowledge_chunks(
    query_embedding VECTOR(1536),
    match_threshold FLOAT,
    match_count INT,
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    source_type TEXT,
    source_id UUID,
    chunk_index INTEGER,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        k.id,
        k.source_type,
        k.source_id,
        k.chunk_index,
        k.content,
        k.metadata,
        1 - (k.embedding <=> query_embedding) AS similarity
    FROM
        public.ai_knowledge_chunks k
    WHERE
        -- Restrict to the requesting user's chunks OR global resources (user_id IS NULL)
        (k.user_id = p_user_id OR k.user_id IS NULL)
        AND 1 - (k.embedding <=> query_embedding) > match_threshold
    ORDER BY
        k.embedding <=> query_embedding
    LIMIT
        match_count;
END;
$$;
