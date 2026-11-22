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
  original: JSON.parse(node.querySelector('details pre').textContent)
}));

function filter() {
  const query = {channel: channel.value, model: model.value, query: search.value};
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
