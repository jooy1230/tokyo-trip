(() => {
 'use strict';
 const T=window.TRIP, $=s=>document.querySelector(s), fmt=n=>Math.round(n).toLocaleString('ko-KR');
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const key='our-days-tokyo-2026-v1'; let saved={};
 try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch(e){}
 const defaults={fx:9.5,budget:{hotel:53475,flight:883600,transport:10540,ticket:21800,dpa:5000,extra:3000,sky:6800,food:32000,dinner:20000,cafe:8000,buffer:10000,shopping:0},enabled:{dpa:false,extra:false,sky:false},checks:{},favorites:[]};
 const state={...defaults,...saved,budget:{...defaults.budget,...saved.budget},enabled:{...defaults.enabled,...saved.enabled},checks:{...saved.checks},favorites:Array.isArray(saved.favorites)?saved.favorites:[]};
 if((saved.bookingRevision||0)<2){
  state.budget.hotel=defaults.budget.hotel;
  state.budget.flight=defaults.budget.flight;
  if(!saved.budget || saved.budget.transport===9540) state.budget.transport=defaults.budget.transport;
  state.enabled.sky=false;
  state.bookingRevision=2;
 }
 if((saved.bookingRevision||0)<3){
  state.budget.hotel=defaults.budget.hotel;
  if([9400,9540].includes(state.budget.transport))state.budget.transport=defaults.budget.transport;
  delete state.checks.hotel;
  state.bookingRevision=3;
 }
 if(!Number.isFinite(state.fx)||state.fx<=0)state.fx=9.5;
 for(const k in defaults.budget)if(!Number.isFinite(state.budget[k])||state.budget[k]<0)state.budget[k]=defaults.budget[k];
 // One source amount per display; conversions always use the current planning rate.
 const amountPattern=/(?:[¥₩][\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?\s*(?:만\s*)?(?:원|엔))/g;
 function dualAmount(value,currency){return currency==='JPY'?`¥${fmt(value)} (약 ₩${fmt(value*state.fx)})`:`₩${fmt(value)} (약 ¥${fmt(value/state.fx)})`;}
 function refreshCurrencyDisplays(){
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode(node){return node.parentElement.closest('script,style,textarea,.settings,[data-currency-skip],.currency-pair')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;}});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(node=>{const text=node.nodeValue;amountPattern.lastIndex=0;const matches=[...text.matchAll(amountPattern)];if(!matches.length)return;const fragment=document.createDocumentFragment();let offset=0;
   matches.forEach(m=>{fragment.append(document.createTextNode(text.slice(offset,m.index)));const label=m[0],currency=label.includes('¥')||label.endsWith('엔')?'JPY':'KRW';const value=Number(label.replace(/[^0-9.]/g,''))*(label.includes('만')?10000:1);const pair=document.createElement('span');pair.className='currency-pair';pair.dataset.amount=value;pair.dataset.currency=currency;const primary=document.createElement('span');primary.textContent=label;const secondary=document.createElement('span');secondary.className='currency-converted';pair.append(primary,secondary);fragment.append(pair);offset=m.index+label.length;});fragment.append(document.createTextNode(text.slice(offset)));node.replaceWith(fragment);
  });
  document.querySelectorAll('.currency-pair').forEach(el=>{const value=Number(el.dataset.amount);el.lastElementChild.textContent=el.dataset.currency==='JPY'?` (약 ₩${fmt(value*state.fx)})`:` (약 ¥${fmt(value/state.fx)})`;});
  document.querySelectorAll('[data-input-conversion]').forEach(el=>{const k=el.dataset.inputConversion;const row=rows.find(r=>r[0]===k);el.textContent=row[2]==='JPY'?`약 ₩${fmt(state.budget[k]*state.fx)}`:`약 ¥${fmt(state.budget[k]/state.fx)}`;});
 }
 let day=0,routeDay=0,shopFilter='전체';
 const persist=()=>{try{localStorage.setItem(key,JSON.stringify(state));}catch(e){}};
 const map=q=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q);
 const external=(url,text,cls='maplink')=>`<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`;
 function toast(s){$('#toast').textContent=s;$('#toast').hidden=false;setTimeout(()=>$('#toast').hidden=true,2400);}
 function timeline(d){return `<div class="daytitle"><h3>${esc(d.label)}</h3><span class="pill">${d.date} ${d.week}</span></div><ol class="timeline">${d.stops.map(s=>`<li class="stop"><time>${esc(s[0])}</time><div class="stopbody"><h4>${esc(s[1])}</h4><p>${esc(s[2])}</p>${external(map(s[3]),'지도에서 보기 ↗')}</div></li>`).join('')}</ol>`;}
 function renderDay(){
 $('#days').innerHTML=T.days.map(d=>`<button class="day ${d.id===day?'selected':''}" role="tab" id="day-${d.id}" aria-selected="${d.id===day}" aria-controls="daycontent" tabindex="${d.id===day?0:-1}" data-day="${d.id}"><span class="day-watermark" aria-hidden="true">${String(d.id+1).padStart(2,'0')}</span><small>DAY 0${d.id+1} / ${d.week}</small><b>${d.date}</b><span>${esc(d.sub.split(' · ')[0])}</span></button>`).join('');
 $('#daycontent').innerHTML=timeline(T.days[day]);$('#daycontent').setAttribute('aria-labelledby',`day-${day}`);
 $('#dayfare').textContent='¥'+fmt(T.days[day].fare*2);routeDay=day;renderRoutes();
 }
 $('#days').addEventListener('click',e=>{const b=e.target.closest('[data-day]');if(b){day=+b.dataset.day;renderDay();refreshCurrencyDisplays();}});
 $('#days').addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();day=(day+(e.key==='ArrowRight'?1:3))%4;renderDay();refreshCurrencyDisplays();$(`#day-${day}`).focus();}});
 $('#collapseDays').insertAdjacentHTML('beforebegin', T.days.map(d=>`<article class="itinerary-card">${timeline(d)}</article>`).join(''));
 $('#allDays').onclick=()=>{const el=$('#fullItinerary');el.hidden=!el.hidden;$('#allDays').setAttribute('aria-expanded',String(!el.hidden));$('#allDays').textContent=el.hidden?'4일 전체 펼쳐보기 +':'전체 일정 접기 −';};
 $('#collapseDays').onclick=()=>{
  $('#allDays').click();
  const selectedDay=$('#days [aria-selected="true"]');
  selectedDay.focus({preventScroll:true});
  $('#days').scrollIntoView({block:'start'});
 };
 function routeLink(title){
 const points={'도쿄 오페라시티':'Tokyo Opera City','하쓰다이':'Hatsudai Station','나리타공항 제2·3터미널역':'Narita Airport Terminal 2 3 Station','공항 제2·3터미널역':'Narita Airport Terminal 2 3 Station','신바시':'Shimbashi Station Tokyo','신바시역':'Shimbashi Station Tokyo','호텔':T.hotel,'히가시니혼바시':'Higashi-nihombashi Station','바쿠로초':'Bakurocho Station','바쿠로요코야마':'Bakuro-yokoyama Station','히가시긴자':'Higashi-ginza Station','마루노우치':'Marunouchi Naka-dori Tokyo','도쿄역':'Tokyo Station Japan','도쿄':'Tokyo Station Japan','가이엔마에':'Gaiemmae Station Tokyo','가이엔':'Meiji Jingu Gaien Ginkgo Avenue','시부야':'Shibuya Station Tokyo','롯폰기':'Roppongi Station Tokyo','시오도메':'Shiodome Station Tokyo','마이하마':'Maihama Station Japan','마이하마역':'Maihama Station Japan','디즈니랜드':'Tokyo Disneyland','아사쿠사':'Sensoji Temple Tokyo','구라마에':'Kuramae Asakusa Line Station Tokyo','nobori':'Douguya nobori 3-7-1 Kotobuki','proto':'proto 4-20-12 Kuramae'};
 const parts=title.split('→').map(v=>v.trim());const walk=['도쿄역 → 긴자 → 히가시긴자','도쿄역 → 황궁 외원 → 히가시긴자','히가시니혼바시 → 호텔','히가시긴자 → 긴자 매장 → 마루노우치','가이엔 → 오모테산도 → 시부야','마이하마역 → 디즈니랜드','아사쿠사 → nobori → proto'].includes(title);
 return 'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(points[parts[0]]||parts[0]+' Tokyo Japan')+'&destination='+encodeURIComponent(points[parts[parts.length-1]]||parts[parts.length-1]+' Tokyo Japan')+(title.includes('황궁 외원')?'&waypoints='+encodeURIComponent('Nijubashi Bridge Tokyo|GINZA SIX'):'')+'&travelmode='+(walk?'walking':'transit');
 }
 function renderRoutes(){
 $('#routeControls').innerHTML=[...T.days.map(d=>`<button class="chip ${routeDay===d.id?'on':''}" data-route="${d.id}" aria-pressed="${routeDay===d.id}">${d.date}</button>`),`<button class="chip ${routeDay===-1?'on':''}" data-route="-1" aria-pressed="${routeDay===-1}">전체 구간</button>`].join('');
 const days=routeDay===-1?T.days:[T.days[routeDay]];
 $('#routes').innerHTML=days.flatMap(d=>[...(routeDay===-1?[`<tr><td colspan="4" style="text-align:left;background:#e8eadf;padding:10px;font-size:12px">DAY 0${d.id+1} · ${d.date} / 2인 ¥${fmt(d.fare*2)}</td></tr>`]:[]),...d.routes.map(r=>`<tr><td>${esc(r[0])}<small>${external(routeLink(r[0]),'지도 경로 검색 ↗')}</small></td><td>${esc(r[1])}<small>${esc(r[2])}</small><small>${esc(r[5])}</small></td><td><span class="yen">¥${r[3]}</span></td><td><span class="yen">¥${fmt(r[4]*2)}</span></td></tr>`)]).join('');
 }
 $('#routeControls').onclick=e=>{const b=e.target.closest('[data-route]');if(b){routeDay=+b.dataset.route;renderRoutes();refreshCurrencyDisplays();}};
 const rows=[
 ['hotel','숙박 · 3박','JPY','APA 니혼바시 바쿠로요코야마 · 두 사람 3박','제시 총액'],
 ['flight','항공권 · 왕복 2인','KRW','2인 총운임 893,600원에서 쿠폰 10,000원을 뺀 간편결제액','결제 확인'],
 ['transport','교통 · 전체 4일','JPY','APA 기준 날짜별 기본 경로 합계 · 예상 운임','운임 참고'],
 ['ticket','디즈니랜드 · 입장권','JPY','11/30 성인 10,900엔 × 2명','공식 공지'],
 ['dpa','미녀와 야수 · DPA 2매','JPY','기본 미포함. 일반 대기 우선, 필요할 때만 체크해 포함','선택 예산'],
 ['extra','추가 기구 · DPA 2매','JPY','1,500엔 기구 × 2명 가정. 원할 때 포함','선택'],
 ['sky','SHIBUYA SKY · 2인','JPY','15시 이후 웹 3,400엔 × 2명 참고. 예약 화면 확인','선택'],
 ['food','일반 식사 · 두 사람','JPY','4일 예상. 디즈니 식사 포함, 기념일 저녁·카페 별도','예상'],
 ['dinner','기념일 저녁 · 2인','JPY','우나후지 저녁 · 두 사람 식사와 음료에 잡은 예산','예상'],
 ['cafe','카페·간식 · 두 사람','JPY','4일 예상. 디즈니 간식도 이 항목에서 사용','예상'],
 ['buffer','예비비 · 두 사람','JPY','추가 이동·택시·가격 변동 등. 실제 사용액 아님','예상'],
 ['shopping','쇼핑 · 두 사람','JPY','명품·빈티지·그릇·디즈니 굿즈. 원하는 한도 입력','별도 예산']
 ];
 function enabled(k){return !['dpa','extra','sky'].includes(k)||state.enabled[k];}
 function renderBudget(){
 $('#fx').value=state.fx;
 $('#budgetrows').innerHTML=rows.map(([k,title,currency,note,type])=>`<tr><td><label>${['dpa','extra','sky'].includes(k)?`<input type="checkbox" data-enable="${k}" ${state.enabled[k]?'checked':''} aria-label="${esc(title)} 예산 포함">`:''}<span>${esc(title)} <span class="badge ${['공식 공지','운임 참고'].includes(type)?'':'est'}">${type}</span><small>${esc(note)}</small></span></label></td><td><input class="costinput" inputmode="numeric" type="number" min="0" max="1000000000" step="${currency==='KRW'?'1000':'100'}" data-cost="${k}" value="${state.budget[k]}" aria-label="${esc(title)} ${currency==='KRW'?'원':'엔'}"><small>${currency==='KRW'?'KRW · 원':'JPY · 엔'}</small><small class="input-conversion" data-currency-skip data-input-conversion="${k}"></small></td></tr>`).join('');
 updateTotal();
 }
 function totals(){const breakdown=rows.filter(r=>enabled(r[0])).map(r=>({id:r[0],title:r[1],value:state.budget[r[0]]*(r[2]==='JPY'?state.fx:1)}));return {breakdown,total:breakdown.reduce((s,r)=>s+r.value,0)};}
 function updateTotal(){
 const {breakdown,total}=totals();$('#totalKRW').textContent='₩'+fmt(total);$('#perperson').textContent='₩'+fmt(total/2);
 $('#budgetbasis').textContent='성인 2명 · 3박 4일'+(state.budget.flight===0?' · 항공권 미포함':' · 항공권 포함')+(state.budget.shopping===0?' · 쇼핑비 미입력':' · 쇼핑 예산 포함');
 $('#hotelcheck').textContent=state.budget.hotel*state.fx<=900000?'90만 원 이내 ✓':'₩'+fmt(state.budget.hotel*state.fx-900000)+' 초과';$('#hotelcheck').style.color=state.budget.hotel*state.fx<=900000?'#c0d1a8':'#ffb2a0';
 const groups=[['숙박',state.budget.hotel*state.fx,'#adbda0'],['교통',state.budget.transport*state.fx,'#8ca4b0'],['디즈니·전망대',(state.budget.ticket+(enabled('dpa')?state.budget.dpa:0)+(enabled('extra')?state.budget.extra:0)+(enabled('sky')?state.budget.sky:0))*state.fx,'#d7b76a'],['식사·카페',(state.budget.food+state.budget.dinner+state.budget.cafe)*state.fx,'#c98062'],['항공·쇼핑·예비비',state.budget.flight+(state.budget.shopping+state.budget.buffer)*state.fx,'#989184']];
 $('#budgetbar').innerHTML=groups.map(g=>`<div style="width:${total?g[1]/total*100:0}%;background:${g[2]}"></div>`).join('');
 $('#summaryRows').innerHTML=groups.map(g=>`<div class="summaryrow"><span><i style="display:inline-block;width:6px;height:6px;background:${g[2]};margin-right:8px;border-radius:50%"></i>${g[0]}</span><b>₩${fmt(g[1])}</b></div>`).join('');
 refreshCurrencyDisplays();persist();
 }
 $('#budgetrows').addEventListener('input',e=>{if(e.target.dataset.cost){const raw=Number(e.target.value);state.budget[e.target.dataset.cost]=Math.max(0,Math.min(1000000000,Number.isFinite(raw)?raw:0));updateTotal();}});
 $('#budgetrows').addEventListener('change',e=>{if(e.target.dataset.enable){state.enabled[e.target.dataset.enable]=e.target.checked;updateTotal();}});
 $('#fx').oninput=e=>{const n=Number(e.target.value);if(n>0&&n<=100){state.fx=n;updateTotal();}};
 $('#resetBudget').onclick=()=>{state.budget={...defaults.budget};state.enabled={...defaults.enabled};state.fx=defaults.fx;renderBudget();toast('예산을 기본값으로 되돌렸어요');};
 $('#copyBudget').onclick=async()=>{const {breakdown,total}=totals();const text=['도쿄 기념일 여행 · 성인 2명 · 2026.11.28~12.1',`계획 환산 기준: 1엔 = ${state.fx}원 (실시간 아님)`,...breakdown.map(r=>`${r.title}: ${dualAmount(r.value,'KRW')}`),`합계: ${dualAmount(total,'KRW')}`,state.budget.flight===0?'항공권 미입력·합계 제외':'항공권 입력액 포함',state.budget.shopping===0?'쇼핑 예산 미입력':'쇼핑 예산 포함','숙박은 제시된 총액, 항공은 실결제 기준. 식비·교통·입장권은 계획 예산.'].join('\n');try{await navigator.clipboard.writeText(text);toast('예산 요약을 복사했어요');}catch(e){const ta=document.createElement('textarea');ta.value=text;document.body.append(ta);ta.select();try{document.execCommand('copy');toast('예산 요약을 복사했어요');}catch(err){toast('브라우저에서 복사를 허용해 주세요');}ta.remove();}};
 $('#rides').innerHTML=T.rides.map((r,i)=>`<article class="ride ${i===0?'top':''}"><span class="rideno">${r[0]}</span><h4>${esc(r[1])}</h4><div class="english">${esc(r[2])}</div><p>${esc(r[3])}</p><div class="ridefoot"><span>${esc(r[4])}</span><b>DPA ¥${fmt(r[5])} / 1인</b></div><small class="subtle" style="font-size:10px">${esc(r[6])}</small></article>`).join('');
 function renderShops(){const types=['전체','리유스','빈티지','그릇','디자인','패션','커피·디저트','위스키','맛집','저장한 곳'];$('#shopfilters').innerHTML=types.map(t=>`<button class="chip ${t===shopFilter?'on':''}" data-filter="${t}" aria-pressed="${t===shopFilter}">${t==='저장한 곳'?'♡ ':''}${t}</button>`).join('');const list=T.shops.map((s,i)=>({s,i})).filter(({s,i})=>shopFilter==='전체'||shopFilter==='저장한 곳'&&state.favorites.includes(i)||s[1]===shopFilter);$('#shopsgrid').innerHTML=list.length?list.map(({s,i})=>`<article class="shopcard"><div class="shophead"><span class="badge ${s[1]==='빈티지'?'red':''}">${esc(s[1])} · ${esc(s[4])}</span><button class="save ${state.favorites.includes(i)?'saved':''}" data-save="${i}" aria-label="${esc(s[0])} 저장" aria-pressed="${state.favorites.includes(i)}">${state.favorites.includes(i)?'♥':'♡'}</button></div><h3>${esc(s[0])}</h3><p>${esc(s[2])}</p><address>${esc(s[3])}</address>${s[7]?`<div class="taxnote"><b>${esc(s[7].status)}</b><p>${esc(s[7].note)}</p><a href="#taxrefund">면세·환급 절차 보기</a></div>`:''}<div class="shoplinks">${external(map(s[6]),'지도 ↗')}${external(s[5],'공식 안내 ↗')}</div></article>`).join(''):'<p class="subtle">아직 저장한 매장이 없어요. 마음에 드는 곳의 ♡를 눌러보세요.</p>';}
 $('#shopfilters').onclick=e=>{const b=e.target.closest('[data-filter]');if(b){shopFilter=b.dataset.filter;renderShops();}};
 $('#shopsgrid').onclick=e=>{const b=e.target.closest('[data-save]');if(b){const n=+b.dataset.save;state.favorites=state.favorites.includes(n)?state.favorites.filter(i=>i!==n):[...state.favorites,n];persist();renderShops();}};
 const checks=[['taxrefund','면세 등록·환급 수단 확인','여권 원본·영수증·반출할 전 품목 준비 · 수하물 위탁 전 세관 확인'],['hotel','호텔 바우처 저장','APA 11/28~12/1 · 예약 확정 후 바우처 저장'],['ticket','11/30 디즈니랜드 티켓','공식 날짜 지정 입장권. 디즈니씨와 구분'],['app','디즈니 앱·두 사람 그룹 연결','일반 대기시간 확인 · DPA는 선택 · 보조배터리'],['sky','시부야 스카이 · 기본 일정 제외','17시 저녁 예약 우선. 추가하려면 오후 산책·쇼핑과 교체'],['dinner','11/29 우나후지 예약 내역 저장','17:00~19:00 예약 확정 · 오페라시티 53층 · 16:50 도착'],['fare','Suica/PASMO·출발일 경로 확인','열차 시각과 직통 여부는 출발일 기준으로'],['shops','매장 임시휴무·재고 확인','ELEPHANT 일요일 / proto 화요일 12시'],['return','12/1 공항 이동편 확인','14:30 호텔 출발 · 16:30 제3터미널 목표 · 짐 맡기기 전 면세 확인'],['packing','파크와 그릇 쇼핑 준비','겉옷·편한 신발·보조배터리·완충 포장'],['passport','여권·항공편·짐 확인','공항 터미널·수하물 조건·입국 준비']];
 function renderChecks(){$('#checklist').innerHTML=checks.map(([id,title,note])=>`<label class="checkitem ${state.checks[id]?'done':''}"><input type="checkbox" data-check="${id}" ${state.checks[id]?'checked':''}><span>${esc(title)}<small>${esc(note)}</small></span></label>`).join('');}
 $('#checklist').onchange=e=>{if(e.target.dataset.check){state.checks[e.target.dataset.check]=e.target.checked;persist();renderChecks();refreshCurrencyDisplays();}};
 $('#sourceslist').innerHTML=T.sources.map(s=>`<div class="source">${external(s[1],s[0]+' ↗','')}<p>${esc(s[2])}</p></div>`).join('');
 let printHidden=true,printFilter='전체';window.addEventListener('beforeprint',()=>{printHidden=$('#fullItinerary').hidden;$('#fullItinerary').hidden=false;$('#daycontent').hidden=true;printFilter=shopFilter;shopFilter='전체';renderShops();});window.addEventListener('afterprint',()=>{$('#fullItinerary').hidden=printHidden;$('#daycontent').hidden=false;shopFilter=printFilter;renderShops();});$('#print').onclick=()=>window.print();
 const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+entry.target.id));}});},{rootMargin:'-12% 0px -65% 0px',threshold:0});document.querySelectorAll('main>section[id]').forEach(s=>observer.observe(s));
 renderDay();renderBudget();renderShops();renderChecks();refreshCurrencyDisplays();
})();
