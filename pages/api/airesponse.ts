// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const prisma = new PrismaClient();

export async function fetchAIResponse(prompt: string): Promise<string> {
  try {
    const existingResponse = await prisma.aiResponse.findUnique({
      where: {
        prompt: prompt,
      },
    });
    if (existingResponse) {
      return existingResponse.response;
    }

    console.error("Calling OpenAI:");
    // If the response is not in the database, call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Describe ${prompt}`,
        },
      ],
      temperature: 0,
      max_tokens: 150,
    });

    const aiResponse = response.choices[0].message.content || "";
    // Save the response to the database
    await prisma.aiResponse.create({
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
