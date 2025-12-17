-- Assign limit policies to all users (round-robin)
-- This script assigns different policies to users for testing

-- Get policy IDs
DO $$
DECLARE
    standard_policy_id UUID;
    premium_policy_id UUID;
    vip_policy_id UUID;
    restricted_policy_id UUID;
    user_record RECORD;
    policy_index INTEGER := 0;
    policy_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    -- Get all policy IDs
    SELECT id INTO standard_policy_id FROM yapague_limit_policies WHERE policy_code = 'standard' LIMIT 1;
    SELECT id INTO premium_policy_id FROM yapague_limit_policies WHERE policy_code = 'premium' LIMIT 1;
    SELECT id INTO vip_policy_id FROM yapague_limit_policies WHERE policy_code = 'vip' LIMIT 1;
    SELECT id INTO restricted_policy_id FROM yapague_limit_policies WHERE policy_code = 'restricted' LIMIT 1;
    
    -- Build policy array
    IF standard_policy_id IS NOT NULL THEN
        policy_ids := array_append(policy_ids, standard_policy_id);
    END IF;
    IF premium_policy_id IS NOT NULL THEN
        policy_ids := array_append(policy_ids, premium_policy_id);
    END IF;
    IF vip_policy_id IS NOT NULL THEN
        policy_ids := array_append(policy_ids, vip_policy_id);
    END IF;
    IF restricted_policy_id IS NOT NULL THEN
        policy_ids := array_append(policy_ids, restricted_policy_id);
    END IF;
    
    -- Assign policies to users (round-robin)
    FOR user_record IN SELECT id FROM yapague_users ORDER BY created_at
    LOOP
        IF array_length(policy_ids, 1) > 0 THEN
            -- Delete existing limit if any
            DELETE FROM yapague_user_limits WHERE user_id = user_record.id;
            
            -- Insert new limit with policy
            INSERT INTO yapague_user_limits (
                id,
                user_id,
                policy_id,
                created_by,
                reset_day_of_month,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                user_record.id,
                policy_ids[1 + (policy_index % array_length(policy_ids, 1))],
                user_record.id, -- created_by
                1, -- reset_day_of_month
                NOW(),
                NOW()
            )
            ON CONFLICT (user_id) DO UPDATE
            SET policy_id = EXCLUDED.policy_id,
                updated_at = NOW();
            
            policy_index := policy_index + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Assigned policies to % users', policy_index;
END $$;

-- Verify assignments
SELECT 
    u."user_DNI_number",
    u.user_email,
    lp.policy_code,
    lp.max_transaction_amount,
    lp.max_daily_amount,
    lp.max_monthly_amount
FROM yapague_users u
LEFT JOIN yapague_user_limits ul ON u.id = ul.user_id
LEFT JOIN yapague_limit_policies lp ON ul.policy_id = lp.id
ORDER BY u.created_at
LIMIT 10;

