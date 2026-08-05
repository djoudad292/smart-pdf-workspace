"use strict";(()=>{var L="https://smart-pdf-backend-vyh7.onrender.com";function A(){var n;let e=document.currentScript;return e!=null&&e.dataset.companyId?e.dataset.companyId:((n=Array.from(document.querySelectorAll("script[data-company-id]"))[0])==null?void 0:n.dataset.companyId)||null}function o(e,t={},n){let l=document.createElement(e);return Object.assign(l,t),n&&(l.className=n),l}function v(e,t,n){return o(e,{textContent:t},n)}function E(){let e=A();if(!e){console.warn("[SmartPDFWidget] Missing data-company-id attribute.");return}fetch(`${L}/widget/${e}/config`).then(t=>{if(!t.ok)throw new Error(`HTTP ${t.status}`);return t.json()}).then(t=>{if(t.documents.length===0){console.warn("[SmartPDFWidget] No published documents for this company.");return}R(t,e)}).catch(t=>{console.warn("[SmartPDFWidget] Could not load widget config:",t.message)})}function R(e,t){let n=o("div"),l=n.attachShadow({mode:"open"});l.adoptedStyleSheets=[W(e)],document.body.appendChild(n);let M=e.position!=="left",H=[],g=!1,w=o("button",{type:"button"},"spw-launcher");w.textContent=e.title;let h=o("div",{},`spw-panel ${M?"spw-right":"spw-left"}`);h.style.display="none";let S=o("div",{},"spw-header"),z=v("span",e.title,"spw-header-title"),x=o("button",{type:"button"},"spw-close");x.textContent="\xD7",S.append(z,x);let r=o("div",{},"spw-scroll"),b=v("p","Ask anything about our published documents.","spw-empty");r.appendChild(b);let T=o("div",{},"spw-input-row"),m=o("input",{type:"text",placeholder:"Ask a question\u2026",autocomplete:"off"},"spw-input"),y=o("button",{type:"button"},"spw-send");y.textContent="\u27A4",T.append(m,y),h.append(S,r,T),l.append(w,h);let I=()=>{let i=o("div",{},"spw-msg spw-assistant"),c=o("div",{},"spw-bubble spw-typing");for(let s=0;s<3;s++)c.appendChild(o("span",{},`spw-dot spw-dot-${s}`));return i.appendChild(c),r.appendChild(i),r.scrollTop=r.scrollHeight,i},k=(i,c)=>{r.contains(b)&&b.remove();let s=o("div",{},`spw-msg spw-${i}`),a=v("span",c,"spw-bubble");return s.appendChild(a),r.appendChild(s),r.scrollTop=r.scrollHeight,s},j=(i,c,s)=>{let a=i.querySelector(".spw-bubble");if(!a){s();return}let f=c.split(" "),p=0,d=setInterval(()=>{p+=1,a.textContent=f.slice(0,p).join(" "),r.scrollTop=r.scrollHeight,p>=f.length&&(clearInterval(d),s())},18);return d},C=async()=>{let i=m.value.trim();if(!i)return;m.value="",H.push({role:"user",text:i}),k("user",i);let c=I();try{let s=await fetch(`${L}/widget/ask`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({companyId:t,question:i})});if(!s.ok){let p=`Request failed (${s.status})`;try{p=(await s.json()).message||p}catch(d){}throw new Error(p)}let a=await s.json();c.remove();let f=k("assistant","");j(f,a.answer,()=>{if(a.sources.length>0){let p=o("button",{type:"button"},"spw-sources-toggle");p.textContent=`Show ${a.sources.length} source${a.sources.length>1?"s":""}`;let d=o("ul",{},"spw-sources");d.style.display="none",a.sources.forEach(u=>{let $=o("li",{},"spw-source"),P=u.documentTitle?` \xB7 ${u.documentTitle}`:"";$.textContent=`${u.chunkText.slice(0,160)}${u.chunkText.length>160?"\u2026":""} (${Math.round(u.similarity*100)}%${P})`,d.appendChild($)}),p.addEventListener("click",()=>{let u=d.style.display==="none";d.style.display=u?"block":"none",p.textContent=u?"Hide sources":`Show ${a.sources.length} source${a.sources.length>1?"s":""}`}),f.appendChild(p),f.appendChild(d)}r.scrollTop=r.scrollHeight})}catch(s){c.remove(),k("assistant",`Sorry, something went wrong: ${s.message}`)}};w.addEventListener("click",()=>{g=!g,h.style.display=g?"flex":"none",w.style.display=g?"none":"block",g&&m.focus()}),x.addEventListener("click",()=>{g=!1,h.style.display="none",w.style.display="block"}),y.addEventListener("click",C),m.addEventListener("keydown",i=>{i.key==="Enter"&&C()})}function W(e){let t=new CSSStyleSheet,n=e.color,l=e.position!=="left"?"right":"left";return t.replaceSync(`
    :host { all: initial; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

    .spw-launcher {
      position: fixed;
      ${l}: 24px;
      bottom: 24px;
      z-index: 2147483000;
      background: ${n};
      color: #fff;
      border: none;
      border-radius: 999px;
      padding: 14px 22px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 6px 24px rgba(0,0,0,0.25);
      transition: transform 0.15s ease;
      display: flex; align-items: center; gap: 8px;
    }
    .spw-launcher:hover { transform: scale(1.05); }

    .spw-panel {
      position: fixed;
      ${l}: 24px;
      bottom: 24px;
      z-index: 2147483001;
      width: 380px;
      max-width: calc(100vw - 32px);
      height: min(560px, calc(100vh - 48px));
      border-radius: 16px;
      background: #fff;
      color: #111;
      box-shadow: 0 12px 48px rgba(0,0,0,0.3);
      overflow: hidden;
      flex-direction: column;
    }

    .spw-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px;
      background: ${n};
      color: #fff;
      font-weight: 600;
      font-size: 15px;
    }
    .spw-header-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .spw-close { background: none; border: none; color: #fff; font-size: 22px; cursor: pointer; line-height: 1; padding: 0 4px; }

    .spw-scroll { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .spw-empty { color: #888; font-size: 13px; text-align: center; margin-top: 24px; }

    .spw-msg { display: flex; }
    .spw-user { justify-content: flex-end; }
    .spw-assistant { justify-content: flex-start; }
    .spw-bubble {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .spw-user .spw-bubble { background: ${n}; color: #fff; border-bottom-right-radius: 4px; }
    .spw-assistant .spw-bubble { background: #f1f3f6; color: #111; border-bottom-left-radius: 4px; }
    .spw-typing { display: flex; align-items: center; gap: 5px; }
    .spw-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #9ca3af;
      animation: spw-bounce 1.2s infinite ease-in-out;
    }
    .spw-dot-1 { animation-delay: 0ms; }
    .spw-dot-2 { animation-delay: 160ms; }
    .spw-dot-3 { animation-delay: 320ms; }
    @keyframes spw-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
      30% { transform: translateY(-4px); opacity: 1; }
    }

    .spw-sources-toggle {
      background: none; border: none; color: ${n};
      font-size: 12px; cursor: pointer; margin-top: 6px; padding: 0;
      text-decoration: underline;
    }
    .spw-sources { margin-top: 6px; padding-left: 16px; list-style: disc; }
    .spw-source { color: #666; font-size: 12px; margin-top: 4px; }

    .spw-input-row {
      display: flex; gap: 8px; padding: 12px;
      border-top: 1px solid #e5e7eb;
      background: #fff;
    }
    .spw-input {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 999px;
      padding: 10px 16px;
      font-size: 14px;
      outline: none;
    }
    .spw-input:focus { border-color: ${n}; }
    .spw-send {
      width: 40px; height: 40px;
      border: none; border-radius: 999px;
      background: ${n}; color: #fff;
      font-size: 16px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
  `),t}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",E):E();})();
