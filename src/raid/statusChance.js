export const STATUS_CHANCES={poison:.30,paralysis:.18,sleep:.15,confusion:.18,burn:.25,freeze:.15,silence:.20,blind:.22,curse:.15,death:.05};
export function rollStatusEffect(status,rng=Math.random,bonus=0){const base=STATUS_CHANCES[status];if(base==null)return false;return rng()<Math.max(0,Math.min(.95,base+bonus));}
export function rollOneStatus(statuses=[],rng=Math.random,bonus=0){for(const status of statuses)if(rollStatusEffect(status,rng,bonus))return status;return null;}
