// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { processAIResponse } from "../../utils";

type Data = {
  name: string;
};

type RequestBody = {
  aiResponse: string;
  targetWords: string[];
  tabooWord: string;
  easyMode: boolean;
};

type ResponseData = {
  matchedWords: string[];
  matchedWordIndices: { [key: string]: number[] };
  tabooWordIndices: number[];
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | Data>
) {
  console.log(req.method);

  if (req.method === "POST") {
    const { aiResponse, targetWords, tabooWord, easyMode } =
      req.body as RequestBody;

    // Log the received parameters for debugging
    console.log({ aiResponse, targetWords, tabooWord, easyMode });

    const result = processAIResponse(
      aiResponse,
      targetWords,
      tabooWord,
      easyMode
    );

    res.status(200).json(result);
  } else {
    res.status(405).json({ name: "Method Not Allowed" });
  }
}
