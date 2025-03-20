import { fetchWeatherApi } from "openmeteo";
import { LatLngAlt } from "../types/api/trips";
import { PointWeather } from "./pointWeather";

export class TripWeather {
  daily: PointWeather[][];

  constructor(data: { daily: PointWeather[][] }) {
    this.daily = data.daily;
  }

  toDTO() {
    return {
      daily: this.daily.map((pointWeathers) =>
        pointWeathers.map((pointWeather) => pointWeather.toDTO())
      ),
    };
  }

  static getForecastByCoordinates(
    coordinates: LatLngAlt[]
  ): Promise<TripWeather | null> {
    const latitudes = coordinates.map((coordinate) => coordinate[1]);
    const longitudes = coordinates.map((coordinate) => coordinate[0]);

    const params = {
      latitude: latitudes,
      longitude: longitudes,
      daily: [
        "weather_code",
        "temperature_2m_max",
        "precipitation_sum",
        "wind_speed_10m_max",
      ],
      timezone: "Europe/Berlin",
      forecast_days: 3,
    };
    return fetchWeatherApi(
      "https://api.open-meteo.com/v1/forecast",
      params
    ).then((response) => {
      const weatherForecastForPoints = response.map((pointWeatherData) => {
        const daily = pointWeatherData.daily();
        const weatherCode = daily.variables(0).valuesArray();
        const temperature2mMax = daily.variables(1).valuesArray();
        const precipitationSum = daily.variables(2).valuesArray()!;
        const windSpeed10mMax = daily.variables(3).valuesArray()!;
        const dates = Array.from(
          {
            length:
              (Number(daily.timeEnd()) - Number(daily.time())) /
              daily.interval(),
          },
          (_, i) => Number(daily.time()) + i * daily.interval()
        ).map(
          (time) =>
            new Date((time + pointWeatherData.utcOffsetSeconds()) * 1000)
        );
        const pointsWeather = dates.map((date, index) => {
          return new PointWeather({
            date: date.toLocaleDateString(),
            temperature: temperature2mMax[index],
            weatherCode: weatherCode[index],
            precipitationSum: precipitationSum[index],
            windSpeed: windSpeed10mMax[index],
          });
        });
        return pointsWeather;
      });
      return new TripWeather({ daily: weatherForecastForPoints });
    });
  }
}
