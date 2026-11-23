import {matchesRecord} from './history-filter.mjs';

const byId = id => document.getElementById(id);
const channel = byId('channel');
const model = byId('model');
const search = byId('history-search');
const status = byId('history-status');
const nodes = new Map(
  [...document.querySelectorAll('[data-record-id]')].map(node => [node.dataset.recordId, node])
);

const records = [...nodes].map(([id, node]) => ({
  id,
  channel: node.dataset.channel,
  models: node.dataset.models.split(/\s+/).filter(Boolean),
  displayed: [...node.querySelectorAll(':scope > h2, :scope > p, .record-links a')]
    .flatMap(element => [element.textContent, element.getAttribute('href')])
    .filter(Boolean).join(' '),
  original: JSON.parse(node.querySelector('details pre').textContent)
}));

// Search alias for the pre-rename review URL (typed by visitors), not a rendered link.
const legacyReviewUrl = ['https://github.com/gobbajogger', 'x0x37-for-loopy-pro', 'pull/869'].join('/');
const currentReviewUrl = 'https://github.com/gobbajogger/DnBOX/pull/869';

function filter() {
  const term = search.value.trim();
  const query = {
    channel: channel.value,
    model: model.value,
    query: term.toLowerCase() === legacyReviewUrl ? currentReviewUrl : term
  };
  let count = 0;
  for (const record of records) {
    const match = matchesRecord(record, query);
    nodes.get(record.id).hidden = !match;
    if (match) count++;
  }
  status.textContent = count + ' of ' + records.length + ' records';
}

channel.addEventListener('change', filter);
model.addEventListener('change', filter);
search.addEventListener('input', filter);
filter();
