'use client';
import { useEffect, useState } from 'react';

const LANGS = ['en','he','pt','es'] as const;
type Lang = typeof LANGS[number];

const pillStyle = (active: boolean, color: string): React.CSSProperties => ({
  background: active ? color + '33' : 'none',
  border: 'none',
  color: active ? color : '#6b7280',
  padding: '3px 7px',
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all .15s',
  fontFamily: 'inherit',
  letterSpacing: '.4px',
});

export function LangSwitcher({ color }: { color: string }) {
  const [lang, setLangState] = useState<Lang>('en');
  useEffect(() => {
    setLangState((localStorage.getItem('wl_lang') as Lang) || 'en');
  }, []);
  function pick(l: Lang) {
    localStorage.setItem('wl_lang', l);
    setLangState(l);
    window.location.reload();
  }
  return (
    <div style={{display:'flex',gap:2,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:8,padding:3}}>
      {LANGS.map(l => (
        <button key={l} style={pillStyle(lang===l, color)} onClick={() => pick(l)}>
          {l === 'he' ? 'עב' : l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function WizeOnboarding() {
  const [show, setShow] = useState(false);
  const OB_KEY = 'wl_ob_deal';
  const OB: Record<string, {title:string,sub:string,features:string[],btn:string,nosee:string}> = {
    en: { title:'Welcome to WizeDeal', sub:'Analyze real estate deals with AI', features:['🏠 AI-powered ROI, yield & cash flow calculator','📊 Rental estimates & live market data','🤖 Deal scoring with personalized AI insights'], btn:'Get started →', nosee:"Don't show on startup" },
    he: { title:'ברוך הבא ל-WizeDeal', sub:'נתח עסקאות נדל"ן עם AI', features:['🏠 מחשבון ROI, תשואה ותזרים מזומנים','📊 הערכות שכירות ונתוני שוק חיים','🤖 ניקוד עסקה עם תובנות AI אישיות'], btn:'בואו נתחיל ←', nosee:'אל תציג שוב בהפעלה' },
    pt: { title:'Bem-vindo ao WizeDeal', sub:'Analise negócios imobiliários com IA', features:['🏠 Calculadora de ROI, rendimento e fluxo de caixa','📊 Estimativas de aluguel e dados de mercado ao vivo','🤖 Pontuação de negócios com insights de IA'], btn:'Vamos lá →', nosee:'Não mostrar na inicialização' },
    es: { title:'Bienvenido a WizeDeal', sub:'Analiza negocios inmobiliarios con IA', features:['🏠 Calculadora de ROI, rendimiento y flujo de caja','📊 Estimaciones de alquiler y datos de mercado en vivo','🤖 Puntuación de negocios con insights de IA'], btn:'Empecemos →', nosee:'No mostrar al iniciar' },
  };
  const [t, setT] = useState(OB.en);
  useEffect(() => {
    const lang = localStorage.getItem('wl_lang') || 'en';
    setT(OB[lang] || OB.en);
    if (!localStorage.getItem(OB_KEY)) setShow(true);
  }, []);
  if (!show) return (
    <button onClick={() => setShow(true)} style={{position:'fixed',bottom:20,left:20,zIndex:9997,width:32,height:32,borderRadius:'50%',background:'rgba(139,92,246,0.15)',border:'1px solid rgba(139,92,246,0.4)',color:'#8b5cf6',fontSize:14,fontWeight:700,cursor:'pointer',lineHeight:1}}>?</button>
  );
  return (
    <div style={{position:'fixed',inset:0,zIndex:99998,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'Inter,-apple-system,sans-serif'}}>
      <div style={{background:'#0d1117',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,padding:36,maxWidth:440,width:'100%',boxShadow:'0 30px 80px rgba(0,0,0,0.6)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
          <svg width="36" height="36" viewBox="0 0 100 100"><defs><linearGradient id="dobg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8b5cf6"/><stop offset="1" stopColor="#7c3aed"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#dobg)"/><text x="50" y="72" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="58" fill="white">W</text></svg>
          <div><div style={{fontSize:18,fontWeight:800,color:'#eef2ff',letterSpacing:'-0.4px'}}>{t.title}</div><div style={{fontSize:13,color:'#6b7280',marginTop:2}}>{t.sub}</div></div>
        </div>
        <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',margin:'20px 0'}}/>
        <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:24}}>
          {t.features.map((f,i) => <div key={i} style={{fontSize:14,color:'#94a3b8'}}>{f}</div>)}
        </div>
        <button onClick={() => { localStorage.setItem(OB_KEY,'1'); setShow(false); }} style={{width:'100%',padding:12,borderRadius:10,background:'#8b5cf6',border:'none',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t.btn}</button>
        <label style={{display:'flex',alignItems:'center',gap:8,marginTop:14,fontSize:12,color:'#4b5563',cursor:'pointer'}}>
          <input type="checkbox" onChange={e => { if(e.target.checked) localStorage.setItem(OB_KEY,'1'); else localStorage.removeItem(OB_KEY); }}/> {t.nosee}
        </label>
      </div>
    </div>
  );
}

export function WizeBar() {
  const [label, setLabel] = useState('← All Tools');
  useEffect(() => {
    const l = localStorage.getItem('wl_lang') || 'en';
    const labels: Record<string, string> = {
      he: '← כל הכלים', en: '← All Tools',
      pt: '← Todas as ferramentas', es: '← Todas las herramientas',
    };
    setLabel(labels[l] || '← All Tools');
  }, []);
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,height:36,zIndex:99999,background:'rgba(5,6,15,0.96)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',fontFamily:'Inter,-apple-system,sans-serif',boxSizing:'border-box',direction:'ltr'}}>
      <a href="https://finsightai.github.io/wizelife/dashboard.html" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none',lineHeight:1}}>
        <svg width="20" height="20" viewBox="0 0 100 100" style={{flexShrink:0}}><defs><linearGradient id="wlbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#wlbg)"/><text x="50" y="72" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="58" fill="white">W</text></svg>
        <span style={{fontSize:13,fontWeight:700,color:'#eef2ff',letterSpacing:'-0.3px'}}>WizeLife</span>
        <span style={{fontSize:11,fontWeight:600,color:'#8b5cf6',background:'rgba(139,92,246,0.12)',padding:'2px 8px',borderRadius:99,lineHeight:1.4}}>WizeDeal</span>
      </a>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <LangSwitcher color="#8b5cf6" />
        <a href="https://finsightai.github.io/wizelife/dashboard.html" style={{fontSize:12,color:'#7b88ad',textDecoration:'none',fontWeight:500,whiteSpace:'nowrap'}}>{label}</a>
      </div>
    </div>
  );
}
