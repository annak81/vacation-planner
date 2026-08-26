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


async function getForecast(location, start, end, model) {
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
            "precipitation_hours",
            "wind_speed_10m_max",
            "sunshine_duration"
        ].join(",")
    );

    url.searchParams.set("timezone", "auto");
    // url.searchParams.set("forecast_days", 14);
    url.searchParams.set("start_date", start);
    url.searchParams.set("end_date", end);
    url.searchParams.set(
        "models", [model].join(",")
    );

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
            // weekday: "short",
            day: "2-digit",
            month: "short"
        }),

        day: date.toLocaleDateString("en-GB", {
            weekday: "short"
        })
    };
}


async function buildTable(start, end, places, model) {
    const rows = [];

    for (const place of places) {

        const location = await geocode(place);

        const daily = await getForecast(
            location,
            start,
            end,
            model
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
                "Rain h": daily.precipitation_hours[i],
                "Wind km/h": round(daily.wind_speed_10m_max[i]),
                "Sunshine h": round(daily.sunshine_duration[i]/3600)
            });
        }
    }

    return rows;
}

const button_load = document.getElementById("load-weather");
const button_clear = document.getElementById("clear")
const status = document.getElementById("status");
const start_date = document.getElementById("start-date");
const end_date = document.getElementById("end-date");
const model = document.getElementById("weather-model");
const destinationsInput = document.getElementById("destinations");

function setDefaultDates() {
    const savedStartDate = localStorage.getItem("start-date");
    const savedEndDate = localStorage.getItem("end-date");

    if (savedStartDate !== null && savedEndDate !== null) {
        start_date.value = savedStartDate;
        end_date.value = savedEndDate;
    } else {
        const today = new Date();
        const end = new Date(today);
        end.setDate(end.getDate() + 15);

        const toInputDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");

            return `${year}-${month}-${day}`;
        };
        start_date.value = toInputDate(today);
        end_date.value = toInputDate(end);
    }

}

function setDestinations() {
    const savedDestinations = localStorage.getItem("destinations");

    if (savedDestinations !== null) {
        destinationsInput.value = savedDestinations;
    }
}



function initializeTabs() {
    const buttons = document.querySelectorAll(".tab-button");
    const contents = document.querySelectorAll(".tab-content");

    buttons.forEach(button => {
        button.addEventListener("click", () => {

            const targetId = button.dataset.tab;

            buttons.forEach(b => {
                b.classList.remove("active");
            });

            contents.forEach(content => {
                content.classList.remove("active");
            });

            button.classList.add("active");

            document
                .getElementById(targetId)
                .classList.add("active");
        });
    });
}

function getRainClass(rainProbability, rainMm, rainHours) {
    const probability = Number(rainProbability);
    const amount = Number(rainMm);
    const hours = Number(rainHours);

    if (amount > 0 && amount <= 1) return "rain-low";

    if (amount >= 10) {
        return "rain-very-high";
    }

    if (amount >= 5 && hours >= 2) {
        return "rain-high";
    }

    if (amount > 1 || hours > 1) {
        return "rain-medium";
    }
}

function getTemperatureClass(high) {
    high = Number(high);

    if (high < 0) return "temp-freezing";
    if (high < 10) return "temp-cold";
    if (high < 20) return "temp-cool";
    if (high < 25) return "temp-mild";
    if (high < 30) return "temp-warm";
    if (high < 35) return "temp-hot";

    return "temp-extreme";
}

function renderWeatherTable(rows) {
    const tableHead = document.getElementById("weather-table-head");
    const tableBody = document.getElementById("weather-table-body");
    const summary = document.getElementById("results-summary");

    tableHead.innerHTML = "";
    tableBody.innerHTML = "";

    if (!rows || rows.length === 0) {
        summary.textContent = "No forecast data.";
        return;
    }

    const dates = [];

    for (const row of rows) {
        const key = row.Date;
        if (!dates.some(d => d.key === key)) {
            dates.push({
                key,
                number: row.Date,
                day: row.Day
            });
        }
    }

    const destinations = [];

    for (const row of rows) {
        const key = `${row.Destination}|${row.Country}`;

        if (!destinations.some(d => d.key === key)) {
            destinations.push({
                key,
                name: row.Destination,
                country: row.Country
            });
        }
    }

    const forecast = {};

    for (const row of rows) {
        const destinationKey =
            `${row.Destination}|${row.Country}`;

        if (!forecast[destinationKey]) {
            forecast[destinationKey] = {};
        }

        forecast[destinationKey][row.Date] = row;
    }

    // Header

    const headerRow = document.createElement("tr");

    const destinationHeader = document.createElement("th");

    destinationHeader.className = "destination";
    destinationHeader.textContent = "Destination";

    headerRow.appendChild(destinationHeader);

    for (const date of dates) {
        const th = document.createElement("th");

        th.className = "date-header";

        th.innerHTML = `
            <div class="date-day">${date.day}</div>
            <div class="date-number">
                ${date.number}
            </div>
        `;

        headerRow.appendChild(th);
    }

    tableHead.appendChild(headerRow);

    // Rows

    for (const destination of destinations) {

        const tr = document.createElement("tr");

        const destinationCell =
            document.createElement("td");

        destinationCell.className = "destination";

        destinationCell.innerHTML = `
            <strong>${destination.name}</strong>
            <br>
            <small>${destination.country}</small>
        `;

        tr.appendChild(destinationCell);

        for (const date of dates) {

            const td = document.createElement("td");
            const row =
                forecast[destination.key]?.[date.number];

            if (!row) {
                td.textContent = "—";
                tr.appendChild(td);
                continue;
            }
            const rainClass = getRainClass(
                row["Rain %"],
                row["Rain mm"],
                row["Rain h"]
            );
            const temperatureClass =
                getTemperatureClass(row["High °C"]);

            td.className = `weather-cell ${rainClass}`;
            const weather = row.Weather || "🌤️";
            const icon = weather.split(" ")[0];

            td.innerHTML = `
                <div class="weather-icon">
                    ${icon}
                </div>

                <div class="temperature ${temperatureClass}">
                    ${row["High °C"]}° /
                    ${row["Low °C"]}°
                </div>

                <div class="rain-probability">
                    💧 ${row["Rain %"] ?? "—"}% / ${row["Rain mm"] ?? "—"}mm 
                    </br>
                    ☀️ ${row["Sunshine h"] ?? "—"}h / 💧 ${row["Rain h"] ?? "—"}h
                </div>
            `;

            td.title = [
                weather,
                `High: ${row["High °C"]}°C`,
                `Low: ${row["Low °C"]}°C`,
                `Rain probability: ${row["Rain %"]}%`,
                `Rain: ${row["Rain mm"]} mm`,
                `Rain hours: ${row["Rain h"]} h`,
                `Wind: ${row["Wind km/h"]} km/h`
            ].join("\n");

            tr.appendChild(td);
        }

        tableBody.appendChild(tr);
    }

    summary.textContent =
        `${destinations.length} destinations · ${dates.length} days`;
}


function renderDataFrame(rows) {
    const tableHead = document.getElementById("dataframe-table-head");
    const tableBody = document.getElementById("dataframe-table-body");

    tableHead.innerHTML = "";
    tableBody.innerHTML = "";

    if (!rows || rows.length === 0) {
        return;
    }

    // Header
    const headerRow = document.createElement("tr");

    for (const column of Object.keys(rows[0])) {
        const th = document.createElement("th");
        th.textContent = column;
        headerRow.appendChild(th);
    }

    tableHead.appendChild(headerRow);

    // Body
    for (const row of rows) {
        const tr = document.createElement("tr");

        for (const value of Object.values(row)) {
            const td = document.createElement("td");
            td.textContent = value ?? "";
            tr.appendChild(td);
        }

        tableBody.appendChild(tr);
    }
}

(function init() {
    setDestinations();
    setDefaultDates();
    initializeTabs();
})();


button_clear.addEventListener("click", () => {
    model.value = "";
    destinationsInput.value = "";
    localStorage.clear();
});

button_load.addEventListener("click", async () => {

    const places = destinationsInput
        .value
        .split("\n")
        .map(x => x.trim())
        .filter(Boolean);

    (function putToStorage() {
        localStorage.setItem(
            "destinations",
            destinationsInput.value
        );
        localStorage.setItem(
            "start-date",
            start_date.value
        );
        localStorage.setItem(
            "end-date",
            end_date.value
        );

    })();


    if (!start_date.value || !end_date.value) {
        status.textContent = "Please select both dates.";
        return;
    }

    if (places.length === 0) {
        status.textContent = "Please enter at least one destination.";
        return;
    }

    if (start_date.value > end_date.value) {
        status.textContent = "Start date must be before end date.";
        return;
    }

    button_load.disabled = true;
    status.textContent = "Getting forecasts...";

    try {

        const rows = await buildTable(
            start_date.value,
            end_date.value,
            places,
            model.value
        );
        renderDataFrame(rows);
        renderWeatherTable(rows);

        status.textContent =
            `Loaded ${rows.length} forecast rows.`;

    } catch (error) {

        console.error(error);

        status.textContent =
            `Error: ${error.message}`;

    } finally {

        button_load.disabled = false;
    }
});
