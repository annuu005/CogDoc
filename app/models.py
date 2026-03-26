import os
from supabase import create_client, Client

# --- CONFIGURATION ---
# Get these from your Supabase Dashboard -> Project Settings -> API
url: str = os.environ.get("SUPABASE_URL", "https://blhzsdbxmiyzavvxeaup.supabase.co")
key: str = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsaHpzZGJ4bWl5emF2dnhlYXVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjM5NjksImV4cCI6MjA4Njg5OTk2OX0.SJCQy_tg2175XcHojl235fJMTNquuUpJG-nJbP6-Bm4")

# Initialize the client
supabase: Client = create_client(url, key)

# We no longer need init_db() here because table creation 
# happens in the Supabase SQL Editor (see supabase_schema.sql)