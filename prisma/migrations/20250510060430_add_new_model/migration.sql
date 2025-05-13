-- CreateTable
CREATE TABLE "AiResponseRelatedWords" (
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,

    CONSTRAINT "AiResponseRelatedWords_pkey" PRIMARY KEY ("prompt")
);
