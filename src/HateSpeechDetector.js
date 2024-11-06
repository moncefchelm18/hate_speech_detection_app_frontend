import React from "react";
import { useState } from "react";
import "./index.css";
import "./App.css";

const HateSpeechDetector = () => {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult("");
    setConfidence(null);

    try {
      // Send the text to Flask API
      const response = await fetch("http://192.168.1.37:5000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        throw new Error("Error fetching data from API");
      }

      const data = await response.json();
      setResult(data.prediction);
      setConfidence(data.confidence);
    } catch (err) {
      setError("There was an issue with the server request.");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="hatespeech-section">
        <div className="hatespeech-card bg-white border">
          <h2 className="hatespeech-title font-bold text-5xl text-blue-800 mb-4">
            Hate Speech Detector
          </h2>
          <p className="hatespeech-text mb-6">
            Hate speech is a communication that carries no meaning other than
            the expression of hatred for some group, especially in circumstances
            in which the communication is likely to provoke violence.
          </p>
          <form
            className="hatespeech-form flex flex-col"
            onSubmit={handleSubmit}
          >
            <p className="mb-2 text-sm text-gray-700">
              Limit {inputText.length}/2000
            </p>
            <textarea
              className="hatespeech-textarea border rounded-md p-2 w-full h-36 mb-4"
              placeholder="Enter your text here..."
              value={inputText}
              onChange={handleInputChange}
              maxLength={2000}
            ></textarea>
            <div className="action-btns flex gap-2">
              <button
                type="submit"
                className="hatespeech-button bg-blue-700 text-white font-bold py-2 px-4 rounded-md mt-2 shadow-lg"
                disabled={loading}
              >
                {loading ? "Detecting..." : "Detect Hate Speech"}
              </button>
              <button
                type="reset"
                className="hatespeech-button bg-red-700 text-white font-bold py-2 px-4 rounded-md mt-2"
                onClick={() => {
                  setInputText("");
                  setResult("");
                  setConfidence(null);
                  setError("");
                }}
              >
                Clear
              </button>

              <button
                type="microphone"
                className="hatespeech-button bg-green-500 text-white font-bold py-2 px-4 rounded-md mt-2"
              >
                Speak
              </button>
            </div>
          </form>
          {/* Display output */}
          {error && <p className="text-red-500 mt-4">{error}</p>}
          {result && (
            <div className="mt-6">
              <h3 className="text-2xl font-semibold">{result}</h3>
              {confidence !== null && (
                <p className="text-gray-700">
                  Confidence: {(confidence * 100).toFixed(2)}%
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default HateSpeechDetector;
