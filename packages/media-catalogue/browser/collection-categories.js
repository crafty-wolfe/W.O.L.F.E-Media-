/* Presentation only: never changes the supplier's movie/series classification. */
(function(root){
  function isMovieCollection(category){
    if(category.kind && category.kind!=='movie')return false;
    const name=String(category.name||'').toLowerCase().replace(/\b(?:4k|vod)\b/g,'').replace(/[|_]/g,' ').replace(/\s+/g,' ').trim();
    if(!name)return false;
    if(/\b(collection|saga|trilogy|anthology|franchise)\b/.test(name))return true;
    if(/^(?:(?:19|20)\d{2}(?:\s*[-–]\s*(?:19|20)?\d{2})?|\d{2}s)$/.test(name))return false;
    if(/^(english|hindi|hollywood|telugu|tamil|malayalam|kannada|punjabi|bangla|marathi|gujarati|pakistani|multiaudio|multi audio)\b/.test(name))return false;
    if(/^(adventure|action|animation|comedy|crime|documentar(?:y|ies)|drama|family|fantasy|history|music|mystery|romance|science fiction|sci[- ]fi|thriller|tv movie|war|western|horror|kids|sports replays|quran majeed|recently added|new releases|trending|all movies)$/.test(name))return false;
    if(/^fifa world cup\b/.test(name))return false;
    return true;
  }
  const api={isMovieCollection};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.WolfeCollections=api;
})(typeof globalThis!=='undefined'?globalThis:this);
