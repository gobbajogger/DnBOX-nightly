// SPDX-License-Identifier: GPL-3.0-only
import {createGitHub, NIGHTLY, MAIN, OWNER} from './github.mjs';
import {loadInstallReports, countInstallReports, installBuild} from '../install-reports.mjs';
import {validateHardwareTests, hardwareTestsFor} from '../hardware-tests.mjs';

if (self === top) initialize();

function initialize() {
  const byId = id => document.getElementById(id);
  const node = (tag, text) => {const el=document.createElement(tag);el.textContent=text;return el;};
  const github=createGitHub();
  const repos=[NIGHTLY,MAIN];
  let authenticated=false, saving=false, releases=[], loadedNotes=null, revision=0;
  const message=(id,text)=>{byId(id).textContent=text;};
  const selected=()=>releases.find(r=>r.version===byId('build').value);
  function selection() {
    const r=selected();
    if(!r) throw Error('Select a nightly build.');
    return {build:structuredClone(r),model:byId('model').value};
  }
  function controls() {
    byId('connect').disabled=authenticated||saving;
    byId('token').disabled=authenticated||saving;
    byId('lock').disabled=!authenticated;
    byId('mark').disabled=!authenticated||saving||!selected()||!byId('verified').checked||!byId('evidence').value.trim();
    byId('promote').disabled=!authenticated||saving||!selected();
    byId('save-notes').disabled=!authenticated||saving||!loadedNotes||byId('notes').value===loadedNotes.body;
  }
  function identity() {
    const r=selected(),m=byId('model').value;
    const pkg=r?.models?.[m];
    message('identity',pkg ? [r.display_version+' · '+r.version,pkg.product,'Source '+r.source_commit,
      'Tree '+r.source_tree,'Package '+pkg.sha256,'Controller '+pkg.controller_sha256,
      pkg.controller_strategy].filter(Boolean).join(' · ') : '');
    byId('verified').checked=false; controls();
  }
  async function action(id,work) {
    if(saving) return;
    saving=true; controls(); message(id,'Working…');
    try{message(id,await work());}catch(error){message(id,error.message);}
    finally{saving=false;controls();}
  }
  function disconnect() {
    revision++; github.lock();authenticated=false;byId('token').value='';byId('verified').checked=false;
    message('connection','Viewing public data.');controls();
  }
  byId('workspace').hidden=false;
  byId('connect').onclick=()=>action('connection',async()=>{
    let value=byId('token').value.trim();byId('token').value='';
    try{await github.connect(value);}finally{value='';}
    authenticated=true;return 'Connected as '+OWNER+'.';
  });
  byId('lock').onclick=disconnect; window.addEventListener('pagehide',disconnect);
  byId('build').onchange=identity;byId('model').onchange=identity;
  byId('verified').onchange=controls;byId('evidence').oninput=controls;
  byId('mark').onclick=()=>action('test-result', async()=>{
    if(!byId('verified').checked) throw Error('Confirm the two hardware checks.');
    const result=await github.markTested(selection(),byId('evidence').value.trim());
    byId('verified').checked=false;return result;
  });
  byId('promote').onclick=()=>action('promotion-result',async()=>{
    const s=selection();
    if(!window.confirm('Promote '+s.build.version+' to DnBOX gh-pages?\n\nElite '+s.build.models.elite.sha256+'\nPro '+s.build.models.pro.sha256)) return 'Promotion cancelled.';
    const result=await github.promote(s);await refresh();return result;
  });
  function clearNotes(){loadedNotes=null;byId('notes').value='';byId('notes').disabled=true;controls();}
  byId('repo').onchange=clearNotes;byId('tag').oninput=clearNotes;
  byId('read-notes').onclick=()=>action('notes-result',async()=>{
    const repo=byId('repo').value,tag=byId('tag').value.trim();
    const result=await github.release(repo,tag);
    if(repo!==byId('repo').value||tag!==byId('tag').value.trim()) return 'Selection changed. Load the selected release.';
    loadedNotes=result;byId('notes').value=result.body;byId('notes').disabled=false;return 'Loaded '+tag+'.';
  });
  byId('notes').oninput=controls;
  byId('save-notes').onclick=()=>action('notes-result',async()=>{
    const before=loadedNotes,body=byId('notes').value;
    if(!before) throw Error('Load the release first.');
    const result=await github.saveNotes(before,body);
    if(loadedNotes===before){loadedNotes=await github.release(before.repo,before.tag);}
    return result;
  });
  function displayCatalog(repo,catalog,ledger) {
    const el=document.createElement('details'),rows=catalog.versions;
    const latest=rows.find(v=>v.version===catalog.latest);
    el.append(node('summary',repo+' · '+(latest?.display_version||catalog.latest||'no latest build')+' · '+rows.length+' builds'));
    const list=document.createElement('ul');
    for(const row of rows){
      const item=document.createElement('li'),details=document.createElement('details');
      const title=[row.display_version||row.version,row.version===catalog.latest?'Latest':'',row.status].filter(Boolean).join(' · ');
      details.append(node('summary',title),node('p',row.version+' · '+(row.source_commit||'source unavailable')));
      for(const [model,pkg] of Object.entries(row.models||{})){
        const status=ledger ? (hardwareTestsFor(ledger,row,model)?'Owner tested startup and restart':'No matching owner test recorded') : 'Owner records unavailable';
        details.append(node('p',[model,pkg.size+' bytes',pkg.sha256,status].join(' · ')));
      }
      item.append(details);list.append(item);
    }
    el.append(list);return el;
  }
  async function refresh() {
    const id=++revision;
    const previous=byId('build').value;
    message('status','Loading lane pull requests and both catalogs…');
    const rows=await Promise.allSettled(repos.map(r=>github.lanePRs(r)));
    if(id!==revision) return;
    byId('lanes').replaceChildren();
    for(const [i,result] of rows.entries()){
      if(result.status==='rejected'){byId('lanes').append(node('p',repos[i]+': '+result.reason.message));continue;}
      for(const pr of result.value){
        const el=document.createElement('details'),summary=node('summary',pr.repo+' #'+pr.number+' · '+pr.lane+(pr.draft?' · Draft':''));
        const link=node('a',pr.title);link.href='https://github.com/'+OWNER+'/'+pr.repo+'/pull/'+pr.number;
        const checks=node('p','Open to read GitHub checks and commit status.');
        el.append(summary,link,checks);
        el.addEventListener('toggle',async()=>{if(!el.open)return;try{const data=await github.checks(pr.repo,pr.sha,pr.number);checks.textContent=data.map(([n,s])=>n+' · '+s).join(' / ')||'No GitHub checks or commit statuses recorded.';}catch(e){checks.textContent=e.message;}});
        byId('lanes').append(el);
      }
    }
    if(!byId('lanes').children.length) byId('lanes').append(node('p','No open lane pull requests.'));
    const snapshots=await Promise.allSettled(repos.map(r=>github.snapshot(r)));
    let ledger;
    if(snapshots[0].status==='fulfilled'){
      try {ledger=validateHardwareTests((await github.readJson(NIGHTLY,'hardware-tests.json',snapshots[0].value.ref)).value);}
      catch {ledger=null;}
    }
    if(id!==revision)return;
    byId('catalogs').replaceChildren();releases=[];byId('build').replaceChildren();
    for(const [i,result] of snapshots.entries()){
      if(result.status==='rejected'){byId('catalogs').append(node('p',repos[i]+': '+result.reason.message));continue;}
      const catalog=result.value.catalog.value;byId('catalogs').append(displayCatalog(repos[i],catalog,ledger));
      if(repos[i]===NIGHTLY) {
        releases=catalog.versions.filter(v=>v.display_version&&v.models?.elite&&v.models?.pro);
        for(const r of releases){const opt=node('option',r.display_version+' · '+r.source_commit.slice(0,8));opt.value=r.version;byId('build').append(opt);}
        byId('build').value=releases.some(v=>v.version===previous)?previous:catalog.latest;
      }
    }
    identity();message('status','');message('reports','Loading install reports…');
    try {
      if(snapshots.some(s=>s.status!=='fulfilled')) throw Error('Catalog unavailable.');
      const reports=await loadInstallReports();
      const packages=snapshots.flatMap(s=>s.value.catalog.value.versions.flatMap(row=>
        Object.entries(row.models||{}).map(([model,pkg])=>installBuild(row,pkg,model)).filter(Boolean)));
      // A package can appear in both catalogs. Count each submitted issue only once.
      const count=reports.filter(report=>packages.some(pkg=>countInstallReports([report],pkg)===1)).length;
      if(id===revision)message('reports',count+' install'+(count===1?'':'s')+' reported OK');
    }
    catch{if(id===revision)message('reports','Install-report count unavailable.');}
  }
  byId('refresh').onclick=()=>refresh().catch(e=>message('status',e.message));
  controls();refresh().catch(e=>message('status',e.message));
}
