#!/usr/bin/env python3
"""Explicit homepage switch. Default is dry-run. Never changes records or Apps Script."""
from pathlib import Path
import argparse,hashlib,json,os,tempfile
MARK='DOKDO-NEXT-HOMEPAGE-V1'
def sha(data):return hashlib.sha256(data).hexdigest()
NEW=('<!doctype html><html lang="ko"><head><meta charset="utf-8">\n'
 '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
 '<meta name="referrer" content="no-referrer">\n'
 '<meta http-equiv="refresh" content="0;url=./dokdo-next/">\n'
 '<title>Dokdo Korea School</title></head><body><!-- '+MARK+' -->\n'
 '<p><a href="./dokdo-next/">Open Dokdo Korea School</a></p>\n'
 '<p><a href="./index.before-dokdo-next.html">Previous version</a></p>\n'
 '</body></html>').encode()
def atomic(path,data):
    with tempfile.NamedTemporaryFile(dir=path.parent,delete=False) as f:temp=Path(f.name);f.write(data)
    os.replace(temp,path)
def switch(root,apply=False,rollback=False):
    root=Path(root).resolve();index=root/'index.html';backup=root/'index.before-dokdo-next.html';manifest=root/'.dokdo-home-switch.json'
    if not (root/'dokdo-next/index.html').is_file():raise ValueError('dokdo-next/index.html is missing. Upload the complete new folder first.')
    if index.is_symlink() or backup.is_symlink():raise ValueError('Refusing to replace symlinked files.')
    if rollback:
        if not backup.is_file() or not manifest.is_file():raise ValueError('No verified homepage backup exists.')
        info=json.loads(manifest.read_text());old=backup.read_bytes();current=index.read_bytes()
        if sha(old)!=info['originalSha256']:raise ValueError('The original backup changed; rollback stopped.')
        if sha(current)!=info['redirectSha256']:raise ValueError('Current homepage has other edits; rollback stopped.')
        if apply:atomic(index,old)
        return {'operation':'rollback','applied':apply,'userRecordsChanged':False}
    if not index.is_file():raise ValueError('Existing index.html was not found. For a new repository, follow the GitHub Pages publishing guide.')
    raw=index.read_bytes()
    if MARK.encode() in raw:return {'operation':'already-promoted','applied':False}
    if backup.exists() or manifest.exists():raise ValueError('A prior homepage backup exists. It will not be overwritten.')
    if apply:
        with backup.open('xb') as f:f.write(raw)
        info={'originalSha256':sha(raw),'redirectSha256':sha(NEW),'originalPath':'index.html','backupPath':backup.name}
        with manifest.open('x') as f:json.dump(info,f,indent=2)
        atomic(index,NEW)
    return {'operation':'promote','applied':apply,'entry':'dokdo-next/index.html','backup':backup.name,'userRecordsChanged':False}
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--root',default='.');p.add_argument('--apply',action='store_true');p.add_argument('--rollback',action='store_true');a=p.parse_args()
    try:print(json.dumps(switch(a.root,a.apply,a.rollback),indent=2))
    except Exception as e:p.exit(1,str(e)+'\n')
