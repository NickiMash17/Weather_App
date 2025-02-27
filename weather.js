const apiKey = "2344c92a7ff896b70d4ee84a698a321d"; // Replace with your actual API key
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#search-form-input");
const locationButton = document.querySelector("#location-button");
const themeToggle = document.querySelector("#theme-toggle");
const favoriteToggle = document.querySelector("#favorite-toggle");
const tempUnit = document.querySelector("#temperature-unit");
const celsiusBtn = document.querySelector("#celsius-btn");
const fahrenheitBtn = document.querySelector("#fahrenheit-btn");
const darkModeSwitch = document.querySelector("#darkModeSwitch");
const favoriteCitiesContainer = document.querySelector("#favorite-cities");
const favoritesListContainer = document.querySelector("#favorites-list");
const loadingIndicator = document.querySelector("#loading-indicator");
const errorMessage = document.querySelector("#error-message");

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let currentCity = "";
let temperatureChart = null;
let units = localStorage.getItem("units") || "metric";

function initApp() {
  renderFavorites();
  setupEventListeners();
  loadSavedSettings();
  console.log("Initializing app with last city:", localStorage.getItem("lastCity") || "New York");
  const lastCity = localStorage.getItem("lastCity") || "New York";
  searchCity(lastCity);
  setupFooterAnimations();
}

function setupEventListeners() {
  searchForm.addEventListener("submit", handleSearchSubmit);
  locationButton.addEventListener("click", getCurrentLocation);
  themeToggle.addEventListener("click", toggleTheme);
  favoriteToggle.addEventListener("click", toggleFavorite);
  tempUnit.addEventListener("click", toggleTemperatureUnit);
  celsiusBtn.addEventListener("click", () => setTemperatureUnit("metric"));
  fahrenheitBtn.addEventListener("click", () => setTemperatureUnit("imperial"));
  darkModeSwitch.addEventListener("change", handleDarkModeToggle);
}

function setupFooterAnimations() {
  const links = document.querySelectorAll("footer a");
  const footer = document.querySelector("footer");
  const root = document.documentElement;

  if (links.length === 0 || !footer) {
    console.warn("Footer elements not found. Skipping animations.");
    return;
  }

  const neonColor = getComputedStyle(root).getPropertyValue('--neon-color').trim() || '#50e3c2';

  links.forEach(link => {
    link.addEventListener("mouseover", () => {
      if (link) link.classList.add("animate__pulse");
    });
    link.addEventListener("mouseout", () => {
      if (link) link.classList.remove("animate__pulse");
    });
  });

  footer.addEventListener("mouseover", () => {
    if (footer) footer.style.boxShadow = `0 -8px 40px rgba(0, 0, 0, 0.3), 0 0 40px ${rgbaFromHex(neonColor, 0.6)}`;
  });

  footer.addEventListener("mouseout", () => {
    if (footer) footer.style.boxShadow = `0 -6px 30px rgba(0, 0, 0, 0.2), 0 0 20px ${rgbaFromHex(neonColor, 0.3)}`;
  });
}

// Helper function to convert hex to rgba for dynamic shadow
function rgbaFromHex(hex, opacity) {
  try {
    if (!hex || typeof hex !== 'string') {
      console.warn("Invalid hex color provided to rgbaFromHex, defaulting to black.");
      return `rgba(0, 0, 0, ${opacity})`;
    }

    hex = hex.trim().replace('#', '');
    if (hex.length !== 6) {
      console.warn("Invalid hex color length, defaulting to black.");
      return `rgba(0, 0, 0, ${opacity})`;
    }

    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    opacity = Math.max(0, Math.min(1, opacity || 0));
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  } catch (error) {
    console.error("Error in rgbaFromHex:", error);
    return `rgba(0, 0, 0, ${opacity || 0})`;
  }
}

function loadSavedSettings() {
  setTemperatureUnit(units, false);
  const darkMode = localStorage.getItem("darkMode") === "true";
  darkModeSwitch.checked = darkMode;
  if (darkMode) {
    document.querySelector(".app").classList.add("night-mode");
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  }
}

function handleSearchSubmit(event) {
  event.preventDefault();
  const city = searchInput.value.trim();
  if (city) {
    searchCity(city);
    searchInput.value = "";
    searchInput.classList.add("animate__pulse");
    setTimeout(() => searchInput.classList.remove("animate__pulse"), 500);
  }
}

function searchCity(city) {
  showLoading();
  clearError();
  
  console.log("Searching for city:", city);
  
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${units}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=${units}`;
  
  axios.get(url)
    .then(response => {
      console.log("API response:", response);
      if (response.status === 200 && response.data.cod === 200) {
        console.log("Current weather API response:", response.data);
        handleWeatherResponse(response.data);
        localStorage.setItem("lastCity", city);
        currentCity = city;
        updateFavoriteToggle();
        return axios.get(forecastUrl);
      } else {
        throw new Error(`API Error: ${response.data.message || 'Invalid response'}`);
      }
    })
    .then(forecastResponse => {
      console.log("Forecast API response:", forecastResponse);
      if (forecastResponse.status === 200 && forecastResponse.data.cod === "200") {
        console.log("Forecast data:", forecastResponse.data);
        handleForecastResponse(forecastResponse.data);
        hideLoading();
      } else {
        throw new Error(`Forecast API Error: ${forecastResponse.data.message || 'Invalid forecast response'}`);
      }
    })
    .catch(error => {
      hideLoading();
      console.error("Error fetching weather data:", error);
      let errorMessage = "City not found or invalid request. Please try again.";
      if (error.response) {
        console.error("API Error:", error.response.data);
        errorMessage = `API Error: ${error.response.data.message || errorMessage}`;
      } else if (error.request) {
        console.error("Network Error:", error.request);
        errorMessage = "Network error. Please check your connection and try again.";
      } else {
        console.error("Error:", error.message);
        errorMessage = `Error: ${error.message}`;
      }
      showError(errorMessage);
    });
}

function handleWeatherResponse(data) {
  console.log("Handling weather response:", data);
  if (!data || !data.name || !data.weather || !data.main || !data.wind) {
    console.error("Invalid weather data received:", data);
    showError("Invalid weather data received. Please try again.");
    return;
  }

  const weatherData = {
    city: data.name,
    condition: {
      description: data.weather[0].description,
      icon_url: `http://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`
    },
    time: data.dt,
    temperature: {
      current: data.main.temp,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure
    },
    wind: { speed: data.wind.speed },
    precipitation: { total: data.clouds.all / 100 },
    visibility: data.visibility,
    cloud_cover: data.clouds.all,
    sunrise: data.sys.sunrise,
    sunset: data.sys.sunset
  };
  
  updateCurrentWeather(weatherData);
  setBackgroundByWeather(data.weather[0].icon);
}

function updateCurrentWeather(data) {
  console.log("Updating current weather:", data);
  const cityElement = document.querySelector("#weather-city");
  const descriptionElement = document.querySelector("#description");
  const timeElement = document.querySelector("#time");
  const temperatureElement = document.querySelector("#temperature");
  const feelsLikeElement = document.querySelector("#feels-like");
  const humidityElement = document.querySelector("#humidity");
  const humidityValueElement = document.querySelector("#humidity-value");
  const speedElement = document.querySelector("#speed");
  const windValueElement = document.querySelector("#wind-value");
  const precipitationElement = document.querySelector("#precipitation");
  const iconElement = document.querySelector("#icon");
  const visibilityElement = document.querySelector("#visibility");
  const pressureElement = document.querySelector("#pressure");
  const cloudinessElement = document.querySelector("#cloudiness");
  const sunriseElement = document.querySelector("#sunrise");
  const sunsetElement = document.querySelector("#sunset");

  if (!cityElement || !descriptionElement || !timeElement || !temperatureElement || !feelsLikeElement || 
      !humidityElement || !humidityValueElement || !speedElement || !windValueElement || 
      !precipitationElement || !iconElement || !visibilityElement || !pressureElement || 
      !cloudinessElement || !sunriseElement || !sunsetElement) {
    console.error("One or more weather data elements not found in DOM.");
    showError("Weather data elements missing. Please check HTML.");
    return;
  }

  cityElement.textContent = data.city;
  descriptionElement.textContent = data.condition.description;
  const date = new Date(data.time * 1000);
  timeElement.textContent = formatDate(date);
  
  const temperature = Math.round(data.temperature.current);
  temperatureElement.textContent = temperature;
  feelsLikeElement.textContent = `${Math.round(data.temperature.feels_like)}°`;
  humidityElement.textContent = `${data.temperature.humidity}%`;
  humidityValueElement.textContent = `${data.temperature.humidity}%`;
  
  const windUnit = units === "metric" ? "m/s" : "mph";
  speedElement.textContent = `${Math.round(data.wind.speed)} ${windUnit}`;
  windValueElement.textContent = `${Math.round(data.wind.speed)} ${windUnit}`;
  precipitationElement.textContent = `${Math.round(data.precipitation.total * 100)}%`;
  
  iconElement.innerHTML = `<img src="${data.condition.icon_url}" class="icon" alt="${data.condition.description}" />`;
  
  visibilityElement.textContent = `${Math.round(data.visibility / 1000)} km`;
  pressureElement.textContent = `${data.temperature.pressure} hPa`;
  cloudinessElement.textContent = `${data.cloud_cover}%`;
  
  const sunrise = new Date(data.sunrise * 1000);
  const sunset = new Date(data.sunset * 1000);
  sunriseElement.textContent = formatTime(sunrise);
  sunsetElement.textContent = formatTime(sunset);

  document.querySelector(".weather-data").classList.add("animate__fadeIn");
  setTimeout(() => document.querySelector(".weather-data").classList.remove("animate__fadeIn"), 600);
}

function handleForecastResponse(data) {
  console.log("Handling forecast response:", data);
  if (!data || !data.list) {
    console.error("Invalid forecast data received:", data);
    showError("Invalid forecast data received. Please try again.");
    return;
  }

  const hourlyData = data.list.slice(0, 12);
  const dailyData = [];
  for (let i = 0; i < data.list.length; i += 8) {
    if (dailyData.length < 5) dailyData.push(data.list[i]);
  }
  updateHourlyForecast(hourlyData);
  updateForecast(dailyData);
  updateTemperatureChart(dailyData);
}

function updateHourlyForecast(hourlyData) {
  console.log("Updating hourly forecast:", hourlyData);
  const hourlyContainer = document.querySelector("#hourly-forecast");
  if (!hourlyContainer) {
    console.error("Hourly forecast container not found in DOM.");
    return;
  }
  hourlyContainer.innerHTML = "";
  
  hourlyData.forEach(hour => {
    const time = new Date(hour.dt * 1000);
    const hourlyHTML = `
      <div class="hourly-item">
        <div class="hourly-time">${formatTime(time)}</div>
        <img src="http://openweathermap.org/img/wn/${hour.weather[0].icon}@2x.png" alt="${hour.weather[0].description}" class="hourly-icon" />
        <div class="hourly-temp">${Math.round(hour.main.temp)}°</div>
      </div>
    `;
    hourlyContainer.innerHTML += hourlyHTML;
  });
}

function updateForecast(dailyData) {
  console.log("Updating forecast:", dailyData);
  const forecastContainer = document.querySelector("#forecast");
  if (!forecastContainer) {
    console.error("Forecast container not found in DOM.");
    return;
  }
  forecastContainer.innerHTML = "";
  
  dailyData.forEach(day => {
    const date = new Date(day.dt * 1000);
    const dayName = formatDay(date);
    const forecastHTML = `
      <div class="weather-forecast-day">
        <div class="date">${dayName}</div>
        <img src="http://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" alt="${day.weather[0].description}" class="weather-forecast-icon" />
        <div class="weather-forecast-temperature">
          <span class="weather-max">${Math.round(day.main.temp_max)}°</span>
          <span class="weather-min">${Math.round(day.main.temp_min)}°</span>
        </div>
      </div>
    `;
    forecastContainer.innerHTML += forecastHTML;
  });
}

function updateTemperatureChart(dailyData = null) {
  console.log("Updating temperature chart with data:", dailyData);
  const ctx = document.getElementById('temperatureChart');
  if (!ctx) {
    console.error("Canvas element with ID 'temperatureChart' not found.");
    return;
  }

  const canvas = ctx.getContext('2d');
  if (!canvas) {
    console.error("Failed to get canvas context.");
    return;
  }

  if (!dailyData) {
    console.warn("No daily data provided for temperature chart. Skipping chart update.");
    return;
  }

  const labels = dailyData.map(day => formatDay(new Date(day.dt * 1000)));
  const maxTemps = dailyData.map(day => Math.round(day.main.temp_max));
  const minTemps = dailyData.map(day => Math.round(day.main.temp_min));
  
  if (temperatureChart) temperatureChart.destroy();
  
  temperatureChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Max Temperature',
          data: maxTemps,
          borderColor: '#ff9f43',
          backgroundColor: 'rgba(255, 159, 67, 0.2)',
          tension: 0.4,
          fill: true,
          borderWidth: 3,
          pointBackgroundColor: '#ff9f43',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#ff9f43'
        },
        {
          label: 'Min Temperature',
          data: minTemps,
          borderColor: '#4a90e2',
          backgroundColor: 'rgba(74, 144, 226, 0.2)',
          tension: 0.4,
          fill: true,
          borderWidth: 3,
          pointBackgroundColor: '#4a90e2',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#4a90e2'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { color: document.querySelector(".app").classList.contains("night-mode") ? '#e2e8f0' : '#2d3748', font: { weight: 'bold' } } },
        title: { display: true, text: '5-Day Temperature Forecast', color: document.querySelector(".app").classList.contains("night-mode") ? '#e2e8f0' : '#2d3748', font: { size: 18, weight: 'bold' } },
        tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: '#fff', bodyColor: '#fff', borderColor: '#fff', borderWidth: 1 }
      },
      scales: {
        y: { 
          ticks: { callback: value => value + '°', color: document.querySelector(".app").classList.contains("night-mode") ? '#e2e8f0' : '#2d3748' },
          grid: { color: document.querySelector(".app").classList.contains("night-mode") ? 'rgba(226, 232, 240, 0.2)' : 'rgba(45, 55, 72, 0.1)' }
        },
        x: { 
          ticks: { color: document.querySelector(".app").classList.contains("night-mode") ? '#e2e8f0' : '#2d3748' },
          grid: { color: document.querySelector(".app").classList.contains("night-mode") ? 'rgba(226, 232, 240, 0.2)' : 'rgba(45, 55, 72, 0.1)' }
        }
      },
      animation: {
        duration: 1500,
        easing: 'easeOutElastic',
        onComplete: function() {
          const chart = this.chart;
          chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            meta.data.forEach((bar, index) => {
              bar.$animations.scale.from = 0;
              bar.$animations.scale.to = 1;
              bar.$animations.scale.delay = index * 100;
            });
          });
        }
      }
    }
  });
}

function setBackgroundByWeather(icon) {
  const body = document.body;
  body.classList.remove('clear', 'cloudy', 'rainy', 'night');
  
  if (icon.includes('01') || icon.includes('02')) body.classList.add('clear');
  else if (icon.includes('03') || icon.includes('04')) body.classList.add('cloudy');
  else if (icon.includes('09') || icon.includes('10') || icon.includes('11')) body.classList.add('rainy');
  else if (icon.includes('n')) body.classList.add('night');
  else body.classList.add('clear');
}

function toggleTheme() {
  const app = document.querySelector(".app");
  app.classList.toggle("night-mode");
  themeToggle.innerHTML = app.classList.contains("night-mode") ? 
    '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
  darkModeSwitch.checked = app.classList.contains("night-mode");
  localStorage.setItem("darkMode", app.classList.contains("night-mode"));
  app.classList.add("animate__fadeIn");
  setTimeout(() => app.classList.remove("animate__fadeIn"), 600);
}

function handleDarkModeToggle() {
  toggleTheme();
}

function toggleFavorite() {
  if (!currentCity) return;
  const cityIndex = favorites.indexOf(currentCity);
  
  if (cityIndex === -1) {
    favorites.push(currentCity);
    favoriteToggle.innerHTML = '<i class="fas fa-star"></i>';
  } else {
    favorites.splice(cityIndex, 1);
    favoriteToggle.innerHTML = '<i class="far fa-star"></i>';
  }
  
  localStorage.setItem("favorites", JSON.stringify(favorites));
  renderFavorites();
  favoriteToggle.classList.add("animate__bounce");
  setTimeout(() => favoriteToggle.classList.remove("animate__bounce"), 500);
}

function updateFavoriteToggle() {
  favoriteToggle.innerHTML = favorites.includes(currentCity) ? 
    '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
}

function renderFavorites() {
  favoriteCitiesContainer.innerHTML = "";
  favoritesListContainer.innerHTML = favorites.length === 0 ? 
    "<p>No favorite cities yet.</p>" : "";
  
  favorites.forEach((city, index) => {
    const favoriteElement = document.createElement("div");
    favoriteElement.className = "favorite-city";
    favoriteElement.innerHTML = `${city} <i class="fas fa-times remove-favorite"></i>`;
    favoriteElement.style.animationDelay = `${index * 0.1}s`;
    
    favoriteElement.addEventListener("click", (event) => {
      if (event.target.classList.contains("remove-favorite")) {
        favorites = favorites.filter(fav => fav !== city);
        localStorage.setItem("favorites", JSON.stringify(favorites));
        renderFavorites();
        if (city === currentCity) updateFavoriteToggle();
      } else {
        searchCity(city);
      }
    });
    
    favoriteCitiesContainer.appendChild(favoriteElement);
    
    const listItem = document.createElement("div");
    listItem.className = "d-flex justify-content-between align-items-center mb-2";
    listItem.innerHTML = `
      <span>${city}</span>
      <button class="btn btn-sm btn-outline-danger remove-favorite-btn" data-city="${city}">
        <i class="fas fa-trash"></i>
      </button>
    `;
    favoritesListContainer.appendChild(listItem);
  });
  
  document.querySelectorAll(".remove-favorite-btn").forEach(button => {
    button.addEventListener("click", () => {
      const city = button.getAttribute("data-city");
      favorites = favorites.filter(fav => fav !== city);
      localStorage.setItem("favorites", JSON.stringify(favorites));
      renderFavorites();
      if (city === currentCity) updateFavoriteToggle();
    });
  });
}

function toggleTemperatureUnit() {
  setTemperatureUnit(units === "metric" ? "imperial" : "metric");
}

function setTemperatureUnit(newUnits, reload = true) {
  units = newUnits;
  localStorage.setItem("units", units);
  tempUnit.textContent = units === "metric" ? "°C" : "°F";
  
  if (units === "metric") {
    celsiusBtn.classList.add("active");
    fahrenheitBtn.classList.remove("active");
  } else {
    celsiusBtn.classList.remove("active");
    fahrenheitBtn.classList.add("active");
  }
  
  if (reload && currentCity) searchCity(currentCity);
  tempUnit.classList.add("animate__pulse");
  setTimeout(() => tempUnit.classList.remove("animate__pulse"), 500);
}

function getCurrentLocation() {
  showLoading();
  clearError();
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude: lat, longitude: lon } = position.coords;
        getWeatherByCoordinates(lat, lon);
      },
      error => {
        hideLoading();
        showError("Unable to retrieve location. Please allow access or search manually.");
        console.error("Geolocation error:", error);
      }
    );
  } else {
    hideLoading();
    showError("Geolocation not supported by your browser.");
  }
}

function getWeatherByCoordinates(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`;
  
  axios.get(url)
    .then(response => {
      console.log("API response:", response);
      if (response.status === 200 && response.data.cod === 200) {
        console.log("Current weather API response:", response.data);
        handleWeatherResponse(response.data);
        currentCity = response.data.name;
        updateFavoriteToggle();
        localStorage.setItem("lastCity", currentCity);
        return axios.get(forecastUrl);
      } else {
        throw new Error(`API Error: ${response.data.message || 'Invalid response'}`);
      }
    })
    .then(forecastResponse => {
      console.log("Forecast API response:", forecastResponse);
      if (forecastResponse.status === 200 && forecastResponse.data.cod === "200") {
        console.log("Forecast data:", forecastResponse.data);
        handleForecastResponse(forecastResponse.data);
        hideLoading();
      } else {
        throw new Error(`Forecast API Error: ${forecastResponse.data.message || 'Invalid forecast response'}`);
      }
    })
    .catch(error => {
      hideLoading();
      console.error("Error fetching weather data:", error);
      let errorMessage = "City not found or invalid request. Please try again.";
      if (error.response) {
        console.error("API Error:", error.response.data);
        errorMessage = `API Error: ${error.response.data.message || errorMessage}`;
      } else if (error.request) {
        console.error("Network Error:", error.request);
        errorMessage = "Network error. Please check your connection and try again.";
      } else {
        console.error("Error:", error.message);
        errorMessage = `Error: ${error.message}`;
      }
      showError(errorMessage);
    });
}

function formatDate(date) {
  return date.toLocaleString("en-US", { 
    weekday: "long", 
    hour: "numeric", 
    minute: "numeric" 
  });
}

function formatDay(date) {
  return date.toLocaleString("en-US", { 
    weekday: "short", 
    month: "short", 
    day: "numeric" 
  });
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", { 
    hour: "numeric", 
    minute: "2-digit", 
    hour12: true 
  });
}

function showLoading() { 
  loadingIndicator.style.display = "block"; 
  loadingIndicator.classList.add("animate__animated", "animate__pulse");
}

function hideLoading() { 
  loadingIndicator.style.display = "none"; 
  loadingIndicator.classList.remove("animate__animated", "animate__pulse");
}

function showError(message) { 
  errorMessage.textContent = message; 
  errorMessage.style.display = "block"; 
  errorMessage.classList.add("animate__animated", "animate__shakeX");
  setTimeout(() => errorMessage.classList.remove("animate__shakeX"), 500);
}

function clearError() { 
  errorMessage.textContent = ""; 
  errorMessage.style.display = "none"; 
  errorMessage.classList.remove("animate__animated", "animate__shakeX");
}

document.addEventListener("DOMContentLoaded", initApp);

// Enhanced particle creation with more dynamic effects
function createParticles(count, weatherType) {
  const container = document.getElementById('particles-js');
  if (!container) {
      console.error('Particles container #particles-js not found');
      return;
  }
  
  // Clear existing particles
  container.innerHTML = '';
  
  // Create gradient elements for special effects based on weather
  if (weatherType === 'clear') {
      // Add sun glow effect
      const sunGlow = document.createElement('div');
      sunGlow.className = 'sun-glow';
      container.appendChild(sunGlow);
  } else if (weatherType === 'night') {
      // Add moon glow effect
      const moonGlow = document.createElement('div');
      moonGlow.className = 'moon-glow';
      container.appendChild(moonGlow);
      
      // Add stars background
      for (let i = 0; i < 20; i++) {
          const star = document.createElement('div');
          star.className = 'star';
          star.style.left = `${Math.random() * 100}vw`;
          star.style.top = `${Math.random() * 60}vh`;
          star.style.animationDelay = `${Math.random() * 5}s`;
          container.appendChild(star);
      }
  } else if (weatherType === 'cloudy') {
      // Add floating clouds
      for (let i = 0; i < 5; i++) {
          const cloud = document.createElement('div');
          cloud.className = 'cloud';
          cloud.style.left = `${Math.random() * 100}vw`;
          cloud.style.top = `${Math.random() * 40}vh`;
          cloud.style.opacity = 0.3 + (Math.random() * 0.4);
          cloud.style.animationDuration = `${30 + Math.random() * 40}s`;
          cloud.style.animationDelay = `${Math.random() * 15}s`;
          cloud.style.transform = `scale(${0.5 + Math.random() * 0.8})`;
          container.appendChild(cloud);
      }
  }
  
  // Create standard particles with enhanced effects
  for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      
      // Set base class and weather-specific class
      particle.className = 'particle';
      
      // Add specific type class
      if (weatherType === 'snow') {
          particle.classList.add('snowflake');
      } else if (weatherType === 'rainy') {
          particle.classList.add('raindrop');
          // Random chance for "splash" effect
          if (Math.random() > 0.9) {
              particle.classList.add('splash');
          }
      } else if (weatherType === 'clear') {
          particle.classList.add('sunbeam');
      } else if (weatherType === 'night') {
          particle.classList.add('stardust');
      } else {
          particle.classList.add('cloudbit');
      }
      
      // Randomize position and animation properties
      const left = Math.random() * 100; // Percentage across width
      const top = -10 - (Math.random() * 20); // Start above viewport randomly
      const delay = Math.random() * 8; // Random delay up to 8s
      
      // Enhanced randomness in animations
      const duration = getAnimationDuration(weatherType);
      const scale = getParticleScale(weatherType);
      
      // Apply styles directly
      particle.style.cssText = `
          left: ${left}vw;
          top: ${top}vh;
          animation-delay: ${delay}s;
          animation-duration: ${duration}s;
          transform: scale(${scale});
      `;
      
      // Weather-specific styles
      applyWeatherStyles(particle, weatherType);
      
      container.appendChild(particle);
  }
  
  console.log(`Created ${count} enhanced particles for ${weatherType} weather`);
}

// Get appropriate animation duration based on weather
function getAnimationDuration(weatherType) {
  switch(weatherType) {
      case 'rainy':
          return (0.8 + Math.random() * 0.7) + 's'; // Faster for rain
      case 'snow':
          return (7 + Math.random() * 8) + 's'; // Slowest for snow
      case 'clear':
          return (12 + Math.random() * 15) + 's'; // Medium-slow for clear skies
      case 'night':
          return (15 + Math.random() * 20) + 's'; // Slower for night
      default: // cloudy
          return (10 + Math.random() * 10) + 's'; // Medium for clouds
  }
}

// Get appropriate scale based on weather
function getParticleScale(weatherType) {
  switch(weatherType) {
      case 'rainy':
          return 0.8 + (Math.random() * 0.4);
      case 'snow':
          return 0.6 + (Math.random() * 0.8);
      case 'clear':
          return 1 + (Math.random() * 1.5);
      case 'night':
          return 0.3 + (Math.random() * 1.2);
      default: // cloudy
          return 0.9 + (Math.random() * 1.2);
  }
}

// Apply specific styles based on weather type
function applyWeatherStyles(particle, weatherType) {
  if (weatherType === 'rainy') {
      // Raindrop effect
      particle.style.width = '2px';
      particle.style.height = `${8 + Math.random() * 12}px`;
      particle.style.opacity = 0.6 + (Math.random() * 0.3);
      particle.style.background = 'linear-gradient(to bottom, rgba(74, 144, 226, 0.1), rgba(74, 144, 226, 0.8))';
      particle.style.borderRadius = '40%';
      particle.style.filter = 'blur(0.5px)';
      
      // For splash raindrops
      if (particle.classList.contains('splash')) {
          particle.style.opacity = '0';
          particle.style.width = '0px';
          particle.style.height = '0px';
      }
  } else if (weatherType === 'snow') {
      // Snowflake effect
      const size = 3 + Math.random() * 5;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.borderRadius = '50%';
      particle.style.background = 'radial-gradient(circle, rgba(255,255,255,0.9) 30%, rgba(240,240,255,0.4) 80%)';
      particle.style.boxShadow = '0 0 5px rgba(255, 255, 255, 0.8)';
      particle.style.opacity = 0.7 + (Math.random() * 0.3);
      particle.style.filter = 'blur(0.3px)';
  } else if (weatherType === 'clear') {
      // Sun particle effect
      const size = 4 + Math.random() * 8;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.borderRadius = '50%';
      particle.style.background = 'radial-gradient(circle, rgba(255,236,179,0.9) 20%, rgba(255,167,38,0.3) 70%)';
      particle.style.boxShadow = '0 0 10px rgba(255, 191, 0, 0.6)';
      particle.style.opacity = 0.4 + (Math.random() * 0.3);
      particle.style.filter = 'blur(1px)';
  } else if (weatherType === 'night') {
      // Star dust effect
      const size = 2 + Math.random() * 4;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.borderRadius = '50%';
      
      // Add variation to star colors
      const colors = [
          'radial-gradient(circle, rgba(226,232,240,0.9) 10%, rgba(148,163,184,0.2) 70%)',
          'radial-gradient(circle, rgba(191,219,254,0.9) 10%, rgba(56,189,248,0.2) 70%)',
          'radial-gradient(circle, rgba(254,249,195,0.9) 10%, rgba(234,179,8,0.2) 70%)'
      ];
      
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      particle.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.8)';
      particle.style.opacity = 0.3 + (Math.random() * 0.7);
  } else {
      // Cloud particle effect
      const size = 6 + Math.random() * 10;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.borderRadius = '50%';
      particle.style.background = 'radial-gradient(circle, rgba(204,204,204,0.8) 30%, rgba(187,187,187,0.3) 80%)';
      particle.style.opacity = 0.3 + (Math.random() * 0.2);
      particle.style.filter = 'blur(2px)';
  }
}

// Update setBackgroundByWeather with enhanced special effects
function setBackgroundByWeather(icon) {
  const body = document.body;
  // Remove all weather classes and special elements
  body.classList.remove('clear', 'cloudy', 'rainy', 'snow', 'night');
  removeSpecialEffects();
  
  let weatherType = 'clear'; // Default
  
  // Add appropriate class based on detailed conditions
  if (icon.includes('01d') || icon.includes('02d')) {
      body.classList.add('clear');
      weatherType = 'clear';
      addLightningEffect(false); // No lightning
  } 
  else if (icon.includes('01n') || icon.includes('02n')) {
      body.classList.add('night');
      weatherType = 'night';
      addLightningEffect(false); // No lightning
  }
  else if (icon.includes('03') || icon.includes('04')) {
      body.classList.add('cloudy');
      weatherType = 'cloudy';
      addLightningEffect(false); // No lightning
  } 
  else if (icon.includes('09') || icon.includes('10')) {
      body.classList.add('rainy');
      weatherType = 'rainy';
      addLightningEffect(false); // No lightning by default
  } 
  else if (icon.includes('11')) {
      body.classList.add('rainy'); // Thunderstorm
      weatherType = 'rainy';
      addLightningEffect(true); // Add lightning effect
  } 
  else if (icon.includes('13')) {
      body.classList.add('cloudy'); // Snow, using cloudy background
      weatherType = 'snow';
      addLightningEffect(false); // No lightning
  } 
  else {
      body.classList.add('clear'); // Default
      weatherType = 'clear';
      addLightningEffect(false); // No lightning
  }
  
  // Create particles with enhanced effects
  createEnhancedParticles(weatherType);
}

// Create particles with count appropriate to weather type
function createEnhancedParticles(weatherType) {
  let particleCount;
  
  // Set appropriate particle counts by weather type
  switch(weatherType) {
      case 'clear':
          particleCount = 40;
          break;
      case 'cloudy':
          particleCount = 70;
          break;
      case 'rainy':
          particleCount = 150;
          break;
      case 'snow':
          particleCount = 100;
          break;
      case 'night':
          particleCount = 60;
          break;
      default:
          particleCount = 50;
  }
  
  // Create particles with the explicit weather type
  createParticles(particleCount, weatherType);
}

// Remove special effects when changing weather
function removeSpecialEffects() {
  // Remove lightning effect if it exists
  const lightning = document.querySelector('.lightning');
  if (lightning) {
      lightning.remove();
  }
}

// Add lightning effect for thunderstorms
function addLightningEffect(enable) {
  // Remove existing lightning if any
  removeSpecialEffects();
  
  if (enable) {
      const lightning = document.createElement('div');
      lightning.className = 'lightning';
      document.body.appendChild(lightning);
  }
}

// Setup enhanced weather animations
function setupWeatherAnimations() {
  // Ensure the particles container exists
  if (!document.getElementById('particles-js')) {
      const particlesContainer = document.createElement('div');
      particlesContainer.id = 'particles-js';
      particlesContainer.className = 'particles-container';
      document.body.prepend(particlesContainer);
  }
  
  // Create enhanced resize handler for responsive animations
  window.addEventListener('resize', function() {
      // Get current weather type
      const body = document.body;
      let weatherType = 'clear';
      
      if (body.classList.contains('night')) {
          weatherType = 'night';
      } else if (body.classList.contains('rainy')) {
          weatherType = 'rainy';
      } else if (body.classList.contains('cloudy')) {
          weatherType = 'cloudy';
          if (document.querySelector('.particle.snowflake')) {
              weatherType = 'snow';
          }
      }
      
      // Recreate particles for current window size
      createEnhancedParticles(weatherType);
  });
}

// Enhanced initialization 
function initApp() {
  console.log('Initializing weather app with enhanced animations');
  
  // Standard app initialization
  renderFavorites();
  setupEventListeners();
  loadSavedSettings();
  
  // Setup enhanced animations
  setupWeatherAnimations();
  
  // Start with default particles
  createEnhancedParticles('clear');
  
  // Load last city or default
  const lastCity = localStorage.getItem("lastCity") || "New York";
  searchCity(lastCity);
}

// Handle intermittent animations for special effects
function setupIntervalEffects() {
  // Add occasional lightning for thunderstorms
  setInterval(function() {
      const body = document.body;
      if (body.classList.contains('rainy') && document.querySelector('.lightning')) {
          // Random flash timing
          const flash = document.querySelector('.lightning');
          flash.style.animation = 'none';
          void flash.offsetWidth; // Trigger reflow
          flash.style.animation = `lightning ${5 + Math.random() * 10}s infinite`;
      }
  }, 10000);
}

// Add window load event listener to ensure DOM is fully loaded
window.addEventListener('load', function() {
  initApp();
  setupIntervalEffects();
});

// Update setBackgroundByWeather with enhanced special effects
function setBackgroundByWeather(icon) {
  const body = document.body;
  // Remove all weather classes and special elements
  body.classList.remove('clear', 'cloudy', 'rainy', 'snow', 'night');
  removeSpecialEffects();
  
  let weatherType = 'clear'; // Default
  
  // Add appropriate class based on detailed conditions
  if (icon.includes('01d') || icon.includes('02d')) {
      body.classList.add('clear');
      weatherType = 'clear';
      addLightningEffect(false); // No lightning
  } 
  else if (icon.includes('01n') || icon.includes('02n')) {
      body.classList.add('night');
      weatherType = 'night';
      addLightningEffect(false); // No lightning
  }
  else if (icon.includes('03') || icon.includes('04')) {
      body.classList.add('cloudy');
      weatherType = 'cloudy';
      addLightningEffect(false); // No lightning
  } 
  else if (icon.includes('09') || icon.includes('10')) {
      body.classList.add('rainy');
      weatherType = 'rainy';
      addLightningEffect(false); // No lightning by default
  } 
  else if (icon.includes('11')) {
      body.classList.add('rainy'); // Thunderstorm
      weatherType = 'rainy';
      addLightningEffect(true); // Add lightning effect
  } 
  else if (icon.includes('13')) {
      body.classList.add('cloudy'); // Snow, using cloudy background
      weatherType = 'snow';
      addLightningEffect(false); // No lightning
  } 
  else {
      body.classList.add('clear'); // Default
      weatherType = 'clear';
      addLightningEffect(false); // No lightning
  }
  
  // Create particles with enhanced effects
  createEnhancedParticles(weatherType);
}

// Create particles with count appropriate to weather type
function createEnhancedParticles(weatherType) {
  let particleCount;
  
  // Set appropriate particle counts by weather type
  switch(weatherType) {
      case 'clear':
          particleCount = 40;
          break;
      case 'cloudy':
          particleCount = 70;
          break;
      case 'rainy':
          particleCount = 150;
          break;
      case 'snow':
          particleCount = 100;
          break;
      case 'night':
          particleCount = 60;
          break;
      default:
          particleCount = 50;
  }
  
  // Create particles with the explicit weather type
  createParticles(particleCount, weatherType);
}

// Remove special effects when changing weather
function removeSpecialEffects() {
  // Remove lightning effect if it exists
  const lightning = document.querySelector('.lightning');
  if (lightning) {
      lightning.remove();
  }
}

// Add lightning effect for thunderstorms
function addLightningEffect(enable) {
  // Remove existing lightning if any
  removeSpecialEffects();
  
  if (enable) {
      const lightning = document.createElement('div');
      lightning.className = 'lightning';
      document.body.appendChild(lightning);
  }
}

// Setup enhanced weather animations
function setupWeatherAnimations() {
  // Ensure the particles container exists
  if (!document.getElementById('particles-js')) {
      const particlesContainer = document.createElement('div');
      particlesContainer.id = 'particles-js';
      particlesContainer.className = 'particles-container';
      document.body.prepend(particlesContainer);
  }
  
  // Create enhanced resize handler for responsive animations
  window.addEventListener('resize', function() {
      // Get current weather type
      const body = document.body;
      let weatherType = 'clear';
      
      if (body.classList.contains('night')) {
          weatherType = 'night';
      } else if (body.classList.contains('rainy')) {
          weatherType = 'rainy';
      } else if (body.classList.contains('cloudy')) {
          weatherType = 'cloudy';
          if (document.querySelector('.particle.snowflake')) {
              weatherType = 'snow';
          }
      }
      
      // Recreate particles for current window size
      createEnhancedParticles(weatherType);
  });
}

// Enhanced initialization 
function initApp() {
  console.log('Initializing weather app with enhanced animations');
  
  // Standard app initialization
  renderFavorites();
  setupEventListeners();
  loadSavedSettings();
  
  // Setup enhanced animations
  setupWeatherAnimations();
  
  // Start with default particles
  createEnhancedParticles('clear');
  
  // Load last city or default
  const lastCity = localStorage.getItem("lastCity") || "New York";
  searchCity(lastCity);
}

// Handle intermittent animations for special effects
function setupIntervalEffects() {
  // Add occasional lightning for thunderstorms
  setInterval(function() {
      const body = document.body;
      if (body.classList.contains('rainy') && document.querySelector('.lightning')) {
          // Random flash timing
          const flash = document.querySelector('.lightning');
          flash.style.animation = 'none';
          void flash.offsetWidth; // Trigger reflow
          flash.style.animation = `lightning ${5 + Math.random() * 10}s infinite`;
      }
  }, 10000);
}

// Add window load event listener to ensure DOM is fully loaded
window.addEventListener('load', function() {
  initApp();
  setupIntervalEffects();
});