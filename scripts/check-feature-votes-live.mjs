// SPDX-License-Identifier: GPL-3.0-only
// Read-only live check of #120 feature votes: GETs the public GitHub issues and
// 👍 reactions exactly as /help/ideas/ does and prints the counted votes.
// It never posts. Not part of the offline gate; run: node scripts/check-feature-votes-live.mjs
import {readInbox} from '../web/product-site/help/ideas/inbox.mjs';

const request = (url, init = {}) => {
  if ((init.method ?? 'GET') !== 'GET') throw Error('read-only check');
  return fetch(url, init);
};
const rows = await readInbox(request);
console.log(JSON.stringify({checkedAt: new Date().toISOString(), proposals: rows.length,
  rows: rows.map(({number, count, ownerVoted, href}) => ({number, count, ownerVoted, href}))}));
