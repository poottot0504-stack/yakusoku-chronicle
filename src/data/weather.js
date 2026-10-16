export const WEATHER_TABLES={
 field:{changeChance:.35,weights:[['clear',50],['rain',20],['fog',15],['thunderstorm',10],['snow',5]]},
 coast:{changeChance:.45,weights:[['clear',35],['rain',30],['fog',20],['thunderstorm',15]]},
 volcano:{changeChance:.50,weights:[['clear',45],['ash',40],['magicStorm',15]]}
};
export function rollWeather(regionId='field',rng=Math.random){const table=WEATHER_TABLES[regionId]??WEATHER_TABLES.field;const total=table.weights.reduce((s,[,w])=>s+w,0);let r=rng()*total;for(const [id,w] of table.weights){r-=w;if(r<=0)return id;}return table.weights[0][0];}
