import { fetchWeatherApi } from "openmeteo";
import { LatLngAlt } from "../types/api/trips";
import { PointWeather } from "./pointWeather";

export class TripWeather {
  daily: PointWeather[][];
  hourly: PointWeather[][];

  constructor(data: { daily: PointWeather[][]; hourly: PointWeather[][] }) {
    this.daily = data.daily;
    this.hourly = data.hourly;
  }

  toDTO() {
    return {
      daily: this.daily.map((pointWeathers) =>
        pointWeathers.map((pointWeather) => pointWeather.toDTO())
      ),
      hourly: this.hourly.map((pointWeathers) =>
        pointWeathers.map((pointWeather) =>
          pointWeather.toDTO()
        )
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
      hourly: [
        "temperature_2m",
        "weather_code",
        "wind_speed_10m",
        "precipitation",
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
        const pointsWeatherDaily = dates.map((date, index) => {
          return new PointWeather({
            date: date.toLocaleDateString(),
            temperature: temperature2mMax[index],
            weatherCode: weatherCode[index],
            precipitationSum: precipitationSum[index],
            windSpeed: windSpeed10mMax[index],
          });
        });
        return pointsWeatherDaily;
      });

      const hourlyWeatherForecastForPoints = response.map((pointWeatherData) => {
        const hourly = pointWeatherData.hourly();
        const temperature2m = hourly.variables(0).valuesArray();
        const weatherCodeHourly = hourly.variables(1).valuesArray();
        const windSpeed10m = hourly.variables(2).valuesArray();
        const precipitationHourly = hourly.variables(3).valuesArray();
        const datesHourly = Array.from(
          {
            length:
              (Number(hourly.timeEnd()) - Number(hourly.time())) /
              hourly.interval(),
          },
          (_, i) => Number(hourly.time()) + i * hourly.interval()
        ).map(
          (time) =>
            new Date((time + pointWeatherData.utcOffsetSeconds()) * 1000)
        );
        const pointsWeatherHourly = datesHourly.map((date, index) => {
          return new PointWeather({
            date: date.toLocaleDateString(undefined, {month: "numeric", day: "numeric"}),
            hour: date.toLocaleTimeString(undefined,{timeStyle: "short"}),
            temperature: temperature2m[index],
            weatherCode: weatherCodeHourly[index],
            precipitationSum: precipitationHourly[index],
            windSpeed: windSpeed10m[index],
          });
        });
        return pointsWeatherHourly;
      });

      return new TripWeather({ daily: weatherForecastForPoints, hourly: hourlyWeatherForecastForPoints });
    });
  }
}
