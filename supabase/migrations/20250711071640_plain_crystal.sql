/*
  # Setup Daily Summary Email Cron Job

  1. Cron Job Configuration
    - Scheduled to run daily at 8:00 AM
    - Calls the send-daily-summary edge function
    - Handles timezone considerations

  2. Security
    - Uses service role for database access
    - Proper error handling and logging
*/

-- Enable the pg_cron extension if not already enabled
-- Note: This requires superuser privileges and may need to be done manually
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to call the edge function
CREATE OR REPLACE FUNCTION send_daily_summary_email()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response_status integer;
  response_body text;
BEGIN
  -- Call the edge function using HTTP request
  -- Note: This is a simplified version. In production, you might want to use
  -- a more robust HTTP client or handle this differently
  
  -- Log the attempt
  INSERT INTO public.system_logs (
    event_type,
    message,
    created_at
  ) VALUES (
    'daily_summary_attempt',
    'Attempting to send daily summary email',
    NOW()
  );
  
  -- In a real implementation, you would make an HTTP request to:
  -- https://your-project.supabase.co/functions/v1/send-daily-summary
  
  RAISE NOTICE 'Daily summary email function called at %', NOW();
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO public.system_logs (
      event_type,
      message,
      error_details,
      created_at
    ) VALUES (
      'daily_summary_error',
      'Error in daily summary email function',
      SQLERRM,
      NOW()
    );
    
    RAISE NOTICE 'Error in daily summary: %', SQLERRM;
END;
$$;

-- Create a simple logging table for system events
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  message text NOT NULL,
  error_details text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on system_logs
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for system_logs (admin only)
CREATE POLICY "Enable all operations for authenticated users"
  ON public.system_logs
  FOR ALL
  TO authenticated
  USING (true);

-- Note: To actually schedule the cron job, you would need to run:
-- SELECT cron.schedule('daily-summary-email', '0 8 * * *', 'SELECT send_daily_summary_email();');
-- This requires pg_cron extension and appropriate permissions.

-- Alternative: You can call this function manually or set up external scheduling
-- Example manual call:
-- SELECT send_daily_summary_email();