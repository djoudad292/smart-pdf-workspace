"use strict";(()=>{var L="https://smart-pdf-backend.onrender.com";function P(){var n;let e=document.currentScript;return e!=null&&e.dataset.companyId?e.dataset.companyId:((n=Array.from(document.querySelectorAll("script[data-company-id]"))[0])==null?void 0:n.dataset.companyId)||null}function o(e,t={},n){let r=document.createElement(e);return Object.assign(r,t),n&&(r.className=n),r}function k(e,t,n){return o(e,{textContent:t},n)}function E(){let e=P();if(!e){console.warn("[SmartPDFWidget] Missing data-company-id attribute.");return}fetch(`${L}/widget/${e}/config`).then(t=>{if(!t.ok)throw new Error(`HTTP ${t.status}`);return t.json()}).then(t=>{if(t.documents.length===0){console.warn("[SmartPDFWidget] No published documents for this company.");return}A(t,e)}).catch(t=>{console.warn("[SmartPDFWidget] Could not load widget config:",t.message)})}function A(e,t){let n=o("div"),r=n.attachShadow({mode:"open"});r.adoptedStyleSheets=[R(e)],document.body.appendChild(n);let M=e.position!=="left",z=[],u=!1,g=o("button",{type:"button"},"spw-launcher");g.textContent=e.title;let f=o("div",{},`spw-panel ${M?"spw-right":"spw-left"}`);f.style.display="none";let v=o("div",{},"spw-header"),H=k("span",e.title,"spw-header-title"),h=o("button",{type:"button"},"spw-close");h.textContent="\xD7",v.append(H,h);let i=o("div",{},"spw-scroll"),m=k("p","Ask anything about our published documents.","spw-empty");i.appendChild(m);let S=o("div",{},"spw-input-row"),w=o("input",{type:"text",placeholder:"Ask a question\u2026",autocomplete:"off"},"spw-input"),b=o("button",{type:"button"},"spw-send");b.textContent="\u27A4",S.append(w,b),f.append(v,i,S),r.append(g,f);let j=()=>{let s=o("div",{},"spw-msg spw-assistant spw-typing");return s.textContent="Thinking\u2026",i.appendChild(s),i.scrollTop=i.scrollHeight,s},y=(s,x)=>{i.contains(m)&&m.remove();let a=o("div",{},`spw-msg spw-${s}`),p=k("span",x,"spw-bubble");return a.appendChild(p),i.appendChild(a),i.scrollTop=i.scrollHeight,a},T=async()=>{let s=w.value.trim();if(!s)return;w.value="",z.push({role:"user",text:s}),y("user",s);let x=j();try{let a=await fetch(`${L}/widget/ask`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({companyId:t,question:s})});if(!a.ok){let d=`Request failed (${a.status})`;try{d=(await a.json()).message||d}catch(c){}throw new Error(d)}let p=await a.json();x.remove();let C=y("assistant",p.answer);if(p.sources.length>0){let d=o("button",{type:"button"},"spw-sources-toggle");d.textContent=`Show ${p.sources.length} source${p.sources.length>1?"s":""}`;let c=o("ul",{},"spw-sources");c.style.display="none",p.sources.forEach(l=>{let $=o("li",{},"spw-source"),I=l.documentTitle?` \xB7 ${l.documentTitle}`:"";$.textContent=`${l.chunkText.slice(0,160)}${l.chunkText.length>160?"\u2026":""} (${Math.round(l.similarity*100)}%${I})`,c.appendChild($)}),d.addEventListener("click",()=>{let l=c.style.display==="none";c.style.display=l?"block":"none",d.textContent=l?"Hide sources":`Show ${p.sources.length} source${p.sources.length>1?"s":""}`}),C.appendChild(d),C.appendChild(c)}i.scrollTop=i.scrollHeight}catch(a){x.remove(),y("assistant",`Sorry, something went wrong: ${a.message}`)}};g.addEventListener("click",()=>{u=!u,f.style.display=u?"flex":"none",g.style.display=u?"none":"block",u&&w.focus()}),h.addEventListener("click",()=>{u=!1,f.style.display="none",g.style.display="block"}),b.addEventListener("click",T),w.addEventListener("keydown",s=>{s.key==="Enter"&&T()})}function R(e){let t=new CSSStyleSheet,n=e.color,r=e.position!=="left"?"right":"left";return t.replaceSync(`
    :host { all: initial; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

    .spw-launcher {
      position: fixed;
      ${r}: 24px;
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
      ${r}: 24px;
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
    .spw-typing { color: #888; font-size: 13px; font-style: italic; }

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
