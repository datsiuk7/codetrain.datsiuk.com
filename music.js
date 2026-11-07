// Original, procedurally composed calm tracks. No audio downloads or autoplay.
import { t } from './i18n.mjs';

const NOCTURNE=[69,72,76,72,67,71,74,71,65,69,72,76,64,67,71,67,69,76,79,76,67,74,77,74,65,72,76,72,64,71,76,71];

// Waltz bars in E minor: [bass, chord on beats 2–3, melody as [beat, note, beats long]].
const WALTZ=[
  [40,[52,55,59],[[0,71,2],[2,67,1]]],
  [36,[52,55,60],[[0,76,2],[2,72,1]]],
  [43,[55,59,62],[[0,74,2],[2,71,1]]],
  [38,[54,57,62],[[0,69,1],[1,66,1],[2,69,1]]],
  [40,[52,55,59],[[0,67,2],[2,71,1]]],
  [45,[52,57,60],[[0,72,2],[2,76,1]]],
  [47,[51,54,57],[[0,75,2],[2,71,1]]],
  [40,[52,55,59],[[0,76,3]]]
];

// Ambient chords (Fmaj7, Dm9, B♭maj7, Cadd9) and the high "stars" that twinkle over them.
const STARS=[[41,[57,60,64,65]],[38,[57,60,62,65]],[34,[57,62,65,69]],[36,[55,60,62,64]]];
const TWINKLE=[77,79,81,84,86,89];

// Each track schedules one bar at time `t` (bar number `n`) through `play` and returns the bar length in seconds.
export const MUSIC_TRACKS=[
  { // 1. Night walk: the original flowing nocturne in A minor.
    name:'nocturne',
    bar(play,t,n){
      const step=.65;
      for(let i=0;i<4;i++)play.note(NOCTURNE[(n*4+i)%NOCTURNE.length],t+i*step,2,.12);
      const bass=[45,43,41,40][n%4];
      play.note(bass,t,3.8,.1);
      play.note(bass+7,t,3.5,.045);
      return 4*step;
    }
  },
  { // 2. Lantern waltz: a slow 3/4 music box — bass on one, soft chord on two and three, echoing bells on top.
    name:'waltz',
    bar(play,t,n){
      const beat=.6,[bass,chord,melody]=WALTZ[n%WALTZ.length];
      play.note(bass,t,beat*2.6,.11,{wave:'triangle'});
      for(const b of [1,2])for(const m of chord)play.note(m,t+b*beat,.45,.032,{wave:'triangle'});
      for(const [b,m,len] of melody)play.note(m,t+b*beat,len*beat+.6,.095,{bell:true,echo:true});
      return 3*beat;
    }
  },
  { // 3. Stars over the city: warm slow pads with a few twinkling stars and their echo.
    name:'stars',
    bar(play,t,n){
      const len=6,[bass,chord]=STARS[n%STARS.length];
      play.pad(chord,t,len+1.5,.02);
      play.note(bass,t,len,.07);
      const count=2+n%3;
      for(let i=0;i<count;i++){
        const at=t+.8+i*(len-1.5)/count+((n+i)%2)*.4;
        play.note(TWINKLE[(n*5+i*3)%TWINKLE.length],at,2.2,.035,{bell:true,echo:true});
      }
      return len;
    }
  }
];

export function setupMusic(button){
  let context,master,echo,timer,isPlaying=false,index=0,nextTime=0,pending=false;
  let track=restoreTrack(),played=track!==null;
  track??=0;

  const frequency=(midi)=>440*2**((midi-69)/12);

  function cleanup(...nodes){return()=>{for(const node of nodes){try{node.disconnect()}catch{}}}}

  // opts.wave: oscillator type; opts.bell: quick strike with a quiet octave; opts.echo: also feed the echo.
  function note(midi,time,duration,volume,opts={}){
    if(!context||!master)return;
    try{
      const osc=context.createOscillator(),gain=context.createGain();
      osc.type=opts.wave||'sine';
      osc.frequency.value=frequency(midi);
      gain.gain.setValueAtTime(0,time);
      gain.gain.linearRampToValueAtTime(volume,time+(opts.bell?.01:.04));
      gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
      osc.connect(gain);
      gain.connect(master);
      if(opts.echo&&echo)gain.connect(echo);
      osc.start(time);
      osc.stop(time+duration+.1);
      osc.onended=cleanup(osc,gain);
      if(opts.bell)note(midi+12,time,duration*.5,volume*.25,{echo:opts.echo});
    }catch{}
  }

  // A soft, slightly detuned chord that swells in and fades out.
  function pad(midis,time,duration,volume){
    if(!context||!master)return;
    try{
      const filter=context.createBiquadFilter(),gain=context.createGain();
      filter.type='lowpass';
      filter.frequency.value=900;
      const fade=Math.min(1.5,duration/3);
      gain.gain.setValueAtTime(0,time);
      gain.gain.linearRampToValueAtTime(volume,time+fade);
      gain.gain.setValueAtTime(volume,time+duration-fade);
      gain.gain.linearRampToValueAtTime(0,time+duration);
      filter.connect(gain);
      gain.connect(master);
      const oscs=midis.flatMap((midi)=>[-8,8].map((cents)=>{
        const osc=context.createOscillator();
        osc.type='sawtooth';
        osc.frequency.value=frequency(midi);
        osc.detune.value=cents;
        osc.connect(filter);
        osc.start(time);
        osc.stop(time+duration+.1);
        return osc;
      }));
      oscs[0].onended=cleanup(...oscs,filter,gain);
    }catch{}
  }

  const play={note,pad};

  // Master volume plus a gentle echo (delay with feedback) that bells can send into.
  function connectOutput(){
    master=context.createGain();
    master.gain.value=.5;
    master.connect(context.destination);
    try{
      echo=context.createDelay(1);
      echo.delayTime.value=.42;
      const feedback=context.createGain(),wet=context.createGain();
      feedback.gain.value=.32;
      wet.gain.value=.35;
      echo.connect(feedback);
      feedback.connect(echo);
      echo.connect(wet);
      wet.connect(master);
    }catch{echo=null}
  }

  function schedule(){
    if(!context||!isPlaying)return;
    const song=MUSIC_TRACKS[track];
    while(nextTime<context.currentTime+.4){
      nextTime+=song.bar(play,nextTime,index++);
    }
  }

  function savePreference(value){try{localStorage.setItem('lamplighter-music',String(value))}catch{}}
  function restoreTrack(){try{const v=Number.parseInt(localStorage.getItem('lamplighter-music-track'),10);return v>=0&&v<MUSIC_TRACKS.length?v:null}catch{return null}}
  function saveTrack(){try{localStorage.setItem('lamplighter-music-track',String(track))}catch{}}

  function updateButton(){
    if(!button)return;
    const on=isPlaying||pending;
    // app.js re-labels the button on language change from data-track.
    if(button.dataset)button.dataset.track=String(track+1);
    button.textContent=on?t('musicOn').replace('{n}',track+1):t('musicOff');
    button.setAttribute('aria-pressed',String(on));
  }

  // Turning music on by hand plays the next track; resuming after a reload keeps the same one.
  async function start(next=false){
    if(next&&played)track=(track+1)%MUSIC_TRACKS.length;
    played=true;
    index=0;
    saveTrack();
    try{
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtx){
        if(button)button.textContent='Музика недоступна';
        return;
      }
      context??=new AudioCtx();
      if(!master)connectOutput();
      if(context.state==='suspended'){
        context.resume().catch(()=>{});
      }
      nextTime=context.currentTime+.05;
      isPlaying=true;
      pending=false;
      schedule();
      clearInterval(timer);
      timer=setInterval(schedule,120);
      savePreference(true);
      updateButton();
    }catch(err){
      console.warn('AudioContext start error:',err);
      if(button)button.textContent='Музика недоступна';
    }
  }

  async function stop(){
    clearInterval(timer);
    pending=false;
    isPlaying=false;
    // Drop the old output so its already-scheduled notes never bleed into the next track.
    if(master){cleanup(master,echo)();master=null;echo=null}
    if(context&&context.state!=='closed'){
      try{await context.suspend()}catch{}
    }
    savePreference(false);
    updateButton();
  }

  function restore(){try{const v=localStorage.getItem('lamplighter-music');return v===null?true:v==='true'}catch{return true}}

  if(button){
    button.onclick=async()=>{
      if(isPlaying||pending){
        await stop();
      }else{
        await start(true);
      }
    };
  }

  if(restore()){
    pending=true;
    updateButton();
    const resume=async(e)=>{
      if(!pending)return;
      if(e?.target===button||button?.contains(e?.target))return;
      document.removeEventListener('pointerdown',resume);
      document.removeEventListener('keydown',resume);
      await start();
    };
    document.addEventListener('pointerdown',resume);
    document.addEventListener('keydown',resume);
  }else{
    isPlaying=false;
    pending=false;
    updateButton();
  }

  document.addEventListener('visibilitychange',()=>{
    if(!context||!isPlaying)return;
    if(document.hidden){
      clearInterval(timer);
      try{context.suspend()}catch{}
    }else{
      context.resume().then(()=>{
        if(!isPlaying)return;
        nextTime=context.currentTime+.1;
        schedule();
        clearInterval(timer);
        timer=setInterval(schedule,120);
      }).catch(()=>{});
    }
  });
}

export function setupEffects(button){
  let context, on = true;
  function savePreference(value){try{localStorage.setItem('lamplighter-sound',String(value))}catch{}}
  function restore(){try{const v=localStorage.getItem('lamplighter-sound');return v===null?true:v==='true'}catch{return true}}
  on = restore();
  function updateButton(){
    if(!button)return;
    button.textContent=on?t('soundOn'):t('soundOff');
    button.setAttribute('aria-pressed',String(on));
  }
  updateButton();
  if(button){
    button.onclick=()=>{
      on=!on;
      savePreference(on);
      updateButton();
    };
  }
  function getContext(){
    if(!on)return null;
    try{
      context??=new AudioContext();
      if(context.state==='suspended')context.resume();
      return context;
    }catch{return null}
  }
  function tone(start,frequency,duration,volume,type='sine',endFrequency=frequency){
    if(!on)return;
    const audio=getContext();if(!audio)return;
    const oscillator=audio.createOscillator(),gain=audio.createGain();
    oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,start);oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),start+duration);
    gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(start);oscillator.stop(start+duration+.03);
  }
  return {
    step(){if(!on)return;const audio=getContext();if(!audio)return;const now=audio.currentTime;tone(now,180,.05,.08,'triangle',90)},
    turn(){if(!on)return;const audio=getContext();if(!audio)return;const now=audio.currentTime;tone(now,420,.035,.06,'sine',310)},
    jump(){if(!on)return;const audio=getContext();if(!audio)return;const now=audio.currentTime;tone(now,260,.14,.09,'sine',520);tone(now+.18,140,.06,.08,'triangle',70)},
    pickup(){if(!on)return;const audio=getContext();if(!audio)return;const now=audio.currentTime;tone(now,587,.09,.08,'sine',880);tone(now+.07,880,.12,.07,'sine',1175)},
    repair(){if(!on)return;const audio=getContext();if(!audio)return;const now=audio.currentTime;tone(now,360,.07,.1,'sawtooth',520);tone(now+.18,420,.07,.1,'sawtooth',580);tone(now+.36,480,.08,.11,'sawtooth',660);tone(now+.22,1100,.04,.04,'triangle',750);tone(now+.40,1300,.04,.04,'triangle',900);tone(now+.55,660,.14,.08,'sine',880);tone(now+.68,880,.2,.07,'sine',1320)},
    call(){if(!on)return;const audio=getContext();if(!audio)return;const now=audio.currentTime;tone(now,660,.06,.06,'sine',990)},
    spark(){if(!on)return;const audio=getContext();if(!audio)return;const now=audio.currentTime;tone(now,820,.04,.08,'sawtooth',140);tone(now+.03,1200,.03,.07,'sawtooth',220)},
    shock(){if(!on)return;const audio=getContext();if(!audio)return;const now=audio.currentTime;
      for(const [index,frequency] of [1180,720,1320,640,960,510].entries()){
        tone(now+index*.075,frequency,.09,.105,'sawtooth',frequency*.22);
      }
      tone(now,145,.55,.09,'triangle',48);
      tone(now+.28,90,.22,.07,'sawtooth',35);
    },
    light(){if(!on)return;const audio=getContext();if(!audio)return;const now=audio.currentTime;tone(now,880,.16,.08,'sine',1320);tone(now+.07,1320,.2,.055,'sine',1760)},
    unscrew(){if(!on)return;const audio=getContext();if(!audio)return;const now=audio.currentTime;tone(now,650,.1,.09,'triangle',320);tone(now+.08,440,.14,.07,'sine',220);tone(now+.18,280,.18,.05,'sine',140)},
    fall(){if(!on)return;const audio=getContext();if(!audio)return;const now=audio.currentTime;
      // Scream: high-pitched glide falling fast (cartoon "AAAAH!")
      tone(now,1100,.9,.13,'sine',180);
      tone(now+.02,1050,.88,.09,'triangle',170);
      tone(now+.05,1000,.85,.11,'sine',160);
      // Air whoosh
      tone(now+.08,400,.7,.06,'sawtooth',55);
      // Thud on impact
      tone(now+.82,120,.22,.18,'sawtooth',28);
      tone(now+.82,60,.25,.14,'triangle',20);
    },
    win(){if(!on)return;const audio=getContext();if(!audio)return;const now=audio.currentTime;[523,659,784,1047].forEach((frequency,index)=>tone(now+index*.12,frequency,.32,.09,'sine',frequency*1.04));tone(now+.48,1047,.65,.12,'sine',1319)},
    sad(){if(!on)return;const audio=getContext();if(!audio)return;const now=audio.currentTime;tone(now,392,.3,.08,'triangle',370);tone(now+.34,370,.3,.08,'triangle',349);tone(now+.68,349,.3,.08,'triangle',330);tone(now+1.02,330,.85,.09,'triangle',247)},
    cry(){if(!on)return;const audio=getContext();if(!audio)return;const now=audio.currentTime;for(let index=0;index<5;index++)tone(now+index*.33,640-index*20,.16,.05,'sine',430);tone(now+1.75,720,.7,.05,'sine',360)},
    angry(){if(!on)return;const audio=getContext();if(!audio)return;const now=audio.currentTime;tone(now,260,.14,.11,'sawtooth',170);tone(now+.12,210,.16,.13,'sawtooth',130);tone(now+.26,160,.24,.15,'sawtooth',80)}
  };
}
