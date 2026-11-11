    float scaleFade=mix(.3,1.0,smoothstep(0.0,uHeadU*1.15,u));   /* round 4: head carries the same scale field, graded by station */
    float hx=scaleHeight(sc+dFdx(sc))-h, hy=scaleHeight(sc+dFdy(sc))-h;
    float scaleRelief=uScale==3 ? .00035 : uScale==2 || uScale==5 ? .0015 : .0011;
    vec3 grad=sign(det)*(hx*r1+hy*r2)*(uLen/max(1.25,uFineness))*scaleRelief*uScaleSize*visible*scaleFade*1.5;
    N=normalize(max(abs(det),1e-12)*N-grad);
    float tone=scaleTone(sc);
    guan=scaleGuanine(sc,vert)*visible*scaleFade;
    col*=1.0+.05*(h-.4)*visible*scaleFade+.05*(tone-.5)*visible*scaleFade;
    col=mix(col,col*vec3(1.06,1.07,1.12),guan*uSilver*.5);                 /* platelet lightening */
    col*=1.0-.10*smoothstep(.25,.0,h)*visible*scaleFade;                   /* seated posterior edge */
  }

  /* skin relief that is not scales: pebbling, lips, orbit, opercle, nares */
  if(uDetail>.4 && (tissue<1.95 || skinT)){
    float mh=microH(u,vert,head*capK);
    vec3 mgrad=sign(det)*(dFdx(mh)*r1+dFdy(mh)*r2)*relief;
    N=normalize(max(abs(det),1e-12)*N-mgrad);
    col*=1.0+.10*clamp(mh,-1.0,1.0)*head;
    /* round 2.1: no periorbital ring. The skin simply darkens in the last fraction before the eyeball (d ≈ distance from the eye centre in eye radii; the skin-blend cap spans d .6–1.2) */
    float dEy=uEyeRU>0.0 ? length(vec2((u-uEyeU)/max(1e-4,uEyeRU),(abs(vert)-abs(uEyeVert))/max(1e-4,uEyeRV))) : 9.0;
    col*=1.0-.22*(1.0-smoothstep(.55,1.0,dEy));   /* round 4: lighter, so the body pattern reads straight across the eye-blend patch */
    float eU=opE(vert), bw=uOpW>0.0 ? uOpW*1.8 : .014;
    float behind=smoothstep(eU-.001,eU+.0015,u)*(1.0-smoothstep(eU+.002,eU+bw+.002,u))*(1.0-skinT0(tissue))*(1.0-uRay);   /* no opercular shadow on the fused disc */
    col*=1.0-.40*behind;                                                     /* soft shadow the free margin casts on the trunk */
    col*=1.0-.12*smoothstep(.45,1.0,rimK)-.26*smoothstep(3.22,3.26,tissue)*step(tissue,3.3);   /* crest barely tinted; the rear wall sits in its own shade */                                   /* fine tapered rim of the cover */
    col*=1.0+.05*(1.0-smoothstep(.0,.003,abs(u-eU+.002)))*(1.0-rimK)*(1.0-uRay);
  }

  if(uScale==6){ float rows=min(abs(vert-.9),min(abs(abs(vert)-.35),abs(vert+.9)));
    float plate=(1.0-smoothstep(.015,.1,rows))*pow(.5+.5*sin(u*uFineness*31.0),2.0)*step(uHeadU,u); col*=1.0+.14*plate; }

  /* lateral line: canal groove plus the pored scales that punctuate it */
  float lly=.08*sin(u*3.0), line=exp(-pow((vert-lly)/.018,2.0))*step(uHeadU,u)*uLateral;
  float pore=line*(1.0-smoothstep(.12,.34,abs(fract(u*uFineness*26.0/uScaleSize)-.5)))*visible;
  col*=1.0-.18*line-.35*pore;

  if(tissue>.5 && tissue<1.95) col=mix(vec3(.34,.12,.12),vec3(.08,.02,.03),smoothstep(-.2,.9,vert*.5+.5))*(.85+.15*sin(u*70.0));
  if(tissue>5.4 && tissue<6.6){ float dk=clamp((tissue-6.0)*4.0,0.0,1.0), dep=(.42+.40*dk)*(.55+.45*vBody.w);   /* slit throat: shaded depth, darkest at the deep rear wall and mid-length */
    col=mix(col,mix(vec3(.17,.05,.06),vec3(.012,.007,.009),smoothstep(.2,.9,dk)),dep); }
  if(tissue>3.45 && tissue<3.7){ col=mix(col,mix(col,vec3(.72,.58,.55),.35),.6); col*=.90+.10*sin(ang*520.0+(u-uPreU)*26.0); }   /* branchiostegal membrane: fine ray fan */
  if(tissue>1.2 && tissue<1.3) col=mix(col,vec3(.40,.07,.08),.65)*.6;                    /* gill arches: dark red filaments hinted in shadow */
  if(tissue>1.4 && tissue<1.6) col=vec3(.60,.28,.29)*(.85+.15*fbm(vec2(u*60.0,ang*18.0)+uSeed));   /* tongue */
  if(tissue>6.6 && tissue<7.6) col*=.86+.08*step(tissue,7.2);
  if(tissue>7.9) col*=1.0-.30*smoothstep(.0,.85,vBody.w);   /* round 5B: nares / spiracle = a soft pit, at most 30 % darker than the skin around it, fading to nothing at the rim */

  /* material response */
  float tone2=scaleTone(sc);
  float rough=mix(.56,.13,uGloss);
  rough*=1.0+.22*head-.10*(1.0-smoothstep(-.7,-.1,vert));      /* head duller, belly slicker */
  rough+=(tone2-.5)*.10*visible;
  rough-=guan*.08;
  rough=mix(rough,rough*1.4+.1,uMatte); rough*=1.0-.2*uSheen;        /* round 4: wet sheen on cruisers / surface plans, matte on deep-band and benthic plans */
  float metal=clamp(uSilver*guan*1.15,0.0,.85)*(1.0-head*.55);
  float coat=mix(.45,1.0,uWet)*(1.0-.25*head)*(1.0-.55*uMatte+.12*uSheen);
  float sss=uTrans*.9+.12;
  bool inner=tissue>.5 && tissue<1.95;
  if(inner){ rough=.78; metal=0.0; coat=.2; sss=.3; }
  vec3 sheen=mix(uBase,vec3(.8,.88,1.0),.6)*uIrid*(.25+.75*guan);
  vec3 c=pbrSkin(col,N,vWP,rough,metal,sss,coat,sheen);

  /* structural colour: thin-film over the guanine layer, hue rotating with view angle */
  float nv=max(0.0,dot(N,V));
  float filmT=.55+.45*fbm(vec2(u*38.0,vert*13.0)+uSeed);
  vec3 iri=hsv2rgb(vec3(fract(.53+(1.0-nv)*.52*filmT+u*.07),.6,1.0));
  c+=iri*uIrid*(.10+.5*guan)*pow(1.0-nv,2.0)*0.9;

  if(uPhoto>.5) for(int row=0;row<2;row++){
    float rv=row==0 ? -.52 : -.81, n=max(1.0,floor(uPhoto/2.0)), pu=(u-uHeadU)/(1.0-uHeadU)*n;
    float dotp=1.0-smoothstep(.07,.13,length(vec2(fract(pu)-.5,(vert-rv)*n*.36)));
    c+=uGlow*dotp*step(uHeadU,u)*step(u,.99)*( .85+.15*sin(uTime*2.5+floor(pu)))*1.7;
  }
  if(uElectric>.5) c+=vec3(.2,.35,.65)*uElectric*pow(max(0.0,sin(uTime*5.0+u*16.0)),24.0)*smoothstep(.3,.8,u)*.14;
  if(tissue>.5 && tissue<1.95){   /* round 4: interior tone = depth gradient (vBody.y = baked occlusion: throat 1, lips ~.2), palette/band derived, mostly unlit so no lit strip can read as a divider */
    float occ=clamp(vBody.y,0.0,1.0); vec3 tn=mix(uIntLip,uIntThroat,smoothstep(.0,.9,occ));
    if(tissue>1.4 && tissue<1.6) tn=mix(uIntLip*1.3,uIntThroat,smoothstep(.2,1.0,occ)*.7); else if(tissue>1.2 && tissue<1.3) tn*=.7;
    ${MOUTH.FS_CAV}
    tn*=.9+.2*fbm(vec2(u*40.0,occ*20.0)+uSeed); c=tn+c*.10*(1.0-.5*occ); }
  c=mix(c,uFogCol,fogAmt(vWP)); gl_FragColor=vec4(c,mix(1.0,.86,uTrans));
}`;
const VS_FIN = GLSL_SWIM + /* glsl */`
attribute vec4 aFin; attribute vec4 aFin2; attribute vec4 aSkin; attribute vec3 aBase; attribute vec4 aHinge; attribute vec3 aAxis; varying vec3 vN, vWP; varying vec4 vFin, vFin2, vSkin; varying vec2 vCirc;
uniform vec4 uPecA, uPecB, uPecP; uniform float uPecDisc, uDiscAmp, uDiscK;
vec3 rotA(vec3 v, vec3 a, float g){ float c=cos(g), s=sin(g); return v*c + cross(a,v)*s + a*dot(a,v)*(1.0-c); }
void main(){ vec3 p = position; vec3 n = normal; float ph = phaseOf(); p += inflateDisp(aBase);
  float kind = aFin.w, lenT = aFin.y, rayT = aFin.x, flex = aFin.z; float u = aSkin.x; float t = uCycle + ph;
  float mobile=smoothstep(.12,.8,lenT), tissue=mix(1.0,.13,aSkin.z);
  float rip = sin(rayT*9.0 + t*8.0 + u*4.0) * flex * mobile*mobile * uLen * .008*tissue;
  if(uMode == 7 && kind == 1.0) rip = sin(rayT*12.0 - t*14.0) * lenT*lenT * uLen * 0.03;
  if((kind == 2.0 || kind == 1.0) && uMode == 0 && flex > 0.9) rip = sin(rayT*14.0 - t*7.0) * lenT*lenT*uLen*0.03;
  p.z += rip*mobile;
  if(kind == 3.0){
    if(uPecDisc > .5){ p.y += sin(u*uDiscK - t*6.2831853) * mobile*mobile * uDiscAmp; }   /* merged disc: travelling wave along the margin, no separate joint */
    else if(aHinge.w != 0.0){                                   /* base joint: sweep + abduction, tip lags the base in phase, ray flex travels outward */
      float sg = aHinge.w; vec4 A = sg > 0.0 ? uPecA : uPecB; float ph0 = sg > 0.0 ? uPecP.x : uPecP.y;
      float th = ph0 - uPecP.z * lenT * (.75 + .25*rayT);
      float sw = clamp(A.x + A.y*cos(th), -.43633, .61087);   /* -25..+35 deg, hard clamp */
      float ab = clamp(A.z + A.w*sin(th), .08727, .95993) - uPecP.w;   /* 5..55 deg abduction, hard clamp */
      float w = smoothstep(0.0, .4, lenT);
      vec3 pr = vec3(p.xy, p.z*sg), nr = vec3(n.xy, n.z*sg), rr = pr - aHinge.xyz;
      rr = rotA(rr, aAxis, ab*w); nr = rotA(nr, aAxis, ab*w); rr = rotA(rr, vec3(0.0,0.0,1.0), sw*w); nr = rotA(nr, vec3(0.0,0.0,1.0), sw*w);
      pr = aHinge.xyz + rr; p = vec3(pr.xy, pr.z*sg); n = vec3(nr.xy, nr.z*sg);
      float pb = .5 + .5*cos(rayT*(aFin2.w-1.0)*6.2831853);   /* individual rays stand proud of the membrane */
      p += normalize(n)*uLen*.0011*pb*smoothstep(.04,.3,lenT)*(1.0-.5*lenT);
    } }
  applyWave(p, n, ph); mat4 mm = modelM(); vec4 wp = mm*vec4(p,1.0); vWP = wp.xyz; vN = normalize(mat3(mm)*n); vFin = aFin; vFin2 = aFin2; vSkin=aSkin; vCirc=vec2(cos(aSkin.y*6.2831853),sin(aSkin.y*6.2831853)); gl_Position = projectionMatrix*viewMatrix*wp; }`;
const FS_FIN = GLSL_COMMON_FS + GLSL_PIGMENT + /* glsl */`
uniform vec3 uFinCol; uniform float uIrid,uGloss; varying vec3 vN, vWP; varying vec4 vFin, vFin2, vSkin; varying vec2 vCirc;
void main(){ float rayT = vFin.x, lenT = vFin.y, op = vFin2.x, memb = vFin2.y, sf = vFin2.z, R = vFin2.w;
  if(vFin.w>2.5 && vFin.w<3.5) memb = 1.02;                                   /* round 2: a side fin keeps its membrane to the margin between the rays (no bare spikes) */
  float rl = abs(fract(rayT*(R-1.0)+0.5)-0.5); float isSpine = step(rayT, sf - 0.001); float rayW = mix(0.08, 0.16, isSpine)*(1.0-0.5*lenT); float ray = 1.0 - smoothstep(rayW, rayW+0.08, rl);
  if(vSkin.z<.5 && lenT > 1.0-.12*(4.0*rl*rl)) discard;                       /* fin law: trailing edge scalloped between ray tips */
  float branch=1.0-smoothstep(.055,.12,abs(fract(rayT*(R-1.0)*2.0+.5)-.5));
  ray=mix(ray,max(ray*.55,branch*.65),smoothstep(.55,.86,lenT)*(1.0-isSpine));
  if(lenT > memb && ray < .55 && vSkin.z<.5) discard;
  float root=1.0-smoothstep(.08,.62,lenT), ang=fract(atan(vCirc.y,vCirc.x)/6.2831853+1.0);
  vec3 skin=skinPigment(vSkin.x,ang), col=mix(uFinCol,skin,root);
  /* membrane: collagen fibre sheen between the rays, pigment blotches and a clearer distal margin */
  float fibre=.94+.06*sin(rayT*R*18.0+lenT*9.0);
  float blotch=fbm(vec2(rayT*9.0, lenT*5.0)+uSeed*1.3);
  col*=fibre*(.88+.24*blotch);
  col=mix(col, col*vec3(1.15,1.12,1.06), smoothstep(.75,1.0,lenT)*.5*(1.0-vSkin.z));
  if(vSkin.z>.5) col=mix(skin,uFinCol*.9,smoothstep(.28,1.0,lenT)*.18);
  else {
    col*=1.0-.27*ray*(1.0-root); col=mix(col,col*vec3(1.08,1.06,1.02)+.03,(1.0-ray)*(1.0-root)*.22);
    if(uPattern==2 || uPattern==3) col=mix(col,uAccent,(1.0-root)*uPatStrength*.35*smoothstep(.3,.44,abs(fract(rayT*R*.35)-.5)));
  }
  float a=mix(max(.2,(op*(1.0-.3*lenT))*(0.84+.16*ray)+ray*.1),1.0,root);
  if(vSkin.z>.5) a=1.0;
  if(vFin.w>2.5 && vFin.w<3.5){ a=max(a, mix(.9,1.0,ray)); if(rayT<.05||rayT>.97) a=1.0; }
  else if(vFin.w>.5 && vFin.w<7.5 && vSkin.z<.5){ a=max(a, mix(.86,1.0,ray)); }   /* round 3: dorsal / anal / pelvic / caudal membranes read as tissue at rest, never jelly-transparent */   /* side fin: ray structure + a membrane that reads as tissue, never a jelly paddle */
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 c=wetLight(col,N,vWP,uGloss*.38,(1.0-vSkin.z)*(1.0-root)*.6);                 /* matte / satin membrane */
  c+=col*uLightCol*pow(max(0.0,dot(-N,normalize(uLightDir))),2.0)*(1.0-vSkin.z)*(1.0-root)*.15;
  float fog=fogAmt(vWP); c=mix(c,uFogCol,fog); gl_FragColor=vec4(c,a);
}`;
const VS_EYE = GLSL_SWIM + /* glsl */`
attribute vec3 aEye; varying vec3 vN, vWP, vE;
void main(){ vec3 p = position; vec3 n = normal; vE = aEye;
  p += inflateDisp(p); applyWave(p, n, phaseOf()); mat4 mm = modelM(); vec4 wp = mm*vec4(p,1.0);
  vWP = wp.xyz; vN = normalize(mat3(mm)*n); gl_Position = projectionMatrix*viewMatrix*wp; }`;
/* The eyeball is real geometry (sclera shell, recessed iris disc, pupil cup, cornea dome, optional lids); this shader only colours each part
   from its own coordinates (aEye) - nothing here depends on the viewing direction except ordinary lighting. */
const FS_EYE = GLSL_COMMON_FS + /* glsl */`
uniform vec3 uEyeCol; uniform float uCartilage,uSeed;
varying vec3 vN, vWP, vE;
void main(){
  vec3 N = normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 V = normalize(cameraPosition-vWP), L = normalize(uLightDir), H = normalize(L+V), R = reflect(-V,N);
  float nv = max(dot(N,V),0.0), nl = max(dot(N,L),0.0), kind = vE.z, fres = .04+.96*pow(1.0-nv,4.2);
  vec3 col = vec3(.5); float alpha = 1.0, spec = 0.0, ao = 1.0;
  if(kind < .5){                                   /* sclera: pale connective tissue, vessels, darker toward the limbus */
    float th = vE.x, ph = vE.y;
    col = mix(uEyeCol*.5, vec3(.07,.065,.06), .6) * (.92+.14*vnoise(vec2(ph*3.0,uSeed)));   /* round 2: dark eyeball surface, never a pale sclera ring */
    col *= mix(.48, 1.0, smoothstep(.78, 1.15, th));
  } else if(kind < 1.5){                           /* iris: textured, palette-coloured, darker limbal rim, bright pupil ruff */
    float q = vE.x, ph = vE.y;
    float fibers = .80 + .12*sin(ph*79.0+q*12.0) + .07*sin(ph*131.0-q*7.0) + .05*sin(ph*37.0+3.0);
    float crypt  = .88 + .12*vnoise(vec2(ph*14.0, q*11.0)+uSeed) + .06*fbm(vec2(ph*26.0,q*18.0));
    float collar = 1.0 + .22*(1.0-smoothstep(.0,.16,abs(q-.30)));
    vec3 irisCol = uCartilage>.5 ? mix(uEyeCol*.95, uEyeCol*.55, q)*.8 : mix(uEyeCol*1.0, uEyeCol*.45, q*q);
    col = irisCol*fibers*crypt*collar;
    col += uEyeCol*.45*(1.0-smoothstep(.0,.12,q));
    col *= 1.0 - .66*smoothstep(.78,1.0,q);
    col += uEyeCol*.10*pow(1.0-nv,2.0);        /* metallic sheen of the stroma */
    ao = .70 + .30*smoothstep(.0,.35,1.0-q*.5);                  /* recessed under the cornea */
  } else if(kind < 2.5){                           /* pupil cup: the dark lens, part of the eyeball itself */
    col = vec3(.004,.004,.006) + uEyeCol*.035*(1.0-vE.x); ao = .8;
  } else if(kind < 3.5){                           /* cornea: clear, moist; only a small scene-light highlight */
    alpha = .03 + .22*fres;
    spec = pow(max(dot(N,H),0.0), 320.0)*.9 + pow(max(dot(N,H),0.0), 40.0)*.03;
    col = vec3(1.0);
  } else if(kind < 4.5){                           /* adipose eyelid: clear fatty window, subtle */
    col = vec3(.08); alpha = .05*fres;
  } else if(kind < 5.5){                           /* limbal funnel: dark collar leading down to the iris plane */
    col = uEyeCol*.16 + vec3(.01); ao = .75;
  } else {                                         /* nictitating lower lid: translucent milky membrane */
    col = vec3(.06); alpha = 0.0;
  }
  vec3 c = col*ao*(envDiff(N)*.55 + uLightCol*(.30+.70*nl) + uFillCol*.7);
  if(kind > 2.5 && kind < 3.5){ c = uLightCol*spec + envSpec(R,.035)*fres*.18; alpha = clamp(alpha + spec*.9 + fres*.10, 0.0, 1.0); }
  else c += uLightCol*spec;
  c *= .80 + .20*nv;
  float fog = fogAmt(vWP); c = mix(c, uFogCol, fog); gl_FragColor = vec4(c, alpha); }`;
const VS_SIMPLE = GLSL_SWIM + /* glsl */`
#ifdef TEETH
attribute float aJaw, aErupt;
varying float vT;
uniform float uJawOpenMax;
${JAW_SPREAD_GLSL}
#endif
varying vec3 vN, vWP;
void main(){ vec3 p = position; vec3 n = normal;
#ifdef TEETH
  vT = position.y; p += aOpen*uMouthOpen; if(aErupt > 0.0) p.y *= .3333 + min(.6667, aErupt*uMouthOpen);
#endif
#ifdef USE_INSTANCING
  p = (instanceMatrix*vec4(p,1.0)).xyz; n = normalize(mat3(instanceMatrix)*n);
#endif
#ifdef TEETH
  if(aJaw > 0.0){ p = jawSpread(p, (uHeadX - p.x)/uLen, aJaw, clamp(uJawAngle/max(uJawOpenMax,1e-4),0.0,1.0)); vec2 d = p.xy - uJawPivot; float a = -uJawAngle*aJaw; float c = cos(a), s = sin(a); p.xy = uJawPivot + vec2(c*d.x - s*d.y, s*d.x + c*d.y); n.xy=vec2(c*n.x-s*n.y,s*n.x+c*n.y); p.x += uJawProtrude*aJaw; }
#endif
  applyWave(p, n, phaseOf()); vec4 wp = modelMatrix*vec4(p,1.0); vWP = wp.xyz; vN = normalize(mat3(modelMatrix)*n); gl_Position = projectionMatrix*viewMatrix*wp; }`;
const FS_SIMPLE = GLSL_COMMON_FS + /* glsl */`
uniform vec3 uColor; varying vec3 vN, vWP;
#ifdef TEETH
varying float vT;
#endif
void main(){ vec3 N = normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 col = uColor; float rough = 0.30, sss = 0.35;
#ifdef TEETH
  /* bone-family enamel: matte off-white, darker warm root, never emissive / pure white */
  float t = clamp(vT,0.0,1.0);
  col = mix(vec3(.30,.24,.19), vec3(.55,.50,.42), smoothstep(.0,.55,t));
  col *= .96+.05*sin(t*40.0);
  rough = .62; sss = .12;
#endif
  vec3 c = pbrSkin(col, N, vWP, rough, 0.0, sss, 0.75, vec3(0.0));
  float fog = fogAmt(vWP); c = mix(c,uFogCol,fog); gl_FragColor = vec4(c,1.0); }`;
const FS_GLOW = GLSL_COMMON_FS + /* glsl */`
uniform vec3 uGlow; varying vec3 vN, vWP;
void main(){ float fl = 0.75 + 0.25*sin(uTime*5.0) * sin(uTime*2.3+1.0); vec3 N = normalize(vN); vec3 V = normalize(cameraPosition-vWP); float rim = pow(1.0-max(dot(N,V),0.0),2.0); vec3 c = uGlow*fl*(1.2+rim) + vec3(0.3)*rim; float fog = fogAmt(vWP); c = mix(c,uFogCol,fog*0.6); gl_FragColor = vec4(c,1.0); }`;
const hslCol = a => new THREE.Color().setHSL(((a[0] % 360) + 360) % 360 / 360, clamp(a[1], 0, 1), clamp(a[2], 0, 1), THREE.SRGBColorSpace);
function makeUniforms(g, bm) {
  const cvr = GILL.kindOf(bm) === 'cover';
  const lm = bm.lm, s = g.skin;
  /* where the eye sits in (u, circumferential-vertical) skin space, so the fragment shader can
     build an orbital rim, a sunken socket and periorbital pigment that actually line up with it */
  const es = bm.section(lm.eye, {}), yy = bm.eyeY;
  const yr = Math.max(1e-8, yy > 0 ? es.dUp : es.dDn), yn = yy > 0 ? es.nD : es.nV;
  const eyeVert = g.head.eyeSide === 'none' ? 0 : Math.sign(yy || 1) * Math.pow(clamp(Math.abs(yy) / yr, 0, .9), yn / 2);
  const eyeRU = g.head.eyeSide === 'none' ? 0 : bm.eyeR / Math.max(1e-6, bm.L);
  const eyeRV = g.head.eyeSide === 'none' ? 0 : clamp(bm.eyeR / Math.max(1e-6, (es.dUp + es.dDn) * .5), .02, .9);
  const silver = clamp(s.iridescence * .8 + (1 - s.base[1]) * .5 * (s.scale === 'bare' || s.scale === 'denticle' ? .2 : 1), 0, .92);
  const SK = skinLaw(axesOf(g), g), dp = (c, k = 1) => { const l = (c.r * .3 + c.g * .59 + c.b * .11); c.r = (l + (c.r - l) * (1 - .5 * SK.deep)) * (1 - .4 * SK.deep) * k; c.g = (l + (c.g - l) * (1 - .5 * SK.deep)) * (1 - .4 * SK.deep) * k; c.b = (l + (c.b - l) * (1 - .5 * SK.deep)) * (1 - .4 * SK.deep) * k; return c; };
  const cBase = dp(hslCol(s.base)), cBelly = dp(hslCol(s.belly)), cAcc = dp(hslCol(s.accent)), cFin = dp(hslCol(s.base).lerp(hslCol(s.belly), .38).lerp(hslCol(s.fin), .25), .96);   /* round 4: fin membrane tone derives from the body palette */
  return Object.assign({}, ENV, {
    uScaleVis: { value: SK.scaleVis }, uMatte: { value: SK.matte }, uSheen: { value: SK.sheen }, uDeep: { value: SK.deep }, uIntLip: { value: new THREE.Color(...SK.lip) }, uIntThroat: { value: new THREE.Color(...SK.throat) },
    uSilver: { value: silver }, uEyeU: { value: lm.eye }, uEyeVert: { value: eyeVert }, uEyeRU: { value: eyeRU }, uEyeRV: { value: eyeRV },
    uLen: { value: bm.L }, uHeadX: { value: bm.headX }, uFreq: { value: g.swim.freq }, uAmp: { value: g.swim.amp }, uAmpHead: { value: g.swim.ampHead }, uEnvPow: { value: g.swim.envPow }, uWaveK: { value: g.swim.waveK }, uMode: { value: Math.max(0, SWIM_MODES.indexOf(g.swim.mode)) }, uFlap: { value: FLAP[g.swim.mode] || 0.2 }, uPecA: { value: new THREE.Vector4(0, 0, bm.law.pec.restAbd * Math.PI / 180, 0) }, uPecB: { value: new THREE.Vector4(0, 0, bm.law.pec.restAbd * Math.PI / 180, 0) }, uPecP: { value: new THREE.Vector4(0, 0, bm.law.pec.lagDeg * Math.PI / 180, bm.law.pec.restAbd * Math.PI / 180) }, uPecDisc: { value: bm.a.family === 'ray' ? 1 : 0 }, uDiscAmp: { value: 0 }, uDiscSp: { value: bm.disc ? bm.disc.Sp : 1 }, uDiscK: { value: 2 * Math.PI / .6 },
    uCycle: { value: 0 }, uFlat: { value: g.body.roll === 0 ? 0 : 1 }, uRay: { value: bm.a.family === 'ray' ? 1 : 0 }, uManta: { value: bm.ventralMouth ? 1 : 0 }, uGape: { value: g.mouth.gape }, uDetail: { value: 1 }, uCartilage: { value: bm.a.gills === 'lateral' ? 1 : 0 },
    uBreath: { value: 0 }, uInflate: { value: 0 }, uJawAngle: { value: 0 }, uJawPivot: { value: new THREE.Vector2(bm.headX, 0) }, uJawOpenMax: { value: 0.3 }, uJawSpread: { value: 0 }, uJawU0: { value: MOUTH.jawU0(bm) }, uHingeU: { value: MOUTH.jawU1(bm) }, uMLine: { value: MOUTH.edgeTable(bm, GH) }, uJawProtrude: { value: 0 }, uMouthOpen: { value: 0 }, uPhase: { value: 0 }, uBurst: { value: 0 },
    uBase: { value: cBase }, uBelly: { value: cBelly }, uAccent: { value: cAcc }, uFinCol: { value: cFin }, uEyeCol: { value: hslCol(s.eye) }, uGlow: { value: hslCol(s.glow) }, uBand: { value: s.band }, uBandCol: { value: hslCol(s.bandColor) },
    uPattern: { value: Math.max(0, SCHEMA['skin.pattern'].opts.indexOf(s.pattern)) }, uPatScale: { value: s.patternScale }, uPatStrength: { value: s.patternStrength }, uScale: { value: Math.max(0, SCHEMA['skin.scale'].opts.indexOf(s.scale)) }, uScaleSize: { value: s.scaleSize },
    uCounter: { value: s.countershade }, uIrid: { value: s.iridescence }, uGloss: { value: s.gloss }, uPhoto: { value: s.photophores }, uTrans: { value: bm.disc ? 0 : s.translucency }, uSlits: { value: g.head.gillSlits }, uHeadU: { value: lm.operculum }, uOpOff: { value: cvr ? OP.slitW * bm.h * 1.15 : 0 }, uOpBow: { value: cvr ? OP.bow * bm.h : 0 }, uOpW: { value: cvr ? OP.slitW * bm.h : 0 }, uPreU: { value: lm.preopercle }, uMouthU: { value: lm.mouthCorner },
    uLateral: { value: s.lateralLine }, uLips: { value: g.mouth.lips }, uNostrils: { value: g.head.nostrils }, uMouthStart: { value: bm.jawStartU }, uMouthTipF: { value: bm.tipF }, uMouthCornerF: { value: bm.cornerF }, uElectric: { value: s.electric ? 1 : 0 }, uSeed: { value: (cyrb128(String(g.meta.surfaceSeed || g.meta.seed))[0] % 1000) / 37 }, uFineness: { value: g.body.fineness }, uColor: { value: hslCol([s.base[0], s.base[1] * 0.6, s.base[2] * 0.75]) }, uSacc: { value: new THREE.Vector2() }, uPupil: { value: 0 }
  });
}
function makeMaterials(g, uni, school) {
  const defs = school ? { SCHOOL: 1 } : {}; const mats = { _eyes: [] };
  mats.body = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VS_BODY, fragmentShader: FS_BODY, defines: Object.assign({}, defs), transparent: !(uni.uPecDisc && uni.uPecDisc.value > .5) && g.skin.translucency > 0.05, side: THREE.FrontSide });
  mats.jaw = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VS_BODY, fragmentShader: FS_BODY, defines: Object.assign({ JAW: 1 }, defs), transparent: !(uni.uPecDisc && uni.uPecDisc.value > .5) && g.skin.translucency > 0.05, side: THREE.DoubleSide });
  mats.fin = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VS_FIN, fragmentShader: FS_FIN, defines: Object.assign({}, defs), transparent: true, depthWrite: true, side: THREE.DoubleSide, forceSinglePass: true });
  mats.eyeOrgan = (glass, eyeCol, axis) => { const m = new THREE.ShaderMaterial({ uniforms: Object.assign({}, uni, { uEyeCol: { value: eyeCol }, uAxis: { value: axis } }), vertexShader: VS_EYE, fragmentShader: FS_EYE, defines: Object.assign({}, defs), transparent: !!glass, depthWrite: !glass, side: glass ? THREE.FrontSide : THREE.DoubleSide }); m.userData.eyeball = true; mats._eyes.push(m); return m; };
  mats.simple = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VS_SIMPLE, fragmentShader: FS_SIMPLE });
  mats.tooth = new THREE.ShaderMaterial({ uniforms: Object.assign({}, uni, { uColor: { value: new THREE.Color(0.66, 0.61, 0.52) } }), vertexShader: VS_SIMPLE, fragmentShader: FS_SIMPLE, defines: { TEETH: 1 } });
  mats.glow = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VS_SIMPLE, fragmentShader: FS_GLOW });
  return mats;
}
/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 10. SCENE, ENVIRONMENT, SCHOOL, ANIMATION, ADAPTIVE QUALITY      ║
   ╚══════════════════════════════════════════════════════════════════╝ */
const FS_POST = s => s.replace(/\}\s*$/, '\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}');
const _origMakeMaterials = makeMaterials;
makeMaterials = function (g, uni, school) { const m = _origMakeMaterials(g, uni, school); for (const k of ['body', 'jaw', 'fin', 'simple', 'tooth', 'glow']) m[k].fragmentShader = FS_POST(m[k].fragmentShader); const ef = m.eyeOrgan; m.eyeOrgan = (...a) => { const mm = ef(...a); mm.fragmentShader = FS_POST(mm.fragmentShader); return mm; }; return m; };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 1000);
const TIERS = [{ pr: 2, school: 64, particles: 400, shafts: true }, { pr: 1.5, school: 40, particles: 240, shafts: true }, { pr: 1, school: 24, particles: 120, shafts: false }, { pr: 0.75, school: 12, particles: 0, shafts: false }];
const App = { fish: null, genome: null, history: [], mode: 'studio', school: null, schoolOn: false, env: null, tier: isMobile ? 1 : 0, fpsEma: 60, lowT: 0, highT: 0, debug: { wire: false, skeleton: false, landmarks: false }, inflateTarget: 0, paused: false, contextLost: false, clock: 0, state: { nextBurst: 4, burst: 0, saccT: 0, saccTarget: new THREE.Vector2() }, es: 1, helpers: [], dirty: false };
const GOD = { enabled: false, strength: .55, baseline: null, axes: {}, editing: false, timer: 0 };
let renderer, scene, camera, controls, lights = {};
function initScene() {
  const canvas = document.getElementById('gl');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
    App.shaderFailed = true;
    showError(new Error('Shader compilation failed\n' + gl.getProgramInfoLog(program) + '\n' + gl.getShaderInfoLog(vertex) + '\n' + gl.getShaderInfoLog(fragment)));
  };
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  applyTier(); renderer.setSize(innerWidth, innerHeight, false);
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.01, 500); camera.position.set(1, 0.4, 2.5);
  controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = true; controls.screenSpacePanning = true; controls.autoRotate = false;
  lights.hemi = new THREE.HemisphereLight(0x88aacc, 0x223322, 0.8); lights.dir = new THREE.DirectionalLight(0xffffff, 1.6); lights.dir.position.set(2, 6, 3); lights.fill = new THREE.DirectionalLight(0xaaccff, 0.4); lights.fill.position.set(-3, 1, -2); scene.add(lights.hemi, lights.dir, lights.fill);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); App.contextLost = true; toast('WebGL context lost. Waiting to recover.'); }, false);
  canvas.addEventListener('webglcontextrestored', () => { App.contextLost = false; App.shaderFailed = false; toast('WebGL context restored'); try { rebuildAll(); } catch (e) { showError(e); } }, false);
  canvas.addEventListener('pointerdown', () => { App.cameraTween = null; controls.enableDamping = true; });
  addEventListener('resize', onResize); onResize();
}
function onResize() { if (!renderer) return; const width = innerWidth - (typeof currentTab !== 'undefined' && currentTab && innerWidth >= 1000 ? 420 : 0); renderer.setSize(width, innerHeight, false); $('gl').style.width = width + 'px'; camera.aspect = width / innerHeight; camera.updateProjectionMatrix(); }
function applyTier() {
  const t = TIERS[App.tier]; if (renderer) renderer.setPixelRatio(Math.min(devicePixelRatio || 1, t.pr));
  if (App.env) { if (App.env.shafts) App.env.shafts.visible = t.shafts && App.mode === 'habitat'; if (App.env.particles) { App.env.particles.visible = t.particles > 0 && App.mode === 'habitat'; App.env.particles.geometry.setDrawRange(0, t.particles); } }
  if (App.school) App.school.setCount(t.school);
  const target = App.tier >= 2 ? 'med' : 'hero';
  if (App.fish && App.fish.info.quality !== target && !App.qualityPending) { App.qualityPending = true; setTimeout(() => { App.qualityPending = false; if (App.genome && !App.contextLost) setFish(App.genome, { noHistory: true, keepCamera: true, skipPanel: true }); }, 0); }
}
function adaptQuality(dt, fps) { App.fpsEma = lerp(App.fpsEma, fps, 0.08); if (App.fpsEma < 42) { App.lowT += dt; App.highT = 0; if (App.lowT > 2 && App.tier < TIERS.length - 1) { App.tier++; App.lowT = 0; applyTier(); toast('Lowered detail (tier ' + App.tier + ') to keep 60 fps'); } } else if (App.fpsEma > 57) { App.highT += dt; App.lowT = 0; if (App.highT > 10 && App.tier > (isMobile ? 1 : 0)) { App.tier--; App.highT = 0; applyTier(); } } else { App.lowT = Math.max(0, App.lowT - dt); } }
/* ── environment ── */
const FS_FLOOR = GLSL_COMMON_FS + /* glsl */`
uniform vec3 uColor; uniform float uCaustic, uScale; varying vec3 vWP; varying vec2 vUv;
void main(){ vec2 p = vWP.xz/uScale; float n = fbm(p*0.8); vec3 col = uColor*(0.75+0.5*n);
  float t = uTime*0.25; float c1 = vnoise(p*6.0+vec2(t,t*0.7)), c2 = vnoise(p*6.3-vec2(t*0.8,t*0.5)); float caus = pow(max(0.0,1.0-abs(c1-c2)*3.0),4.0)*uCaustic;
  col += uLightCol*caus*0.6*(0.6+0.4*n); vec3 c = col*(mix(uGroundCol,uSkyCol,0.6)*0.8+uLightCol*0.6); float fog = fogAmt(vWP); c = mix(c,uFogCol,fog); gl_FragColor = vec4(c,1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const VS_FLOOR = /* glsl */`varying vec3 vWP; varying vec2 vUv; void main(){ vUv = uv; vec4 wp = modelMatrix*vec4(position,1.0); vWP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`;
const VS_PART = /* glsl */`uniform float uTime, uScale, uSize; attribute float aSeed; varying float vA; void main(){ vec3 p = position; p.y = mod(p.y + uTime*0.02*uScale*(0.5+aSeed), 12.0*uScale) - 6.0*uScale; p.x += sin(uTime*0.3+aSeed*6.28)*0.2*uScale; vec4 mv = modelViewMatrix*vec4(p,1.0); gl_PointSize = uSize*(0.5+aSeed) / max(0.1,-mv.z) ; vA = 0.4+0.6*aSeed; gl_Position = projectionMatrix*mv; }`;
