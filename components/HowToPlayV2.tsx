import React, { useEffect } from "react";
import { X } from "lucide-react";

interface HowToPlayProps {
  onClose: () => void;
}

export function HowToPlay({ onClose }: HowToPlayProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full relative overflow-hidden h-[80%]">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">How to Play</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto h-[80%]">
          <div className="space-y-6 mb-8">
            <p className="text-gray-700 leading-relaxed">
              In Promptl, we prompt AI to describe some terms. For instance, if
              the word is "fish", the prompt for AI will be "Describe the term
              fish".
            </p>
            <p className="text-gray-700 leading-relaxed">
              There are 5 target terms and 1 taboo terms that AI will be
              prompted with. You have to guess a word appearing in the AI
              response. Your goal is to hit the target terms while avoiding the
              taboo term.
            </p>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800">Rules:</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-indigo-400 rounded-full"></span>
                  Guess words in the AI responses for 5 target terms that do not
                  appear in the AI response for the taboo term.
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-indigo-400 rounded-full"></span>
                  Your guess must be a single English word.
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-indigo-400 rounded-full"></span>
                  Your guess cannot be a derivatives of target terms.
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-indigo-400 rounded-full"></span>
                  You get penalized if AI response for the taboo term contains
                  your guess.
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-indigo-400 rounded-full"></span>
                  You get bonus points if AI response for more than one target
                  term contains your guess.
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-indigo-400 rounded-full"></span>
                  You have 10 guesses and 10 minutes to win.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800">Scoring:</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-purple-400 rounded-full"></span>
                  Start with 100 points.
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-purple-400 rounded-full"></span>
                  -10 points for each guess with a taboo hit.
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-purple-400 rounded-full"></span>
                  -5 points for each wasted guess, i.e., without a target hit.
                  hit
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-purple-400 rounded-full"></span>
                  +5 points for each extra target term hit in a single guess.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800">
                Hard Mode:
              </h3>
              <p className="text-gray-700">
                In normal mode, word matching is lenient and includes word
                variations (e.g., "running" matches "run"). In hard mode, only
                exact matches are accepted.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all transform hover:scale-105 font-medium"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
