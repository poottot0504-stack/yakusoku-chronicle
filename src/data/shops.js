export const SHOPS={
 starter:{id:'starter',type:'normal',items:[{id:'potion',price:100,stock:Infinity},{id:'antidote',price:150,stock:Infinity},{id:'eyeDrops',price:150,stock:Infinity},{id:'wakeUp',price:200,stock:Infinity},{id:'highPotion',price:500,stock:Infinity},{id:'megaPotion',price:5000,stock:Infinity},{id:'ether',price:800,stock:Infinity},{id:'highEther',price:1500,stock:Infinity},{id:'turboEther',price:8000,stock:Infinity},{id:'elixir',price:100000,stock:Infinity},{id:'phoenixTail',price:250000,stock:Infinity},{id:'forgeCharm',price:5000,stock:Infinity,rare:true}]},
 night:{id:'night',type:'special',items:[{id:'moonHerb',price:200},{id:'shadowCard',price:700},{id:'forgeCharm',price:5000,stock:Infinity}]}
};

const endBands=[200,220,240,260,280,300],weaponTypes=['oneHandSword','greatSword','dagger','fist','staff','greatStaff','spear','axe','bow','mace','dualBlades','katana','instrument','cards'];
SHOPS.endgame={id:'endgame',type:'normal',items:[]};
for(const [i,band] of endBands.entries()){
 const price=18000+i*18000;
 for(const type of weaponTypes)SHOPS.endgame.items.push({id:`end-${band}-shop-${type}`,kind:'equipment',equipmentId:`end-${band}-shop-${type}`,price,stock:Infinity,requiredTrueEnding:true});
 for(const slot of ['shield','head','body','arms','waist','legs','ring','charm'])SHOPS.endgame.items.push({id:`end-${band}-shop-${slot}`,kind:'equipment',equipmentId:`end-${band}-shop-${slot}`,price:Math.round(price*.8),stock:Infinity,requiredTrueEnding:true});
 for(const group of ['magic','thief','fighter','archer'])for(const slot of ['head','body','arms','waist','legs'])SHOPS.endgame.items.push({id:`end-${band}-shop-${group}-${slot}`,kind:'equipment',equipmentId:`end-${band}-shop-${group}-${slot}`,price:Math.round(price*.8),stock:Infinity,requiredTrueEnding:true});
}
