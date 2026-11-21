import {startRemote} from './page.mjs';
import {REVIEWED_BUNDLE} from './catalog.mjs';
startRemote({document,window,navigator,bundle:REVIEWED_BUNDLE});
