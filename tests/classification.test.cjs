const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
function page(items=[]){
  const context=vm.createContext({URLSearchParams,content:{items,topics:new Map([['a',{title:'主題 A',trackId:'track-a'}]])},escapeHtml:value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))});
  const file=path.join(root,'classification.js');
  vm.runInContext(fs.existsSync(file)?fs.readFileSync(file,'utf8'):'',context);
  return context;
}
test('legacy articles have no tags; malformed and duplicate tags are ignored',()=>{
  const p=page(); assert.equal(typeof p.articleTags,'function');
  assert.equal(p.articleTags({}).length,0);
  assert.equal(p.articleTags({tags:'PoC'}).length,0);
  assert.equal(JSON.stringify(p.articleTags({tags:[' PoC ','PoC',null,'',42,'Pilot']})),JSON.stringify(['PoC','Pilot']));
});
test('tag links encode special characters and escape their visible text',()=>{
  const p=page(); assert.equal(typeof p.articleTagsMarkup,'function');
  const html=p.articleTagsMarkup({tags:['R&D','<script>']});
  assert.ok(html.includes('tag=R%26D'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});
test('related articles prefer shared tags then primary subtopic and exclude self and drafts',()=>{
  const item={id:'self',topicId:'a',tags:['PoC'],status:'已核准'};
  const p=page([item,{id:'same',topicId:'a',status:'已核准'},{id:'tag',topicId:'b',tags:['PoC'],status:'已核准'},{id:'both',topicId:'a',tags:['PoC'],status:'已核准'},{id:'draft',topicId:'a',tags:['PoC'],status:'草稿'},{id:'unrelated',topicId:'b',status:'已核准'}]);
  assert.equal(typeof p.relatedArticles,'function');
  assert.equal(JSON.stringify(p.relatedArticles(item).map(x=>x.item.id)),JSON.stringify(['both','tag','same']));
});
test('unrelated and unknown topics do not generate filler recommendations',()=>{
  const p=page([{id:'other',topicId:'unknown',status:'已核准'}]);
  assert.equal(typeof p.relatedArticles,'function');
  assert.equal(p.relatedArticles({id:'self',topicId:'unknown'}).length,0);
});
test('related articles have stable ordering, no duplicates and explain their relation',()=>{
  const item={id:'self',topicId:'a',tags:['PoC']};
  const p=page([{id:'one',topicId:'a',tags:['PoC'],status:'已核准'},{id:'one',topicId:'a',status:'已核准'},{id:'two',topicId:'a',status:'已核准'}]);
  assert.equal(typeof p.relatedArticles,'function');
  const results=p.relatedArticles(item);
  assert.equal(results.length,2);
  assert.ok(results[0].reason.includes('PoC'));
});
