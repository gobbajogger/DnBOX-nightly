// SPDX-License-Identifier: GPL-3.0-only
import {SITE_ORIGIN, githubRepo} from '../../site-origin.mjs';

const repo = SITE_ORIGIN.firmwareRepo;
const endpoint = 'https://api.github.com/repos/' + SITE_ORIGIN.owner + '/' + repo;
const repoId = 1426904592;
const ownerId = 255244738;

async function getJson(request, url) {
  const response = await request(url, {headers:{Accept:'application/vnd.github+json'}, credentials:'omit', cache:'no-store'});
  if (!response.ok) throw new Error('GitHub HTTP ' + response.status);
  return response.json();
}

async function* pages(request, path) {
  for (let page=1; ; page++) {
    const url = new URL(endpoint + path);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    const items = await getJson(request, url);
    if (!Array.isArray(items)) throw new Error('Invalid GitHub response');
    yield* items;
    if (items.length < 100) return;
  }
}

export async function readInbox(request = fetch) {
  const repository = await getJson(request, endpoint);
  if (repository.id !== repoId || repository.owner?.id !== ownerId) throw new Error('Unexpected repository identity');
  const results = new Map();
  for await (const issue of pages(request, '/issues?state=open')) {
    if (issue.pull_request || results.has(issue.number)) continue;
    const feature = issue.labels?.some(label => label.name === 'enhancement') || /^\[?feature\]?:/i.test(issue.title);
    if (!feature) continue;
    const number = issue.number;
    if (!Number.isSafeInteger(number) || number < 1) throw new Error('Invalid GitHub issue number');
    const voters = new Set();
    if (issue.reactions?.['+1'] !== 0) {
      for await (const reaction of pages(request, '/issues/' + number + '/reactions?content=%2B1')) {
        if (reaction.content !== '+1') continue;
        if (!Number.isSafeInteger(reaction.user?.id)) throw new Error('Unavailable voter identity');
        voters.add(reaction.user.id);
      }
    }
    results.set(number, {number,title:issue.title,count:voters.size,ownerVoted:voters.has(ownerId),
      href:githubRepo(repo,'issues/' + number)});
  }
  return [...results.values()];
}
