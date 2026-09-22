/* Shared catalogue rules. These deliberately prefer an empty rail to unrelated family content. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.WolfeCatalogueFilters=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const terms={
    series:['series','tv','season','box set','boxset','complete series','netflix','prime','amazon','apple','paramount','disney','max','hbo','hulu','peacock','bbc','itv','sky','showtime','starz','crunchyroll','discovery'],
    kids:['kids','kid','child','children','cartoon','animation','family','disney','pixar','dreamworks','nickelodeon','cbeebies','bluey','peppa','paw patrol','minecraft'],
    unsuitable:['adult','xxx','18+','horror']
  };
  const text=value=>`${value?.categoryName||value?.name||''} ${value?.title||''}`.toLowerCase();
  const has=(value,words)=>words.some(word=>text(value).includes(word));
  const categoryText=category=>String(category?.name||'').toLowerCase();
  const categoryHas=(category,words)=>words.some(word=>categoryText(category).includes(word));
  function titlesForPage(page,items){
    const source=Array.isArray(items)?items:[];
    if(page==='movies'&&source.some(item=>item?.kind))return source.filter(item=>item.kind==='movie');
    if(page==='series'&&source.some(item=>item?.kind))return source.filter(item=>item.kind==='series');
    if(page==='kids')return source.filter(item=>has(item,terms.kids)&&!has(item,terms.unsuitable));
    if(page==='series')return source.filter(item=>has(item,terms.series)&&!has(item,terms.unsuitable));
    if(page==='movies')return source.filter(item=>!has(item,terms.series)&&!has(item,terms.kids));
    return source;
  }
  function categoriesForPage(page,categories){
    const source=Array.isArray(categories)?categories:[];
    if(page==='movies'&&source.some(category=>category?.kind))return source.filter(category=>category.kind==='movie');
    if(page==='series'&&source.some(category=>category?.kind))return source.filter(category=>category.kind==='series');
    if(page==='kids')return source.filter(category=>categoryHas(category,terms.kids)&&!categoryHas(category,terms.unsuitable));
    if(page==='series')return source.filter(category=>categoryHas(category,terms.series)&&!categoryHas(category,terms.unsuitable));
    if(page==='movies')return source.filter(category=>!categoryHas(category,terms.series)&&!categoryHas(category,terms.kids));
    return source;
  }
  return { titlesForPage,categoriesForPage };
});
