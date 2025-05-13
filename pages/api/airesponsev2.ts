// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const prisma = new PrismaClient();

export async function fetchAIResponse(prompt: string): Promise<string> {
  try {
    const existingResponse = await prisma.aiResponseRelatedWords.findUnique({
      where: {
        prompt: prompt,
      },
    });
    if (existingResponse) {
      return existingResponse.response;
    }

    // If the response is not in the database, call OpenAI API
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          "You are a helpful assistant. Your task is to provide concise and accurate descriptions of terms. Please respond in a clear and informative manner. Do not autocorrect the prompt.",
      },
      {
        role: "user",
        content: `Return 20 words most frequently associated with the term "${prompt}". It should be a list of words separated by commas. Words should be single words, and there should be no repeated words. Do not include the word "${prompt}" in the list. `,
      },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0,
      max_tokens: 300,
    });

    const aiResponse = response.choices[0].message.content || "";
    // Save the response to the database
    await prisma.aiResponseRelatedWords.create({
      data: {
        prompt: prompt,
        response: aiResponse,
      },
    });
    // Return the AI response
    return aiResponse;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw new Error("Failed to fetch AI response");
  }
}
type Data = {
  response: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const response = await fetchAIResponse(req.query.prompt as string);
  res.status(200).json({ response });
}
