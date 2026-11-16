// SPDX-License-Identifier: GPL-3.0-only
// R039: the one place the public owner and repo names are configured.
// Pages keep plain, working links (no runtime templating: links must work
// without JavaScript, in fetched JSON and for crawlers). After a rename, change
// this object and run `node scripts/rename-origin.mjs <old-owner/old-repo>`
// which rewrites every live link; tests/site-origin.test.mjs fails if any live
// link disagrees with this object. Sealed history rows are never rewritten
// (GitHub redirects renamed repos, and the R19 digests pin those bytes).
export const SITE_ORIGIN=Object.freeze({
 owner:'gobbajogger',
 firmwareRepo:'X0X37-for-Loopy-Pro',
 nightlyRepo:'x0x37-for-Loopy-Pro_nightly'
});
export function githubRepo(repo,suffix=''){
 const path=suffix?(suffix.startsWith('/')?suffix:'/'+suffix):'';
 return `https://github.com/${SITE_ORIGIN.owner}/${repo}${path}`;
}
export function pagesUrl(suffix=''){
 const tail=suffix?(suffix.startsWith('/')?suffix.slice(1):suffix):'';
 return `https://${SITE_ORIGIN.owner}.github.io/${SITE_ORIGIN.nightlyRepo}/${tail}`;
}
// Live files: every site page, tool and manifest. Sealed history is excluded.
export const LIVE_ROOTS=['web/product-site','web/x0x_installer.html','web/x0x_breaks.html','web/x0x_projects.html','preview-catalog.json'];
export const SEALED=new Set(['web/product-site/build-status.json','web/product-site/data/history.json','web/product-site/ENTRY-DISCLOSURE.json','web/product-site/versions.json','web/product-site/SOURCE-MANIFEST.json']);
const LINK=/(?:github\.com|raw\.githubusercontent\.com|githack\.com)\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)|([A-Za-z0-9-]+)\.github\.io\/([A-Za-z0-9_.-]+)/g;
// Every owner/repo pair a text links to.
export function repoLinks(text){const out=[];for(const m of String(text).matchAll(LINK))out.push(m[1]?{owner:m[1],repo:m[2]}:{owner:m[3],repo:m[4],pages:true});return out;}
export function isKnownRepo(name){return [SITE_ORIGIN.firmwareRepo,SITE_ORIGIN.nightlyRepo].includes(name);}
