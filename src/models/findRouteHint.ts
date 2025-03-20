import db from "../utils/db";

export class FindRouteHint {
  id: number;
  name: string;
  way: string;
  type: "place" | "polygon";

  constructor(id: number, name: string, way: string, type: "place" | "polygon") {
    this.id = id;
    this.name = name;
    this.type = type;
    this.way = way;
  }

  static getFindRouteHintByIdAndType = async (id: string, type: "place" | "polygon") => {

    const response = await db.query<{
        id: number;
        name: string;
        way: string;
        type: "place" | "polygon";      
    }>(`SELECT osm_id as id, name, ST_AsGeoJSON(ST_Transform(way,4326)) as way,'${type}' AS type FROM ${type === "place" ? "public.planet_osm_point" :"public.planet_osm_polygon"} WHERE osm_id = $1`, [id]);
      if(response.rowCount === 0){
        return null;
      }
      const row = response.rows[0];
      return new FindRouteHint(row.id, row.name, row.way, row.type);
  }

  static getFindRouteHintsByQuery = async (query: string) => {
    if (query.length < 3) {
      return [];
    }
    const response = await db.query<{
        id: number;
        name: string;
        way: string;
        type: "place" | "polygon";      
    }>(
      `
SELECT 
    osm_id as id, 
    name,
    ST_AsGeoJSON(ST_Transform(way,4326)) as way,
    'place' AS type,
	CASE 
        WHEN population IS NOT NULL OR place IN ('village', 'city', 'town') THEN 1 
        ELSE 3 
    END AS sort_order
FROM 
    public.planet_osm_point pt
WHERE 
    name ILIKE $1 AND ( 
	'natural' IS NOT NULL 
      OR tourism IS NOT NULL 
      OR place IS NOT NULL 
      OR sport IS NOT NULL 
      OR historic IS NOT NULL 
      OR leisure IS NOT NULL 
      OR ele IS NOT NULL
  ) 

UNION ALL

SELECT 
    osm_id as id, 
    name, 
    ST_AsGeoJSON(ST_Transform(way,4326)) as way,
    'polygon' AS type,
	CASE 
        WHEN population IS NOT NULL OR place IN ('village', 'city', 'town') THEN 2 
        ELSE 3 
    END AS sort_order
FROM 
    public.planet_osm_polygon pg
WHERE 
    name ILIKE $1
ORDER BY 
    sort_order
limit 4
`,
      [`${query}%`]
    );

    return response.rows.map(
      (row) => new FindRouteHint(row.id, row.name, row.way, row.type)
    );
  };
  
  toDTO = () => {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      way: this.way,
    };
  };
}
