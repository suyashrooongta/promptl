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
              In Promptl, come up with prompts for AI, to make it say specific
              target words while avoiding a taboo word.
            </p>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800">Rules:</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-indigo-400 rounded-full"></span>
                  Find 5 target words while avoiding 1 taboo word
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-indigo-400 rounded-full"></span>
                  Your prompt must be a single English word
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-indigo-400 rounded-full"></span>
                  You cannot use derivatives of target words
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-indigo-400 rounded-full"></span>
                  You get penalized if AI uses the taboo word
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-indigo-400 rounded-full"></span>
                  You have 10 prompts and 10 minutes to win
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800">Scoring:</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-purple-400 rounded-full"></span>
                  Start with 100 points
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-purple-400 rounded-full"></span>
                  -10 points for each prompt with a taboo hit
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-purple-400 rounded-full"></span>
                  -5 points for each wasted prompt, i.e., without a target word
                  hit
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 mt-2 mr-2 bg-purple-400 rounded-full"></span>
                  +5 points for each extra word matched in a single prompt
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
