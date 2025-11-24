-- Create new tables with bloxadmin_ prefix
-- This migration creates fresh tables without modifying existing tables

-- Create enums if they don't exist
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COLLABORATOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "EmbeddingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop existing bloxadmin_ tables if they exist (to refresh them)
DROP TABLE IF EXISTS "bloxadmin_AuditLog" CASCADE;
DROP TABLE IF EXISTS "bloxadmin_Document" CASCADE;
DROP TABLE IF EXISTS "bloxadmin_VerificationToken" CASCADE;
DROP TABLE IF EXISTS "bloxadmin_Session" CASCADE;
DROP TABLE IF EXISTS "bloxadmin_Account" CASCADE;
DROP TABLE IF EXISTS "bloxadmin_User" CASCADE;

-- CreateTable: bloxadmin_User
CREATE TABLE "bloxadmin_User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "role" "UserRole" NOT NULL DEFAULT 'COLLABORATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "bloxadmin_User_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bloxadmin_Account
CREATE TABLE "bloxadmin_Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "bloxadmin_Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bloxadmin_Session
CREATE TABLE "bloxadmin_Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bloxadmin_Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bloxadmin_VerificationToken
CREATE TABLE "bloxadmin_VerificationToken" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bloxadmin_VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bloxadmin_Document
CREATE TABLE "bloxadmin_Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEdited" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "embeddingStatus" "EmbeddingStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "bloxadmin_Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bloxadmin_AuditLog
CREATE TABLE "bloxadmin_AuditLog" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bloxadmin_AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bloxadmin_Account_provider_providerAccountId_key" ON "bloxadmin_Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "bloxadmin_Session_sessionToken_key" ON "bloxadmin_Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "bloxadmin_User_email_key" ON "bloxadmin_User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "bloxadmin_VerificationToken_token_key" ON "bloxadmin_VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "bloxadmin_VerificationToken_identifier_token_key" ON "bloxadmin_VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "bloxadmin_Account" ADD CONSTRAINT "bloxadmin_Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "bloxadmin_User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloxadmin_Session" ADD CONSTRAINT "bloxadmin_Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "bloxadmin_User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloxadmin_User" ADD CONSTRAINT "bloxadmin_User_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "bloxadmin_User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloxadmin_User" ADD CONSTRAINT "bloxadmin_User_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "bloxadmin_User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloxadmin_Document" ADD CONSTRAINT "bloxadmin_Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "bloxadmin_User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloxadmin_Document" ADD CONSTRAINT "bloxadmin_Document_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "bloxadmin_User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloxadmin_Document" ADD CONSTRAINT "bloxadmin_Document_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "bloxadmin_User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloxadmin_AuditLog" ADD CONSTRAINT "bloxadmin_AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "bloxadmin_User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

