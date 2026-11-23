/* Visual effects: 3D background (WebGL shader), loading counter, cursor, parallax.
   If WebGL isn't available the site still works with a plain gradient background. */
(function () {
  const $ = id => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const mouse = { x: .5, y: .5, sx: .5, sy: .5 };

  /* ---- Loading counter ---- */
  let pct = 0, start = performance.now();
  (function count(now) {
    const t = (now - start) / 1000, target = window.__ready ? 100 : Math.min(90, t * 60);
    pct += (target - pct) * .08 + .2;
    const p = Math.min(100, Math.floor(pct));
    $('pct').textContent = p; $('pfill').style.width = p + '%';
    if (p >= 100 && t > 1.2) { $('pre').classList.add('done'); document.body.classList.add('ready'); return; }
    requestAnimationFrame(count);
  })(start);

  /* ---- Pointer: parallax + custom cursor ---- */
  addEventListener('pointermove', e => {
    mouse.x = e.clientX / innerWidth; mouse.y = 1 - e.clientY / innerHeight;
    document.documentElement.style.setProperty('--mx', (mouse.x - .5) * 2);
    document.documentElement.style.setProperty('--my', (mouse.y - .5) * 2);
  });
  if (matchMedia('(hover:hover) and (pointer:fine)').matches && !reduce) {
    document.body.classList.add('cursor');
    const dot = document.createElement('i'), ring = document.createElement('i');
    dot.id = 'cdot'; ring.id = 'cring'; document.body.append(dot, ring);
    let rx = 0, ry = 0, cx = 0, cy = 0;
    addEventListener('pointermove', e => { cx = e.clientX; cy = e.clientY; dot.style.transform = `translate(${cx}px,${cy}px)`; });
    (function follow() { rx += (cx - rx) * .16; ry += (cy - ry) * .16; ring.style.transform = `translate(${rx}px,${ry}px)`; requestAnimationFrame(follow); })();
    document.addEventListener('pointerover', e => ring.classList.toggle('hot', !!e.target.closest('button,a,input,label')));
  }

  /* ---- WebGL background ---- */
  const cv = $('gl'), gl = cv.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) { document.body.classList.add('nogl'); return; }

  /* COLOURS (r, g, b from 0 to 1): change these to recolour the 3D scene */
  const GOLD = 'vec3(1.0,0.70,0.10)', PINK = 'vec3(1.0,0.17,0.84)', CYAN = 'vec3(0.10,0.90,1.0)';

  const vs = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const fs = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 R; uniform float T; uniform vec2 M; uniform float L;
const vec3 GOLD=${GOLD}; const vec3 PINK=${PINK}; const vec3 CYAN=${CYAN};
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float k=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*k);}
vec3 scene(vec2 p){
  float hz=-0.16;
  vec3 c=mix(vec3(.05,.0,.10),vec3(.0,.0,.02),clamp(p.y*1.4+.2,0.,1.));
  /* stars */
  vec2 sp=p*vec2(70.,40.);vec2 id=floor(sp);float r=hash(id);
  float star=step(.988,r)*smoothstep(.35,0.,length(fract(sp)-.5))*(.5+.5*sin(T*2.+r*40.));
  c+=vec3(star)*step(hz,p.y);
  /* neon grid floor */
  float below=step(p.y,hz);
  float z=1./max(hz-p.y,.001);
  vec2 q=vec2(p.x*z*1.1,z*.8+T*(.5+L*2.));
  vec2 f=abs(fract(q)-.5);
  float line=max(smoothstep(.45,.5,f.x),smoothstep(.45,.5,f.y));
  float fade=clamp((hz-p.y)*3.5,0.,1.);
  vec3 gc=mix(CYAN,PINK,smoothstep(-.7,.7,p.x+sin(T*.3)*.3));
  c+=gc*line*fade*below*(.8+L*1.2);
  c+=PINK*exp(-abs(p.y-hz)*9.)*(.35+L*.6);
  /* pyramid of light */
  vec2 A=vec2(0.,.30),B=vec2(-.26,hz),C=vec2(.26,hz);
  float hw=(A.y-p.y)/(A.y-hz)*.26;
  float inside=step(abs(p.x),hw)*step(hz,p.y)*step(p.y,A.y);
  c+=GOLD*inside*(.05+.07*L);
  float e=min(min(seg(p,A,B),seg(p,A,C)),seg(p,A,vec2(0.,hz)));
  c+=GOLD*(.0018/(e+.0012))*(.7+L*1.6);
  c+=GOLD*(.004/(length(p-A)+.004))*(.8+L*1.5);
  /* lasers */
  for(int i=0;i<6;i++){
    float fi=float(i);
    float a=(fi-2.5)*.42+sin(T*.7+fi*1.7)*.35;
    vec2 d=vec2(sin(a),cos(a));vec2 v=p-A;
    float along=dot(v,d);float dist=abs(v.x*d.y-v.y*d.x);
    float beam=(.0022/(dist+.0014))*step(0.,along)*exp(-along*1.1);
    c+=(mod(fi,2.)<1.?CYAN:PINK)*beam*(.3+L*1.8);
  }
  return c;
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
  uv+=(M-.5)*vec2(.05,.03);
  float ab=.003+L*.012;
  vec3 col=vec3(scene(uv+vec2(ab,0.)).r,scene(uv).g,scene(uv-vec2(ab,0.)).b);
  col*=1.-.9*dot(uv,uv);
  col+=(hash(gl_FragCoord.xy+T)-.5)*.035;
  col*=.95+.05*sin(gl_FragCoord.y*1.7);
  col=1.-exp(-col*1.3);
  gl_FragColor=vec4(col,1.);
}`;
  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs), pr = gl.createProgram();
  if (!v || !f) { document.body.classList.add('nogl'); return; }
  gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { document.body.classList.add('nogl'); return; }
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(pr, 'R'), uT = gl.getUniformLocation(pr, 'T'), uM = gl.getUniformLocation(pr, 'M'), uL = gl.getUniformLocation(pr, 'L');
  const scale = Math.min(devicePixelRatio || 1, 1.5) * .75;
  function size() { cv.width = Math.floor(innerWidth * scale); cv.height = Math.floor(innerHeight * scale); gl.viewport(0, 0, cv.width, cv.height); }
  addEventListener('resize', size); size();
  let t0 = performance.now();
  (function frame(now) {
    if (!document.hidden) {
      mouse.sx += (mouse.x - mouse.sx) * .05; mouse.sy += (mouse.y - mouse.sy) * .05;
      gl.uniform2f(uR, cv.width, cv.height);
      gl.uniform1f(uT, reduce ? 0 : ((now - t0) / 1000) % 600);
      gl.uniform2f(uM, mouse.sx, mouse.sy);
      gl.uniform1f(uL, reduce ? 0 : (window.fx ? window.fx.lvl : 0));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(frame);
  })(t0);
})();
