/**
 * Weather Application - Professional Implementation
 * Features:
 * - Real-time weather data from OpenWeatherMap API
 * - 5-day forecast with interactive chart
 * - Location-based weather
 * - Favorite cities
 * - Dark/light mode
 * - Unit conversion (Celsius/Fahrenheit)
 * - Responsive design
 * - Error handling
 * - Performance optimizations
 */

// API Configuration
const API_KEY = "d2e2def6121cc95b4ebc25d67ab54c8e"; // Replace with your actual API key
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
  hourlyForecastContainer: document.querySelector("#hourly-forecast-container"),
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
  appContainer: document.querySelector(".app")
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
  hourlyItemWidth: 90, // Width of each hourly forecast item including margins
  visibleHourlyItems: 4, // Number of hourly items visible at once
  totalHourlyItems: 0 // Will be set when forecast data is loaded
};

// Initialize the application
function initApp() {
  setupEventListeners();
  loadSavedSettings();
  renderFavorites();
  setupAnimations();
  
  // Load weather for last viewed city or default
  fetchWeatherData(state.currentCity);
}

// Set up all event listeners
function setupEventListeners() {
  // Search form submission
  elements.searchForm.addEventListener("submit", handleSearchSubmit);
  
  // Location button click
  elements.locationButton.addEventListener("click", getCurrentLocation);
  
  // Theme toggle
  elements.themeToggle.addEventListener("click", toggleTheme);
  elements.darkModeSwitch.addEventListener("change", handleDarkModeToggle);
  
  // Favorite toggle
  elements.favoriteToggle.addEventListener("click", toggleFavorite);
  
  // Temperature unit toggle
  elements.celsiusBtn.addEventListener("click", () => setTemperatureUnit("metric"));
  elements.fahrenheitBtn.addEventListener("click", () => setTemperatureUnit("imperial"));
  
  // Hourly forecast navigation
  if (elements.prevHourBtn) {
    elements.prevHourBtn.addEventListener("click", scrollHourlyForecastLeft);
  }
  
  if (elements.nextHourBtn) {
    elements.nextHourBtn.addEventListener("click", scrollHourlyForecastRight);
  }
  
  // Window resize for chart responsiveness
  window.addEventListener("resize", debounce(handleResize, 200));
}

// Load user preferences from localStorage
function loadSavedSettings() {
  // Set temperature unit
  setTemperatureUnit(state.units, false);
  
  // Set dark mode
  if (state.isDarkMode) {
    enableDarkMode();
  }
  
  // Update favorite toggle based on current city
  updateFavoriteToggle();
}

// Fetch weather data for a location
async function fetchWeatherData(location) {
  try {
    showLoading();
    clearError();
    
    const [currentWeather, forecast] = await Promise.all([
      fetchCurrentWeather(location),
      fetchWeatherForecast(location)
    ]);
    
    // Update application state
    state.currentCity = currentWeather.name;
    state.weatherData = processCurrentWeather(currentWeather);
    state.forecastData = processForecastData(forecast.list);
    
    // Reset hourly scroll position when loading new data
    state.hourlyScrollPosition = 0;
    
    // Update UI
    updateCurrentWeatherUI();
    updateForecastUI();
    updateTemperatureChart();
    
    // Save last viewed city
    localStorage.setItem("lastCity", state.currentCity);
    
    // Set background based on weather condition
    setBackgroundByWeather(currentWeather.weather[0].icon);
    
    // Update favorite toggle
    updateFavoriteToggle();
    
  } catch (error) {
    handleError(error);
  } finally {
    hideLoading();
  }
}

// Fetch current weather data
async function fetchCurrentWeather(location) {
  const url = `${BASE_URL}/weather?q=${location}&appid=${API_KEY}&units=${state.units}`;
  const response = await fetchWithRetry(url);
  
  if (!response || response.cod !== 200) {
    throw new Error(response?.message || "Failed to fetch current weather");
  }
  
  return response;
}

// Fetch weather forecast data
async function fetchWeatherForecast(location) {
  const url = `${BASE_URL}/forecast?q=${location}&appid=${API_KEY}&units=${state.units}`;
  const response = await fetchWithRetry(url);
  
  if (!response || response.cod !== "200") {
    throw new Error(response?.message || "Failed to fetch forecast");
  }
  
  return response;
}

// Fetch with retry logic
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

// Process current weather data into a normalized format
function processCurrentWeather(data) {
  console.log("Processing weather data:", data); // Debug log
  if (!data || !data.weather || !data.main || !data.wind || !data.clouds || !data.sys) {
    throw new Error("Invalid weather data structure");
  }
  
  return {
    city: data.name,
    condition: {
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      iconUrl: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`
    },
    timestamp: data.dt,
    temperature: {
      current: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      min: Math.round(data.main.temp_min),
      max: Math.round(data.main.temp_max)
    },
    details: {
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: Math.round(data.wind.speed * (state.units === "metric" ? 3.6 : 2.237)), // km/h or mph
      windDirection: data.wind.deg,
      cloudiness: data.clouds.all,
      visibility: data.visibility / 1000, // Convert to km
      precipitation: data.rain ? Math.round(data.rain["1h"] || 0) : 0,
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset
    }
  };
}

// Process forecast data into a normalized format
function processForecastData(forecastList) {
  if (!forecastList || !Array.isArray(forecastList) || forecastList.length === 0) {
    throw new Error("Invalid forecast data");
  }
  
  // Group by day
  const dailyForecast = {};
  let hourlyItems = [];
  
  forecastList.forEach(item => {
    const date = new Date(item.dt * 1000);
    const dayKey = date.toLocaleDateString();
    
    // For hourly forecast (first 24 hours)
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
    
    // Update min/max temps
    dailyForecast[dayKey].tempMin = Math.min(dailyForecast[dayKey].tempMin, Math.round(item.main.temp_min));
    dailyForecast[dayKey].tempMax = Math.max(dailyForecast[dayKey].tempMax, Math.round(item.main.temp_max));
    
    dailyForecast[dayKey].items.push({
      time: date,
      temp: Math.round(item.main.temp),
      icon: item.weather[0].icon,
      description: item.weather[0].description
    });
  });
  
  // Store the total number of hourly items
  state.totalHourlyItems = hourlyItems.length;
  
  // Get next 5 days and attach hourly items
  const result = Object.values(dailyForecast).slice(0, 5);
  result.hourlyItems = hourlyItems;
  
  return result;
}

// Update current weather UI
function updateCurrentWeatherUI() {
  const { weatherData } = state;
  
  if (!weatherData) {
    showError("No weather data available");
    return;
  }
  
  // Debug: Check if elements are found
  console.log("Humidity element:", elements.currentHumidity);
  console.log("Wind element:", elements.currentWind);
  
  elements.currentCity.textContent = weatherData.city;
  elements.currentDescription.textContent = weatherData.condition.description;
  elements.currentTime.textContent = formatDate(new Date(weatherData.timestamp * 1000));
  elements.currentTemp.textContent = weatherData.temperature.current;
  elements.currentFeelsLike.textContent = `${weatherData.temperature.feelsLike}°`;
  
  // Update humidity display
// Update all humidity displays
if (elements.currentHumidityMain && elements.currentHumidityDetail) {
  elements.currentHumidityMain.textContent = `${weatherData.details.humidity}%`;
  elements.currentHumidityDetail.textContent = `${weatherData.details.humidity}%`;
}
  
  // Update wind display
  if (elements.currentWindMain && elements.currentWindDetail) {
    let windSpeed = weatherData.details.windSpeed;
    let windUnit = state.units === 'metric' ? 'm/s' : 'mph';
    
    if (state.units === 'imperial') {
      windSpeed = (windSpeed * 2.23694).toFixed(1); // Convert to mph
    } else {
      windSpeed = windSpeed.toFixed(1);
    }
    
    elements.currentWindMain.textContent = `${windSpeed} ${windUnit}`;
    elements.currentWindDetail.textContent = `${windSpeed} ${windUnit}`;
  }
  
  
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
  
  const sunriseTime = new Date(weatherData.details.sunrise * 1000);
  const sunsetTime = new Date(weatherData.details.sunset * 1000);
  
  if (elements.currentSunrise) {
    elements.currentSunrise.textContent = formatTime(sunriseTime);
  }
  
  if (elements.currentSunset) {
    elements.currentSunset.textContent = formatTime(sunsetTime);
  }
  
  // Add animation
  if (elements.weatherContainer) {
    elements.weatherContainer.classList.add("animate__fadeIn");
    setTimeout(() => elements.weatherContainer.classList.remove("animate__fadeIn"), 600);
  }
}

// Update forecast UI
function updateForecastUI() {
  updateHourlyForecast();
  updateDailyForecast();
}

// Update hourly forecast UI
function updateHourlyForecast() {
  if (!state.forecastData || !state.forecastData.hourlyItems) {
    console.error("No hourly forecast data available");
    return;
  }
  
  // Get hourly items
  const hourlyItems = state.forecastData.hourlyItems;
  
  // Create HTML for hourly forecast
  if (elements.hourlyForecast) {
    elements.hourlyForecast.innerHTML = hourlyItems.map(item => `
      <div class="hourly-item">
        <div class="hourly-time">${formatTime(item.time)}</div>
        <img src="https://openweathermap.org/img/wn/${item.icon}.png" alt="${item.description}" />
        <div class="hourly-temp">${item.temp}°</div>
      </div>
    `).join("");
    
    // Apply initial scroll position
    if (elements.hourlyForecast.scrollTo) {
      elements.hourlyForecast.scrollTo({
        left: state.hourlyScrollPosition,
        behavior: 'smooth'
      });
    } else {
      elements.hourlyForecast.scrollLeft = state.hourlyScrollPosition;
    }
    
    // Update scroll buttons visibility
    updateHourlyScrollButtons();
  }
}

// Scroll hourly forecast left
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

// Scroll hourly forecast right
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

// Update hourly forecast scroll buttons visibility
function updateHourlyScrollButtons() {
  if (!elements.prevHourBtn || !elements.nextHourBtn) return;
  
  // Show/hide previous button
  if (state.hourlyScrollPosition <= 0) {
    elements.prevHourBtn.classList.add('disabled');
  } else {
    elements.prevHourBtn.classList.remove('disabled');
  }
  
  // Show/hide next button
  const maxScroll = (state.totalHourlyItems - state.visibleHourlyItems) * state.hourlyItemWidth;
  if (state.hourlyScrollPosition >= maxScroll) {
    elements.nextHourBtn.classList.add('disabled');
  } else {
    elements.nextHourBtn.classList.remove('disabled');
  }
}

// Update daily forecast UI
function updateDailyForecast() {
  if (!state.forecastData || !elements.dailyForecast) {
    console.error("No daily forecast data available or forecast container not found");
    return;
  }
  
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

// Update temperature chart
function updateTemperatureChart() {
  if (!state.forecastData || !elements.temperatureChart) {
    console.error("No forecast data available or chart element not found");
    return;
  }
  
  if (state.temperatureChart) {
    state.temperatureChart.destroy();
  }
  
  try {
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
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: state.isDarkMode ? '#e2e8f0' : '#2d3748'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.raw}°${state.units === 'metric' ? 'C' : 'F'}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              color: state.isDarkMode ? '#e2e8f0' : '#2d3748',
              callback: function(value) {
                return `${value}°${state.units === 'metric' ? 'C' : 'F'}`;
              }
            }
          },
          x: {
            ticks: {
              color: state.isDarkMode ? '#e2e8f0' : '#2d3748'
            }
          }
        }
      }
    });
  } catch (error) {
    console.error("Error creating temperature chart:", error);
  }
}

// Handle search form submission
function handleSearchSubmit(event) {
  event.preventDefault();
  const city = elements.searchInput.value.trim();
  
  if (city) {
    fetchWeatherData(city);
    elements.searchInput.value = "";
    
    // Add input animation
    elements.searchInput.classList.add("animate__pulse");
    setTimeout(() => elements.searchInput.classList.remove("animate__pulse"), 500);
  }
}

// Get current location weather
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

// Fetch weather by coordinates
async function fetchWeatherDataByCoords(lat, lon) {
  try {
    showLoading();
    
    const [currentWeather, forecast] = await Promise.all([
      fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${state.units}`).then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      }),
      fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${state.units}`).then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
    ]);
    
    if (currentWeather.cod !== 200 || forecast.cod !== "200") {
      throw new Error(currentWeather.message || forecast.message || "Invalid weather data");
    }
    
    state.currentCity = currentWeather.name;
    state.weatherData = processCurrentWeather(currentWeather);
    state.forecastData = processForecastData(forecast.list);
    
    // Reset hourly scroll position when loading new data
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

// Toggle dark/light theme
function toggleTheme() {
  state.isDarkMode = !state.isDarkMode;
  
  if (state.isDarkMode) {
    enableDarkMode();
  } else {
    disableDarkMode();
  }
  
  localStorage.setItem("darkMode", state.isDarkMode);
}

// Enable dark mode
function enableDarkMode() {
  elements.appContainer.classList.add("night-mode");
  elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  
  if (elements.darkModeSwitch) {
    elements.darkModeSwitch.checked = true;
  }
  
  // Update chart colors if it exists
  if (state.temperatureChart) {
    if (state.temperatureChart.options && state.temperatureChart.options.plugins && state.temperatureChart.options.plugins.legend) {
      state.temperatureChart.options.plugins.legend.labels.color = '#e2e8f0';
    }
    
    if (state.temperatureChart.options && state.temperatureChart.options.scales) {
      if (state.temperatureChart.options.scales.x) {
        state.temperatureChart.options.scales.x.ticks.color = '#e2e8f0';
      }
      
      if (state.temperatureChart.options.scales.y) {
        state.temperatureChart.options.scales.y.ticks.color = '#e2e8f0';
      }
    }
    
    state.temperatureChart.update();
  }
}

// Disable dark mode
function disableDarkMode() {
  elements.appContainer.classList.remove("night-mode");
  elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  
  if (elements.darkModeSwitch) {
    elements.darkModeSwitch.checked = false;
  }
  
  // Update chart colors if it exists
  if (state.temperatureChart) {
    if (state.temperatureChart.options && state.temperatureChart.options.plugins && state.temperatureChart.options.plugins.legend) {
      state.temperatureChart.options.plugins.legend.labels.color = '#2d3748';
    }
    
    if (state.temperatureChart.options && state.temperatureChart.options.scales) {
      if (state.temperatureChart.options.scales.x) {
        state.temperatureChart.options.scales.x.ticks.color = '#2d3748';
      }
      
      if (state.temperatureChart.options.scales.y) {
        state.temperatureChart.options.scales.y.ticks.color = '#2d3748';
      }
    }
    
    state.temperatureChart.update();
  }
}

// Handle dark mode switch change
function handleDarkModeToggle() {
  toggleTheme();
}

// Toggle favorite status for current city
function toggleFavorite() {
  if (!state.currentCity) return;
  
  const index = state.favorites.indexOf(state.currentCity);
  
  if (index === -1) {
    // Add to favorites
    state.favorites.push(state.currentCity);
    elements.favoriteToggle.innerHTML = '<i class="fas fa-star"></i>';
  } else {
    // Remove from favorites
    state.favorites.splice(index, 1);
    elements.favoriteToggle.innerHTML = '<i class="far fa-star"></i>';
  }
  
  // Save to localStorage
  localStorage.setItem("favorites", JSON.stringify(state.favorites));
  
  // Update favorites display
  renderFavorites();
  
  // Add animation
  elements.favoriteToggle.classList.add("animate__bounce");
  setTimeout(() => elements.favoriteToggle.classList.remove("animate__bounce"), 500);
}

// Update favorite toggle based on current city
function updateFavoriteToggle() {
  if (!elements.favoriteToggle || !state.currentCity) return;
  
  elements.favoriteToggle.innerHTML = state.favorites.includes(state.currentCity) 
    ? '<i class="fas fa-star"></i>' 
    : '<i class="far fa-star"></i>';
}

// Render favorites list
function renderFavorites() {
  // Ensure we have the necessary DOM elements
  if (!elements.favoriteCitiesContainer || !elements.favoritesListContainer) {
    console.error("Favorites containers not found in DOM");
    return;
  }
  
  // Clear existing favorites
  elements.favoriteCitiesContainer.innerHTML = "";
  elements.favoritesListContainer.innerHTML = state.favorites.length === 0 
    ? "<p>No favorite cities yet. Add some using the star icon!</p>" 
    : "";
  
  // Add each favorite city
  state.favorites.forEach((city, index) => {
    // Add to quick access bar
    const favoriteElement = document.createElement("div");
    favoriteElement.className = "favorite-city";
    favoriteElement.innerHTML = `${city} <i class="fas fa-times remove-favorite"></i>`;
    favoriteElement.style.animationDelay = `${index * 0.1}s`;
    
    favoriteElement.addEventListener("click", (event) => {
      if (event.target.classList.contains("remove-favorite")) {
        // Remove from favorites
        state.favorites = state.favorites.filter(fav => fav !== city);
        localStorage.setItem("favorites", JSON.stringify(state.favorites));
        renderFavorites();
        if (city === state.currentCity) updateFavoriteToggle();
      } else {
        // View this city's weather
        fetchWeatherData(city);
      }
    });
    
    elements.favoriteCitiesContainer.appendChild(favoriteElement);
    
    // Add to favorites list
    const listItem = document.createElement("div");
    listItem.className = "favorite-item";
    listItem.innerHTML = `
      <span>${city}</span>
      <button class="remove-favorite-btn" data-city="${city}">
        <i class="fas fa-trash"></i>
      </button>
    `;
    elements.favoritesListContainer.appendChild(listItem);
  });
  
  // Add event listeners to remove buttons
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

// Set temperature unit (metric/imperial)
function setTemperatureUnit(newUnits, reload = true) {
  state.units = newUnits;
  localStorage.setItem("units", state.units);
  
  // Update UI
  if (elements.tempUnit) {
    elements.tempUnit.textContent = state.units === "metric" ? "°C" : "°F";
  }
  
  if (elements.celsiusBtn && elements.fahrenheitBtn) {
    if (state.units === "metric") {
      elements.celsiusBtn.classList.add("active");
      elements.fahrenheitBtn.classList.remove("active");
    } else {
      elements.celsiusBtn.classList.remove("active");
      elements.fahrenheitBtn.classList.add("active");
    }
  }
  
  // Reload weather data if needed
  if (reload && state.currentCity) {
    fetchWeatherData(state.currentCity);
  }
  
  // Add animation
  if (elements.tempUnit) {
    elements.tempUnit.classList.add("animate__pulse");
    setTimeout(() => elements.tempUnit.classList.remove("animate__pulse"), 500);
  }
}

// Set background based on weather condition
function setBackgroundByWeather(iconCode) {
  if (!iconCode) return;
  
  const body = document.body;
  
  // Remove all weather classes
  body.classList.remove(
    "weather-clear", 
    "weather-cloudy", 
    "weather-rainy", 
    "weather-snow", 
    "weather-thunderstorm",
    "weather-night"
  );
  
  // Determine weather type
  let weatherType = "clear";
  
  if (iconCode.includes("01d")) {
    weatherType = "clear";
  } else if (iconCode.includes("01n")) {
    weatherType = "night";
  } else if (iconCode.includes("02") || iconCode.includes("03") || iconCode.includes("04")) {
    weatherType = "cloudy";
  } else if (iconCode.includes("09") || iconCode.includes("10")) {
    weatherType = "rainy";
  } else if (iconCode.includes("11")) {
    weatherType = "thunderstorm";
  } else if (iconCode.includes("13")) {
    weatherType = "snow";
  }
  
  // Add appropriate class
  body.classList.add(`weather-${weatherType}`);
}

// Handle window resize
function handleResize() {
  if (state.temperatureChart) {
    state.temperatureChart.resize();
  }
}

// Show loading indicator
function showLoading() {
  elements.loadingIndicator.style.display = "block";
  elements.loadingIndicator.classList.add("animate__pulse");
}

// Hide loading indicator
function hideLoading() {
  elements.loadingIndicator.style.display = "none";
  elements.loadingIndicator.classList.remove("animate__pulse");
}

// Show error message
function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.style.display = "block";
  elements.errorMessage.classList.add("animate__shakeX");
  setTimeout(() => elements.errorMessage.classList.remove("animate__shakeX"), 500);
}

// Clear error message
function clearError() {
  elements.errorMessage.textContent = "";
  elements.errorMessage.style.display = "none";
  elements.errorMessage.classList.remove("animate__shakeX");
}

// Handle errors
function handleError(error) {
  console.error("Weather App Error:", error);
  
  let errorMessage = "An error occurred while fetching weather data.";
  
  if (error.message.includes("404")) {
    errorMessage = "Location not found. Please try another city.";
  } else if (error.message.includes("network")) {
    errorMessage = "Network error. Please check your internet connection.";
  } else if (error.message.includes("401")) {
    errorMessage = "Invalid API key. Please contact support.";
  }
  
  showError(errorMessage);
}

// Format date
function formatDate(date) {
  return date.toLocaleString("en-US", { 
    weekday: "long", 
    month: "short", 
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

// Format day
function formatDay(date) {
  return date.toLocaleString("en-US", { 
    weekday: "short", 
    month: "short", 
    day: "numeric"
  });
}

// Format time
function formatTime(date) {
  return date.toLocaleTimeString("en-US", { 
    hour: "numeric",
    minute: "2-digit"
  });
}

// Debounce function for performance
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Setup animations
function setupAnimations() {
  // Add hover animations to buttons
  const buttons = document.querySelectorAll("button, .clickable");
  buttons.forEach(button => {
    button.addEventListener("mouseenter", () => {
      button.classList.add("animate__animated", "animate__pulse");
    });
    button.addEventListener("mouseleave", () => {
      button.classList.remove("animate__animated", "animate__pulse");
    });
  });
  
  // Add animation to footer links
  const footerLinks = document.querySelectorAll("footer a");
  footerLinks.forEach(link => {
    link.addEventListener("mouseenter", () => {
      link.classList.add("animate__animated", "animate__rubberBand");
    });
    link.addEventListener("mouseleave", () => {
      link.classList.remove("animate__animated", "animate__rubberBand");
    });
  });
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", initApp);