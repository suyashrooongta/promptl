import { X } from "lucide-react";
import { marked } from "marked";
import { useState, useEffect } from "react";
import { PENALTY_PER_TABOO_HIT_CONSTANT } from "../utils"; // Import the constant

interface AIResponseProps {
  input: string;
  matchedWords: string[];
  matchedIndices: { [key: string]: number[] };
  tabooWord: string;
  tabooWordIndices: number[];
  bonusPoints: number;
  tabooWordResponse: string;
  targetWordResponses: { [key: string]: string };
  onClose: () => void;
  selectedTerm: string | null;
}

export function AIResponse({
  input,
  matchedWords,
  matchedIndices,
  tabooWord,
  tabooWordIndices,
  bonusPoints,
  tabooWordResponse,
  targetWordResponses,
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

  const tabooHit = tabooWordIndices?.length > 0;
  bonusPoints = selectedTerm ? 0 : bonusPoints;

  const highlightMarkdown = (
    markdown: string,
    matchedWordIndices: number[],
    taboo: Boolean
  ) => {
    let processedMarkdown = markdown;

    // Split into words and punctuation while preserving them
    const markdownWords = markdown.split(/(\W+)/);

    if (taboo) {
      // For each matched word, show it and two words on either side, blur the rest
      const visible = new Array(markdownWords.length).fill(false);
      let wordIndices = [];
      // Map from markdownWords index to word index (skip punctuation)
      let wordIdx = 0;
      for (let i = 0; i < markdownWords.length; i++) {
        if (/\w/.test(markdownWords[i])) {
          wordIndices.push(i);
          wordIdx++;
        }
      }
      // Mark visible indices
      matchedWordIndices.forEach((matchedWordIdx) => {
        // Find the corresponding index in markdownWords
        const idx = wordIndices[matchedWordIdx];
        if (idx !== undefined) {
          for (let offset = -2; offset <= 2; offset++) {
            const showIdx = wordIndices[matchedWordIdx + offset];
            if (showIdx !== undefined) visible[showIdx] = true;
          }
        }
      });
      // Highlight and blur accordingly
      let currWordIdx = 0;
      const highlightedWords = markdownWords.map((word, i) => {
        const isVisible = visible[i];
        const isMatched = matchedWordIndices.includes(currWordIdx);
        const isAWord = /\w/.test(word);
        if (isAWord) currWordIdx++;
        if (isMatched && isAWord) {
          return `<span class="bg-red-200 px-1 rounded">${word}</span>`;
        } else if (isVisible) {
          return word;
        } else {
          return `<span class="text-gray-600 blur-sm select-none">${word}</span>`;
        }
      });
      processedMarkdown = highlightedWords.join("");
      return marked(processedMarkdown);
    }

    // Normal highlighting for non-taboo
    let wordIndex = 0;
    const highlightedWords = markdownWords.map((word) => {
      if (!/\w/.test(word)) return word;
      const currentIndex = wordIndex++;
      if (matchedWordIndices.includes(currentIndex)) {
        return `<span class="bg-green-200 px-1 rounded">${word}</span>`;
      }
      return word;
    });

    processedMarkdown = highlightedWords.join("");
    return marked(processedMarkdown);
  };

  const highlightedResponse = (
    response: string,
    matchedWordIndices: number[],
    taboo: Boolean
  ) => {
    return (
      <div
        dangerouslySetInnerHTML={{
          __html: highlightMarkdown(response, matchedWordIndices, taboo),
        }}
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full relative overflow-hidden h-[80%]">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">
              {" "}
              {/* Reduced size */}
              {selectedTerm ? (
                <>✅ Input: "{input}"</>
              ) : tabooHit ? (
                <>❌ Hit taboo term "{tabooWord}"!</>
              ) : matchedWords.length > 0 ? (
                <>
                  ✅ Matched {matchedWords.length} term
                  {matchedWords.length > 1 ? "s" : ""}:{" "}
                  {matchedWords.join(", ")}
                </>
              ) : (
                <>⚠️ No target terms hit</>
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
            </div>
          )}
          {tabooHit ? (
            <div className="text-red-200 font-semibold animate-bounce text-xl mt-2">
              {" "}
              {/* Increased size */}
              😢 -{PENALTY_PER_TABOO_HIT_CONSTANT} points!
            </div>
          ) : null}
        </div>
        <div className="p-6 space-y-6 overflow-y-auto h-[80%]">
          {!selectedTerm && (
            <>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Your Guess
              </h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{input}</p>
            </>
          )}
          {(tabooHit || matchedWords.length > 0) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                AI Response
              </h3>
              <div className="text-gray-700 bg-gray-50 p-3 rounded-lg leading-relaxed space-y-4">
                {tabooHit
                  ? tabooWordResponse && (
                      <div>
                        <strong className="text-red-500">
                          Taboo word: "{tabooWord}"
                        </strong>
                        {highlightedResponse(
                          tabooWordResponse,
                          tabooWordIndices,
                          true
                        )}
                      </div>
                    )
                  : Object.entries(targetWordResponses)
                      .filter(([word]) =>
                        selectedTerm
                          ? word === selectedTerm
                          : matchedWords.includes(word)
                      )
                      .map(([word, response]) => (
                        <div key={word}>
                          <strong className="text-green-500">
                            Target term: "{word}"
                          </strong>
                          {highlightedResponse(
                            response,
                            matchedIndices[word] || [],
                            false
                          )}
                        </div>
                      ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
