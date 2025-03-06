"use client"
import apiClient from '@/apiClient';
import { useState, useEffect } from 'react';

const RaceInfo = ({ sessionData, isLive }) => {
  const [weather, setWeather] = useState(null);
  
  useEffect(() => {
    if (!sessionData) return;
    
    async function fetchWeather() {
      try {
        const { data } = await apiClient(`/api/weather?session_key=${sessionData.session_key}`);
        console.log("weatherData: ", data);
        setWeather(data);
      } catch (error) {
        console.error('Error fetching weather data:', error);
      }
    }
    
    fetchWeather();
    
    // Poll for weather updates if live
    let interval;
    if (isLive) {
      interval = setInterval(fetchWeather, 60000); // Every minute
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionData, isLive]);
  
  if (!sessionData) {
    console.log("RaceInfo rendering null - no session data");
    return <div className="bg-gray-800 rounded-lg p-4 text-white">Waiting for session data...</div>;
  }
  
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">{sessionData.circuit_short_name}</h2>
          <h3 className="text-xl font-semibold text-gray-300 mb-4">{sessionData.session_name}</h3>
          
          <div className="flex items-center mb-2">
            <div className={`w-4 h-4 rounded-full ${isLive ? 'bg-red-500' : 'bg-gray-500'} mr-2`}></div>
            <span className="text-gray-300">{isLive ? 'LIVE' : 'Historical'}</span>
          </div>
          
          <p className="text-gray-300">
            {new Date(sessionData.date_start).toLocaleDateString()} at {new Date(sessionData.date_start).toLocaleTimeString()}
          </p>
        </div>
        
        {weather && (
          <div className="bg-gray-700 rounded p-3">
            <h4 className="text-gray-300 font-semibold mb-2">Weather Conditions</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-gray-400 text-sm">Air Temperature</p>
                <p className="text-white">{weather.air_temperature}°C</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Track Temperature</p>
                <p className="text-white">{weather.track_temperature}°C</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Humidity</p>
                <p className="text-white">{weather.humidity}%</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Wind Speed</p>
                <p className="text-white">{weather.wind_speed} m/s</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RaceInfo;