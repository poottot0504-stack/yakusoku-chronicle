// Filter inventory candidates without changing owned items, equipped gear, or save data.
export const normalizeEquipmentSearch=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('ja').trim();

export function equipmentMatchesSearch(name,query=''){
 const terms=normalizeEquipmentSearch(query).split(/\s+/).filter(Boolean);
 const normalizedName=normalizeEquipmentSearch(name);
 return terms.every(term=>normalizedName.includes(term));
}

export function equipmentCandidateVisible({category='all',itemCategory,unequipped=false,name='',query=''}) {
 const categoryMatches=category==='all'||category==='unequipped'&&unequipped||category===itemCategory;
 return categoryMatches&&equipmentMatchesSearch(name,query);
}
