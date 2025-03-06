"use client";
import { useState, useEffect } from "react";
import apiClient from "./apiClient";
import SessionSelector from "./components/SessionSelector";
import CircuitAnimation from "./components/CircuitAnimation";
import TimingTable from "./components/TimingTable";
import PlaybackControls from "./components/PlaybackControls";
import RaceInfo from "./components/RaceInfo";
import YearVenueSelector from "./components/YearVenueSelector";

function App() {
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [timestamp, setTimestamp] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveSessionKey, setLiveSessionKey] = useState(null);

  // Connect to WebSocket for live updates
  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.hostname}:5000`);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("data on initial websocket connect:  ", data);

        if (data.type === "live_update") {
          setLiveSessionKey(data.session_key);
          // Auto-select live session if user hasn't selected one
          if (!selectedSession) {
            handleFetchSessionDetails(data.session_key);
          }
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  // Fetch session details when a session is selected
  const handleFetchSessionDetails = async (sessionKey) => {
    try {
      const { data } = await apiClient(
        `/api/session?session_key=${sessionKey}`
      );
      setSessionData(data);

      // Determine if this is a live session
      const isSessionLive = data.status === "Active";
      setIsLive(isSessionLive);

      // Set initial timestamp for historical playback
      if (!isSessionLive && data.date_start) {
        setTimestamp(data.date_start);
      }
    } catch (error) {
      console.error("Error fetching session details:", error);
    }
  };

  // Handle session selection
  const handleSessionSelect = (session) => {
    setSelectedSession(session);
    handleFetchSessionDetails(session.session_key);
  };

  // Handle timestamp change for historical playback
  const handleTimestampChange = (newTimestamp) => {
    setTimestamp(newTimestamp);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-black p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-red-600">
            F1 Live Timing & Track Visualization
          </h1>
          <div className="flex items-center">
            <div
              className={`w-3 h-3 rounded-full ${
                wsConnected ? "bg-green-500" : "bg-red-500"
              } mr-2`}
            ></div>
            <span className="text-sm text-gray-300">
              {wsConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-3">
            {!liveSessionKey && (
              <YearVenueSelector
                onYearSelect={setSelectedYear}
                onVenueSelect={setSelectedVenue}
                selectedYear={selectedYear}
                selectedVenue={selectedVenue}
              />
            )}
            <SessionSelector
              onSessionSelect={handleSessionSelect}
              year={selectedYear}
              circuit={selectedVenue}
              showHistorical={!liveSessionKey}
            />
          </div>
          <div className="md:col-span-1">
            {liveSessionKey && !selectedSession && (
              <button
                onClick={() => handleFetchSessionDetails(liveSessionKey)}
                className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition"
              >
                Join Live Session
              </button>
            )}
          </div>
        </div>

        {selectedSession && (
          <>
            <div className="mb-4">
              <RaceInfo sessionData={selectedSession} isLive={isLive} />
            </div>

            <div className="mb-4">
              <CircuitAnimation
                sessionKey={selectedSession.session_key}
                isLive={isLive}
                timestamp={timestamp}
              />
            </div>

            <div className="mb-4">
              <TimingTable
                sessionKey={selectedSession.session_key}
                isLive={isLive}
                timestamp={timestamp}
              />
            </div>

            {!isLive && sessionData && (
              <div className="mb-4">
                <PlaybackControls
                  sessionKey={selectedSession.session_key}
                  onTimestampChange={handleTimestampChange}
                  sessionData={sessionData}
                />
              </div>
            )}
          </>
        )}
      </main>

      <footer className="bg-black p-4 text-center text-gray-400">
        <p>Powered by OpenF1 API - Data provided by openf1.org</p>
      </footer>
    </div>
  );
}

export default App;
