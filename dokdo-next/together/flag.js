/* 태극기 그리기. 비율은 국가기록원 「국기의 제작」 작도법을 따른다(2026-11-20 확인).
 *  깃면 가로:세로 3:2 · 태극 지름 = 세로의 1/2, 중심 = 두 대각선이 만나는 점
 *  태극을 가르는 곡선: 왼쪽 위→오른쪽 아래 대각선 위의 두 반원(지름 = 세로의 1/4). 왼쪽 반원은 대각선 아래쪽, 오른쪽 반원은 위쪽.
 *  윗부분 빨강, 아랫부분 파랑(대한민국국기법 시행령 제6조제2항제3호) · 괘는 검정(같은 조 제3항제5호)
 *  괘: 건(☰) 왼쪽 위 · 곤(☷) 오른쪽 아래 · 감(☵) 오른쪽 위 · 이(☲) 왼쪽 아래. 대각선 위에 대각선과 직각으로 놓는다.
 *  태극과 괘 사이 = 태극 지름의 1/4 · 괘 가로 = 지름의 1/2 · 괘 세로 = 지름의 1/3 · 효 두께 = 괘 세로의 1/4 · 효 사이와 끊긴 틈 = 괘 세로의 1/8
 * 색 값: 표준색도(시행령 별표 2) 원문 수치를 확인하지 못해 널리 쓰는 화면 근삿값을 쓴다[확인필요]. */
(function(root){
'use strict';
const COLOR={red:'#CD2E3A',blue:'#0047A0',black:'#000000',white:'#FFFFFF'};
// 괘 효: 1=이어진 효, 0=끊긴 효. 태극에 가까운 효부터. (감·이는 위아래가 같아 순서와 상관없다)
const TRIGRAMS={geon:[1,1,1],gon:[0,0,0],gam:[0,1,0],ri:[1,0,1]};
// 세로 h인 깃발의 모든 치수(시험에서 비율을 확인한다).
function geom(h){const w=h*1.5,d=h/2,th=d/3,bar=th/4,gap=th/8;
 const ang=Math.atan2(h,w);// 왼쪽 위→오른쪽 아래 대각선이 가로와 이루는 각
 const dist=d/2+d/4+th/2;// 중심에서 괘 가운데까지
 const dirs={geon:Math.PI+ang,gon:ang,gam:-ang,ri:Math.PI-ang};// 중심에서 각 괘 쪽으로 가는 방향
 return{w,h,d,r:d/2,small:d/4/*작은 반원의 반지름(지름 = 세로의 1/4)*/,th,len:d/2,bar,gap,ang,dist,dirs}}
// ctx에 (x,y) 왼쪽 위부터 세로 h로 그린다.
function draw(ctx,x,y,h,opt){const g=geom(h),cx=x+g.w/2,cy=y+g.h/2,o=opt||{};
 if(!o.noBg){ctx.fillStyle=COLOR.white;ctx.fillRect(x,y,g.w,g.h)}
 ctx.save();ctx.translate(cx,cy);ctx.rotate(g.ang);// 대각선을 가로축으로
 const R=g.r,q=R/2;
 // 윗반(빨강)과 아랫반(파랑)
 ctx.fillStyle=COLOR.red;ctx.beginPath();ctx.arc(0,0,R,Math.PI,0);ctx.closePath();ctx.fill();
 ctx.fillStyle=COLOR.blue;ctx.beginPath();ctx.arc(0,0,R,0,Math.PI);ctx.closePath();ctx.fill();
 // 왼쪽 작은 반원은 대각선 아래로 빨강이, 오른쪽 작은 반원은 대각선 위로 파랑이 들어간다.
 ctx.fillStyle=COLOR.red;ctx.beginPath();ctx.arc(-q,0,q,0,Math.PI);ctx.closePath();ctx.fill();
 ctx.fillStyle=COLOR.blue;ctx.beginPath();ctx.arc(q,0,q,Math.PI,0);ctx.closePath();ctx.fill();
 ctx.restore();
 // 괘
 ctx.fillStyle=COLOR.black;
 for(const[k,lines]of Object.entries(TRIGRAMS)){const a=g.dirs[k];ctx.save();ctx.translate(cx+Math.cos(a)*g.dist,cy+Math.sin(a)*g.dist);ctx.rotate(a);
  // 지금 가로축 = 중심에서 바깥쪽. 효는 이 축에 직각(세로로 긴 막대)으로 놓인다. 안쪽 효부터.
  for(let i=0;i<3;i++){const off=-g.th/2+i*(g.bar+g.gap);const L=g.len;
   if(lines[i])ctx.fillRect(off,-L/2,g.bar,L);else{const piece=(L-g.gap)/2;ctx.fillRect(off,-L/2,g.bar,piece);ctx.fillRect(off,L/2-piece,g.bar,piece)}}
  ctx.restore()}}
// 캔버스 하나에 그려 돌려준다(three.js 텍스처·공유 이미지에 쓴다).
function canvas(h,doc){const d=doc||root.document;const c=d.createElement('canvas');c.width=Math.round(h*1.5);c.height=Math.round(h);draw(c.getContext('2d'),0,0,h);return c}
const api={COLOR,TRIGRAMS,geom,draw,canvas};
if(typeof module==='object'&&module.exports)module.exports=api;else root.DokdoTaegeukgi=api;
})(typeof globalThis!=='undefined'?globalThis:this);
