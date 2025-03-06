"use client"
import { useState, useEffect } from 'react';
import apiClient from '@/apiClient';

function YearVenueSelector({ onYearSelect, onVenueSelect, selectedYear, selectedVenue }) {
  const [years] = useState([2025, 2024, 2023]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    async function fetchVenues() {
      if (!selectedYear) {
        setVenues([]);
        return;
      }

      setLoading(true);
      try {
        const { data } = await apiClient.get(`/api/meetings?year=${selectedYear}`);
        console.log(data);
        setVenues(data);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setVenues([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchVenues();
  }, [selectedYear]);

  return (
    <div className="flex gap-4">
      <div className="w-1/2">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select Year
        </label>
        <select 
          className="w-full bg-gray-800 text-white rounded p-2"
          value={selectedYear || ''}
          onChange={(e) => {
            const year = e.target.value;
            onYearSelect(year);
            onVenueSelect(null); // Reset venue when year changes
          }}
        >
          <option value="">Select a year</option>
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
      
      <div className="w-1/2">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select Venue
        </label>
        <select 
          className="w-full bg-gray-800 text-white rounded p-2"
          value={selectedVenue || ''}
          onChange={(e) => onVenueSelect(e.target.value)}
          disabled={!selectedYear || loading}
        >
          <option value="">
            {loading ? 'Loading venues...' : 'Select a venue'}
          </option>
          {venues.map(venue => (
            <option key={venue.meeting_key} value={venue.circuit_key}>
              {venue.location}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default YearVenueSelector;