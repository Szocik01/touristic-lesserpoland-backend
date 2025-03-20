
export class PointWeather{
    date: string
    temperature: number
    weatherCode: number
    precipitationSum: number
    windSpeed: number

    constructor( data: {date: string, temperature: number, weatherCode: number, precipitationSum: number, windSpeed: number}){
        this.date = data.date
        this.temperature =  data.temperature
        this.weatherCode =  data.weatherCode
        this.precipitationSum =  data.precipitationSum
        this.windSpeed =  data.windSpeed
    }

    toDTO(){
        return {
            date: this.date,
            temperature: this.temperature,
            weatherCode: this.weatherCode,
            precipitationSum: this.precipitationSum,
            windSpeed: this.windSpeed
        }
    }
}