// SPDX-License-Identifier: GPL-3.0-only
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readInbox} from '../web/product-site/help/ideas/inbox.mjs';

const repo = 'https://api.github.com/repos/gobbajogger/DnBOX';
const owner = 255244738;
const feature = {number: 3, title: '[Feature]: Show note names', labels: [], reactions: {'+1': 1}};
const url = (path, page = 1) => repo + path + (path === '' ? '' : (path.includes('?') ? '&' : '?') + 'per_page=100&page=' + page);
function provider(table) {
  return async input => {
    const address = String(input);
    assert.ok(Object.hasOwn(table, address), address);
    const entry = table[address];
    if (typeof entry === 'number') return new Response('', {status: entry});
    return Response.json(entry);
  };
}
const identity = {[repo]: {id: 1426904592, owner: {id: owner}}};

test('count opening-post votes once per person and distinguish the owner', async () => {
  const issues = Array.from({length:100}, (_,i) => ({...feature, number:i+10, pull_request:{}}));
  issues[0] = feature;
  const later = {...feature, number:4, title:'A second proposal', labels:[{name:'enhancement'}]};
  const data = {...identity,
    [url('/issues?state=open')]:issues,
    [url('/issues?state=open',2)]:[later,{number:2,title:'Build log',labels:[]}],
    [url('/issues/3/reactions?content=%2B1')]:[{content:'+1',user:{id:6}},{content:'+1',user:{id:6}}],
    [url('/issues/4/reactions?content=%2B1')]:[{content:'+1',user:{id:owner}}],
  };
  const rows=await readInbox(provider(data));
  assert.deepEqual(rows.map(r=>[r.number,r.count,r.ownerVoted]), [[3,1,false],[4,1,true]]);
});

test('incomplete reads never become zero votes or another repository’s owner decision', async () => {
  const data = {...identity,[url('/issues?state=open')]:[feature], [url('/issues/3/reactions?content=%2B1')]:403};
  await assert.rejects(readInbox(provider(data)), /403/);
  await assert.rejects(readInbox(provider({...identity,[repo]:{id:1, owner:{id:owner}}})), /identity/);
});

test('read all reaction pages and omit pull requests and unrelated open issues', async () => {
  const first=Array.from({length:100},(_,i)=>({content:'+1',user:{id:i+1}}));
  const data = {...identity,[url('/issues?state=open')]:[feature,{...feature,number:8,pull_request:{}},{number:2,title:'Build log',labels:[]}],
    [url('/issues/3/reactions?content=%2B1')]:first,
    [url('/issues/3/reactions?content=%2B1',2)]:[{content:'+1',user:{id:owner}}]};
  assert.deepEqual((await readInbox(provider(data))).map(r=>[r.number,r.count,r.ownerVoted]),[[3,101,true]]);
});
