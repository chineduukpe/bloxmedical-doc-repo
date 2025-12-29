-- CreateTable: bloxadmin_Photo
CREATE TABLE "bloxadmin_Photo" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "bloxadmin_Photo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "bloxadmin_Photo" ADD CONSTRAINT "bloxadmin_Photo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "bloxadmin_User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


