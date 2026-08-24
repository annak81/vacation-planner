const WEATHER = {
    0: "☀️ Clear",
    1: "🌤️ Mostly clear",
    2: "🌤️ Partly cloudy",
    3: "☁️ Cloudy",
    45: "🌫️ Fog",
    48: "🌫️ Fog",
    51: "🌦️ Light Drizzle",
    53: "🌦️ Moderate Drizzle",
    55: "🌦️ Dense Drizzle",
    56: "🌦️ Freezing drizzle",
    57: "🌦️ Freezing drizzle",
    61: "🌧️ Slight Rain",
    63: "🌧️ Moderate Rain",
    65: "🌧️ Heavy rain",
    66: "🌧️ Freezing rain",
    67: "🌧️ Freezing rain",
    71: "🌨️ Snow",
    73: "🌨️ Snow",
    75: "🌨️ Heavy snow",
    77: "🌨️ Snow grains",
    80: "🌦️ Slight Rain showers",
    81: "🌦️ Moderate Rain showers",
    82: "🌦️ Heavy showers",
    85: "🌨️ Snow showers",
    86: "🌨️ Snow showers",
    95: "⛈️ Thunderstorm",
    96: "⛈️ Thunderstorm + Hail",
    99: "⛈️ Thunderstorm + Hail"
};


async function geocode(place) {
    const url = new URL(
        "https://geocoding-api.open-meteo.com/v1/search"
    );

    url.searchParams.set("name", place);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Geocoding failed for ${place}`);
    }

    const data = await response.json();
    const results = data.results || [];

    if (results.length === 0) {
        throw new Error(`Could not find location: ${place}`);
    }

    const x = results[0];

    return {
        name: x.name,
        country: x.country || "",
        latitude: x.latitude,
        longitude: x.longitude
    };
}


async function getForecast(location, start, end) {
    const url = new URL(
        "https://api.open-meteo.com/v1/forecast"
    );

    url.searchParams.set("latitude", location.latitude);
    url.searchParams.set("longitude", location.longitude);

    url.searchParams.set(
        "daily",
        [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max",
            "precipitation_sum",
            "wind_speed_10m_max"
        ].join(",")
    );

    url.searchParams.set("timezone", "auto");
    url.searchParams.set("start_date", start);
    url.searchParams.set("end_date", end);

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Weather request failed for ${location.name}`);
    }

    const data = await response.json();

    return data.daily || {};
}


function round(value, decimals = 0) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}


function formatDate(dateString) {
    const date = new Date(`${dateString}T00:00:00`);

    return {
        full: date.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short"
        }),

        day: date.toLocaleDateString("en-GB", {
            weekday: "short"
        })
    };
}


async function buildTable(start, end, places) {
    const rows = [];

    for (const place of places) {

        const location = await geocode(place);

        const daily = await getForecast(
            location,
            start,
            end
        );

        const dates = daily.time || [];

        for (let i = 0; i < dates.length; i++) {

            const date = formatDate(dates[i]);

            const code = daily.weather_code[i];

            rows.push({
                "Destination": location.name,
                "Country": location.country,
                "Date": date.full,
                "Day": date.day,
                "Weather": WEATHER[code] || "🌤️ Unknown",
                "High °C": round(daily.temperature_2m_max[i]),
                "Low °C": round(daily.temperature_2m_min[i]),
                "Rain %": daily.precipitation_probability_max[i],
                "Rain mm": round(daily.precipitation_sum[i], 1),
                "Wind km/h": round(daily.wind_speed_10m_max[i])
            });
        }
    }

    return rows;
}


const button = document.getElementById("load-weather");
const status = document.getElementById("status");
const tableBody = document.querySelector("#weather-table tbody");


button.addEventListener("click", async () => {

    const start = document.getElementById("start-date").value;
    const end = document.getElementById("end-date").value;

    const places = document
        .getElementById("destinations")
        .value
        .split("\n")
        .map(x => x.trim())
        .filter(Boolean);

    if (!start || !end) {
        status.textContent = "Please select both dates.";
        return;
    }

    if (places.length === 0) {
        status.textContent = "Please enter at least one destination.";
        return;
    }

    if (start > end) {
        status.textContent = "Start date must be before end date.";
        return;
    }

    button.disabled = true;
    status.textContent = "Getting forecasts...";
    tableBody.innerHTML = "";

    try {

        const rows = await buildTable(
            start,
            end,
            places
        );

        for (const row of rows) {

            const tr = document.createElement("tr");

            for (const value of Object.values(row)) {
                const td = document.createElement("td");
                td.textContent = value;
                tr.appendChild(td);
            }

            tableBody.appendChild(tr);
        }

        status.textContent =
            `Loaded ${rows.length} forecast rows.`;

    } catch (error) {

        console.error(error);

        status.textContent =
            `Error: ${error.message}`;

    } finally {

        button.disabled = false;
    }
});