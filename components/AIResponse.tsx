import { X } from "lucide-react";
import { marked } from "marked";
import { useState, useEffect } from "react";
import { PENALTY_PER_TABOO_HIT_CONSTANT } from "../utils"; // Import the constant

interface AIResponseProps {
  prompt: string;
  response: string;
  matchedWords: string[];
  matchedWordIndices: { [key: string]: number[] };
  tabooWord: string;
  tabooWordIndices: number[];
  bonusPoints: number;
  onClose: () => void;
  selectedTerm: string | null;
}

export function AIResponse({
  prompt,
  response,
  matchedWords,
  matchedWordIndices,
  tabooWord,
  tabooWordIndices,
  bonusPoints,
  onClose,
  selectedTerm,
}: AIResponseProps) {
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setLoading(true);
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const highlightMarkdown = (markdown: string) => {
    let processedMarkdown = markdown;

    const matchedIndices = selectedTerm
      ? matchedWordIndices[selectedTerm] || []
      : Object.values(matchedWordIndices).flat();

    // Split into words and punctuation while preserving them
    const markdownWords = markdown.split(/(\W+)/); // Matches non-word characters (punctuation, spaces, etc.)

    let wordIndex = 0; // Track non-whitespace word index
    const highlightedWords = markdownWords.map((word) => {
      if (!/\w/.test(word)) return word; // Skip non-word characters (punctuation, spaces)

      const currentIndex = wordIndex++;
      if (tabooWordIndices?.includes(currentIndex)) {
        return `<span class="bg-red-200 px-1 rounded">${word}</span>`;
      }

      if (matchedIndices.includes(currentIndex)) {
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

  const tabooHit = tabooWordIndices?.length > 0;
  bonusPoints = selectedTerm ? 0 : bonusPoints;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full relative overflow-hidden h-[80%]">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">
              {" "}
              {/* Reduced size */}
              {selectedTerm ? (
                <>✅ Prompt: "Describe {prompt}"</>
              ) : tabooHit ? (
                <>❌ Taboo term "{tabooWord}" was used!</>
              ) : matchedWords.length > 0 ? (
                <>
                  ✅ Matched {matchedWords.length} term
                  {matchedWords.length > 1 ? "s" : ""}:{" "}
                  {matchedWords.join(", ")}
                </>
              ) : (
                <>⚠️ No target terms matched</>
              )}
            </h2>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close"
              disabled={loading}
            >
              {loading ? "Checking..." : <X className="w-6 h-6" />}
            </button>
          </div>
          {bonusPoints > 0 && !tabooHit && (
            <div className="text-indigo-200 font-semibold animate-bounce text-xl mt-2">
              {" "}
              {/* Increased size */}
              🎉 Bonus points: +{bonusPoints}!
            </div>
          )}
          {tabooHit && (
            <div className="text-red-200 font-semibold animate-bounce text-xl mt-2">
              {" "}
              {/* Increased size */}
              😢 -{PENALTY_PER_TABOO_HIT_CONSTANT} points!
            </div>
          )}
        </div>
        <div className="p-6 space-y-6 overflow-y-auto h-[80%]">
          {!selectedTerm && (
            <>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Your Prompt
              </h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                Describe {prompt}
              </p>
            </>
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              AI Response
            </h3>
            <div className="text-gray-700 bg-gray-50 p-3 rounded-lg leading-relaxed">
              {highlightedResponse}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
