function articleTags(item) {
  if (!Array.isArray(item.tags)) return [];
  return [...new Set(item.tags.filter(tag => typeof tag === 'string').map(tag => tag.normalize('NFKC').trim()).filter(tag => tag && tag.length <= 60 && !/[\u0000-\u001f]/.test(tag)))].slice(0, 5);
}
function articleTagsMarkup(item) {
  const tags = articleTags(item);
  return tags.length ? `<nav class="article-tags" aria-label="輔助標籤">${tags.map(tag => `<a href="./?${escapeHtml(new URLSearchParams({tag}).toString())}#all-articles">${escapeHtml(tag)}</a>`).join('')}</nav>` : '';
}
function relatedArticles(item) {
  const tags = new Set(articleTags(item));
  const seen = new Set([item.id]);
  return content.items.filter(other => {
    if (other.status !== '已核准' || seen.has(other.id)) return false;
    seen.add(other.id); return true;
  }).map((other, index) => {
    const shared = articleTags(other).filter(tag => tags.has(tag));
    const sameTopic = content.topics.has(item.topicId) && item.topicId === other.topicId;
    const reasons = [];
    if (shared.length) reasons.push(`共同標籤：${shared.join('、')}`);
    if (sameTopic) reasons.push(`相同子題：${content.topics.get(item.topicId).title}`);
    return {item:other, score:shared.length * 2 + Number(sameTopic), index, reason:reasons.join('；')};
  }).filter(entry => entry.score > 0).sort((a,b) => b.score - a.score || a.index - b.index).slice(0,3);
}
function relatedArticlesMarkup(item) {
  const related = relatedArticles(item);
  return related.length ? `<section class="article-related" aria-labelledby="article-related-title"><h2 id="article-related-title">相關文章</h2><p>依共同標籤與主要子題找到的相關內容。</p>${related.map(entry => `<a href="${articleUrl(entry.item)}"><strong>${escapeHtml(entry.item.title)}</strong><span>${escapeHtml(entry.reason)}</span></a>`).join('')}</section>` : '';
}
