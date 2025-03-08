import express from "express";
import http from "http";
import cors from "cors";
import axios from "axios";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Base URL for OpenF1 API
const OPENF1_API_URL = "https://api.openf1.org/v1";

// Store connected clients
const clients = new Set();

// WebSocket connection
wss.on("connection", (ws) => {
  clients.add(ws);

  ws.on("close", () => {
    clients.delete(ws);
  });
});

// Broadcast to all clients
function broadcast(data) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

/* -------------------------------------------------------------------------- */
/*                              Meetings endpoint                             */
/* -------------------------------------------------------------------------- */
app.get("/api/meetings", async (req, res) => {
  try {
    const { year } = req.query;
    console.log("meeting called: ", year);
    const response = await axios.get(`${OPENF1_API_URL}/meetings?year=${year}`);

    const venues = response.data.map((venue) => ({
      location: venue.location,
    }));

    res.json(response.data);
    // res.json(venues);
  } catch (error) {
    console.error("Error fetching meetings: ", error);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
});

/* -------------------------------------------------------------------------- */
/*                               Sessions endpoint                            */
/* -------------------------------------------------------------------------- */
app.get("/api/sessions", async (req, res) => {
  try {
    const { year, circuit_key } = req.query;
    console.log(year, circuit_key);
    const response = await axios.get(
      `${OPENF1_API_URL}/sessions?year=${year}&circuit_key=${circuit_key}`
    );
    const sessions = response.data;

    // Sort by date, most recent first
    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

/* -------------------------------------------------------------------------- */
/*                             Circuit data endpoint                          */
/* -------------------------------------------------------------------------- */
app.get("/api/circuit", async (req, res) => {
  const { session_key } = req.query;

  if (!session_key) {
    return res.status(400).json({ error: "session_key is required" });
  }

  try {
    // Fetch circuit details from OpenF1
    const response = await axios.get(
      `${OPENF1_API_URL}/track_status?session_key=${session_key}`
    );

    // For this demo, we'll generate circuit data
    // In a real implementation, you'd get this from the API or preload circuit layouts
    const circuitPoints = generateCircuitPoints(
      response.data[0]?.meeting_name || "Unknown Circuit"
    );

    res.json({
      points: circuitPoints,
      startLine: {
        x1: circuitPoints[0].x,
        y1: circuitPoints[0].y - 10,
        x2: circuitPoints[0].x,
        y2: circuitPoints[0].y + 10,
      },
    });
  } catch (error) {
    console.error("Error fetching circuit data:", error);
    res.status(500).json({ error: "Failed to fetch circuit data" });
  }
});

/* -------------------------------------------------------------------------- */
/*                        Driver positions endpoint                           */
/* -------------------------------------------------------------------------- */
app.get("/api/positions", async (req, res) => {
  const { session_key, live, timestamp } = req.query;

  if (!session_key) {
    return res.status(400).json({ error: "session_key is required" });
  }

  try {
    let url = `${OPENF1_API_URL}/position?session_key=${session_key}`;

    // If historical playback, add timestamp filter
    if (!live && timestamp) {
      url += `&date<=${timestamp}&date>=${timestamp - 5000}`;
    }

    const [positionsResponse, driversResponse, teamsResponse] =
      await Promise.all([
        axios.get(url),
        axios.get(`${OPENF1_API_URL}/drivers?session_key=${session_key}`),
        axios.get(`${OPENF1_API_URL}/teams?session_key=${session_key}`),
      ]);

    const positions = positionsResponse.data;
    const drivers = driversResponse.data;
    const teams = teamsResponse.data;

    // Process and merge data
    const mergedData = positions.map((position) => {
      const driver = drivers.find(
        (d) => d.driver_number === position.driver_number
      );
      const team = teams.find((t) => t.team_id === driver?.team_id);

      return {
        ...position,
        driver_name: driver?.full_name || "Unknown",
        driver_code: driver?.driver_code || "UNK",
        team_name: team?.name || "Unknown",
        team_color: team?.color_code || "#FFFFFF",
      };
    });

    res.json(mergedData);
  } catch (error) {
    console.error("Error fetching position data:", error);
    res.status(500).json({ error: "Failed to fetch position data" });
  }
});

/* -------------------------------------------------------------------------- */
/*                            Intervals data endpoint                         */
/* -------------------------------------------------------------------------- */
app.get("/api/intervals", async (req, res) => {
  const { session_key, timestamp, session_type } = req.query;
  console.log("intervals: ", session_key, timestamp, session_type);

  if (!session_key) {
    return res.status(400).json({ error: "session_key is required" });
  }

  try {
    let intervalUrl = `${OPENF1_API_URL}/intervals?session_key=${session_key}`;
    let timingUrl = `${OPENF1_API_URL}/laps?session_key=${session_key}`;
    let driverUrl = `${OPENF1_API_URL}/drivers?session_key=${session_key}`;
    let stintUrl = `${OPENF1_API_URL}/stints?session_key=${session_key}`;
    let positionUrl = `${OPENF1_API_URL}/position?session_key=${session_key}`;

    // // If historical playback, add timestamp filter
    // if (timestamp != null) {
    //   intervalUrl += `&date<=${timestamp}`;
    //   timingUrl += `&date<=${timestamp}`;
    //   stintUrl += `&date<=${timestamp}`;
    // }

    const [
      intervalResponse,
      timingResponse,
      driversResponse,
      stintsResponse,
      positionResponse,
    ] = await Promise.all([
      axios.get(intervalUrl),
      axios.get(timingUrl),
      axios.get(driverUrl),
      axios.get(stintUrl),
      axios.get(positionUrl),
    ]);

    const intervals = intervalResponse.data;
    const timings = timingResponse.data;
    const drivers = driversResponse.data;
    const stints = stintsResponse.data;
    const positions = positionResponse.data;

    // console.log("testing: ", intervals.length, timings.length, drivers.length, stints.length, positions.length);
    // Process the data to create a comprehensive timing table
    const processedTiming = processTimingData(
      intervals,
      timings,
      drivers,
      stints,
      positions,
      session_type
    );

    res.json(processedTiming);
  } catch (error) {
    console.error("Error fetching timing data:", error);
    res.status(500).json({ error: "Failed to fetch timing data" });
  }
});

/* -------------------------------------------------------------------------- */
/*                        Get session details endpoint                        */
/* -------------------------------------------------------------------------- */
app.get("/api/session-details", async (req, res) => {
  const { session_key } = req.query;

  if (!session_key) {
    return res.status(400).json({ error: "session_key is required" });
  }

  try {
    const response = await axios.get(
      `${OPENF1_API_URL}/sessions?session_key=${session_key}`
    );

    if (response.data && response.data.length > 0) {
      res.json(response.data[0]);
    } else {
      res.status(404).json({ error: "Session not found" });
    }
  } catch (error) {
    console.error("Error fetching session details:", error);
    res.status(500).json({ error: "Failed to fetch session details" });
  }
});

/* -------------------------------------------------------------------------- */
/*                            Weather data endpoint                           */
/* -------------------------------------------------------------------------- */
app.get("/api/weather", async (req, res) => {
  const { session_key } = req.query;
  console.log("Weather session: ".session_key);
  if (!session_key) {
    return res.status(400).json({ error: "session_key is required" });
  }

  try {
    const response = await axios.get(
      `${OPENF1_API_URL}/weather?session_key=${session_key}`
    );

    if (response.data && response.data.length > 0) {
      // Get the most recent weather data
      const weatherData = response.data.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      )[0];
      res.json(weatherData);
    } else {
      res.status(404).json({ error: "Weather data not found" });
    }
  } catch (error) {
    console.error("Error fetching weather data:", error);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

/* -------------------------------------------------------------------------- */
/*                              Helper Functions                              */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*                   Helper function to process timing data                   */
/* -------------------------------------------------------------------------- */
function processTimingData(
  intervals,
  timings,
  drivers,
  stints,
  positions,
  session_type
) {
  // Group lap times by driver
  const driverLaps = {};

  timings.forEach((lap) => {
    if (!driverLaps[lap.driver_number]) {
      driverLaps[lap.driver_number] = [];
    }
    driverLaps[lap.driver_number].push(lap);
  });

  // Find best sectors
  const bestSectors = {
    sector_1: { time: Infinity, driver: null },
    sector_2: { time: Infinity, driver: null },
    sector_3: { time: Infinity, driver: null },
  };

  timings.forEach((lap) => {
    if (
      lap.duration_sector_1 &&
      lap.duration_sector_1 < bestSectors.sector_1.time
    ) {
      bestSectors.sector_1 = {
        time: lap.duration_sector_1,
        driver: lap.driver_number,
      };
    }
    if (
      lap.duration_sector_2 &&
      lap.duration_sector_2 < bestSectors.sector_2.time
    ) {
      bestSectors.sector_2 = {
        time: lap.duration_sector_2,
        driver: lap.driver_number,
      };
    }
    if (
      lap.duration_sector_3 &&
      lap.duration_sector_3 < bestSectors.sector_3.time
    ) {
      bestSectors.sector_3 = {
        time: lap.duration_sector_3,
        driver: lap.driver_number,
      };
    }
  });

  // Find best lap
  const bestLap = { time: Infinity, driver: null };

  timings.forEach((lap) => {
    if (lap.lap_duration && lap.lap_duration < bestLap.time) {
      bestLap.time = lap.lap_duration;
      bestLap.driver = lap.driver_number;
    }
  });

  // Create the final timing data
  const result = drivers.map((driver) => {
    const driverTiming = driverLaps[driver.driver_number] || [];
    const driverStints = stints.filter(
      (s) => s.driver_number === driver.driver_number
    );

    // Sort laps by number to get latest
    driverTiming.sort((a, b) => b.lap_number - a.lap_number);
    const latestLap = driverTiming[0] || {};

    const driverPosition = positions
      .filter((p) => p.driver_number === driver.driver_number)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 1)[0];

    let gap = [];
    if (session_type == "Race") {
      gap = intervals
        .filter((i) => i.driver_number === driver.driver_number)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 1)[0];
    }

    return {
      driver_number: driver.driver_number,
      driver_code: driver.name_acronym,
      driver_name: driver.full_name,
      team_name: driver?.team_name || "Unknown",
      team_color: "#" + driver?.team_colour || "#FFFFFF",
      position: driverPosition.position,
      lap: latestLap.lap_number || "-",
      last_lap_time: formatTime(latestLap.lap_duration),
      // last_lap_time: latestLap.lap_duration,
      gap: session_type == "Race" ? gap.gap_to_leader : "-",
      interval: session_type == "Race" ? gap.interval : "-",
      sector_1_time: latestLap.duration_sector_1,
      sector_2_time: latestLap.duration_sector_2,
      sector_3_time: latestLap.duration_sector_3,
      sector_1_best: bestSectors.sector_1.driver === driver.driver_number,
      sector_2_best: bestSectors.sector_2.driver === driver.driver_number,
      sector_3_best: bestSectors.sector_3.driver === driver.driver_number,
      best_lap_overall: bestLap.driver === driver.driver_number,
      tire: driverStints[driverStints.length - 1]?.compound || "Unknown",
    };
  });

  // Sort by position
  result.sort((a, b) => a.position - b.position);

  return result;
}

/* -------------------------------------------------------------------------- */
/*                     Helper function to format lap times                    */
/* -------------------------------------------------------------------------- */
function formatTime(totalSeconds) {
  if (!totalSeconds && totalSeconds !== 0) return "--"; // Handle null, undefined, or no input, but allow 0

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds - Math.floor(totalSeconds)) * 1000);

  return `${minutes > 0 ? minutes + ":" : ""}${seconds
    .toString()
    .padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
}

/* -------------------------------------------------------------------------- */
/*                 Helper function to generate circuit points                 */
/* -------------------------------------------------------------------------- */
function generateCircuitPoints(circuitName) {
  // Simplified algorithm to generate circuit shape
  // In a real implementation, you'd use real circuit data

  // Default oval
  let points = [];
  const circuitTemplates = {
    // 'Monaco': generateMonacoLikeCircuit(),
    // 'Monza': generateMonzaLikeCircuit(),
    // 'Spa': generateSpaLikeCircuit(),
    // Add more circuits as needed
  };

  // Find a template or use default
  for (const [name, template] of Object.entries(circuitTemplates)) {
    if (circuitName.includes(name)) {
      points = template;
      break;
    }
  }

  // Default to oval if no template matches
  if (points.length === 0) {
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * Math.PI * 2;
      points.push({
        x: 300 + Math.cos(angle) * 200,
        y: 200 + Math.sin(angle) * 120,
      });
    }
  }

  return points;
}

/* -------------------------------------------------------------------------- */
/*                         Circuit generator functions                        */
/* -------------------------------------------------------------------------- */
function generateMonacoLikeCircuit() {
  // Complex Monaco-like circuit with tight corners
  // Implementation details omitted for brevity
  return [
    /* Points would go here */
  ];
}

function generateMonzaLikeCircuit() {
  // Monza-like circuit with long straights
  // Implementation details omitted for brevity
  return [
    /* Points would go here */
  ];
}

function generateSpaLikeCircuit() {
  // Spa-like circuit with elevation and complex sections
  // Implementation details omitted for brevity
  return [
    /* Points would go here */
  ];
}

/* -------------------------------------------------------------------------- */
/*                           Start live data polling                          */
/* -------------------------------------------------------------------------- */
function startLiveDataPolling() {
  setInterval(async () => {
    try {
      // Check for active sessions
      const sessionsResponse = await axios.get(`${OPENF1_API_URL}/sessions`);
      const activeSessions = sessionsResponse.data.filter((s) => {
        s.year == new Date().getFullYear(),
        s.date_start.split('T')[0] == new Date().toISOString().split('T')[0]
      });
      console.log("active length", activeSessions.length);

      if (activeSessions.length > 0) {
        console.log("Active session");
        const activeSession = activeSessions[0];

        // Fetch live data
        const [positionsResponse, timingResponse] = await Promise.all([
          axios.get(
            `${OPENF1_API_URL}/position?session_key=${activeSession.session_key}`
          ),
          axios.get(
            `${OPENF1_API_URL}/lap_times?session_key=${activeSession.session_key}`
          ),
        ]);

        // Broadcast to connected clients
        broadcast({
          type: "live_update",
          session_key: activeSession.session_key,
          positions: positionsResponse.data,
          timing: timingResponse.data,
          timestamp: Date.now(),
        });
      }
      // else {
      //   // console.log("No live session");
      //   console.error("Error polling live data: ", error);
      // }
    } catch (error) {
      // console.error("Error polling live data:", error);
      console.error("Error polling live data");
    }
  }, 60000); // Poll every minute
}

/* -------------------------------------------------------------------------- */
/*                             Starting the server                            */
/* -------------------------------------------------------------------------- */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startLiveDataPolling();
});
