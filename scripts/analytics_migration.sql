-- ==============================================================================
-- FEATURE 11: TIMESTAMP & ENGAGEMENT ANALYTICS (SUPABASE MIGRATION)
-- ==============================================================================

-- 1. Create the dedicated user activity log table
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'signup', 'deal_saved', 'deal_redeemed', 'session_start', 'return_visit'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes for fast analytical queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.user_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type ON public.user_activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_device ON public.user_activity_logs(device_id);

-- 3. Row Level Security (RLS)
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to user_activity_logs" 
ON public.user_activity_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public select on user_activity_logs" 
ON public.user_activity_logs 
FOR SELECT 
USING (true);

-- 4. PostgreSQL Function: Calculate Team UX OKR Metrics
CREATE OR REPLACE FUNCTION public.get_team_ux_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    v_total_users INT;
    v_avg_minutes_to_save NUMERIC;
    v_save_conversion_pct NUMERIC;
    v_redemption_pct NUMERIC;
    v_seven_day_return_pct NUMERIC;
BEGIN
    -- Distinct active devices/users
    SELECT count(DISTINCT device_id) INTO v_total_users FROM public.user_activity_logs;
    IF v_total_users IS NULL OR v_total_users = 0 THEN
        v_total_users := 1;
    END IF;

    -- OKR 1.1: Average time from first session/signup to first deal saved
    WITH first_actions AS (
        SELECT 
            device_id,
            min(created_at) FILTER (WHERE event_type IN ('signup', 'session_start')) AS signup_time,
            min(created_at) FILTER (WHERE event_type = 'deal_saved') AS first_save_time
        FROM public.user_activity_logs
        GROUP BY device_id
    )
    SELECT round(avg(EXTRACT(EPOCH FROM (first_save_time - signup_time)) / 60)::numeric, 1)
    INTO v_avg_minutes_to_save
    FROM first_actions
    WHERE signup_time IS NOT NULL AND first_save_time >= signup_time;

    -- OKR 1.2: Percentage of users who saved at least one deal
    SELECT round((count(DISTINCT device_id)::numeric / v_total_users) * 100, 1)
    INTO v_save_conversion_pct
    FROM public.user_activity_logs
    WHERE event_type = 'deal_saved';

    -- OKR 2.1: Percentage of users who redeemed a deal
    SELECT round((count(DISTINCT device_id)::numeric / v_total_users) * 100, 1)
    INTO v_redemption_pct
    FROM public.user_activity_logs
    WHERE event_type = 'deal_redeemed';

    -- OKR 2.2: Percentage of users returning within 7 days
    SELECT round((count(DISTINCT device_id)::numeric / v_total_users) * 100, 1)
    INTO v_seven_day_return_pct
    FROM public.user_activity_logs
    WHERE event_type = 'return_visit';

    result := jsonb_build_object(
        'total_users', v_total_users,
        'avg_minutes_to_first_save', COALESCE(v_avg_minutes_to_save, 0),
        'save_conversion_rate', COALESCE(v_save_conversion_pct, 0),
        'redemption_rate', COALESCE(v_redemption_pct, 0),
        'seven_day_return_rate', COALESCE(v_seven_day_return_pct, 0)
    );

    RETURN result;
END;
$$;
