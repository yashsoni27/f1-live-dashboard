"use client"
import { useState } from "react";

const PlaybackControls = ({ sessionKey, onTimestampChange, sessionData }) => {
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTimestamp, setCurrentTimestamp] = useState(
    sessionData?.start_timestamp || 0
  );
  const endTimestamp = sessionData?.end_timestamp || 0;

  // Calculate progress percentage
  const progress =
    endTimestamp > 0
      ? ((currentTimestamp - sessionData?.start_timestamp) /
          (endTimestamp - sessionData?.start_timestamp)) *
        100
      : 0;

  // Format time display
  const formatTime = (timestamp) => {
    if (!sessionData?.start_timestamp) return "00:00";

    const seconds = Math.floor(
      (timestamp - sessionData.start_timestamp) / 1000
    );
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Handle play/pause
  const togglePlay = () => {
    if (playing) {
      clearInterval(window.playbackInterval);
    } else {
      window.playbackInterval = setInterval(() => {
        setCurrentTimestamp((prev) => {
          const newTime = prev + 1000 * playbackSpeed;
          if (newTime >= endTimestamp) {
            clearInterval(window.playbackInterval);
            setPlaying(false);
            return endTimestamp;
          }
          onTimestampChange(newTime);
          return newTime;
        });
      }, 1000);
    }
    setPlaying(!playing);
  };

  // Handle slider change
  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value);
    const newTimestamp =
      sessionData.start_timestamp +
      (endTimestamp - sessionData.start_timestamp) * (value / 100);
    setCurrentTimestamp(newTimestamp);
    onTimestampChange(newTimestamp);
  };

  // Handle speed change
  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (playing) {
      clearInterval(window.playbackInterval);
      window.playbackInterval = setInterval(() => {
        setCurrentTimestamp((prev) => {
          const newTime = prev + 1000 * speed;
          if (newTime >= endTimestamp) {
            clearInterval(window.playbackInterval);
            setPlaying(false);
            return endTimestamp;
          }
          onTimestampChange(newTime);
          return newTime;
        });
      }, 1000);
    }
  };

  return (
    <div className="playback-controls bg-gray-800 rounded-lg p-4">
      <h2 className="text-xl font-bold text-white mb-4">Playback Controls</h2>

      <div className="flex items-center mb-4">
        <span className="text-gray-300 mr-2">
          {formatTime(currentTimestamp)}
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-gray-300 ml-2">{formatTime(endTimestamp)}</span>
      </div>

      <div className="flex justify-center space-x-4">
        <button
          onClick={togglePlay}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          {playing ? "Pause" : "Play"}
        </button>

        <div className="flex space-x-2">
          <button
            onClick={() => handleSpeedChange(0.5)}
            className={`px-3 py-1 rounded ${
              playbackSpeed === 0.5
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            0.5x
          </button>
          <button
            onClick={() => handleSpeedChange(1)}
            className={`px-3 py-1 rounded ${
              playbackSpeed === 1
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            1x
          </button>
          <button
            onClick={() => handleSpeedChange(2)}
            className={`px-3 py-1 rounded ${
              playbackSpeed === 2
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            2x
          </button>
          <button
            onClick={() => handleSpeedChange(4)}
            className={`px-3 py-1 rounded ${
              playbackSpeed === 4
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            4x
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaybackControls;