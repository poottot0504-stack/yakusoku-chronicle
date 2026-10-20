// Numeric-keyboard-friendly, comma-grouped G prices shared by both market inputs.
// The server still receives a plain integer; market-model validates 1..30,000,000.
export function marketPriceDigits(value=''){
 return String(value??'').replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)).replace(/[^0-9]/g,'');
}
export function formatMarketPrice(value=''){
 return marketPriceDigits(value).replace(/\B(?=(\d{3})+(?!\d))/g,',');
}
export function parseMarketPrice(value=''){
 const digits=marketPriceDigits(value);
 return digits?Number(digits):0;
}
export function marketPriceCursor(value='',start=0){
 const before=marketPriceDigits(String(value).slice(0,Math.max(0,start))).length;
 const output=formatMarketPrice(value);
 let digits=0,cursor=0;
 while(cursor<output.length&&digits<before){if(output.charCodeAt(cursor)>=48&&output.charCodeAt(cursor)<=57)digits++;cursor++;}
 return before===0?0:cursor;
}
export function formatMarketPriceField(input){
 if(!input)return;
 const original=input.value??'',cursor=input.selectionStart;
 const formatted=formatMarketPrice(original);
 if(original===formatted)return;
 input.value=formatted;
 if(cursor!==null&&Number.isFinite(cursor)&&typeof input.setSelectionRange==='function'){
  const position=marketPriceCursor(original,cursor);
  input.setSelectionRange(position,position);
 }
}
