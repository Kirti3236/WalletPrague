-- ============================================================================
-- DATABASE FIX SCRIPT
-- ============================================================================
-- This script fixes two database migration errors:
-- 1. Enum type mismatch for RefundRequest.status column
-- 2. NOT NULL constraint violation for AuditLog.resource_type column
--
-- Run this script BEFORE starting the application with Docker
-- ============================================================================

-- ============================================================================
-- FIX 1: RefundRequest Status Enum Type Mismatch
-- ============================================================================
-- Problem: Database has 'refund_status_enum' but Sequelize tries to create
--          'enum_yapague_refund_requests_status'. PostgreSQL cannot cast
--          between different enum types.
-- Solution: Rename the existing enum to match what Sequelize expects, or
--           convert the column to use the new enum type properly.
-- ============================================================================

DO $$
BEGIN
    -- Check if the old enum type exists
    IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'refund_status_enum'
    ) THEN
        -- Check if the new enum type already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'enum_yapague_refund_requests_status'
        ) THEN
            -- Create the new enum type
            CREATE TYPE enum_yapague_refund_requests_status AS ENUM (
                'pending',
                'approved',
                'rejected',
                'completed',
                'failed'
            );
        END IF;

        -- Check if the table and column exist
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'yapague_refund_requests' 
            AND column_name = 'status'
        ) THEN
            -- Check if column is already using the correct enum type
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'yapague_refund_requests' 
                AND column_name = 'status'
                AND udt_name = 'enum_yapague_refund_requests_status'
            ) THEN
                RAISE NOTICE 'RefundRequest.status already uses correct enum type';
            ELSE
                -- Convert the column to use the new enum type
                -- First, convert to text, then to the new enum
                ALTER TABLE yapague_refund_requests 
                ALTER COLUMN status TYPE text USING status::text;
                
                ALTER TABLE yapague_refund_requests 
                ALTER COLUMN status TYPE enum_yapague_refund_requests_status 
                USING status::enum_yapague_refund_requests_status;
                
                -- Set NOT NULL and default if needed
                ALTER TABLE yapague_refund_requests 
                ALTER COLUMN status SET NOT NULL;
                
                ALTER TABLE yapague_refund_requests 
                ALTER COLUMN status SET DEFAULT 'pending';
                
                RAISE NOTICE 'Fixed RefundRequest.status enum type';
            END IF;
        ELSE
            RAISE NOTICE 'Table yapague_refund_requests or column status does not exist yet';
        END IF;
        
        -- Optionally drop the old enum type if no longer needed
        -- Uncomment the following lines if you want to remove the old enum
        -- DROP TYPE IF EXISTS refund_status_enum CASCADE;
    ELSE
        RAISE NOTICE 'Old enum type refund_status_enum does not exist, skipping fix';
    END IF;
END $$;

-- ============================================================================
-- FIX 2: AuditLog resource_type NOT NULL Constraint
-- ============================================================================
-- Problem: Trying to add NOT NULL column to existing table with data.
--          Existing rows would have NULL values, violating the constraint.
-- Solution: Add column as nullable first, update existing rows with default
--           value, then set NOT NULL constraint.
-- ============================================================================

DO $$
BEGIN
    -- Check if the table exists first
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'yapague_audit_logs'
    ) THEN
        RAISE NOTICE 'Table yapague_audit_logs does not exist yet, skipping resource_type fix';
        RETURN;
    END IF;

    -- Check if the column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'yapague_audit_logs' 
        AND column_name = 'resource_type'
    ) THEN
        -- Add the column as nullable first
        ALTER TABLE yapague_audit_logs 
        ADD COLUMN resource_type VARCHAR(255) NULL;
        
        -- Update existing rows with a default value based on action type
        -- This is a best-effort mapping - adjust as needed for your use case
        UPDATE yapague_audit_logs 
        SET resource_type = CASE 
            WHEN action::text LIKE 'user_%' THEN 'user'
            WHEN action::text LIKE 'transfer_%' THEN 'transfer'
            WHEN action::text LIKE 'deposit_%' THEN 'deposit'
            WHEN action::text LIKE 'withdrawal_%' THEN 'withdrawal'
            WHEN action::text LIKE 'refund_%' THEN 'refund'
            WHEN action::text LIKE 'admin_%' THEN 'policy'
            WHEN action::text LIKE 'system_%' THEN 'system'
            ELSE 'unknown'
        END
        WHERE resource_type IS NULL;
        
        -- Set a default for any remaining NULL values
        UPDATE yapague_audit_logs 
        SET resource_type = 'unknown'
        WHERE resource_type IS NULL;
        
        -- Now set NOT NULL constraint
        ALTER TABLE yapague_audit_logs 
        ALTER COLUMN resource_type SET NOT NULL;
        
        -- Add the comment
        COMMENT ON COLUMN yapague_audit_logs.resource_type IS 
            'Resource type affected (user, transaction, transfer, etc)';
        
        RAISE NOTICE 'Fixed AuditLog.resource_type column';
    ELSE
        -- Column exists, check if it's nullable
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'yapague_audit_logs' 
            AND column_name = 'resource_type'
            AND is_nullable = 'YES'
        ) THEN
            -- Update any NULL values
            UPDATE yapague_audit_logs 
            SET resource_type = CASE 
                WHEN action::text LIKE 'user_%' THEN 'user'
                WHEN action::text LIKE 'transfer_%' THEN 'transfer'
                WHEN action::text LIKE 'deposit_%' THEN 'deposit'
                WHEN action::text LIKE 'withdrawal_%' THEN 'withdrawal'
                WHEN action::text LIKE 'refund_%' THEN 'refund'
                WHEN action::text LIKE 'admin_%' THEN 'policy'
                WHEN action::text LIKE 'system_%' THEN 'system'
                ELSE 'unknown'
            END
            WHERE resource_type IS NULL;
            
            -- Set NOT NULL
            ALTER TABLE yapague_audit_logs 
            ALTER COLUMN resource_type SET NOT NULL;
            
            RAISE NOTICE 'Updated existing AuditLog.resource_type column to NOT NULL';
        ELSE
            RAISE NOTICE 'AuditLog.resource_type column already exists and is NOT NULL';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run these queries to verify the fixes:

-- Check RefundRequest status column
SELECT 
    column_name, 
    data_type, 
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'yapague_refund_requests' 
AND column_name = 'status';

-- Check AuditLog resource_type column
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'yapague_audit_logs' 
AND column_name = 'resource_type';

-- Check for any NULL values in resource_type (should return 0 rows)
SELECT COUNT(*) as null_count
FROM yapague_audit_logs 
WHERE resource_type IS NULL;

-- ============================================================================
-- END OF FIX SCRIPT
-- ============================================================================

