# Enhanced Weather App

Welcome to the Enhanced Weather App – a sleek, interactive, and modern weather web application designed to provide real-time weather updates with a stunning user experience. Leveraging glassmorphism design, smooth animations, and dynamic particle effects, this app is built to be both functional and visually appealing.

## 🌦️ Description

The Enhanced Weather App allows users to search for weather data by city name or current location, providing access to real-time conditions, hourly forecasts, 5-day forecasts, and detailed weather insights. It includes customizable features such as theme switching, favorite cities management, and temperature unit selection, all wrapped in a beautifully animated UI.

## ✨ Features

✔ Real-Time Weather Data – Fetch live weather conditions, hourly, and 5-day forecasts via OpenWeatherMap API.

✔ Interactive UI – Glassmorphism design with smooth animations (Animate.css) and particle effects (particles.js).

✔ Dark & Light Mode – Switch themes for a personalized experience.

✔ Favorite Cities – Save and manage your favorite locations for quick access.

✔ Temperature Units – Seamlessly toggle between Celsius (°C) and Fahrenheit (°F).

✔ Responsive Design – Fully optimized for desktop, tablet, and mobile devices.

✔ Detailed Weather Information – Access humidity, wind speed, precipitation, visibility, pressure, cloud cover, sunrise, and sunset.

✔ Hourly & 5-Day Forecasts – View interactive charts for extended weather insights.

✔ Engaging Animations – Fade, pulse, bounce, and slide effects enhance the user experience.

## 🛠️ Technologies Used

- HTML5 – Structured and semantic web page layout.
- CSS3 – Glassmorphism styling, animations, and responsive design.
- JavaScript – Core logic, API integration, and interactivity.
- Bootstrap 5 – Ensuring responsive and mobile-friendly components.
- Font Awesome – Icons for weather conditions and UI elements.
- Google Fonts – Utilizing the Roboto font for consistency.
- Animate.css – Adding eye-catching animations.
- particles.js – Dynamic animated particle effects.
- Chart.js – Visual representation of the 5-day temperature forecast.
- Axios – Efficient API requests to OpenWeatherMap.
- OpenWeatherMap API – Source for weather data.

## 🚀 Installation

To run the project locally, follow these steps:

1️⃣ **Clone the Repository**  
   ```bash
   git clone https://github.com/NickiMash17/Weather_App.git
   cd Weather_App

2️⃣ Install Dependencies

The project utilizes CDN-hosted libraries, so no additional installation is required. Ensure you have a web browser and a local server (e.g., Live Server in VS Code) to run the application.

3️⃣ Get an OpenWeatherMap API Key

- Sign up at OpenWeatherMap and obtain a free API key.

- Replace the apiKey value in weather.js (line 1) with your API key:

- const apiKey = "YOUR_API_KEY_HERE";

4️⃣ Open in a Web Browser   

Open weather.html in your web browser.
Alternatively, use a local server:
```bash
python -m http.server 8080  # Python

or use VS Code Live Server.

🎯 Usage Guide
1. 🔍 Search for a City
Type a city name in the search bar and press Enter or click "Search".
Use the location button to fetch weather data based on your current location.
2. 🗂️ Explore Different Sections
Current Weather: View real-time weather conditions.
Forecast: Check hourly and 5-day forecasts.
Details: Get an in-depth weather breakdown.
Settings: Personalize your experience.
3. 🎨 Customize Your Experience
Toggle between light and dark mode.
Switch temperature units between °C and °F.
Add or remove cities from Favorites.
4. 🎭 Enjoy Stunning Animations
Experience particle effects, fade-ins, pulses, and transitions for a lively experience.

📁 Project Structure

