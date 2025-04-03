-- CreateTable
CREATE TABLE "AiResponse" (
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AiResponse_prompt_key" ON "AiResponse"("prompt");
