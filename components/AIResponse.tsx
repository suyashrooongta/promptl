import { X } from "lucide-react";
import { checkWordMatch } from "../utils";
import { marked } from "marked";
import { useState } from "react";

interface AIResponseProps {
  prompt: string;
  response: string;
  matchedWords: string[];
  tabooWord: string;
  tabooHit: boolean;
  bonusPoints: number;
  isEasyMode: boolean;
  onClose: () => void;
}

export function AIResponse({
  prompt,
  response,
  matchedWords,
  tabooWord,
  tabooHit,
  bonusPoints,
  isEasyMode,
  onClose,
}: AIResponseProps) {
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setLoading(true);
    onClose();
  };

  // Split response into words and highlight matches

  const highlightMarkdown = (markdown: string) => {
    let processedMarkdown = markdown;

    const markdownwords = markdown.split(/(\s+)/);

    const highlightedWords = markdownwords.map((word, index) => {
      if (word.trim() === "") return word;

      const cleanWord = word.replace(/[.,!?]/g, "");

      if (checkWordMatch(cleanWord, tabooWord, false)) {
        return `<span class="bg-red-200 px-1 rounded">${word}</span>`;
      }

      if (
        matchedWords.some((target) =>
          checkWordMatch(cleanWord, target, isEasyMode)
        )
      ) {
        return `<span class="bg-green-200 px-1 rounded">${word}</span>`;
      }

      return word;
    });
    processedMarkdown = highlightedWords.join("");

    return marked(processedMarkdown);
  };

  const highlightedResponse = (
    <div dangerouslySetInnerHTML={{ __html: highlightMarkdown(response) }} />
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full relative overflow-hidden h-[80%]">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">AI Response</h2>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close"
              disabled={loading}
            >
              {loading ? "Checking..." : <X className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6  overflow-y-auto h-[80%]">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Your Prompt:
          </h3>
          <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
            Describe {prompt}
          </p>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              AI Response:
            </h3>
            <div className="text-gray-700 bg-gray-50 p-3 rounded-lg leading-relaxed">
              {highlightedResponse}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="space-y-2">
              {tabooHit ? (
                <>
                  <div className="text-red-600 font-semibold">
                    ❌ Taboo word "{tabooWord}" was used!
                  </div>
                  <div className="text-red-600 font-semibold animate-bounce">
                    -20 points!
                  </div>
                </>
              ) : matchedWords.length > 0 ? (
                <>
                  <div className="text-green-600 font-semibold">
                    ✅ Matched {matchedWords.length} word
                    {matchedWords.length > 1 ? "s" : ""}:{" "}
                    {matchedWords.join(", ")}
                  </div>
                  {bonusPoints > 0 && (
                    <div className="text-indigo-600 font-semibold animate-bounce">
                      🎉 Bonus points: +{bonusPoints}!
                    </div>
                  )}
                </>
              ) : (
                <div className="text-yellow-600 font-semibold">
                  ⚠️ No target words matched
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
