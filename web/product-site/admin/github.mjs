// SPDX-License-Identifier: GPL-3.0-only
import {permitsRelease, hardwareTestsFor, validateHardwareTests, effectivePackageVersion} from '../hardware-tests.mjs';

export const OWNER = 'gobbajogger';
export const NIGHTLY = 'DnBOX-nightly';
export const MAIN = 'DnBOX';
const REPOS = [NIGHTLY, MAIN];
const PAGES = 'gh-pages';
const API = 'https://api.github.com';
const HEX40 = /^[a-f0-9]{40}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const MODELS = ['elite', 'pro'];
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', {fatal:true});
const jsonBytes = value => textEncoder.encode(JSON.stringify(value, null, 2) + '\n');

function oid(value) {
  if (!HEX40.test(value)) throw Error('GitHub returned an invalid object identifier.');
  return value;
}
function pathParts(path) {
  const parts = path.split('/');
  if (!parts.every(p => /^[A-Za-z0-9._-]+$/.test(p) && p !== '.' && p !== '..')) throw Error('Invalid repository path.');
  return parts.map(encodeURIComponent).join('/');
}
function repoPath(repo) {
  if (!REPOS.includes(repo)) throw Error('Unsupported repository.');
  return '/repos/' + OWNER + '/' + repo;
}
function b64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(s);
}
function unbase64(s) {
  if (typeof s !== 'string') throw Error('Missing GitHub file contents.');
  return Uint8Array.from(atob(s.replace(/\s/g,'')), ch => ch.charCodeAt(0));
}
async function sha256(bytes) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  return Array.from(hash, x => x.toString(16).padStart(2,'0')).join('');
}
export function createGitHub(fetcher = fetch) {
  let credential = '';
  let session = 0;
  let authorized = false;
  async function request(path, method='GET', data, secret=credential) {
    if (!(path === '/user' || REPOS.some(r => path.startsWith(repoPath(r) + '/'))) || /[\\\r\n#]/.test(path)) throw Error('Invalid GitHub API request.');
    const url = new URL(API + path);
    if (url.origin !== API || url.pathname !== path.split('?')[0]) throw Error('Invalid GitHub API path.');
    if (method !== 'GET' && (!authorized || !secret || secret !== credential)) throw Error('Connect an owner token before saving.');
    const headers = {Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28'};
    if (secret) headers.Authorization = 'Bearer ' + secret;
    if (data !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetcher(url.href,{method,headers,body:data===undefined ? undefined : JSON.stringify(data),
      credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',cache:'no-store'});
    if (!res.ok) {
      const error = Error('GitHub returned HTTP ' + res.status + (res.status === 403 ? '. Check permissions or the API rate limit.' : '.'));
      error.status = res.status;
      throw error;
    }
    return res.json();
  }
  function lock() { session++; credential=''; authorized=false; }
  async function connect(token) {
    lock();
    const attempt=session;
    if (typeof token !== 'string' || !/^github_pat_[A-Za-z0-9_]+$/.test(token)) throw Error('Use a fine-grained personal access token.');
    const account=await request('/user','GET',undefined,token);
    if (session!==attempt) throw Error('Connection cancelled.');
    if (account.login?.toLowerCase() !== OWNER) throw Error('This page requires the repository owner.');
    credential=token; authorized=true;
  }
  async function head(repo) {
    const ref=await request(repoPath(repo)+'/git/ref/heads/'+PAGES);
    return oid(ref.object?.sha);
  }
  async function file(repo,path,ref) {
    const data=await request(repoPath(repo)+'/contents/'+pathParts(path)+'?ref='+oid(ref));
    if (data.type!=='file'||data.path!==path||!Number.isSafeInteger(data.size)||data.size<0||data.size>4*1024*1024) throw Error('Unexpected file metadata for '+path+'.');
    oid(data.sha);
    const blob=data.encoding==='base64' && (data.content||data.size===0) ? data : await request(repoPath(repo)+'/git/blobs/'+data.sha);
    if(blob.encoding!=='base64'||blob.sha!==data.sha) throw Error('Invalid file response for '+path+'.');
    const bytes=unbase64(blob.content);
    if(bytes.length!==data.size) throw Error('Incomplete file '+path+'.');
    return {sha:data.sha,bytes};
  }
  async function readJson(repo,path,ref) {
    const data=await file(repo,path,ref);
    return {...data,value:JSON.parse(textDecoder.decode(data.bytes))};
  }
  async function snapshot(repo) {
    const ref=await head(repo);
    const catalog=await readJson(repo,'versions.json',ref);
    if (!Array.isArray(catalog.value.versions)) throw Error('Invalid installer catalog.');
    if (repo===NIGHTLY && catalog.value.versions.some(row=>!row.display_version)) {
      // Legacy builds carry their display version in the separately pinned package assignments.
      let ledger;
      try {ledger=(await readJson(repo,'package-version-assignments.json',ref)).value;}
      catch(error){if(error.status!==404)throw error;}
      if(ledger) catalog.value.versions=catalog.value.versions.map(row=>{
        const display=effectivePackageVersion(row,ledger);
        return !row.display_version&&display ? {...row,display_version:display} : row;
      });
    }
    return {ref,catalog};
  }
  async function lanePRs(repo) {
    const rows=[];
    for (let page=1;;page++) {
      const batch=await request(repoPath(repo)+'/pulls?state=open&per_page=100&page='+page);
      rows.push(...batch.filter(p=>p.head?.ref?.startsWith('lane/') && p.head.repo?.full_name === OWNER+'/'+repo)
        .map(p=>({repo,number:p.number,title:p.title,lane:p.head.ref,sha:oid(p.head.sha),draft:p.draft})));
      if(batch.length<100) return rows;
    }
  }
  async function checks(repo,sha,number) {
    const root=repoPath(repo);
    const path=root+'/commits/'+oid(sha);
    const rows=[];
    const statuses=await Promise.allSettled([request(path+'/status'),request(path+'/check-runs?per_page=100')]);
    for(const [i,result] of statuses.entries()) {
      if(result.status==='rejected') {rows.push([i?'Check runs':'Commit statuses','unavailable']);continue;}
      const value=result.value;
      rows.push(...(i?value.check_runs.map(x=>[x.name,x.conclusion||x.status]):value.statuses.map(x=>[x.context,x.state])));
    }
    if(Number.isSafeInteger(number)&&number>0) {
      let gate;
      const pattern=new RegExp('^DNBOX-GATE RESULT (PASS|FAIL|VOID) sha='+sha+'(?: |$)','m');
      for(let page=1;;page++){
        const comments=await request(root+'/issues/'+number+'/comments?per_page=100&page='+page);
        for(const comment of comments){
          if(!['OWNER','MEMBER','COLLABORATOR'].includes(comment.author_association)) continue;
          const match=pattern.exec(comment.body);
          if(match)gate=match[1];
        }
        if(comments.length<100)break;
      }
      rows.push(['Local gate',gate||'no exact-head result posted']);
    }
    return rows;
  }
  async function markTested(selection,evidenceUrl) {
    const {ref,catalog}=await snapshot(NIGHTLY);
    const row=selected(catalog.value,selection,[selection.model]);
    const entry=candidate(row,selection.model);
    const url=new URL(evidenceUrl);
    if(url.protocol!=='https:' || url.host!=='github.com'||url.username||url.password||url.search||
       !/^\/gobbajogger\/DnBOX(?:-nightly)?\/(?:issues\/\d+|pull\/\d+|releases\/tag\/[A-Za-z0-9._-]+)$/.test(url.pathname)) throw Error('Use a DnBOX GitHub issue, PR or release as evidence.');
    const ledger=await readJson(NIGHTLY,'hardware-tests.json',ref);
    validateHardwareTests(ledger.value);
    if(hardwareTestsFor(ledger.value,row,selection.model)) return 'This package already has an owner test.';
    const report={version:row.display_version,source_commit:row.source_commit,model:selection.model,package_sha256:entry.sha256,controller_sha256:entry.controller_sha256,startup:true,restart:true,evidence_url:url.href,reported_by:'owner',reported_at:new Date().toISOString()};
    const updated={...ledger.value,reports:[...ledger.value.reports,report]};
    validateHardwareTests(updated);
    await request(repoPath(NIGHTLY)+'/contents/hardware-tests.json','PUT',{message:'data: record owner startup and restart on '+selection.model+' '+row.display_version,branch:PAGES,sha:ledger.sha,content:b64(jsonBytes(updated))});
    return 'Saved the hardware test for '+row.display_version+' '+selection.model+'.';
  }
  async function promote(selection) {
    const [src,dest]=await Promise.all([snapshot(NIGHTLY),snapshot(MAIN)]);
    if(dest.catalog.value.installer_promotion_schema!==1) throw Error('The main site needs the ledger-aware installer before it can accept a promotion.');
    const row=selected(src.catalog.value,selection);
    const ledger=await readJson(NIGHTLY,'hardware-tests.json',src.ref);
    validateHardwareTests(ledger.value);
    if(!MODELS.every(m=>hardwareTestsFor(ledger.value,row,m))) throw Error('Both model packages need an owner startup and restart record.');
    const existing=dest.catalog.value.versions.filter(v=>v.version===row.version);
    if(existing.length>1) throw Error('The MAIN catalog has duplicate entries for this build ID.');
    const prior=existing[0];
    if(prior) {
      if(!sameFirmware(prior,row,MODELS)) throw Error('The existing build ID has different firmware.');
      if(!permitsRelease(prior) || !['dev-checked','release-checked'].includes(prior.status) ||
         (prior.hardware_tested!==undefined && typeof prior.hardware_tested!=='boolean') ||
         Object.keys(prior.models||{}).sort().join(',')!=='elite,pro' ||
         !MODELS.every(model=>{
           const pkg=prior.models[model];
           return permitsRelease(pkg) && (pkg.status===undefined || pkg.status===prior.status) &&
             (pkg.hardware_tested===undefined || pkg.hardware_tested===false);
         })) throw Error('The existing MAIN build or model is unavailable.');
    }
    const target=structuredClone(prior || row), files=[];
    for(const model of MODELS) {
      const entry=candidate(row,model);
      const prefix='/DnBOX-nightly/artifacts/';
      const url=new URL(entry.pkg);
      if(url.origin!=='https://gobbajogger.github.io'||url.username||url.password||url.search||url.hash||!url.pathname.startsWith(prefix)) throw Error('Invalid nightly package URL.');
      const path=url.pathname.slice('/DnBOX-nightly/'.length);
      pathParts(path);
      const parts=path.split('/');
      if(parts.at(-2)!==entry.sha256||!/^[A-Za-z0-9._-]+\.fwsc$/.test(parts.at(-1))) throw Error('Expected an immutable firmware package path.');
      const pkg=await file(NIGHTLY,path,src.ref);
      if(pkg.bytes.length!==entry.size||await sha256(pkg.bytes)!==entry.sha256) throw Error('Firmware verification failed for '+model+'.');
      const to='artifacts/releases/'+entry.sha256+'/'+parts.at(-1);
      files.push({path:to,bytes:pkg.bytes,original:pkg.sha});
      target.models[model].pkg='https://gobbajogger.github.io/DnBOX/'+to;
      // MAIN checks an explicit model status against the promoted catalog row.
      if (target.models[model].status!==undefined) target.models[model].status='release-checked';
    }
    Object.assign(target,{hardware_tested:true,status:'release-checked',lifecycle:'current'});
    const next={...dest.catalog.value,latest:target.version,versions:[target,...dest.catalog.value.versions.filter(v=>v.version!==target.version)]};
    const root=repoPath(MAIN)+'/git/';
    const parent=await request(root+'commits/'+dest.ref);
    const entries=[];
    for(const f of [...files,{path:'versions.json',bytes:jsonBytes(next)}]) {
      const blob=await request(root+'blobs','POST',{content:b64(f.bytes),encoding:'base64'});
      if(f.original&&f.original!==blob.sha) throw Error('GitHub stored different package bytes.');
      entries.push({path:f.path,mode:'100644',type:'blob',sha:oid(blob.sha)});
    }
    const tree=await request(root+'trees','POST',{base_tree:oid(parent.tree.sha),tree:entries});
    if(tree.sha===parent.tree.sha) return 'The main installer already has this exact release.';
    const commit=await request(root+'commits','POST',{message:'release: promote '+row.display_version+' to the main installer',parents:[dest.ref],tree:oid(tree.sha)});
    if(await head(NIGHTLY)!==src.ref) throw Error('The nightly source changed. Refresh before promoting.');
    await request(root+'refs/heads/'+PAGES,'PATCH',{sha:oid(commit.sha),force:false});
    return 'Promoted '+row.display_version+' in '+commit.sha.slice(0,12)+'.';
  }
  async function release(repo,tag) {
    if(!/^v[0-9]+(?:\.[0-9]+){1,3}(?:-[A-Za-z0-9.-]+)?$/.test(tag)) throw Error('Enter a version tag such as v0.0.26.');
    const r=await request(repoPath(repo)+'/releases/tags/'+encodeURIComponent(tag));
    if(r.tag_name!==tag||!Number.isSafeInteger(r.id)) throw Error('GitHub returned a different release.');
    return {repo,tag,id:r.id,body:r.body??'',updated:r.updated_at};
  }
  async function saveNotes(previous,body) {
    const current=await release(previous.repo,previous.tag);
    if(current.id!==previous.id || current.body!==previous.body || current.updated!==previous.updated) throw Error('The release changed. Reload its notes before saving.');
    await request(repoPath(current.repo)+'/releases/'+current.id,'PATCH',{body});
    const saved=await release(current.repo,current.tag);
    if(saved.id!==current.id||saved.body!==body) throw Error('Another edit reached the release during save. Reload to see the current notes.');
    return 'Saved the release notes for '+current.tag+'.';
  }
  return {connect,lock,head,snapshot,readJson,lanePRs,checks,markTested,promote,release,saveNotes};
}
function sameFirmware(actual,expected,models) {
  const buildFields=['source_commit','source_tree','display_version'];
  const packageFields=['product','sha256','size','controller_sha256','controller_size','controller_strategy'];
  return buildFields.every(key=>actual[key]===expected[key]) && models.every(model=>{
    const a=actual.models?.[model], b=expected.models?.[model];
    return MODELS.includes(model) && a && b && packageFields.every(key=>a[key]===b[key]);
  });
}
function selected(catalog,selection,models=MODELS) {
  const matches=catalog.versions.filter(v=>v.version===selection.build?.version);
  const row=matches[0];
  if(matches.length!==1 || !permitsRelease(row) || !sameFirmware(row,selection.build,models) ||
     !HEX40.test(row.source_commit) || !HEX40.test(row.source_tree) ||
     !/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(row.display_version) ||
     !['dev-checked','release-checked'].includes(row.status) ||
     (row.hardware_tested!==undefined && typeof row.hardware_tested!=='boolean') ||
     Object.keys(row.models||{}).sort().join(',')!=='elite,pro')
    throw Error('The selected build changed or is unavailable. Refresh the catalog.');
  return row;
}
function candidate(row,model) {
  const entry=row.models?.[model];
  const product=model==='elite'?'Elite':'Pro';
  if(!MODELS.includes(model)||!permitsRelease(entry)||!HEX64.test(entry.sha256)||!HEX64.test(entry.controller_sha256)||
     (entry.status!==undefined && entry.status!=='dev-checked') ||
     (entry.hardware_tested!==undefined && entry.hardware_tested!==false) ||
     (Object.hasOwn(entry,'controller_strategy') && !['bundled','owner-supplied'].includes(entry.controller_strategy)) ||
     (entry.controller_strategy==='bundled' &&
       (!Number.isSafeInteger(entry.controller_size) || entry.controller_size<68 || entry.controller_size>65536)) ||
     !Number.isSafeInteger(entry.size)||entry.size<=960||entry.size>2097152||
     !new RegExp('^SMK-37 '+product+'_(?:900|9[0-9]{6})$').test(entry.product))
    throw Error('This model package is unavailable.');
  return entry;
}
