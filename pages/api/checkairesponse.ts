// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
// @ts-ignore
import Lemmatizer from "javascript-lemmatizer";

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
  matchedWordIndices: number[];
  tabooWordIndex: number;
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

    const words = aiResponse.split(/\s+/);
    const matchedWords: string[] = [];
    const matchedWordIndices: number[] = [];
    const lemmatizer = new Lemmatizer();

    // Precompute lemmas for target words
    const targetWordLemmasMap = new Map<string, string[]>();
    targetWords.forEach((target) => {
      targetWordLemmasMap.set(
        target,
        lemmatizer.only_lemmas(target.toLowerCase())
      );
    });

    // Iterate over aiResponse words and check matches
    words.forEach((word, index) => {
      const cleanWord = word.toLowerCase().replace(/[.,:\*!?]/g, "");
      if (cleanWord === tabooWord.toLowerCase()) {
        res
          .status(200)
          .json({
            matchedWords: [],
            matchedWordIndices: [],
            tabooWordIndex: index,
          });
      }
      const wordLemmas = lemmatizer.only_lemmas(cleanWord);
      targetWords.forEach((target) => {
        const cleanTarget = target.toLowerCase();
        if (!easyMode) {
          if (cleanWord === cleanTarget) {
            addMatch(matchedWords, target, matchedWordIndices, index);
          }
          return;
        }
        if (cleanWord.slice(0, 5) === cleanTarget.slice(0, 5)) {
          addMatch(matchedWords, target, matchedWordIndices, index);
          return;
        }
        const targetLemmas = targetWordLemmasMap.get(target) || [];

        if (targetLemmas.some((lemma: any) => wordLemmas.includes(lemma))) {
          addMatch(matchedWords, target, matchedWordIndices, index);
        }
      });
    });

    res
      .status(200)
      .json({ matchedWords, matchedWordIndices, tabooWordIndex: -1 });
  } else {
    res.status(405).json({ name: "Method Not Allowed" });
  }
}

function addMatch(
  matchedWords: string[],
  target: string,
  matchedWordIndices: number[],
  index: number
) {
  if (!matchedWords.includes(target)) {
    matchedWords.push(target);
  }
  matchedWordIndices.push(index);
}

// function checkWordMatch(
//   word: string,
//   target: string,
//   isEasyMode: boolean
// ): boolean {
//   const cleanWord = word.toLowerCase().replace(/[.,:\*!?]/g, "");
//   const cleanTarget = target.toLowerCase();

//   if (isEasyMode) {
//     const lemmatizer = new Lemmatizer();
//     const wordLemmas = lemmatizer.only_lemmas(cleanWord);
//     const targetLemmas = lemmatizer.only_lemmas(cleanTarget);
//     if (wordLemmas.some((lemma: any) => targetLemmas.includes(lemma))) {
//       return true;
//     }

//     // Check if the first 5 characters match
//     return cleanWord.slice(0, 5) === cleanTarget.slice(0, 5);
//   }

//   return cleanWord === cleanTarget;
// }
