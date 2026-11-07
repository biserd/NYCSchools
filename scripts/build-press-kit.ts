import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pressReleaseText} from '../shared/data-release-copy';
const root='client/public/press/2026-school-results';
mkdirSync(root,{recursive:true});
writeFileSync(root+'/press-release.txt',pressReleaseText(),'utf8');
execFileSync(process.env.PYTHON||'python',['scripts/data/build_press_kit.py'],{stdio:'inherit'});
