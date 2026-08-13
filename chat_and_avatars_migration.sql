-- 1. Add avatar_url to profiles if it doesn't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Create the function to clean up old messages
CREATE OR REPLACE FUNCTION public.cleanup_old_room_messages()
RETURNS trigger AS $$
BEGIN
  -- Delete messages older than 3 days
  DELETE FROM public.community_messages
  WHERE created_at < NOW() - INTERVAL '3 days';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger to execute cleanup whenever a new message is inserted
-- This ensures the chat stays clean automatically without needing pg_cron
DROP TRIGGER IF EXISTS trigger_cleanup_old_room_messages ON public.community_messages;
CREATE TRIGGER trigger_cleanup_old_room_messages
AFTER INSERT ON public.community_messages
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_room_messages();
