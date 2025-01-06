import { LatLng } from "../types/api/trips";

export class GeometryConverter {


    static latLngToGeometryText(route: LatLng[]): string {
        return `LINESTRING(${route.map((point) => point.join(" ")).join(",")})`;
    }
}