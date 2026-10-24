// Lightweight check against the static Worker build manifest. All versions
// are hashes of the deployed public assets, not any save/character information.
export function validGameBuildId(value){
 return typeof value==='string'&&/^[a-f0-9]{24}$/.test(value);
}
export function isGameUpdateAvailable(loadedId,remoteId){
 return validGameBuildId(loadedId)&&validGameBuildId(remoteId)&&loadedId!==remoteId;
}
export async function fetchLatestGameBuild(fetchImpl=globalThis.fetch?.bind(globalThis),nonce=Date.now()){
 if(typeof fetchImpl!=='function')throw new Error('更新確認を利用できません');
 const response=await fetchImpl(`./build-version.json?check=${Number(nonce)||0}`,{
  method:'GET',cache:'no-store',credentials:'same-origin'
 });
 if(!response.ok)throw new Error('更新情報を確認できません');
 const result=await response.json();
 if(!validGameBuildId(result?.buildId))throw new Error('更新情報が不正です');
 return result.buildId;
}
