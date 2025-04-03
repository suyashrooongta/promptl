-- AlterTable
ALTER TABLE "AiResponse" ADD CONSTRAINT "AiResponse_pkey" PRIMARY KEY ("prompt");

-- DropIndex
DROP INDEX "AiResponse_prompt_key";
