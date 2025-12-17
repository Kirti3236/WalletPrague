# Database Migration Fix Scripts

## 🔴 Errors Identified

Your client encountered two database migration errors **in sequence** when trying to run the project with Docker:

**Timeline:**
1. **First Error** (`log backend (1).txt`): AuditLog resource_type NOT NULL constraint error
2. **After Truncate** (`log backend.txt`): RefundRequest enum type mismatch error (current issue)

### Error 1: RefundRequest Status Enum Type Mismatch
**Error Message:**
```
cannot cast type refund_status_enum to enum_yapague_refund_requests_status
```

**Root Cause:**
- The database has an existing enum type `refund_status_enum`
- Sequelize is trying to create a new enum type `enum_yapague_refund_requests_status`
- PostgreSQL cannot directly cast between two different enum types, even if they have the same values

**Location:** `yapague_refund_requests.status` column

---

### Error 2: AuditLog resource_type NOT NULL Constraint
**Error Message:**
```
column "resource_type" of relation "yapague_audit_logs" contains null values
```

**Root Cause:**
- The `AuditLog` model defines `resource_type` as `NOT NULL`
- When Sequelize tries to add this column to an existing table that already has rows
- Those existing rows would have `NULL` values, which violates the `NOT NULL` constraint

**Location:** `yapague_audit_logs.resource_type` column

---

## ✅ Solution

We've created a SQL fix script that resolves both issues. The script:

1. **For RefundRequest:**
   - Creates the new enum type if it doesn't exist
   - Converts the existing column from the old enum to the new enum type
   - Sets proper constraints and defaults

2. **For AuditLog:**
   - Adds the `resource_type` column as nullable first
   - Updates existing rows with appropriate default values based on the `action` type
   - Then sets the `NOT NULL` constraint

---

## 🚀 How to Apply the Fix

### Option 1: Run Script Manually (Recommended for Production)

1. **Connect to your PostgreSQL database:**
   ```bash
   # If using Docker
   docker exec -it yapague-postgres psql -U yapague_user -d yapague_db
   
   # Or if connecting directly
   psql -U your_username -d your_database_name -h localhost
   ```

2. **Run the fix script:**
   ```sql
   \i database/fixes/fix-db-errors.sql
   ```
   
   Or copy and paste the contents of `fix-db-errors.sql` into your psql session.

3. **Verify the fixes:**
   The script includes verification queries at the end. Check that:
   - `yapague_refund_requests.status` uses `enum_yapague_refund_requests_status`
   - `yapague_audit_logs.resource_type` is `NOT NULL` with no NULL values

4. **Start your application:**
   ```bash
   docker-compose up -d
   ```

---

### Option 2: Run Script via Docker (Quick Fix)

```bash
# Copy the script into the container and run it
docker cp database/fixes/fix-db-errors.sql yapague-postgres:/tmp/fix.sql
docker exec -it yapague-postgres psql -U yapague_user -d yapague_db -f /tmp/fix.sql
```

---

### Option 3: Add to Docker Init Scripts (For Fresh Databases)

If you want this to run automatically for new database setups:

1. Create the init directory:
   ```bash
   mkdir -p database/init
   ```

2. Copy the fix script:
   ```bash
   cp database/fixes/fix-db-errors.sql database/init/01-fix-db-errors.sql
   ```

3. The script will run automatically when the database container starts for the first time.

---

## 📋 Pre-Flight Checklist

Before running the fix script, ensure:

- [ ] You have a database backup (recommended for production)
- [ ] You can connect to the database
- [ ] You have the necessary permissions (ALTER TABLE, CREATE TYPE, etc.)
- [ ] The application is stopped (to avoid conflicts)

---

## 🔍 Verification Queries

After running the fix, verify everything is correct:

```sql
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

-- Check for NULL values (should return 0)
SELECT COUNT(*) as null_count
FROM yapague_audit_logs 
WHERE resource_type IS NULL;
```

---

## 🛠️ Troubleshooting

### Issue: "Permission denied"
**Solution:** Ensure your database user has the necessary privileges:
```sql
GRANT ALL PRIVILEGES ON DATABASE yapague_db TO yapague_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO yapague_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO yapague_user;
```

### Issue: "Type already exists"
**Solution:** The script handles this gracefully. If you see this warning, it means the fix was already partially applied. The script will continue and complete the fix.

### Issue: "Column already exists"
**Solution:** The script checks for existing columns and handles them appropriately. If the column exists but is nullable, it will update NULL values and set NOT NULL.

---

## 📝 Notes

- The script is **idempotent** - it's safe to run multiple times
- The script uses `DO $$` blocks for conditional logic
- Existing data is preserved during the migration
- The script includes helpful `RAISE NOTICE` messages to track progress

---

## 🆘 Need Help?

If you encounter any issues:

1. Check the PostgreSQL logs: `docker logs yapague-postgres`
2. Verify database connection: `docker exec -it yapague-postgres psql -U yapague_user -d yapague_db -c "SELECT version();"`
3. Review the error messages carefully - they usually indicate what's wrong

---

## 📅 Last Updated

November 10, 2025

