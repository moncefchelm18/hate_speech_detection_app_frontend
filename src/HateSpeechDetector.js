import React, { useState, useRef } from "react";
import "./index.css";
import "./App.css";

const HateSpeechDetector = () => {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [duration, setDuration] = useState(0);
  const [transcription, setTranscription] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRef = useRef(new Audio());

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
      const response = await fetch("http://172.20.10.4:5001/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Error: ${response.status} - ${errorBody}`);
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

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      setError("Please upload an audio file");
      return;
    }

    // Create a blob URL for the audio file
    const audioURL = URL.createObjectURL(file);
    audioRef.current.src = audioURL;

    // Check duration when metadata is loaded
    audioRef.current.onloadedmetadata = () => {
      if (audioRef.current.duration > 20) {
        setError("Audio file must be 20 seconds or shorter");
        setAudioFile(null);
        URL.revokeObjectURL(audioURL);
      } else {
        setDuration(audioRef.current.duration);
        setAudioFile(file);
        setError("");
      }
    };
  };

  const handleTranscribe = async () => {
    if (!audioFile) return;

    setIsTranscribing(true);
    setError("");
    setTranscription("");

    try {
      const formData = new FormData();
      formData.append("audio", audioFile);

      // Upload audio file to AssemblyAI
      const uploadResponse = await fetch(
        "https://api.assemblyai.com/v2/upload",
        {
          method: "POST",
          headers: {
            Authorization: "0670aaa45a704005a19db390ef3eb844",
          },
          body: formData,
        }
      );

      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error("Failed to upload audio.");

      const audioUrl = uploadData.upload_url;

      // Request transcription
      const transcriptResponse = await fetch(
        "https://api.assemblyai.com/v2/transcript",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "0670aaa45a704005a19db390ef3eb844",
          },
          body: JSON.stringify({ audio_url: audioUrl }),
        }
      );

      const transcriptData = await transcriptResponse.json();
      if (!transcriptResponse.ok)
        throw new Error("Failed to request transcription.");

      // Poll for transcription result
      let pollingResponse;
      let result;
      do {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        pollingResponse = await fetch(
          `https://api.assemblyai.com/v2/transcript/${transcriptData.id}`,
          {
            headers: { Authorization: "0670aaa45a704005a19db390ef3eb844" },
          }
        );

        result = await pollingResponse.json(); // Read the response body once
      } while (result.status === "processing");

      if (result.status === "completed") {
        setTranscription(result.text);
        setInputText(result.text); // Automatically set the transcription as input for hate speech detection
      } else {
        throw new Error("Transcription failed.");
      }
    } catch (err) {
      console.log(err.message);
      setError(err.message || "Failed to transcribe audio.");
    } finally {
      setIsTranscribing(false);
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
            </div>
            <label className="block mt-4">
              <span className="text-gray-700">
                Upload Audio File (Max 20 seconds)
              </span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
              />
            </label>
            <button
              onClick={handleTranscribe}
              className="hatespeech-button bg-green-500 text-white font-bold py-2 px-4 rounded-md mt-4"
              disabled={isTranscribing || !audioFile}
            >
              {isTranscribing ? "Transcribing..." : "Transcribe Audio"}
            </button>
          </form>
          {/* Display Output */}
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
          {/* {transcription && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold">Transcription:</h3>
              <p className="text-gray-700">{transcription}</p>
            </div>
          )} */}
        </div>
      </section>
    </>
  );
};

export default HateSpeechDetector;
