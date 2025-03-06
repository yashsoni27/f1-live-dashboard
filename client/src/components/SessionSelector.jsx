"use client";
import apiClient from '@/apiClient';
import { useState, useEffect } from "react";

const SessionSelector = ({
  onSessionSelect,
  year,
  circuit,
  showHistorical,
}) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Session: ", year, circuit, showHistorical);
    const fetchSessions = async () => {
      setLoading(true);
      try {
        let url = "/api/sessions";
        if (showHistorical) {
          url += `?year=${year}&circuit_key=${circuit}`;
        }
        const { data } = await apiClient(url);
        console.log("session data: ", data);
        setSessions(data);
      } catch (error) {
        console.error("Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!showHistorical || (year && circuit)) {
      fetchSessions();
    }
  }, [year, circuit, showHistorical]);

  if (loading) {
    return <div className="text-white">Loading sessions...</div>;
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold text-white mb-4">Select Session</h2>
      {loading ? (
        <p className="text-gray-300">Loading sessions...</p>
      ) : (
        <select
          className="w-full bg-gray-700 text-white p-2 rounded"
          onChange={(e) => {
            const selectedSession = sessions[e.target.selectedIndex - 1];
            console.log("Selected session: ", selectedSession);
            onSessionSelect(selectedSession);
          }}
        >
          <option value="">Select a session</option>
          {sessions.map((session, index) => (
            <option key={session.session_key} value={session}>
              {session.session_name} (
              {new Date(session.date_start).toLocaleDateString()})
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default SessionSelector;
