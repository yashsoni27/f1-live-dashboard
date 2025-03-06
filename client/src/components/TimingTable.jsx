"use client"
import apiClient from '@/apiClient';
import { useEffect, useState } from 'react';

const TimingTable = ({ sessionKey, isLive, timestamp }) => {
  const [timingData, setTimingData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!sessionKey) return;
    
    async function fetchTimingData() {
      try {
        setLoading(true);
        // console.log("timing table: ", sessionKey, isLive, timestamp);
        const endpoint = isLive 
          ? `/api/intervals?session_key=${sessionKey}` 
          : `/api/intervals?session_key=${sessionKey}&timestamp=${timestamp}`;
          
        const {data} = await apiClient(endpoint);
        console.log ("Interval data: ", data);
        setTimingData(data);
      } catch (error) {
        console.error('Error fetching timing data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchTimingData();
    
    // Set interval for live updates
    let interval;
    if (isLive) {
      interval = setInterval(fetchTimingData, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionKey, isLive, timestamp]);
  
  return (
    <div className="timing-table bg-gray-800 rounded-lg p-4">
      <h2 className="text-xl font-bold text-white mb-4">Live Timing</h2>
      {loading ? (
        <p className="text-gray-300">Loading timing data...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs uppercase bg-gray-700">
              <tr>
                <th className="px-6 py-3">Pos</th>
                <th className="px-6 py-3">Driver</th>
                <th className="px-6 py-3">Team</th>
                <th className="px-6 py-3">Lap</th>
                <th className="px-6 py-3">Last Lap</th>
                <th className="px-6 py-3">Gap</th>
                <th className="px-6 py-3">Interval</th>
                <th className="px-6 py-3">Sector 1</th>
                <th className="px-6 py-3">Sector 2</th>
                <th className="px-6 py-3">Sector 3</th>
              </tr>
            </thead>
            <tbody>
              {timingData.map((driver) => (
                <tr key={driver.driver_number} className="border-b bg-gray-800 border-gray-700">
                  <td className="px-6 py-4">{driver.position}</td>
                  <td className="px-6 py-4 font-medium whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: driver.team_color }}
                      ></div>
                      <span>{driver.driver_code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{driver.team_name}</td>
                  <td className="px-6 py-4">{driver.lap}</td>
                  <td className="px-6 py-4">{driver.last_lap_time}</td>
                  <td className="px-6 py-4">{driver.gap}</td>
                  <td className="px-6 py-4">{driver.interval}</td>
                  <td className={`px-6 py-4 ${driver.sector_1_best ? 'text-purple-400' : ''}`}>
                    {driver.sector_1_time}
                  </td>
                  <td className={`px-6 py-4 ${driver.sector_2_best ? 'text-purple-400' : ''}`}>
                    {driver.sector_2_time}
                  </td>
                  <td className={`px-6 py-4 ${driver.sector_3_best ? 'text-purple-400' : ''}`}>
                    {driver.sector_3_time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TimingTable;