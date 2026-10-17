const $ = (id) => document.getElementById(id);
const form = $('homeworkForm');
const entryView = $('entryView');
const listView = $('listView');
const dashboardView = $('dashboardView');
const subjectInput = $('subject');
const assignmentLabel = $('assignmentLabel');
let assignments = [];
let game = { xp: 0, completionLog: [], xpDate: '', xpToday: 0, noHomeworkDate: '', adminAllAchievements: false };
let selectedDay = '';

function updateAssignmentLabel() { assignmentLabel.textContent = `Homework for ${subjectInput.value.trim() || 'Class'}:`; }
subjectInput.addEventListener('input', updateAssignmentLabel);
subjectInput.addEventListener('change', updateAssignmentLabel);
function showView(which) {
  const view = which === 'list' ? 'list' : which === 'entry' ? 'entry' : 'dashboard';
  dashboardView.classList.toggle('hidden', view !== 'dashboard');
  entryView.classList.toggle('hidden', view !== 'entry');
  listView.classList.toggle('hidden', view !== 'list');
  $('dashboardNav').classList.toggle('active', view === 'dashboard');
  $('entryNav').classList.toggle('active', view === 'entry');
  $('listNav').classList.toggle('active', view === 'list');
  if (view === 'list') renderList();
  if (view === 'dashboard') renderDashboard();
  window.scrollTo({top: 0, behavior: 'smooth'});
}
async function loadAssignments() {
  let savedAssignments = [];
  let savedGame = {xp:0, completionLog:[]};
  try { savedAssignments = JSON.parse(localStorage.getItem('homeworkAssignments') || '[]'); } catch { savedAssignments = []; }
  try { savedGame = JSON.parse(localStorage.getItem('homeworkGame') || '{\"xp\":0,\"completionLog\":[]}'); } catch { savedGame = {xp:0, completionLog:[]}; }
  assignments = Array.isArray(savedAssignments) ? savedAssignments.map(item => ({...item, completed: Boolean(item.completed)})) : [];
  game = savedGame && typeof savedGame === 'object' ? savedGame : {xp:0, completionLog:[]};
  game.xp = Number(game.xp) || 0;
  game.completionLog = Array.isArray(game.completionLog) ? game.completionLog : [];
  updateCount(); renderStats(); renderDashboard();
}
async function saveAssignments() { localStorage.setItem('homeworkAssignments', JSON.stringify(assignments)); localStorage.setItem('homeworkGame', JSON.stringify(game)); updateCount(); }
function updateCount() { $('count').textContent = String(assignments.filter(a => !a.completed).length); }
function formatDate(value, options={month:'short',day:'numeric'}) {
  if (!value) return 'No date'; const [year,month,day]=value.split('-').map(Number);
  return new Date(year,month-1,day).toLocaleDateString(undefined,options);
}
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function parseDate(value) { if(!value) return null; const [y,m,d]=value.split('-').map(Number); return new Date(y,m-1,d); }
function dateStatus(value) {
  if(!value) return ''; const today=dateKey(new Date()); const t=new Date(); t.setDate(t.getDate()+1); const tomorrow=dateKey(t);
  if(value<today)return 'OVERDUE'; if(value===today)return 'DUE TODAY'; if(value===tomorrow)return 'DUE SOON'; return '';
}
function priorityRank(item) { if(item.completed)return 5; const s=dateStatus(item.dueDate); if(s==='OVERDUE')return 0; if(s==='DUE TODAY')return 1; if(s==='DUE SOON')return 2; return 3; }
function prioritySort(a,b) { return priorityRank(a)-priorityRank(b) || (a.dueDate||'9999').localeCompare(b.dueDate||'9999') || Number(a.period)-Number(b.period); }
function makeCell(className,text) { const el=document.createElement('div'); el.className=className; el.textContent=text; return el; }
function renderStats() {
  const total=assignments.length, completed=assignments.filter(a=>a.completed).length;
  const overdue=assignments.filter(a=>!a.completed&&a.dueDate&&a.dueDate<dateKey(new Date())).length;
  $('statTotal').textContent=total; $('statCompleted').textContent=completed; $('statOverdue').textContent=overdue; $('statRemaining').textContent=total-completed;
  const percent=total?Math.round(completed/total*100):0; $('completionPercent').textContent=`${percent}%`; $('completionBar').style.width=`${percent}%`; $('completionProgress').setAttribute('aria-valuenow',String(percent));
  $('progressCaption').textContent=total?`${completed} of ${total} assignments completed${percent===100?' — all done, great work!':'.'}`:'Add homework to start tracking your progress.';
}
function weekDates() {
  const today=new Date(); today.setHours(0,0,0,0); const monday=new Date(today); monday.setDate(today.getDate()-((today.getDay()+6)%7));
  return Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return d;});
}
function currentStreak() {
  const days=[...new Set(game.completionLog)].sort(); if(!days.length)return 0;
  const today=dateKey(new Date()); const yesterdayDate=new Date(); yesterdayDate.setDate(yesterdayDate.getDate()-1); const yesterday=dateKey(yesterdayDate);
  let cursor=days.includes(today)?today:days.includes(yesterday)?yesterday:null; if(!cursor)return 0;
  let streak=0; while(days.includes(cursor)){streak++;const d=parseDate(cursor);d.setDate(d.getDate()-1);cursor=dateKey(d);} return streak;
}
function awardXp(amount, bypassCap=false) {
  const today=dateKey(new Date()); if(game.xpDate!==today){game.xpDate=today;game.xpToday=0;}
  const award=bypassCap?amount:Math.min(amount,Math.max(0,30-game.xpToday));
  game.xp+=award; if(!bypassCap)game.xpToday+=award; return award;
}
function renderGame() {
  const todayKey=dateKey(new Date()); if(game.xpDate!==todayKey){game.xpDate=todayKey;game.xpToday=0;}
  const xp=game.xp, level=Math.floor(xp/100)+1, into=xp%100;
  $('xpTotal').textContent=`${xp} XP`; $('levelPill').textContent=`LEVEL ${level}`; $('xpBar').style.width=`${into}%`; $('xpCaption').textContent=`${into} / 100 XP to level ${level+1}`;
  const streak=currentStreak(); $('streakValue').textContent=`${streak} day${streak===1?'':'s'} streak`;
  const completed=assignments.filter(a=>a.completed).length;
  const achievements=[
    {id:'first',icon:'★',name:'First Steps',desc:'Complete your first assignment',ok:completed>=1},
    {id:'five',icon:'⚡',name:'Getting It Done',desc:'Complete 5 assignments',ok:completed>=5},
    {id:'ten',icon:'🏆',name:'Homework Hero',desc:'Complete 10 assignments',ok:completed>=10},
    {id:'streak3',icon:'🔥',name:'On a Roll',desc:'Build a 3-day streak',ok:streak>=3},
    {id:'perfect',icon:'✓',name:'All Clear',desc:'Finish every saved assignment',ok:assignments.length>0&&completed===assignments.length},
    {id:'xp250',icon:'✦',name:'XP Collector',desc:'Earn 250 XP',ok:xp>=250}
  ];
  $('dailyXpStatus').textContent=`${Math.min(30,game.xpToday)} / 30 XP earned today${game.xpToday>=30?' — daily limit reached':''}`;
  const noHomeworkUsed=game.noHomeworkDate===todayKey; $('noHomeworkBtn').disabled=noHomeworkUsed; $('noHomeworkBtn').textContent=noHomeworkUsed?'Streak saved today ✓':'No Homework 🎉'; $('streakHint').textContent=noHomeworkUsed?'Today’s streak is safely recorded':'Complete homework or use this on a homework-free day';
  const grid=$('achievementGrid');grid.replaceChildren();for(const a of achievements){const unlocked=a.ok||game.adminAllAchievements;const card=document.createElement('div');card.className=`achievement${unlocked?' unlocked':''}`;const icon=document.createElement('span');icon.className='achievement-icon';icon.textContent=a.icon;const name=document.createElement('strong');name.textContent=a.name;const desc=document.createElement('p');desc.textContent=a.desc;card.append(icon,name,desc);grid.append(card);}
}
function renderDashboard() {
  if(!$('weekDays'))return;
  const dates=weekDates(), start=dateKey(dates[0]), end=dateKey(dates[6]), today=dateKey(new Date());
  $('weekRange').textContent=`${formatDate(start,{month:'long',day:'numeric'})} – ${formatDate(end,{month:'long',day:'numeric',year:'numeric'})}`;
  const dueWeek=assignments.filter(a=>a.dueDate>=start&&a.dueDate<=end), doneThisWeek=assignments.filter(a=>a.completed&&a.completedAt&&a.completedAt>=start&&a.completedAt<=end).length;
  $('weekTotal').textContent=dueWeek.length; $('weekCompleted').textContent=doneThisWeek; $('dashOverdue').textContent=assignments.filter(a=>!a.completed&&a.dueDate&&a.dueDate<today).length;
  $('dashPercent').textContent=`${assignments.length?Math.round(assignments.filter(a=>a.completed).length/assignments.length*100):0}%`;
  const days=$('weekDays');days.replaceChildren();if(!selectedDay||selectedDay<start||selectedDay>end)selectedDay=today;
  for(const d of dates){const key=dateKey(d), items=assignments.filter(a=>a.dueDate===key),btn=document.createElement('button');btn.type='button';btn.className=`week-day${key===today?' today':''}${key===selectedDay?' selected':''}`;
    const weekday=document.createElement('span');weekday.className='day-name';weekday.textContent=d.toLocaleDateString(undefined,{weekday:'short'});const num=document.createElement('strong');num.textContent=d.getDate();const count=document.createElement('span');count.className='day-count';count.textContent=items.length?`${items.length} due`:'—';const dots=document.createElement('span');dots.className='day-dots';for(let i=0;i<Math.min(items.length,4);i++){const dot=document.createElement('i');dots.append(dot);}btn.append(weekday,num,count,dots);btn.addEventListener('click',()=>{selectedDay=key;renderDashboard();});days.append(btn);}
  const detail=$('dayDetail');detail.replaceChildren();const title=document.createElement('div');title.className='day-detail-title';title.textContent=selectedDay===today?'Today · '+formatDate(selectedDay,{weekday:'long',month:'short',day:'numeric'}):formatDate(selectedDay,{weekday:'long',month:'short',day:'numeric'});detail.append(title);
  const dayItems=assignments.filter(a=>a.dueDate===selectedDay).sort(prioritySort);
  if(!dayItems.length){const empty=document.createElement('p');empty.className='day-empty';empty.textContent='Nothing due this day. Enjoy the breathing room!';detail.append(empty);}else for(const item of dayItems.slice(0,5)){const line=document.createElement('div');line.className='day-assignment';const status=document.createElement('span');status.className=`mini-check${item.completed?' checked':''}`;status.textContent=item.completed?'✓':'•';const text=document.createElement('span');text.className='day-assignment-name';text.textContent=`${item.subject}: ${item.assignment}`;const state=document.createElement('span');state.className='day-assignment-state';state.textContent=item.completed?'Done':`Period ${item.period}`;line.append(status,text,state);detail.append(line);}
  const queue=$('priorityQueue');queue.replaceChildren();const pending=assignments.filter(a=>!a.completed).sort(prioritySort).slice(0,4);
  if(!pending.length){const empty=document.createElement('p');empty.className='day-empty';empty.textContent='You’re all caught up. Add an assignment whenever you get new homework.';queue.append(empty);}else for(const item of pending){const line=document.createElement('div');line.className='priority-item';const badge=document.createElement('span');const st=dateStatus(item.dueDate);badge.className=`priority-badge ${st.toLowerCase().replace(' ','-')}`;badge.textContent=st||formatDate(item.dueDate);const copy=document.createElement('div');copy.className='priority-copy';const name=document.createElement('strong');name.textContent=item.assignment;const meta=document.createElement('span');meta.textContent=`${item.subject} · Period ${item.period}`;copy.append(name,meta);line.append(copy,badge);queue.append(line);}
  renderGame();
}
function renderList() {
  const container=$('homeworkList');container.replaceChildren();const mode=$('sortMode').value;
  const sorted=[...assignments].sort((a,b)=>{if(mode==='priority')return prioritySort(a,b);if(mode==='due')return (a.dueDate||'9999').localeCompare(b.dueDate||'9999')||Number(a.period)-Number(b.period);if(mode==='subject')return a.subject.localeCompare(b.subject)||Number(a.period)-Number(b.period);return Number(a.completed)-Number(b.completed)||Number(a.period)-Number(b.period)||(a.createdAt||0)-(b.createdAt||0);});
  $('emptyState').classList.toggle('hidden',sorted.length>0);container.classList.toggle('hidden',sorted.length===0);renderStats();
  for(const item of sorted){const row=document.createElement('article');row.className=`homework-row${item.completed?' is-completed':''}`;const period=makeCell('period-pill',String(item.period));period.setAttribute('aria-label',`Period ${item.period}`);row.append(period,makeCell('subject',item.subject));
    const assignmentCell=makeCell('assignment assignment-cell','');const toggleLabel=document.createElement('label');toggleLabel.className='completion-toggle';toggleLabel.title=item.completed?'Mark as not completed':'Mark as completed';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=Boolean(item.completed);checkbox.setAttribute('aria-label',`${item.completed?'Unmark':'Complete'} ${item.assignment}`);
    checkbox.addEventListener('change',async()=>{const current=assignments.find(a=>a.id===item.id);if(current){current.completed=checkbox.checked;if(checkbox.checked){if(!current.xpAwarded){const awarded=awardXp(10, false);if(awarded>0)current.xpAwarded=true;}current.completedAt=dateKey(new Date());game.completionLog.push(current.completedAt);game.completionLog=[...new Set(game.completionLog)];}else{current.completedAt=null;}}await saveAssignments();renderList();renderDashboard();});toggleLabel.append(checkbox);const title=document.createElement('span');title.className='assignment-title';title.textContent=item.assignment;assignmentCell.append(toggleLabel,title);
    const status=dateStatus(item.dueDate);if(status&&!item.completed){const badge=document.createElement('span');badge.className=`due-badge ${status.toLowerCase().replace(' ','-')}`;badge.textContent=status;assignmentCell.append(badge);}row.append(assignmentCell,makeCell('due',formatDate(item.dueDate,{month:'short',day:'numeric',year:'numeric'})));
    const remove=document.createElement('button');remove.type='button';remove.className='delete-one';remove.textContent='×';remove.title=`Delete ${item.assignment}`;remove.setAttribute('aria-label',`Delete ${item.assignment}`);remove.addEventListener('click',async()=>{assignments=assignments.filter(a=>a.id!==item.id);await saveAssignments();renderList();renderDashboard();});row.append(remove);container.append(row);
  }
  $('listFooterLabel').textContent=mode==='priority'?'SMART PRIORITY':mode==='due'?'EARLIEST DUE':mode==='subject'?'SUBJECT A–Z':'LOWEST PERIOD';
}
form.addEventListener('submit',async(event)=>{event.preventDefault();const period=Number($('period').value);if(!Number.isInteger(period)||period<1||period>20){$('status').textContent='Enter a period number from 1 to 20.';$('period').focus();return;}
  const item={id:(crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`),period,subject:$('subject').value.trim(),assignment:$('assignment').value.trim(),dueDate:$('dueDate').value,completed:false,createdAt:Date.now(),xpAwarded:false,completedAt:null};
  if(!item.subject||!item.assignment||!item.dueDate){$('status').textContent='Please complete every field, including the due date.';return;}assignments.push(item);await saveAssignments();form.reset();updateAssignmentLabel();$('status').textContent='Homework saved! Your dashboard is up to date.';$('period').focus();renderDashboard();
});
$('dashboardNav').addEventListener('click',()=>showView('dashboard'));$('entryNav').addEventListener('click',()=>showView('entry'));$('listNav').addEventListener('click',()=>showView('list'));$('viewList').addEventListener('click',()=>showView('list'));$('addFromList').addEventListener('click',()=>showView('entry'));$('emptyAdd').addEventListener('click',()=>showView('entry'));$('dashboardAdd').addEventListener('click',()=>showView('entry'));$('dashboardList').addEventListener('click',()=>showView('list'));$('priorityAll').addEventListener('click',()=>{$('sortMode').value='priority';showView('list');});$('sortMode').addEventListener('change',renderList);
$('noHomeworkBtn').addEventListener('click',async()=>{const today=dateKey(new Date());if(game.noHomeworkDate===today)return;game.noHomeworkDate=today;game.completionLog=[...new Set([...game.completionLog,today])];await saveAssignments();renderGame();});
$('secretAdminTrigger').addEventListener('click',()=>{const code=prompt('Enter administrator code:');if(code===null)return;if(code==='5599'){$('adminPanel').classList.remove('hidden');$('adminStatus').textContent='Administrator access granted.';$('adminXpAmount').focus();}else{alert('Incorrect code.');}});
$('adminClose').addEventListener('click',()=>$('adminPanel').classList.add('hidden'));
$('adminPanel').addEventListener('click',(event)=>{if(event.target===$('adminPanel'))$('adminPanel').classList.add('hidden');});
$('adminAddXp').addEventListener('click',async()=>{const amount=Number($('adminXpAmount').value);if(!Number.isSafeInteger(amount)||amount<0){$('adminStatus').textContent='Enter a whole number of XP (0 or more).';return;}awardXp(amount,true);await saveAssignments();renderGame();$('adminStatus').textContent=`Added ${amount.toLocaleString()} XP. Daily limit bypassed.`;});
$('adminUnlockAchievements').addEventListener('click',async()=>{game.adminAllAchievements=true;await saveAssignments();renderGame();$('adminStatus').textContent='All achievements unlocked.';});
$('adminLockAchievements').addEventListener('click',async()=>{game.adminAllAchievements=false;await saveAssignments();renderGame();$('adminStatus').textContent='Achievements now reflect earned progress.';});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape')$('adminPanel').classList.add('hidden');});
$('reset').addEventListener('click',async()=>{if(!assignments.length)return;if(!confirm('Delete all saved homework? This cannot be undone.'))return;assignments=[];await saveAssignments();renderList();renderDashboard();});
loadAssignments();
