import fs from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import axios from "axios";

type Data = {
  response: string;
};

export async function processPrompts(
  startLine: number,
  endLine: number,
  baseUrl: string
): Promise<string> {
  const validPromptsPath = path.join(process.cwd(), "validprompts.txt");
  const outputPath = path.join(process.cwd(), "output.txt");

  // Read the validprompts file
  const fileContent = fs.readFileSync(validPromptsPath, "utf-8");
  const lines = fileContent.split("\n");

  if (startLine < 1 || endLine > lines.length || startLine > endLine) {
    throw new Error("Invalid line range");
  }

  const selectedPrompts = lines.slice(startLine - 1, endLine);

  for (const prompt of selectedPrompts) {
    try {
      const aiResponse = await axios
        .get(`${baseUrl}/api/airesponse`, {
          params: { prompt },
        })
        .then((res) => res.data.response as string);

      // Append prompt and response to the output file
      fs.appendFileSync(
        outputPath,
        `Prompt: ${prompt}\nResponse: ${aiResponse}\n\n`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return `Error processing prompt "${prompt}": ${errorMessage}`;
    }
  }

  return "Batch processing completed successfully";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { startLine, endLine } = req.query;
  const start = parseInt(startLine as string, 10);
  const end = parseInt(endLine as string, 10);

  if (isNaN(start) || isNaN(end)) {
    res.status(400).json({ response: "Invalid startLine or endLine" });
    return;
  }

  const baseUrl = req.headers.origin || process.env.BASE_URL || "";
  if (!baseUrl) {
    res.status(500).json({ response: "Base URL is not defined" });
    console.error("Base URL is not defined");
    return;
  }

  const response = await processPrompts(start, end, baseUrl);
  res.status(200).json({ response });
}
