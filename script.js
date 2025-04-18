/**
 * Complete Weather Application
 * Features:
 * - Accurate local time for any city
 * - Proper dark mode visibility
 * - 5-day forecast with chart
 * - Favorite cities
 * - Unit conversion
 * - Location detection
 */

// API Configuration
const API_KEY = "d2e2def6121cc95b4ebc25d67ab54c8e";
const BASE_URL = "https://api.openweathermap.org/data/2.5";

// DOM Elements
const elements = {
  searchForm: document.querySelector("#search-form"),
  searchInput: document.querySelector("#search-form-input"),
  locationButton: document.querySelector("#location-button"),
  themeToggle: document.querySelector("#theme-toggle"),
  favoriteToggle: document.querySelector("#favorite-toggle"),
  tempUnit: document.querySelector("#temperature-unit"),
  celsiusBtn: document.querySelector("#celsius-btn"),
  fahrenheitBtn: document.querySelector("#fahrenheit-btn"),
  darkModeSwitch: document.querySelector("#darkModeSwitch"),
  favoriteCitiesContainer: document.querySelector("#favorite-cities"),
  favoritesListContainer: document.querySelector("#favorites-list"),
  loadingIndicator: document.querySelector("#loading-indicator"),
  errorMessage: document.querySelector("#error-message"),
  weatherContainer: document.querySelector(".weather-data"),
  hourlyForecast: document.querySelector("#hourly-forecast"),
  prevHourBtn: document.querySelector("#prev-hour-btn"),
  nextHourBtn: document.querySelector("#next-hour-btn"),
  dailyForecast: document.querySelector("#forecast"),
  temperatureChart: document.getElementById("temperatureChart"),
  weatherIcon: document.querySelector("#icon"),
  currentTemp: document.querySelector("#temperature"),
  currentCity: document.querySelector("#weather-city"),
  currentDescription: document.querySelector("#description"),
  currentTime: document.querySelector("#time"),
  currentTimezone: document.querySelector("#timezone"),
  currentFeelsLike: document.querySelector("#feels-like"),
  currentHumidityMain: document.querySelector("#humidity"),
  currentHumidityDetail: document.querySelector("#humidity-value"),
  currentWindMain: document.querySelector("#speed"),
  currentWindDetail: document.querySelector("#wind-value"),
  currentPrecipitation: document.querySelector("#precipitation"),
  currentVisibility: document.querySelector("#visibility"),
  currentPressure: document.querySelector("#pressure"),
  currentCloudiness: document.querySelector("#cloudiness"),
  currentSunrise: document.querySelector("#sunrise"),
  currentSunset: document.querySelector("#sunset"),
  appContainer: document.querySelector(".app"),
  appDetails: document.querySelector(".app-details")
};

// Application State
const state = {
  favorites: JSON.parse(localStorage.getItem("favorites")) || [],
  units: localStorage.getItem("units") || "metric",
  currentCity: localStorage.getItem("lastCity") || "New York",
  temperatureChart: null,
  isDarkMode: localStorage.getItem("darkMode") === "true",
  weatherData: null,
  forecastData: null,
  hourlyScrollPosition: 0,
  hourlyItemWidth: 90,
  visibleHourlyItems: 4,
  totalHourlyItems: 0
};

// Initialize the application
function initApp() {
  setupEventListeners();
  loadSavedSettings();
  renderFavorites();
  setupAnimations();
  fetchWeatherData(state.currentCity);
}

/* ======================
   TIMEZONE FUNCTIONS
   ====================== */

function getLocalTime(timestamp, timezoneOffset) {
  const utcDate = new Date(timestamp * 1000);
  const localTime = new Date(utcDate.getTime() + timezoneOffset * 1000);
  
  return {
    timeString: localTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }),
    dateString: localTime.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    }),
    timezoneString: formatTimezoneOffset(timezoneOffset)
  };
}

function formatTimezoneOffset(offset) {
  const hours = Math.floor(Math.abs(offset) / 3600);
  const minutes = Math.floor((Math.abs(offset) % 3600) / 60);
  const sign = offset >= 0 ? '+' : '-';
  return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/* ======================
   WEATHER DATA FUNCTIONS
   ====================== */

async function fetchWeatherData(location) {
  try {
    showLoading();
    clearError();
    
    const [currentWeather, forecast] = await Promise.all([
      fetchCurrentWeather(location),
      fetchWeatherForecast(location)
    ]);
    
    state.currentCity = currentWeather.name;
    state.weatherData = processCurrentWeather(currentWeather);
    state.forecastData = processForecastData(forecast.list);
    state.hourlyScrollPosition = 0;
    
    updateCurrentWeatherUI();
    updateForecastUI();
    updateTemperatureChart();
    
    localStorage.setItem("lastCity", state.currentCity);
    setBackgroundByWeather(currentWeather.weather[0].icon);
    updateFavoriteToggle();
    
  } catch (error) {
    handleError(error);
  } finally {
    hideLoading();
  }
}

async function fetchCurrentWeather(location) {
  const url = `${BASE_URL}/weather?q=${location}&appid=${API_KEY}&units=${state.units}`;
  const response = await fetchWithRetry(url);
  
  if (!response || response.cod !== 200) {
    throw new Error(response?.message || "Failed to fetch current weather");
  }
  
  return response;
}

async function fetchWeatherForecast(location) {
  const url = `${BASE_URL}/forecast?q=${location}&appid=${API_KEY}&units=${state.units}`;
  const response = await fetchWithRetry(url);
  
  if (!response || response.cod !== "200") {
    throw new Error(response?.message || "Failed to fetch forecast");
  }
  
  return response;
}

async function fetchWithRetry(url, retries = 3, delay = 1000) {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, retries - 1, delay * 2);
    }
    throw error;
  }
}

function processCurrentWeather(data) {
  return {
    city: data.name,
    condition: {
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      iconUrl: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`
    },
    timestamp: data.dt,
    timezone: data.timezone,
    temperature: {
      current: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      min: Math.round(data.main.temp_min),
      max: Math.round(data.main.temp_max)
    },
    details: {
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg,
      cloudiness: data.clouds.all,
      visibility: data.visibility / 1000,
      precipitation: data.rain ? Math.round(data.rain["1h"] || 0) : 0,
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset
    }
  };
}

function processForecastData(forecastList) {
  if (!forecastList || !Array.isArray(forecastList)) {
    throw new Error("Invalid forecast data");
  }

  const dailyForecast = {};
  let hourlyItems = [];

  forecastList.forEach(item => {
    const date = new Date(item.dt * 1000);
    const dayKey = date.toLocaleDateString();

    if (hourlyItems.length < 24) {
      hourlyItems.push({
        time: date,
        temp: Math.round(item.main.temp),
        icon: item.weather[0].icon,
        description: item.weather[0].description
      });
    }

    if (!dailyForecast[dayKey]) {
      dailyForecast[dayKey] = {
        date: date,
        items: [],
        tempMin: Infinity,
        tempMax: -Infinity
      };
    }

    dailyForecast[dayKey].tempMin = Math.min(dailyForecast[dayKey].tempMin, Math.round(item.main.temp_min));
    dailyForecast[dayKey].tempMax = Math.max(dailyForecast[dayKey].tempMax, Math.round(item.main.temp_max));
    dailyForecast[dayKey].items.push({
      time: date,
      temp: Math.round(item.main.temp),
      icon: item.weather[0].icon,
      description: item.weather[0].description
    });
  });

  state.totalHourlyItems = hourlyItems.length;
  const result = Object.values(dailyForecast).slice(0, 5);
  result.hourlyItems = hourlyItems;
  return result;
}

/* ======================
   UI UPDATE FUNCTIONS
   ====================== */

function updateCurrentWeatherUI() {
  const { weatherData } = state;
  if (!weatherData) return;

  const localTime = getLocalTime(weatherData.timestamp, weatherData.timezone);
  
  // Update time displays
  elements.currentTime.textContent = `${localTime.timeString}, ${localTime.dateString}`;
  if (elements.currentTimezone) {
    elements.currentTimezone.textContent = localTime.timezoneString;
  }

  // Update weather data
  elements.currentCity.textContent = weatherData.city;
  elements.currentDescription.textContent = weatherData.condition.description;
  elements.currentTemp.textContent = weatherData.temperature.current;
  elements.currentFeelsLike.textContent = `${weatherData.temperature.feelsLike}°`;
  
  // Update humidity
  if (elements.currentHumidityMain && elements.currentHumidityDetail) {
    elements.currentHumidityMain.textContent = `${weatherData.details.humidity}%`;
    elements.currentHumidityDetail.textContent = `${weatherData.details.humidity}%`;
  }
  
  // Update wind
  if (elements.currentWindMain && elements.currentWindDetail) {
    let windSpeed = weatherData.details.windSpeed;
    let windUnit = state.units === 'metric' ? 'm/s' : 'mph';
    
    if (state.units === 'imperial') {
      windSpeed = (windSpeed * 2.23694).toFixed(1);
    } else {
      windSpeed = windSpeed.toFixed(1);
    }
    
    elements.currentWindMain.textContent = `${windSpeed} ${windUnit}`;
    elements.currentWindDetail.textContent = `${windSpeed} ${windUnit}`;
  }

  // Update other elements
  elements.weatherIcon.innerHTML = `<img src="${weatherData.condition.iconUrl}" alt="${weatherData.condition.description}" />`;
  
  if (elements.currentVisibility) {
    elements.currentVisibility.textContent = `${weatherData.details.visibility.toFixed(1)} km`;
  }
  
  if (elements.currentPressure) {
    elements.currentPressure.textContent = `${weatherData.details.pressure} hPa`;
  }
  
  if (elements.currentCloudiness) {
    elements.currentCloudiness.textContent = `${weatherData.details.cloudiness}%`;
  }
  
  if (elements.currentPrecipitation) {
    elements.currentPrecipitation.textContent = `${weatherData.details.precipitation} mm`;
  }

  // Update sunrise/sunset
  if (elements.currentSunrise && elements.currentSunset) {
    const sunrise = getLocalTime(weatherData.details.sunrise, weatherData.timezone);
    const sunset = getLocalTime(weatherData.details.sunset, weatherData.timezone);
    elements.currentSunrise.textContent = sunrise.timeString;
    elements.currentSunset.textContent = sunset.timeString;
  }

  // Update dark mode text colors
  updateDarkModeTextColors();
}

function updateDarkModeTextColors() {
  const textColor = state.isDarkMode ? '#ffffff' : '';
  const secondaryTextColor = state.isDarkMode ? '#e0e0e0' : '';
  
  if (elements.appDetails) {
    elements.appDetails.style.color = secondaryTextColor;
  }
  
  if (elements.currentDescription) {
    elements.currentDescription.style.color = secondaryTextColor;
  }
  
  if (elements.currentTime) {
    elements.currentTime.style.color = textColor;
  }
  
  if (elements.currentHumidityMain) {
    elements.currentHumidityMain.style.color = textColor;
  }
  
  if (elements.currentWindMain) {
    elements.currentWindMain.style.color = textColor;
  }
}

function updateForecastUI() {
  updateHourlyForecast();
  updateDailyForecast();
}

function updateHourlyForecast() {
  if (!state.forecastData?.hourlyItems) return;

  elements.hourlyForecast.innerHTML = state.forecastData.hourlyItems.map(item => `
    <div class="hourly-item">
      <div class="hourly-time">${formatTime(item.time)}</div>
      <img src="https://openweathermap.org/img/wn/${item.icon}.png" alt="${item.description}" />
      <div class="hourly-temp">${item.temp}°</div>
    </div>
  `).join("");

  elements.hourlyForecast.scrollTo({
    left: state.hourlyScrollPosition,
    behavior: 'smooth'
  });
  updateHourlyScrollButtons();
}

function updateDailyForecast() {
  if (!state.forecastData || !elements.dailyForecast) return;

  elements.dailyForecast.innerHTML = state.forecastData.map(day => `
    <div class="weather-forecast-day">
      <div class="date">${formatDay(day.date)}</div>
      <img src="https://openweathermap.org/img/wn/${day.items[0].icon}.png" alt="${day.items[0].description}" />
      <div class="weather-forecast-temperature">
        <span class="weather-max">${day.tempMax}°</span>
        <span class="weather-min">${day.tempMin}°</span>
      </div>
    </div>
  `).join("");
}

function updateTemperatureChart() {
  if (!state.forecastData || !elements.temperatureChart) return;

  if (state.temperatureChart) {
    state.temperatureChart.destroy();
  }

  const ctx = elements.temperatureChart.getContext('2d');
  const labels = state.forecastData.map(day => formatDay(day.date));
  const maxTemps = state.forecastData.map(day => day.tempMax);
  const minTemps = state.forecastData.map(day => day.tempMin);

  state.temperatureChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'High',
          data: maxTemps,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.4
        },
        {
          label: 'Low',
          data: minTemps,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.4
        }
      ]
    },
    options: getChartOptions()
  });
}

function getChartOptions() {
  const textColor = state.isDarkMode ? '#e2e8f0' : '#2d3748';
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: textColor }
      },
      tooltip: {
        callbacks: {
          label: context => `${context.dataset.label}: ${context.raw}°${state.units === 'metric' ? 'C' : 'F'}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          color: textColor,
          callback: value => `${value}°${state.units === 'metric' ? 'C' : 'F'}`
        }
      },
      x: {
        ticks: { color: textColor }
      }
    }
  };
}

/* ======================
   USER INTERACTION FUNCTIONS
   ====================== */

function setupEventListeners() {
  elements.searchForm.addEventListener("submit", handleSearchSubmit);
  elements.locationButton.addEventListener("click", getCurrentLocation);
  elements.themeToggle.addEventListener("click", toggleTheme);
  elements.darkModeSwitch.addEventListener("change", handleDarkModeToggle);
  elements.favoriteToggle.addEventListener("click", toggleFavorite);
  elements.celsiusBtn.addEventListener("click", () => setTemperatureUnit("metric"));
  elements.fahrenheitBtn.addEventListener("click", () => setTemperatureUnit("imperial"));
  
  if (elements.prevHourBtn) elements.prevHourBtn.addEventListener("click", scrollHourlyForecastLeft);
  if (elements.nextHourBtn) elements.nextHourBtn.addEventListener("click", scrollHourlyForecastRight);
  
  window.addEventListener("resize", debounce(handleResize, 200));
}

function handleSearchSubmit(event) {
  event.preventDefault();
  const city = elements.searchInput.value.trim();
  
  if (city) {
    fetchWeatherData(city);
    elements.searchInput.value = "";
    elements.searchInput.classList.add("animate__pulse");
    setTimeout(() => elements.searchInput.classList.remove("animate__pulse"), 500);
  }
}

function getCurrentLocation() {
  showLoading();
  clearError();
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        fetchWeatherDataByCoords(latitude, longitude);
      },
      error => {
        hideLoading();
        showError("Unable to retrieve your location. Please enable location services or search manually.");
        console.error("Geolocation error:", error);
      }
    );
  } else {
    hideLoading();
    showError("Geolocation is not supported by your browser.");
  }
}

async function fetchWeatherDataByCoords(lat, lon) {
  try {
    showLoading();
    
    const [currentWeather, forecast] = await Promise.all([
      fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${state.units}`)
        .then(res => res.ok ? res.json() : Promise.reject(res)),
      fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${state.units}`)
        .then(res => res.ok ? res.json() : Promise.reject(res))
    ]);
    
    if (currentWeather.cod !== 200 || forecast.cod !== "200") {
      throw new Error(currentWeather.message || forecast.message || "Invalid weather data");
    }
    
    state.currentCity = currentWeather.name;
    state.weatherData = processCurrentWeather(currentWeather);
    state.forecastData = processForecastData(forecast.list);
    state.hourlyScrollPosition = 0;
    
    updateCurrentWeatherUI();
    updateForecastUI();
    updateTemperatureChart();
    
    localStorage.setItem("lastCity", state.currentCity);
    setBackgroundByWeather(currentWeather.weather[0].icon);
    updateFavoriteToggle();
    
  } catch (error) {
    handleError(error);
  } finally {
    hideLoading();
  }
}

function scrollHourlyForecastLeft() {
  if (!elements.hourlyForecast) return;
  
  const newPosition = Math.max(0, state.hourlyScrollPosition - (state.hourlyItemWidth * state.visibleHourlyItems));
  state.hourlyScrollPosition = newPosition;
  
  elements.hourlyForecast.scrollTo({
    left: newPosition,
    behavior: 'smooth'
  });
  updateHourlyScrollButtons();
}

function scrollHourlyForecastRight() {
  if (!elements.hourlyForecast) return;
  
  const maxScroll = (state.totalHourlyItems - state.visibleHourlyItems) * state.hourlyItemWidth;
  const newPosition = Math.min(maxScroll, state.hourlyScrollPosition + (state.hourlyItemWidth * state.visibleHourlyItems));
  state.hourlyScrollPosition = newPosition;
  
  elements.hourlyForecast.scrollTo({
    left: newPosition,
    behavior: 'smooth'
  });
  updateHourlyScrollButtons();
}

function updateHourlyScrollButtons() {
  if (!elements.prevHourBtn || !elements.nextHourBtn) return;
  
  elements.prevHourBtn.classList.toggle('disabled', state.hourlyScrollPosition <= 0);
  
  const maxScroll = (state.totalHourlyItems - state.visibleHourlyItems) * state.hourlyItemWidth;
  elements.nextHourBtn.classList.toggle('disabled', state.hourlyScrollPosition >= maxScroll);
}

/* ======================
   THEME FUNCTIONS
   ====================== */

function toggleTheme() {
  state.isDarkMode = !state.isDarkMode;
  localStorage.setItem("darkMode", state.isDarkMode);
  
  if (state.isDarkMode) {
    enableDarkMode();
  } else {
    disableDarkMode();
  }
}

function enableDarkMode() {
  elements.appContainer.classList.add("night-mode");
  elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  elements.darkModeSwitch.checked = true;
  updateDarkModeTextColors();
  
  if (state.temperatureChart) {
    updateChartColors('#e2e8f0');
  }
}

function disableDarkMode() {
  elements.appContainer.classList.remove("night-mode");
  elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  elements.darkModeSwitch.checked = false;
  updateDarkModeTextColors();
  
  if (state.temperatureChart) {
    updateChartColors('#2d3748');
  }
}

function handleDarkModeToggle() {
  toggleTheme();
}

function updateChartColors(color) {
  if (state.temperatureChart?.options?.plugins?.legend?.labels) {
    state.temperatureChart.options.plugins.legend.labels.color = color;
  }
  if (state.temperatureChart?.options?.scales?.x?.ticks) {
    state.temperatureChart.options.scales.x.ticks.color = color;
  }
  if (state.temperatureChart?.options?.scales?.y?.ticks) {
    state.temperatureChart.options.scales.y.ticks.color = color;
  }
  state.temperatureChart?.update();
}

/* ======================
   FAVORITES FUNCTIONS
   ====================== */

function toggleFavorite() {
  if (!state.currentCity) return;
  
  const index = state.favorites.indexOf(state.currentCity);
  
  if (index === -1) {
    state.favorites.push(state.currentCity);
    elements.favoriteToggle.innerHTML = '<i class="fas fa-star"></i>';
  } else {
    state.favorites.splice(index, 1);
    elements.favoriteToggle.innerHTML = '<i class="far fa-star"></i>';
  }
  
  localStorage.setItem("favorites", JSON.stringify(state.favorites));
  renderFavorites();
  elements.favoriteToggle.classList.add("animate__bounce");
  setTimeout(() => elements.favoriteToggle.classList.remove("animate__bounce"), 500);
}

function updateFavoriteToggle() {
  if (!elements.favoriteToggle || !state.currentCity) return;
  
  elements.favoriteToggle.innerHTML = state.favorites.includes(state.currentCity) 
    ? '<i class="fas fa-star"></i>' 
    : '<i class="far fa-star"></i>';
}

function renderFavorites() {
  if (!elements.favoriteCitiesContainer || !elements.favoritesListContainer) return;
  
  elements.favoriteCitiesContainer.innerHTML = "";
  elements.favoritesListContainer.innerHTML = state.favorites.length === 0 
    ? "<p>No favorite cities yet. Add some using the star icon!</p>" 
    : "";
  
  state.favorites.forEach((city, index) => {
    const favoriteElement = document.createElement("div");
    favoriteElement.className = "favorite-city";
    favoriteElement.innerHTML = `${city} <i class="fas fa-times remove-favorite"></i>`;
    favoriteElement.style.animationDelay = `${index * 0.1}s`;
    
    favoriteElement.addEventListener("click", (event) => {
      if (event.target.classList.contains("remove-favorite")) {
        state.favorites = state.favorites.filter(fav => fav !== city);
        localStorage.setItem("favorites", JSON.stringify(state.favorites));
        renderFavorites();
        if (city === state.currentCity) updateFavoriteToggle();
      } else {
        fetchWeatherData(city);
      }
    });
    
    elements.favoriteCitiesContainer.appendChild(favoriteElement);
    
    const listItem = document.createElement("div");
    listItem.className = "favorite-item";
    listItem.innerHTML = `
      <span>${city}</span>
      <button class="remove-favorite-btn" data-city="${city}">
        <i class="fas fa-trash text-danger"></i>
      </button>
    `;
    elements.favoritesListContainer.appendChild(listItem);
  });
  
  document.querySelectorAll(".remove-favorite-btn").forEach(button => {
    button.addEventListener("click", () => {
      const city = button.getAttribute("data-city");
      state.favorites = state.favorites.filter(fav => fav !== city);
      localStorage.setItem("favorites", JSON.stringify(state.favorites));
      renderFavorites();
      if (city === state.currentCity) updateFavoriteToggle();
    });
  });
}

/* ======================
   UTILITY FUNCTIONS
   ====================== */

function loadSavedSettings() {
  setTemperatureUnit(state.units, false);
  
  if (state.isDarkMode) {
    enableDarkMode();
  }
  
  updateFavoriteToggle();
}

function setTemperatureUnit(newUnits, reload = true) {
  state.units = newUnits;
  localStorage.setItem("units", state.units);
  
  if (elements.tempUnit) {
    elements.tempUnit.textContent = state.units === "metric" ? "°C" : "°F";
  }
  
  if (elements.celsiusBtn && elements.fahrenheitBtn) {
    elements.celsiusBtn.classList.toggle("active", state.units === "metric");
    elements.fahrenheitBtn.classList.toggle("active", state.units === "imperial");
  }
  
  if (reload && state.currentCity) {
    fetchWeatherData(state.currentCity);
  }
  
  if (elements.tempUnit) {
    elements.tempUnit.classList.add("animate__pulse");
    setTimeout(() => elements.tempUnit.classList.remove("animate__pulse"), 500);
  }
}

function setBackgroundByWeather(iconCode) {
  if (!iconCode) return;
  
  const body = document.body;
  body.classList.remove(
    "weather-clear", "weather-cloudy", "weather-rainy", 
    "weather-snow", "weather-thunderstorm", "weather-night"
  );
  
  let weatherType = "clear";
  if (iconCode.includes("01d")) weatherType = "clear";
  else if (iconCode.includes("01n")) weatherType = "night";
  else if (iconCode.includes("02") || iconCode.includes("03") || iconCode.includes("04")) weatherType = "cloudy";
  else if (iconCode.includes("09") || iconCode.includes("10")) weatherType = "rainy";
  else if (iconCode.includes("11")) weatherType = "thunderstorm";
  else if (iconCode.includes("13")) weatherType = "snow";
  
  body.classList.add(`weather-${weatherType}`);
}

function handleResize() {
  if (state.temperatureChart) {
    state.temperatureChart.resize();
  }
}

function showLoading() {
  elements.loadingIndicator.style.display = "block";
  elements.loadingIndicator.classList.add("animate__pulse");
}

function hideLoading() {
  elements.loadingIndicator.style.display = "none";
  elements.loadingIndicator.classList.remove("animate__pulse");
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.style.display = "block";
  elements.errorMessage.classList.add("animate__shakeX");
  setTimeout(() => elements.errorMessage.classList.remove("animate__shakeX"), 500);
}

function clearError() {
  elements.errorMessage.textContent = "";
  elements.errorMessage.style.display = "none";
  elements.errorMessage.classList.remove("animate__shakeX");
}

function handleError(error) {
  console.error("Weather App Error:", error);
  
  let errorMessage = "An error occurred while fetching weather data.";
  if (error.message.includes("404")) errorMessage = "Location not found. Please try another city.";
  else if (error.message.includes("network")) errorMessage = "Network error. Please check your internet connection.";
  else if (error.message.includes("401")) errorMessage = "Invalid API key. Please contact support.";
  
  showError(errorMessage);
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatDay(date) {
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric'
  });
}

function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

function setupAnimations() {
  document.querySelectorAll("button, .clickable").forEach(button => {
    button.addEventListener("mouseenter", () => {
      button.classList.add("animate__animated", "animate__pulse");
    });
    button.addEventListener("mouseleave", () => {
      button.classList.remove("animate__animated", "animate__pulse");
    });
  });
  
  document.querySelectorAll("footer a").forEach(link => {
    link.addEventListener("mouseenter", () => {
      link.classList.add("animate__animated", "animate__rubberBand");
    });
    link.addEventListener("mouseleave", () => {
      link.classList.remove("animate__animated", "animate__rubberBand");
    });
  });
}

// Initialize the application
document.addEventListener("DOMContentLoaded", initApp);