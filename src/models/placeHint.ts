import db from "../utils/db";

export class PlaceHint {
  id: number;
  name: string;
  city: string;
  point: string;

  constructor(id: number, name: string, city: string, point: string) {
    this.id = id;
    this.name = name;
    this.city = city;
    this.point = point;
  }

  static getPlaceHintsByQuery = async (query: string) => {
    if (query.length < 3) {
      return [];
    }
    const response = await db.query<{
      osm_id: number;
      name: string;
      city: string;
      point: string;
    }>(
      `
 Select pr.osm_id, pr.name, pr.city, pr.point from (SELECT DISTINCT ON (pt.osm_id) pt.osm_id, pt.name, pg.name as city, ST_AsGeoJSON(ST_Transform(pt.way,4326)) as point, 
 pt.natural, pt.ele, pt.historic, pt.leisure, pt.tourism, pt.amenity, pt.place
        FROM public.planet_osm_polygon pg 
        JOIN public.planet_osm_point pt 
            ON ST_Intersects(pt.way, pg.way) 
        WHERE pt.name ILIKE $1  
          AND pt.name != pg.name 
          AND (
              pt.natural IS NOT NULL 
              OR pt.tourism IS NOT NULL 
              OR pt.place IS NOT NULL 
              OR pt.sport IS NOT NULL 
              OR pt.historic IS NOT NULL 
              OR pt.leisure IS NOT NULL 
              OR pt.ele IS NOT NULL
			        OR pt.amenity IS NOT NULL
			        OR pt.aerialway IS NOT NULL
			        OR pt.aeroway IS NOT NULL
			        OR pt.building IS NOT NULL
          ) 
          AND (
              pg.population IS NOT NULL 
              OR pg.place = 'village' 
              OR pg.place = 'town'
			  OR pg.place = 'hamlet'
          ) 
        ORDER BY 
            pt.osm_id,
			      CASE 
                WHEN pg.name NOT ILIKE 'gmina%' 
                     AND pg.name NOT ILIKE 'województwo%'  
                     AND pg.name NOT ILIKE 'powiat%' THEN 1 
                WHEN pg.name ILIKE 'gmina%' THEN 2 
                WHEN pg.name ILIKE 'powiat%' THEN 3 
                WHEN pg.name ILIKE 'województwo%' THEN 4 
                ELSE 5 
            END) pr
			ORDER BY 
				CASE 
	        WHEN "natural" is not null
					or ele is not null
					or historic is not null THEN 1
					WHEN place is not null 
					or tourism is not null 
					or leisure is not null THEN 2
					WHEN amenity is not null THEN 3
	        ELSE 4
	      END
        limit 5`,
      [`${query}%`]
    );
    return response.rows.map(
      (row) => new PlaceHint(row.osm_id, row.name, row.city, row.point)
    );
  };
  
  toDTO = () => {
    return {
      id: this.id,
      name: this.name,
      city: this.city,
      point: this.point,
    };
  };
}
