


// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export async function callOpenAI(prompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Describe ${prompt}`
        }
      ],
      temperature: 0,
      max_tokens: 150
    });

    const aiResponse = response.choices[0].message.content || '';
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
  res: NextApiResponse<Data>,
) {
  const response = await callOpenAI(req.query.prompt as string);
  res.status(200).json({ response });
}
