let libraryTopic = '';
let libraryKeyword = '';
let libraryScope = '';
let libraryTag = '';
let libraryTrack = '';
function validLibraryScope(value) {
  return value === 'hpe' || value === 'security' || (typeof value === 'string' && value.startsWith('layer:') && layerMeta[value.slice(6)]) ? value : '';
}
const libraryArrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
function libraryUrl() {
  const params = new URLSearchParams();
  if (libraryTopic) params.set('topic', libraryTopic);
  if (libraryKeyword) params.set('keyword', libraryKeyword);
  if (libraryScope) params.set('scope', libraryScope);
  if (libraryTag) params.set('tag', libraryTag);
  if (libraryTrack) params.set('track', libraryTrack);
  return `./${params.size ? '?' + params : ''}#all-articles`;
}
function libraryReadUrl(item) {
  const params = new URLSearchParams({ article: item.id, from: 'all-articles' });
  if (libraryTopic) params.set('topic', libraryTopic);
  if (libraryKeyword) params.set('keyword', libraryKeyword);
  if (libraryScope) params.set('scope', libraryScope);
  if (libraryTag) params.set('tag', libraryTag);
  if (libraryTrack) params.set('track', libraryTrack);
  return '?' + params;
}
function libraryCount(id) { return content.items.filter(item => item.topicId === id).length; }
function libraryTracks() { return content.tracks.map(track => ({...track, topics:track.topics.filter(topic => libraryCount(topic.id)>0)})); }
function libraryTrackCount(id) { return content.items.filter(item => topicOf(item).trackId === id).length; }
function libraryPage() {
  return `<section id="all-articles-view" class="site-view library-view" hidden aria-labelledby="library-title"><div class="site-container">
    <div class="library-intro"><h1 id="library-title" tabindex="-1">所有文章</h1><p>從感興趣的主題開始，找到適合你的實務內容。</p></div>
    <div class="library-layout"><aside class="library-sidebar" aria-label="文章分類"><h2>依分類瀏覽</h2><button class="library-topic library-all" data-library-topic="" aria-pressed="true"><span>全部文章</span><span>${content.items.length}</span></button>
      ${libraryTracks().map(track => `<details class="library-group" data-library-group="${escapeHtml(track.id)}"><summary data-library-track="${escapeHtml(track.id)}">${escapeHtml(track.title)} <span>${libraryTrackCount(track.id)}</span></summary><p>${escapeHtml(track.subtitle)}</p><div>${track.topics.map(topic => `<button class="library-topic" data-library-topic="${escapeHtml(topic.id)}" aria-pressed="false" title="${escapeHtml(topic.description)}"><span>${escapeHtml(topic.title)}</span><span>${libraryCount(topic.id)}</span></button>`).join('') || '<p>目前沒有已核准文章。</p>'}</div></details>`).join('')}
    </aside><div class="library-main"><div class="library-mobile-filter"><label for="library-theme">主題區</label><select id="library-theme"><option value="">全部主題</option>${libraryTracks().map(track => `<option value="${escapeHtml(track.id)}">${escapeHtml(track.title)}（${libraryTrackCount(track.id)}）</option>`).join('')}</select><label for="library-category">子題</label><select id="library-category"><option id="library-scope-option" value="__scope" hidden></option><option value="">全部子題</option>${libraryTracks().map(track => `<optgroup label="${escapeHtml(track.title)}">${track.topics.map(topic => `<option value="${escapeHtml(topic.id)}">${escapeHtml(topic.title)}（${libraryCount(topic.id)}）</option>`).join('')}</optgroup>`).join('')}</select></div>
      <form id="library-search-form" role="search"><label for="library-search">在文章中搜尋</label><div class="library-search-field"><input id="library-search" type="search" placeholder="搜尋關鍵字，例如：AI Agent、虛擬化" autocomplete="off"><button type="submit">搜尋</button></div></form>
      <div class="library-results-head"><div><p id="library-track" hidden></p><h2 id="library-results-title">全部文章</h2></div><p id="library-count" role="status" aria-live="polite"></p></div>
      <p id="library-description" class="library-description" hidden></p><div id="library-active-filter" hidden></div><div id="library-results" class="library-results"></div>
    </div></div></div></section>`;
}
function renderLibrary() {
  const topic = content.topics.get(libraryTopic);
  const selectedTrack = content.tracks.find(track => track.id === libraryTrack);
  const items = filteredItems(topic ? 'topic:' + libraryTopic : libraryScope || 'all', libraryKeyword).filter(item => (!selectedTrack || topicOf(item).trackId === libraryTrack) && (!libraryTag || articleTags(item).includes(libraryTag)));
  document.querySelectorAll('[data-library-topic]').forEach(button => button.setAttribute('aria-pressed', String(!libraryScope && button.dataset.libraryTopic === libraryTopic && (!!libraryTopic || !libraryTrack))));
  const scopeOption = document.querySelector('#library-scope-option');
  scopeOption.hidden = !libraryScope;
  scopeOption.textContent = libraryScope ? filterTitle(libraryScope) : '';
  document.querySelector('#library-category').value = libraryScope ? '__scope' : libraryTopic;
  document.querySelector('#library-theme').value = libraryTrack;
  document.querySelectorAll('[data-library-group]').forEach(group => { group.open = group.dataset.libraryGroup === (libraryTrack || topic?.trackId); });
  document.querySelectorAll('#library-category optgroup').forEach(group => { group.hidden = !!selectedTrack && group.label !== selectedTrack.title; });
  document.querySelector('#library-search').value = libraryKeyword;
  document.querySelector('#library-results-title').textContent = topic?.title || selectedTrack?.title || (libraryScope ? filterTitle(libraryScope) : libraryTag ? `標籤：${libraryTag}` : '全部文章');
  const track = document.querySelector('#library-track');
  track.hidden = !topic;
  track.textContent = topic?.track || '';
  const description = document.querySelector('#library-description');
  description.hidden = !topic && !selectedTrack;
  description.textContent = topic?.description ? topic.description.split('。')[0] + '。' : selectedTrack?.subtitle || '';
  document.querySelector('#library-count').textContent = `${items.length} 篇文章`;
  const active = document.querySelector('#library-active-filter');
  active.hidden = !libraryKeyword && !libraryTag;
  active.innerHTML = `${libraryTag ? `<span>標籤「${escapeHtml(libraryTag)}」</span><button type="button" data-library-clear="tag">清除標籤</button>` : ''}${libraryKeyword ? `<span>搜尋「${escapeHtml(libraryKeyword)}」</span><button type="button" data-library-clear="keyword">清除搜尋</button>` : ''}`;
  document.querySelector('#library-results').innerHTML = items.length ? items.map(item => `<article class="library-article"><a href="${escapeHtml(libraryReadUrl(item))}"><div class="library-article-meta"><span>${escapeHtml(topicOf(item).track)}</span><span>${escapeHtml(topicOf(item).title)}</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(teaser(item, 145))}</p><span class="library-read">閱讀文章 ${libraryArrow}</span></a>${articleTagsMarkup(item)}</article>`).join('') : `<div class="library-empty"><h3>${libraryKeyword || libraryTag ? '沒有找到相符的文章' : '這個分類還沒有文章'}</h3><p>試試其他分類、標籤或關鍵字。</p><button type="button" data-library-clear="all">查看全部文章</button></div>`;
}
function libraryFromUrl() {
  if (location.hash !== '#all-articles') return;
  const params = new URLSearchParams(location.search);
  libraryTopic = content.topics.has(params.get('topic')) ? params.get('topic') : '';
  libraryKeyword = params.get('keyword') || '';
  libraryScope = libraryTopic ? '' : validLibraryScope(params.get('scope')); 
  libraryTag = (params.get('tag') || '').normalize('NFKC').trim();
  libraryTrack = content.tracks.some(track => track.id === params.get('track')) ? params.get('track') : '';
  if (libraryTopic) libraryTrack = content.topics.get(libraryTopic).trackId;
  renderLibrary();
}
function updateLibrary(topic, keyword, scope = libraryScope, tag = libraryTag, track = libraryTrack) {
  libraryTopic = content.topics.has(topic) ? topic : '';
  libraryScope = libraryTopic ? '' : validLibraryScope(scope);
  libraryKeyword = keyword;
  libraryTag = tag;
  libraryTrack = libraryTopic ? content.topics.get(libraryTopic).trackId : content.tracks.some(item => item.id === track) ? track : '';
  renderLibrary();
  history.pushState(null, '', libraryUrl());
}
function bindLibrary() {
  document.querySelector('#all-articles-view').addEventListener('click', event => {
    const button = event.target.closest('[data-library-topic]');
    if (button) updateLibrary(button.dataset.libraryTopic, libraryKeyword, '', libraryTag, button.dataset.libraryTopic ? libraryTrack : '');
    const theme = event.target.closest('[data-library-track]');
    if (theme) {
      event.preventDefault();
      const group = theme.closest('[data-library-group]');
      if (group?.open && group.dataset.libraryGroup === libraryTrack) group.open = false;
      else updateLibrary('', libraryKeyword, '', libraryTag, theme.dataset.libraryTrack);
    }
    const clear = event.target.closest('[data-library-clear]');
    if (clear) {
      const kind = clear.dataset.libraryClear;
      updateLibrary(kind === 'all' ? '' : libraryTopic, kind === 'keyword' || kind === 'all' ? '' : libraryKeyword, kind === 'all' ? '' : libraryScope, kind === 'tag' || kind === 'all' ? '' : libraryTag, kind === 'all' ? '' : libraryTrack);
    }
  });
  document.querySelector('#library-category').addEventListener('change', event => updateLibrary(event.target.value === '__scope' ? '' : event.target.value, libraryKeyword, event.target.value === '__scope' ? libraryScope : ''));
  document.querySelector('#library-theme').addEventListener('change', event => updateLibrary('', libraryKeyword, '', libraryTag, event.target.value));
  document.querySelector('#library-search-form').addEventListener('submit', event => {
    event.preventDefault(); updateLibrary(libraryTopic, document.querySelector('#library-search').value.trim());
  });
  document.querySelector('#library-search').addEventListener('input', event => {
    if (!event.target.value && libraryKeyword) updateLibrary(libraryTopic, '');
  });
  renderLibrary();
  libraryFromUrl();
  window.addEventListener('popstate', libraryFromUrl);
}
