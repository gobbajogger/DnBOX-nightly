// SPDX-License-Identifier: GPL-3.0-only
import {readInbox} from './inbox.mjs';

const status = document.getElementById('status');
const proposals = document.getElementById('proposals');
const refresh = document.getElementById('refresh');

async function showProposals() {
  if (refresh.disabled) return;
  refresh.disabled = true;
  status.textContent = 'Checking open proposals…';
  try {
    const rows = await readInbox();
    const items = rows.map(row => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = row.href;
      link.textContent = '#' + row.number + ' ' + row.title;
      const score = row.count + (row.count === 1 ? ' vote' : ' votes');
      item.append(link, document.createTextNode(' · ' + score + (row.ownerVoted ? ' · Owner voted 👍' : '')));
      return item;
    });
    proposals.replaceChildren(...items);
    status.textContent = rows.length ? '' : 'There are no open feature proposals.';
  } catch {
    proposals.replaceChildren();
    status.textContent = 'GitHub could not return the votes. Open the issue list or try again.';
  } finally {
    refresh.disabled = false;
  }
}

refresh.hidden = false;
refresh.addEventListener('click', showProposals);
window.addEventListener('pageshow', showProposals);
