const express = require('express');
const path = require('path');
const os = require('os');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const WEATHER_API_KEY = (process.env.WEATHER_API_KEY || '').trim();

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

function buildStudyAdvice(temp, conditionText) {
  const lower = (conditionText || '').toLowerCase();
  if (lower.includes('rain') || lower.includes('storm') || lower.includes('drizzle')) {
    return 'Rainy campus forecast—ideal for an uninterrupted indoor deep-work session and leaving early for transit.';
  }
  if (temp >= 29) {
    return 'Warm afternoon ahead—schedule heavy problem sets in cooler indoor rooms or shaded spots and stay hydrated.';
  }
  if (temp <= 18) {
    return 'Cooler weather predicted—great conditions for focused coding, reading, or exam prep with a warm drink.';
  }
  return 'Balanced campus weather—great window for 50-minute study sprints with short outdoor breaks.';
}

function buildFallbackWeather(city, reason) {
  return {
    source: 'fallback',
    notice: reason,
    cached: false,
    hostname: os.hostname(),
    city,
    country: 'RW',
    temperature: 24,
    feelsLike: 24,
    humidity: 64,
    windSpeed: 3.4,
    condition: 'Clear',
    description: 'partly sunny campus sky',
    studyTip: buildStudyAdvice(24, 'Clear')
  };
}

function buildFallbackForecast(city, reason) {
  const now = Date.now();
  const templates = [
    { offsetHours: 3, temp: 24, condition: 'Clear', description: 'sunny & clear sky', studyWindow: 'Peak Focus • Library / Lab' },
    { offsetHours: 6, temp: 26, condition: 'Clouds', description: 'scattered blue clouds', studyWindow: 'Group Study • Collaboration' },
    { offsetHours: 9, temp: 21, condition: 'Rain', description: 'light evening shower', studyWindow: 'Indoor Deep Work • Coding' },
    { offsetHours: 12, temp: 19, condition: 'Clouds', description: 'calm evening breeze', studyWindow: 'Review & Flashcards' },
    { offsetHours: 24, temp: 25, condition: 'Clear', description: 'bright morning sun', studyWindow: 'Morning Sprint • Problem Sets' },
    { offsetHours: 27, temp: 27, condition: 'Clouds', description: 'warm afternoon sky', studyWindow: 'Shaded / Indoor Lab Practice' }
  ];

  return {
    source: 'fallback',
    notice: reason,
    cached: false,
    hostname: os.hostname(),
    city,
    predictions: templates.map((slot) => {
      const dt = new Date(now + slot.offsetHours * 3600 * 1000);
      return {
        timeLabel: dt.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
        city,
        temperature: slot.temp,
        condition: slot.condition,
        description: slot.description,
        studyWindow: slot.studyWindow
      };
    })
  };
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hostname: os.hostname(),
    weatherApiConfigured: Boolean(WEATHER_API_KEY)
  });
});

app.get('/api/weather', async (req, res) => {
  const city = (req.query.city || 'Kigali').trim() || 'Kigali';
  const cacheKey = `weather:${city.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ ...cached, cached: true, hostname: os.hostname() });
  }

  if (!WEATHER_API_KEY) {
    return res.json(buildFallbackWeather(city, 'No WEATHER_API_KEY in .env (fallback mode)'));
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${encodeURIComponent(WEATHER_API_KEY)}&units=metric`;
    const response = await fetch(url);
    const data = await response.json();

    if (response.status === 401) {
      return res.json(buildFallbackWeather(city, 'OpenWeatherMap API key invalid or pending activation (fallback mode)'));
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || 'Unable to fetch current weather from OpenWeatherMap.'
      });
    }

    const temp = Math.round(data.main.temp);
    const condition = data.weather?.[0]?.main || 'Clear';
    const description = data.weather?.[0]?.description || condition.toLowerCase();

    const payload = {
      source: 'openweathermap',
      cached: false,
      hostname: os.hostname(),
      city: data.name || city,
      country: data.sys?.country || '',
      temperature: temp,
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      windSpeed: data.wind?.speed ?? 0,
      condition,
      description,
      studyTip: buildStudyAdvice(temp, `${condition} ${description}`)
    };

    setCached(cacheKey, payload);
    return res.json(payload);
  } catch (err) {
    return res.json(buildFallbackWeather(city, 'Network unreachable (fallback mode)'));
  }
});

app.get('/api/forecast', async (req, res) => {
  const city = (req.query.city || 'Kigali').trim() || 'Kigali';
  const cacheKey = `forecast:${city.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ ...cached, cached: true, hostname: os.hostname() });
  }

  if (!WEATHER_API_KEY) {
    return res.json(buildFallbackForecast(city, 'No WEATHER_API_KEY in .env'));
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${encodeURIComponent(WEATHER_API_KEY)}&units=metric&cnt=8`;
    const response = await fetch(url);
    const data = await response.json();

    if (response.status === 401) {
      return res.json(buildFallbackForecast(city, 'API key pending activation'));
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || 'Unable to fetch weather forecast from OpenWeatherMap.'
      });
    }

    const predictions = (data.list || []).map((item) => {
      const temp = Math.round(item.main.temp);
      const condition = item.weather?.[0]?.main || 'Clear';
      const description = item.weather?.[0]?.description || condition.toLowerCase();
      const dt = new Date(item.dt * 1000);

      return {
        timeLabel: dt.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
        city: data.city?.name || city,
        temperature: temp,
        condition,
        description,
        studyWindow: buildStudyAdvice(temp, `${condition} ${description}`)
      };
    });

    const payload = {
      source: 'openweathermap-forecast',
      cached: false,
      hostname: os.hostname(),
      city: data.city?.name || city,
      predictions
    };

    setCached(cacheKey, payload);
    return res.json(payload);
  } catch (err) {
    return res.json(buildFallbackForecast(city, 'Network unreachable'));
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Campus Dashboard backend listening on http://${HOST}:${PORT}`);
});


