-- ============================================================================
-- CURRENT DATABASE FIX SCRIPT (After Truncate)
-- ============================================================================
-- This script fixes the RefundRequest enum type error that occurs
-- after truncating the database.
--
-- Error: cannot cast type refund_status_enum to enum_yapague_refund_requests_status
-- ============================================================================

-- ============================================================================
-- FIX: RefundRequest Status Enum Type Mismatch
-- ============================================================================
-- Problem: Database has 'refund_status_enum' but Sequelize tries to create
--          'enum_yapague_refund_requests_status'. PostgreSQL cannot cast
--          between different enum types.
-- Solution: Create the new enum type and convert the column properly.
-- ============================================================================

DO $$
BEGIN
    -- Step 1: Create the new enum type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_yapague_refund_requests_status'
    ) THEN
        CREATE TYPE enum_yapague_refund_requests_status AS ENUM (
            'pending',
            'approved',
            'rejected',
            'completed',
            'failed'
        );
        RAISE NOTICE 'Created enum type: enum_yapague_refund_requests_status';
    ELSE
        RAISE NOTICE 'Enum type enum_yapague_refund_requests_status already exists';
    END IF;

    -- Step 2: Check if the table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'yapague_refund_requests'
    ) THEN
        -- Step 3: Check if the status column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'yapague_refund_requests' 
            AND column_name = 'status'
        ) THEN
            -- Step 4: Check what type the column currently uses
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'yapague_refund_requests' 
                AND column_name = 'status'
                AND udt_name = 'enum_yapague_refund_requests_status'
            ) THEN
                RAISE NOTICE 'Column already uses correct enum type - no action needed';
            ELSIF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'yapague_refund_requests' 
                AND column_name = 'status'
                AND udt_name = 'refund_status_enum'
            ) THEN
                -- Convert from old enum to new enum via text
                RAISE NOTICE 'Converting status column from refund_status_enum to enum_yapague_refund_requests_status';
                
                -- First, convert to text
                ALTER TABLE yapague_refund_requests 
                ALTER COLUMN status TYPE text USING status::text;
                
                -- Then convert to new enum
                ALTER TABLE yapague_refund_requests 
                ALTER COLUMN status TYPE enum_yapague_refund_requests_status 
                USING status::enum_yapague_refund_requests_status;
                
                -- Set constraints
                ALTER TABLE yapague_refund_requests 
                ALTER COLUMN status SET NOT NULL;
                
                ALTER TABLE yapague_refund_requests 
                ALTER COLUMN status SET DEFAULT 'pending';
                
                RAISE NOTICE 'Successfully converted status column to new enum type';
            ELSE
                -- Column exists but uses a different type - convert it
                RAISE NOTICE 'Converting status column to enum_yapague_refund_requests_status';
                
                ALTER TABLE yapague_refund_requests 
                ALTER COLUMN status TYPE text USING status::text;
                
                ALTER TABLE yapague_refund_requests 
                ALTER COLUMN status TYPE enum_yapague_refund_requests_status 
                USING status::enum_yapague_refund_requests_status;
                
                ALTER TABLE yapague_refund_requests 
                ALTER COLUMN status SET NOT NULL;
                
                ALTER TABLE yapague_refund_requests 
                ALTER COLUMN status SET DEFAULT 'pending';
                
                RAISE NOTICE 'Successfully set status column to new enum type';
            END IF;
        ELSE
            RAISE NOTICE 'Table exists but status column does not - Sequelize will create it';
        END IF;
    ELSE
        RAISE NOTICE 'Table yapague_refund_requests does not exist yet - Sequelize will create it';
    END IF;

    -- Step 5: Optionally drop the old enum type if it exists and is not used
    -- Uncomment the following if you want to clean up the old enum type
    -- (Only do this if you're sure no other tables use it)
    /*
    IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'refund_status_enum'
    ) THEN
        -- Check if any columns still use the old enum
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE udt_name = 'refund_status_enum'
        ) THEN
            DROP TYPE refund_status_enum;
            RAISE NOTICE 'Dropped old enum type: refund_status_enum';
        ELSE
            RAISE NOTICE 'Old enum type refund_status_enum still in use - not dropping';
        END IF;
    END IF;
    */
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check the status column type
SELECT 
    column_name, 
    data_type, 
    udt_name as enum_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'yapague_refund_requests' 
AND column_name = 'status';

-- Check if old enum type still exists
SELECT typname as enum_name
FROM pg_type 
WHERE typname IN ('refund_status_enum', 'enum_yapague_refund_requests_status')
ORDER BY typname;

-- ============================================================================
-- END OF FIX SCRIPT
-- ============================================================================


