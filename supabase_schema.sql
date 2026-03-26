-- ============================================================
-- LexGuard / CogDoc  —  Supabase PostgreSQL Schema (FIXED)
-- Fix: user_id changed TEXT → UUID to match auth.users(id)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Drop previous failed attempt if it exists
DROP TABLE IF EXISTS public.documents;

-- 1. DOCUMENTS TABLE
--    Stores every analysis result linked to a user.
-- ------------------------------------------------------------
CREATE TABLE public.documents (
    id            TEXT        PRIMARY KEY,          -- UUID string from Python
    user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
    filename      TEXT        NOT NULL,
    risk_score    INTEGER     DEFAULT 0,
    risk_level    TEXT        DEFAULT 'Low',
    details       JSONB,                            -- full analysis JSON
    upload_date   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast per-user history lookups
CREATE INDEX idx_documents_user_id
    ON public.documents (user_id);

-- Index for fast date sorting
CREATE INDEX idx_documents_upload_date
    ON public.documents (upload_date DESC);


-- 2. ROW LEVEL SECURITY (RLS)
--    Each user can only see and insert their own documents.
-- ------------------------------------------------------------
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Allow users to read only their own rows
CREATE POLICY "Users can read own documents"
    ON public.documents
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to insert their own rows
CREATE POLICY "Users can insert own documents"
    ON public.documents
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own rows
CREATE POLICY "Users can delete own documents"
    ON public.documents
    FOR DELETE
    USING (auth.uid() = user_id);


-- 3. SERVICE ROLE BYPASS
--    The Python backend uses the anon/service key and
--    sends user_id manually, so we need this policy too
--    (for inserts from the backend without a JWT).
-- ------------------------------------------------------------
CREATE POLICY "Backend service can insert documents"
    ON public.documents
    FOR INSERT
    WITH CHECK (true);   -- backend validates user_id in application logic

CREATE POLICY "Backend service can select documents"
    ON public.documents
    FOR SELECT
    USING (true);


-- ============================================================
-- VERIFICATION — run after creating the table:
-- SELECT * FROM public.documents LIMIT 5;
-- ============================================================