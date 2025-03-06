"use client"
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import apiClient from '@/apiClient';

const CircuitAnimation = ({ sessionKey, isLive, timestamp }) => {
  const svgRef = useRef();
  
  useEffect(() => {
    if (!sessionKey) return;
    
    // Set up D3 visualization
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const width = 800;
    const height = 500;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Fetch circuit data
    async function fetchCircuitData() {
      try {
        const { circuitData } = await apiClient(`/api/circuit?session_key=${sessionKey}`);
        console.log("circuit data: ", circuitData);
        drawCircuit(circuitData);
      } catch (error) {
        console.error('Error fetching circuit data:', error);
      }
    }
    
    // Draw circuit function
    function drawCircuit(circuitData) {
      // Create scales based on circuit coordinates
      const xExtent = d3.extent(circuitData.points, d => d.x);
      const yExtent = d3.extent(circuitData.points, d => d.y);
      
      const xScale = d3.scaleLinear()
        .domain(xExtent)
        .range([0, width - margin.left - margin.right])
        .nice();
        
      const yScale = d3.scaleLinear()
        .domain(yExtent)
        .range([height - margin.top - margin.bottom, 0])
        .nice();
      
      // Draw circuit path
      const line = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveCatmullRom);
      
      g.append("path")
        .datum(circuitData.points)
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", 4)
        .attr("d", line);
        
      // Draw start/finish line
      if (circuitData.startLine) {
        g.append("line")
          .attr("x1", xScale(circuitData.startLine.x1))
          .attr("y1", yScale(circuitData.startLine.y1))
          .attr("x2", xScale(circuitData.startLine.x2))
          .attr("y2", yScale(circuitData.startLine.y2))
          .attr("stroke", "red")
          .attr("stroke-width", 3);
      }
      
      // Set up car position updates
      updateDriverPositions();
    }
    
    // Update driver positions
    async function updateDriverPositions() {
      try {
        const endpoint = isLive 
          ? `/api/positions?session_key=${sessionKey}&live=true` 
          : `/api/positions?session_key=${sessionKey}&timestamp=${timestamp}`;
          
        const response = await fetch(endpoint);
        const positions = await response.json();
        
        // Create driver dots
        const driverGroups = g.selectAll(".driver")
          .data(positions, d => d.driver_number)
          .join(
            enter => {
              const group = enter.append("g")
                .attr("class", "driver")
                .attr("transform", d => `translate(${xScale(d.x)}, ${yScale(d.y)})`);
                
              group.append("circle")
                .attr("r", 8)
                .attr("fill", d => d.team_color);
                
              group.append("text")
                .attr("text-anchor", "middle")
                .attr("dy", 3)
                .attr("fill", "white")
                .attr("font-size", "10px")
                .text(d => d.driver_number);
                
              return group;
            },
            update => update.transition()
              .duration(500)
              .attr("transform", d => `translate(${xScale(d.x)}, ${yScale(d.y)})`)
          );
        
        // If live, schedule next update
        if (isLive) {
          setTimeout(updateDriverPositions, 1000);
        }
      } catch (error) {
        console.error('Error fetching driver positions:', error);
      }
    }
    
    fetchCircuitData();
    
    return () => {
      // Cleanup
    };
  }, [sessionKey, isLive, timestamp]);
  
  return (
    <div className="circuit-container bg-gray-900 rounded-lg p-4">
      <h2 className="text-xl font-bold text-white mb-4">Circuit Animation</h2>
      <svg 
        ref={svgRef} 
        width="100%" 
        height="500" 
        viewBox="0 0 800 500" 
        preserveAspectRatio="xMidYMid meet"
        className="bg-black rounded-lg"
      />
    </div>
  );
};

export default CircuitAnimation;