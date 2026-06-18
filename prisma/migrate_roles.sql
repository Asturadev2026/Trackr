-- Run this SQL script in your Neon DB console BEFORE running `npx prisma db push`
-- It migrates existing role data to the new role names

-- Step 1: Add the new enum values so existing rows can be updated
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'AI_ENGINEER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'INTERN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SENIOR_ENGINEER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MANAGER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'BUSINESS';

-- Commit the type additions (Postgres requires this before using new enum values in USING)
COMMIT;
BEGIN;

-- Step 2: Convert existing rows to use new roles
UPDATE "User" SET role = 'AI_ENGINEER'     WHERE role IN ('DEVELOPER', 'DESIGNER');
UPDATE "User" SET role = 'MANAGER'         WHERE role = 'PROJECT_MANAGER';
UPDATE "User" SET role = 'INTERN'          WHERE role = 'VIEWER';

UPDATE "ProjectMember" SET role = 'AI_ENGINEER' WHERE role IN ('DEVELOPER', 'DESIGNER');
UPDATE "ProjectMember" SET role = 'MANAGER'     WHERE role = 'PROJECT_MANAGER';
UPDATE "ProjectMember" SET role = 'INTERN'      WHERE role = 'VIEWER';

-- Step 3: Swap the enum type to remove old values
ALTER TYPE "UserRole" RENAME TO "UserRole_old";

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AI_ENGINEER', 'INTERN', 'SENIOR_ENGINEER', 'MANAGER', 'BUSINESS');

ALTER TABLE "User"
  ALTER COLUMN role TYPE "UserRole" USING (role::text::"UserRole");

ALTER TABLE "ProjectMember"
  ALTER COLUMN role TYPE "UserRole" USING (role::text::"UserRole");

DROP TYPE "UserRole_old";
