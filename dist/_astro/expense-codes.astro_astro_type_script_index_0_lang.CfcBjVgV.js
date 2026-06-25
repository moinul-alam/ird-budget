import{s as m}from"./supabase.DyS_ZLhl.js";import{t as h}from"./bangla.B9xk0lp1.js";import{s as i}from"./strings.BTnzgeWt.js";document.addEventListener("astro:page-load",async()=>{if(!window.location.pathname.includes("/superadmin/expense-codes"))return;const g=document.getElementById("loading-state"),c=document.getElementById("codes-container"),y=document.getElementById("add-code-btn"),b=document.getElementById("add-code-form-container"),x=document.getElementById("cancel-code-btn"),f=document.getElementById("add-code-form");let r=[];const v=async()=>{try{const{data:t,error:a}=await m.from("expense_codes").select("*").order("sort_order",{ascending:!0});if(a)throw a;r=t||[],w()}catch(t){console.error(t),c&&(c.innerHTML='<p class="text-center text-rose-500">ডেটা লোড করতে সমস্যা হয়েছে।</p>')}finally{g?.classList.add("hidden"),c?.classList.remove("hidden")}},w=()=>{if(!c)return;if(c.innerHTML="",r.length===0){c.innerHTML='<p class="text-center text-slate-500 bg-white p-8 rounded-2xl border border-slate-200">কোনো কোড পাওয়া যায়নি</p>';return}const t={};r.forEach(a=>{const e=a.parent_code||"Others";t[e]||(t[e]={title:a.parent_title,codes:[]}),t[e].codes.push(a)});for(const[a,e]of Object.entries(t)){const d=document.createElement("div");d.className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden";const l=`
          <div class="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="px-2.5 py-1 bg-blue-100 text-blue-800 font-mono font-bold rounded-lg">${h(a)}</span>
              <div class="relative group cursor-text editable-parent-wrapper" data-pcode="${a}">
                  <h2 class="text-lg font-bold text-slate-800 parent-title-display">${e.title||"--"}</h2>
                  <svg xmlns="http://www.w3.org/2000/svg" class="absolute -right-5 top-1 h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
              </div>
              <input type="text" class="hidden text-lg font-bold px-2 py-0 border-2 border-blue-500 rounded outline-none parent-title-input" value="${e.title||""}">
            </div>
          </div>
        `;let n="";e.codes.forEach(s=>{const o=s.active?"bg-emerald-500":"bg-slate-300",u=s.is_manual?"checked":"";n+=`
             <tr class="hover:bg-slate-50 transition-colors group/row">
                <td class="p-3 pl-4 w-32">
                  <span class="font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">${h(s.code)}</span>
                </td>
                <td class="p-3 relative w-1/3">
                  <div class="flex items-center gap-2 group-hover/row:bg-blue-50/50 -mx-2 px-2 py-1 rounded-lg transition-colors cursor-text editable-name-wrapper" data-id="${s.id}">
                    <span class="flex-1 font-medium text-slate-800 name-display">${s.name}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400 opacity-0 group-hover/row:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <input type="text" class="hidden absolute inset-y-2 left-2 right-2 px-3 border-2 border-blue-500 rounded-lg outline-none font-sans name-input" value="${s.name}">
                </td>
                <td class="p-3 text-slate-500 font-mono text-sm">${s.formula_key||"--"}</td>
                <td class="p-3 text-center">
                   <input type="checkbox" disabled ${u} class="w-4 h-4 rounded text-blue-600">
                </td>
                <td class="p-3 pr-4 text-right">
                  <button data-id="${s.id}" data-active="${s.active}" class="toggle-active-btn relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${o}">
                    <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${s.active?"translate-x-6":"translate-x-1"}"></span>
                  </button>
                </td>
             </tr>
           `}),d.innerHTML=`
          ${l}
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead class="text-xs uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th class="p-3 pl-4 font-semibold">${i.superAdmin.codes.code}</th>
                  <th class="p-3 font-semibold">${i.superAdmin.codes.name}</th>
                  <th class="p-3 font-semibold">${i.superAdmin.codes.formulaKey}</th>
                  <th class="p-3 text-center font-semibold">${i.superAdmin.codes.isManual}</th>
                  <th class="p-3 pr-4 text-right font-semibold">${i.superAdmin.codes.active}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                ${n}
              </tbody>
            </table>
          </div>
        `,c.appendChild(d)}L()},L=()=>{document.querySelectorAll(".toggle-active-btn").forEach(t=>{t.addEventListener("click",async a=>{const e=a.currentTarget,d=e.getAttribute("data-id"),n=!(e.getAttribute("data-active")==="true");e.disabled=!0;try{await m.from("expense_codes").update({active:n}).eq("id",d),e.setAttribute("data-active",String(n)),e.className=`toggle-active-btn relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${n?"bg-emerald-500":"bg-slate-300"}`,e.innerHTML=`<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${n?"translate-x-6":"translate-x-1"}"></span>`;const s=r.find(o=>o.id==d);s&&(s.active=n)}catch{alert("সংরক্ষণ ব্যর্থ হয়েছে")}finally{e.disabled=!1}})}),document.querySelectorAll(".editable-name-wrapper").forEach(t=>{const a=t.querySelector(".name-display"),e=t.nextElementSibling,d=t.getAttribute("data-id");t.addEventListener("click",()=>{t.classList.add("hidden"),e.classList.remove("hidden"),e.focus()});const l=async()=>{const n=e.value.trim(),s=r.find(o=>o.id==d);if(!n||n===s.name){e.classList.add("hidden"),t.classList.remove("hidden");return}e.disabled=!0;try{await m.from("expense_codes").update({name:n}).eq("id",d),s.name=n,a&&(a.textContent=n),e.classList.add("border-emerald-500","bg-emerald-50"),setTimeout(()=>{e.classList.add("hidden"),t.classList.remove("hidden"),e.classList.remove("border-emerald-500","bg-emerald-50"),e.disabled=!1},300)}catch{alert("সংরক্ষণ ব্যর্থ হয়েছে"),e.disabled=!1,e.focus()}};e.addEventListener("blur",l),e.addEventListener("keydown",n=>{n.key==="Enter"?e.blur():n.key==="Escape"&&(e.value=r.find(s=>s.id==d).name,e.blur())})}),document.querySelectorAll(".editable-parent-wrapper").forEach(t=>{const a=t.querySelector(".parent-title-display"),e=t.nextElementSibling,d=t.getAttribute("data-pcode");t.addEventListener("click",()=>{t.classList.add("hidden"),e.classList.remove("hidden"),e.focus()});const l=async()=>{const n=e.value.trim(),s=r.find(o=>o.parent_code===d);if(!n||!s||n===s.parent_title){e.classList.add("hidden"),t.classList.remove("hidden");return}e.disabled=!0;try{await m.from("expense_codes").update({parent_title:n}).eq("parent_code",d),r.forEach(o=>{o.parent_code===d&&(o.parent_title=n)}),a&&(a.textContent=n),e.classList.add("border-emerald-500","bg-emerald-50"),setTimeout(()=>{e.classList.add("hidden"),t.classList.remove("hidden"),e.classList.remove("border-emerald-500","bg-emerald-50"),e.disabled=!1},300)}catch{alert("সংরক্ষণ ব্যর্থ হয়েছে"),e.disabled=!1,e.focus()}};e.addEventListener("blur",l),e.addEventListener("keydown",n=>{n.key==="Enter"&&e.blur()})})};y?.addEventListener("click",()=>{b?.classList.remove("hidden")}),x?.addEventListener("click",()=>{b?.classList.add("hidden"),f.reset()}),f?.addEventListener("submit",async t=>{t.preventDefault();const a=document.getElementById("new-parent-code").value.trim(),e=document.getElementById("new-parent-title").value.trim(),d=document.getElementById("new-code").value.trim(),l=document.getElementById("new-name").value.trim(),n=document.getElementById("new-formula").value.trim(),s=parseInt(document.getElementById("new-sort").value),o=document.getElementById("new-is-manual").checked,u=document.getElementById("save-code-btn");u.disabled=!0,u.textContent=i.saving;try{const{error:p}=await m.from("expense_codes").insert({parent_code:a,parent_title:e,code:d,name:l,formula_key:n||null,sort_order:s,is_manual:o,active:!0});if(p)throw p;f.reset(),b?.classList.add("hidden"),await v()}catch(p){console.error(p),alert(i.errors.saveFailed)}finally{u.disabled=!1,u.textContent=i.fields.save}}),v()});
