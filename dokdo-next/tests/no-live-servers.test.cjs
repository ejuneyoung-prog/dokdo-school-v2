/* 브라우저 시험이 운영 저장소와 분석으로 나가지 않게 지키는 시험입니다.
   요청을 끊는 것만으로는 부족합니다. 시험마다 site-config의 운영 주소를 비워야 합니다. */
'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('fs'),path=require('path');
const dir=__dirname;
// 내보낸 단일 파일을 file://로 여는 시험이라 운영 주소가 들어 있지 않습니다.
const portable=new Set(['portable.py','review-portable.py']);
test('Every browser test empties the operating addresses',()=>{
 const files=fs.readdirSync(dir).filter(name=>name.endsWith('.py')&&fs.readFileSync(path.join(dir,name),'utf8').includes('sync_playwright')&&!portable.has(name));
 a.ok(files.length>=7,files.join());
 for(const name of files)a.match(fs.readFileSync(path.join(dir,name),'utf8'),/site-config/,name+' must replace assets/site-config.js');
});
