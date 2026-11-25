document.addEventListener('DOMContentLoaded', () => {
  const globalSearchInput = document.getElementById('global-search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');

  const weatherForm = document.getElementById('weather-form');
  const cityInput = document.getElementById('city-input');
  const weatherDisplay = document.getElementById('weather-display');
  const weatherSource = document.getElementById('weather-source');
  const adviceText = document.getElementById('advice-text');
  const serverBadge = document.getElementById('server-badge');

  const forecastList = document.getElementById('forecast-list');
  const forecastCount = document.getElementById('forecast-count');

  const planForm = document.getElementById('plan-form');
  const topicInput = document.getElementById('topic-input');
  const courseInput = document.getElementById('course-input');
  const durationInput = document.getElementById('duration-input');
  const dailyCapInput = document.getElementById('daily-cap-input');
  const capBadge = document.getElementById('cap-badge');
  const progressText = document.getElementById('progress-text');
  const progressPct = document.getElementById('progress-pct');
  const progressFill = document.getElementById('progress-fill');
  const clearCompletedBtn = document.getElementById('clear-completed-btn');
  const statusMsg = document.getElementById('status-msg');
  const planList = document.getElementById('plan-list');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const sortSelect = document.getElementById('sort-select');

  const PLANS_KEY = 'campus_weather_study_plans_v2';
  const CAP_KEY = 'campus_daily_cap_mins_v2';
  const CITY_KEY = 'campus_weather_city_v2';

  let plans = JSON.parse(localStorage.getItem(PLANS_KEY) || '[]');
  let predictions = [];
  let activeFilter = 'all';
  let sortMode = 'newest';
  let searchQuery = '';

  let dailyCap = Number(localStorage.getItem(CAP_KEY)) || 240;
  dailyCapInput.value = dailyCap;

  const savedCity = localStorage.getItem(CITY_KEY);
  if (savedCity) {
    cityInput.value = savedCity;
  }

  function setStatus(msg) {
    statusMsg.textContent = msg;
  }

  function savePlans() {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  }

  function matchesSearch(text) {
    if (!searchQuery) return true;
    return (text || '').toLowerCase().includes(searchQuery.toLowerCase());
  }

  function updateSummary() {
    const totalMins = plans.reduce((sum, item) => sum + Number(item.duration || 0), 0);
    const pct = Math.min(100, Math.round((totalMins / Math.max(1, dailyCap)) * 100));

    capBadge.textContent = `Daily Goal: ${totalMins} / ${dailyCap} mins`;
    progressText.textContent = `${totalMins} of ${dailyCap} minutes planned`;
    progressPct.textContent = `${pct}%`;
    progressFill.style.width = `${pct}%`;
    progressFill.classList.toggle('over-cap', totalMins > dailyCap);
  }

  function getFilteredAndSortedPlans() {
    const indexed = plans.map((item, originalIndex) => ({ ...item, originalIndex }));

    const filtered = indexed.filter((item) => {
      if (activeFilter === 'active' && item.done) return false;
      if (activeFilter === 'completed' && !item.done) return false;
      const hay = `${item.topic} ${item.course || ''} ${item.duration} mins`;
      return matchesSearch(hay);
    });

    if (sortMode === 'duration-desc') {
      filtered.sort((a, b) => Number(b.duration) - Number(a.duration));
    } else if (sortMode === 'duration-asc') {
      filtered.sort((a, b) => Number(a.duration) - Number(b.duration));
    } else if (sortMode === 'title-asc') {
      filtered.sort((a, b) => a.topic.localeCompare(b.topic));
    } else {
      filtered.sort((a, b) => b.originalIndex - a.originalIndex);
    }

    return filtered;
  }

  function renderPlans() {
    planList.innerHTML = '';
    const visiblePlans = getFilteredAndSortedPlans();

    if (visiblePlans.length === 0) {
      const msg = plans.length === 0
        ? 'No study sessions yet. Add a topic above to build your plan.'
        : 'No study sessions match your current search or filter.';
      planList.innerHTML = `<li class="muted">${msg}</li>`;
      updateSummary();
      return;
    }

    visiblePlans.forEach((plan) => {
      const li = document.createElement('li');
      li.className = 'plan-item';

      const left = document.createElement('div');
      left.className = 'plan-left';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(plan.done);
      checkbox.addEventListener('change', () => {
        plans[plan.originalIndex].done = checkbox.checked;
        savePlans();
        renderPlans();
      });

      const info = document.createElement('div');
      const title = document.createElement('div');
      title.className = `plan-title ${plan.done ? 'done' : ''}`;
      title.textContent = plan.topic;

      const meta = document.createElement('div');
      meta.className = 'plan-meta';
      const coursePart = plan.course ? `${plan.course} • ` : '';
      meta.textContent = `${coursePart}${plan.duration} mins`;

      info.appendChild(title);
      info.appendChild(meta);
      left.appendChild(checkbox);
      left.appendChild(info);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-remove';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => {
        const removed = plans[plan.originalIndex].topic;
        plans.splice(plan.originalIndex, 1);
        savePlans();
        renderPlans();
        setStatus(`Removed "${removed}".`);
      });

      li.appendChild(left);
      li.appendChild(removeBtn);
      planList.appendChild(li);
    });

    updateSummary();
  }

  function renderPredictions() {
    forecastList.innerHTML = '';
    const filteredSlots = predictions.filter((slot) =>
      matchesSearch(`${slot.timeLabel} ${slot.condition} ${slot.description} ${slot.studyWindow} ${slot.temperature}`)
    );

    forecastCount.textContent = `${filteredSlots.length} slot${filteredSlots.length === 1 ? '' : 's'}`;

    if (filteredSlots.length === 0) {
      forecastList.innerHTML = '<p class="muted">No weather predictions match your search.</p>';
      return;
    }

    filteredSlots.forEach((slot) => {
      const card = document.createElement('div');
      card.className = 'forecast-item';
      card.innerHTML = `
        <div class="forecast-top">
          <span>${slot.timeLabel}</span>
          <span class="forecast-temp">${slot.temperature}°C</span>
        </div>
        <div class="forecast-sub">${slot.condition} — ${slot.description}</div>
        <div class="forecast-window">${slot.studyWindow}</div>
      `;
      forecastList.appendChild(card);
    });
  }

  async function loadCurrentWeather(city) {
    const cleanCity = (city || 'Kigali').trim();
    localStorage.setItem(CITY_KEY, cleanCity);
    weatherSource.textContent = 'Updating...';

    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(cleanCity)}`);
      const data = await res.json();

      if (!res.ok) {
        weatherSource.textContent = 'Error';
        weatherDisplay.innerHTML = `<p class="muted">${data.error || 'Could not load weather.'}</p>`;
        return;
      }

      if (data.hostname) {
        serverBadge.textContent = `Host: ${data.hostname}`;
      }

      const modeLabel = data.source === 'openweathermap' ? 'Live API' : 'Demo Data';
      weatherSource.textContent = data.cached ? `${modeLabel} (Cached)` : modeLabel;

      weatherDisplay.innerHTML = `
        <div class="weather-temp">${data.temperature}°C</div>
        <div class="weather-desc">${data.city}${data.country ? `, ${data.country}` : ''} • ${data.description}</div>
        <div class="weather-metrics">
          <span>Feels: <strong>${data.feelsLike}°C</strong></span>
          <span>Humidity: <strong>${data.humidity}%</strong></span>
          <span>Wind: <strong>${data.windSpeed} m/s</strong></span>
        </div>
      `;
      adviceText.textContent = data.studyTip;
    } catch (err) {
      weatherSource.textContent = 'Offline';
      weatherDisplay.innerHTML = '<p class="muted">Unable to reach /api/weather.</p>';
    }
  }

  async function loadForecast(city) {
    const cleanCity = (city || 'Kigali').trim();
    try {
      const res = await fetch(`/api/forecast?city=${encodeURIComponent(cleanCity)}`);
      const data = await res.json();

      if (!res.ok) {
        forecastList.innerHTML = `<p class="muted">${data.error || 'Forecast unavailable.'}</p>`;
        return;
      }

      predictions = data.predictions || [];
      renderPredictions();
    } catch (err) {
      forecastList.innerHTML = '<p class="muted">Unable to reach /api/forecast.</p>';
    }
  }

  planForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const topic = topicInput.value.trim();
    const course = courseInput.value.trim();
    const duration = Math.max(5, Number(durationInput.value) || 30);

    if (!topic) {
      setStatus('Please enter a study topic first.');
      topicInput.focus();
      return;
    }

    plans.push({ topic, course, duration, done: false });
    savePlans();
    renderPlans();
    setStatus(`Added "${topic}" (${duration} mins).`);

    topicInput.value = '';
    courseInput.value = '';
    topicInput.focus();
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderPlans();
    });
  });

  sortSelect.addEventListener('change', () => {
    sortMode = sortSelect.value;
    renderPlans();
  });

  globalSearchInput.addEventListener('input', () => {
    searchQuery = globalSearchInput.value.trim();
    renderPlans();
    renderPredictions();
  });

  clearSearchBtn.addEventListener('click', () => {
    globalSearchInput.value = '';
    searchQuery = '';
    renderPlans();
    renderPredictions();
  });

  dailyCapInput.addEventListener('change', () => {
    dailyCap = Math.max(30, Number(dailyCapInput.value) || 240);
    dailyCapInput.value = dailyCap;
    localStorage.setItem(CAP_KEY, String(dailyCap));
    updateSummary();
    setStatus(`Daily study cap updated to ${dailyCap} minutes.`);
  });

  clearCompletedBtn.addEventListener('click', () => {
    const before = plans.length;
    plans = plans.filter((p) => !p.done);
    savePlans();
    renderPlans();
    setStatus(`Cleared ${before - plans.length} completed session(s).`);
  });

  weatherForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = cityInput.value;
    loadCurrentWeather(city);
    loadForecast(city);
  });

  renderPlans();
  loadCurrentWeather(cityInput.value);
  loadForecast(cityInput.value);
});

