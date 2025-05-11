
export class PointWeather{
    date: string
    hour?: string
    temperature: number
    weatherCode: number
    precipitationSum: number
    windSpeed: number

    constructor( data: {date: string,hour?: string ,temperature: number, weatherCode: number, precipitationSum: number, windSpeed: number}){
        this.date = data.date
        this.hour = data.hour
        this.temperature =  data.temperature
        this.weatherCode =  data.weatherCode
        this.precipitationSum =  data.precipitationSum
        this.windSpeed =  data.windSpeed
    }

    toDTO(){
        return {
            date: this.date,
            hour: this.hour,
            temperature: this.temperature,
            weatherCode: this.weatherCode,
            precipitationSum: this.precipitationSum,
            windSpeed: this.windSpeed,
        }
    }
}