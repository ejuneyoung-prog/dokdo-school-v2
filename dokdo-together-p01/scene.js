'use strict';

function createPlaza(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  const player = { x: 0, z: 3.3, heading: 0 };
  const guests = [
    [-4, -2.8, '#d48756'], [4.1, -2, '#ba6482'], [-3.7, 2, '#678fb2'],
    [3.4, 2.9, '#9994ce'], [1.7, -3.8, '#7e9761']
  ];
  let width, height, scale;
  const faces = [];

  // Project XYZ into an elevated perspective camera looking toward the island.
  function project([x, y, z]) {
    const depth = 24 + y * -.55 - z * .835;
    const factor = scale * 24 / depth;
    return [width / 2 + x * factor, height * .48 + (z * .55 - y * .835) * factor, depth];
  }

  function face(points, color, outline) {
    const projected = points.map(project);
    const depth = projected.reduce((sum, point) => sum + point[2], 0) / projected.length;
    faces.push({ projected, depth, color, outline });
  }

  function paint({ projected, color, outline }) {
    ctx.beginPath();
    projected.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (outline) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function flush() {
    faces.sort((a, b) => b.depth - a.depth).forEach(paint);
    faces.length = 0;
  }

  function ring(x, y, z, rx, rz, count = 16, phase = 0) {
    return Array.from({ length: count }, (_, i) => {
      const angle = i * Math.PI * 2 / count + phase;
      return [x + Math.cos(angle) * rx, y, z + Math.sin(angle) * rz];
    });
  }

  function sides(top, bottom, colors) {
    top.forEach((point, i) => {
      const j = (i + 1) % top.length;
      face([point, top[j], bottom[j], bottom[i]], colors[i % colors.length]);
    });
  }

  function box(x, y, z, w, h, d, color, side, heading = 0) {
    const layer = elevation => [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]]
      .map(([a,b]) => [x + a*Math.cos(heading) - b*Math.sin(heading), elevation,
        z + a*Math.sin(heading) + b*Math.cos(heading)]);
    const top = layer(y + h);
    sides(top, layer(y), [side, color, color, side]);
    face(top, color);
  }

  function flag(x, y, z, w, time, amplitude) {
    const h = w * 2 / 3;
    box(x, .06, z, .037, y - .06, .037, '#f2e6cb', '#97886f');
    const point = (u, v) => [x + u * w, y - v * h,
      z + Math.sin(u * 7 - time * 8) * u * amplitude];
    function patch(u, v, a, b, color) {
      face([point(u,v), point(a,v), point(a,b), point(u,b)], color);
    }
    for (let i = 0; i < 12; i++) patch(i/12, 0, (i+1)/12, 1, '#fffdf4');
    // The cloth and all markings share the same displacement.
    function symbol(points, color) {
      face(points.map(([u,v]) => point(u,v)), color);
    }
    function curved(cx, cy, rx, ry, start, end, color) {
      symbol(Array.from({ length: 25 }, (_, i) => {
        const a = start + (end - start) * i / 24;
        return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
      }), color);
    }
    // Paint insignia after the cloth at the same depth.
    const markingsStart = faces.length;
    curved(.5,.5,.167,.25,0,2*Math.PI,'#17478b');
    curved(.5,.5,.167,.25,Math.PI,2*Math.PI,'#cd2e3a');
    curved(.417,.5,.083,.125,0,Math.PI,'#cd2e3a');
    curved(.583,.5,.083,.125,Math.PI,2*Math.PI,'#17478b');
    for (const [cx,cy,tilt,split] of [
      [.22,.24,.62,[false,false,false]], [.78,.24,-.62,[true,false,true]],
      [.22,.76,-.62,[false,true,false]], [.78,.76,.62,[true,true,true]]
    ]) {
      split.forEach((broken, i) => {
        const row = (i - 1) * .034;
        for (const [a,b] of broken ? [[-.061,-.009],[.009,.061]] : [[-.061,.061]]) {
          symbol([[a,row-.009],[b,row-.009],[b,row+.009],[a,row+.009]].map(([u,v]) =>
            [cx + u*Math.cos(tilt) - v*Math.sin(tilt), cy + (u*Math.sin(tilt) + v*Math.cos(tilt))*1.5]), '#17202a');
        }
      });
    }
    // Give the entire flag one sorting depth; stable sorting preserves cloth layers.
    const depth = project([x, y - h/2, z])[2];
    for (let i = markingsStart - 12; i < faces.length; i++) faces[i].depth = depth;
  }

  function avatar(x, z, heading, coat, time, moving, waving, selected) {
    const stride = moving ? Math.sin(time * 15) * .13 : 0;
    face(ring(x,.025,z,.42,.3), '#9e947d');
    for (const side of [-1, 1]) {
      box(x + side*.13,.06,z+side*stride,.19,.37,.24,'#293f52','#203043',heading);
    }
    box(x,.41,z,.55,.52,.34,coat,'#284b59',heading);
    box(x,.91,z,.47,.43,.43,'#f1bb92','#c89477',heading);
    box(x,1.29,z,.52,.14,.48,selected?'#136f72':'#443a45','#244350',heading);
    if (waving) {
      const reach = .45 + Math.sin(time * 8) * .07;
      box(x + .34,.58,z,.18,.29,.22,'#f1bb92','#c89477');
      flag(x + reach,1.62,z+.23,.82,time,.18);
    }
  }

  function render(time, moving, waving) {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    if (!width || !height) return;
    const density = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * density);
    const pixelHeight = Math.round(height * density);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx.setTransform(density,0,0,density,0,0);
    scale = Math.min(width / 18.5, height / 11);
    const sea = ctx.createLinearGradient(0,0,0,height);
    sea.addColorStop(0,'#b9e4de');
    sea.addColorStop(.22,'#63a6b3');
    sea.addColorStop(1,'#0d506e');
    ctx.fillStyle = sea;
    ctx.fillRect(0,0,width,height);

    for (let i = 0; i < 25; i++) {
      const x = ((i * 83.7 + time * (3 + i%4)) % (width + 65)) - 40;
      const y = height * (.18 + (i*29%101)/126);
      ctx.fillStyle = i%3 ? '#d6f7ef38' : '#daf8ef64';
      ctx.fillRect(x,y,12 + i%7*5,1);
    }
    for (const [x,z,rx,ry] of [[-6,-8,2.8,2.8],[5,-9,3.4,3.5]]) {
      const base = ring(x,-.55,z,rx,1.8,7);
      const top = ring(x-.3,ry,z,.55,.6,7,.2);
      sides(top,base,['#537578','#658586','#385d68','#789492']);
      face(top,'#789488');
    }
    flush();
    const base = ring(0,-1.48,0,7.55,6.8);
    const plaza = ring(0,0,0,7.2,6.35);
    sides(plaza,base,['#55757b','#45636b','#6a8385','#364f60']);
    face(plaza,'#dacead','#faf0d5');
    face(ring(0,.015,0,5.9,5.2),'#cdbf9d','#efe2c1');
    face(ring(0,.02,0,2.8,2.6),'#e9dec3','#faf0d5');
    flush();

    box(0,.02,0,1.28,.34,1.25,'#f1e5c8','#a99577');
    flag(0,4.2,0,2.65,time,.32);
    guests.forEach(([x,z,coat], i) => {
      const sway = Math.sin(time * .7 + i) * .22;
      avatar(x+sway,z,-.2,coat,time,true,i%2===0,false);
    });
    avatar(player.x,player.z,player.heading,'#1b8c8a',time,moving,waving,true);
    flush();
    const [lx,ly] = project([player.x,1.86,player.z]);
    ctx.font = '700 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#163844';
    ctx.beginPath();
    ctx.roundRect(lx-15,ly-14,30,20,8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('나',lx,ly);
  }
  return { player, render };
}
