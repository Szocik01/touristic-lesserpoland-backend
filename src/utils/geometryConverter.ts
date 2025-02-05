import { LatLngAlt } from "../types/api/trips";

export class GeometryConverter {


    static latLngToGeometryText(route: LatLngAlt[]): string {
        return `LINESTRING(${route.map((point) => point.join(" ")).join(",")})`;
    }
}