import{s as d}from"./supabase.DyS_ZLhl.js";import{s as v}from"./strings.BTnzgeWt.js";import{c as M}from"./bangla.B9xk0lp1.js";import{calculateAll as C,codeFormulas as V}from"./formulas.CPdG5S8e.js";document.addEventListener("astro:page-load",async()=>{if(!window.location.pathname.includes("/office/budget-sheet"))return;const i=sessionStorage.getItem("submission_id"),$=sessionStorage.getItem("cycle_id");if(!i||!$){window.location.href="/";return}const c=document.getElementById("init-loading"),k=document.getElementById("loading-text"),b=document.getElementById("budget-container"),_=document.getElementById("budget-body"),T=document.getElementById("grand-total-final"),u=document.getElementById("recalculate-btn"),m=document.getElementById("final-submit-btn"),D=document.getElementById("return-dashboard-btn"),q=document.getElementById("save-indicator"),x=document.getElementById("save-spinner"),S=document.getElementById("save-check"),f=document.getElementById("save-text");let l=!1,r=[];const H=()=>{q?.classList.remove("opacity-0"),x?.classList.remove("hidden"),S?.classList.add("hidden"),f&&(f.textContent=v.saving)},N=()=>{x?.classList.add("hidden"),S?.classList.remove("hidden"),f&&(f.textContent=v.saved),setTimeout(()=>q?.classList.add("opacity-0"),3e3)},y=()=>{let s=0;r.forEach(t=>{if(V[t.expense_codes?.code]!==void 0)s+=parseFloat(t.auto_value)||0;else{const e=document.getElementById(`manual-${t.id}`),a=e&&e.value?parseInt(e.value,10):t.manual_value||0;s+=a}}),T&&(T.textContent=M(s))},j=async(s,t)=>{if(l)return;H();const n=t.value?parseInt(t.value,10):null;try{await d.from("budget_sheet").update({manual_value:n}).eq("id",s);const e=r.findIndex(a=>a.id===parseInt(s));e>-1&&(r[e].manual_value=n),y(),N()}catch(e){console.error("Row save error",e),f&&(f.textContent=v.saveFailed),x?.classList.add("hidden")}},R=()=>{if(!_)return;_.innerHTML="";let s=null;r.forEach((t,n)=>{const e=t.expense_codes?.parent_code||null,a=t.expense_codes?.parent_title||"";if(e&&e!==s){const h=document.createElement("tr");h.className="bg-slate-200 border-b-2 border-slate-300 cursor-pointer hover:bg-slate-300 transition-colors group",h.innerHTML=`
                    <td class="p-3 border-r border-slate-300 text-center">
                        <span class="inline-block px-2.5 py-1 bg-slate-800 text-white font-mono text-sm rounded-lg font-bold">${e}</span>
                    </td>
                    <td colspan="2" class="p-3 text-slate-800 font-bold">
                        <div class="flex items-center justify-between w-full">
                            <span>${a}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transform transition-transform duration-200 text-slate-500 group-hover:text-slate-800" id="icon-${e}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </td>
                `,h.addEventListener("click",()=>{const J=document.querySelectorAll(`.child-of-${e}`),F=document.getElementById(`icon-${e}`);let I=!1;J.forEach(B=>{B.classList.contains("hidden")?(B.classList.remove("hidden"),I=!1):(B.classList.add("hidden"),I=!0)}),I?F?.classList.add("-rotate-90"):F?.classList.remove("-rotate-90")}),_.appendChild(h),s=e}const o=l?"disabled":"",p=n%2===0?"bg-white":"bg-slate-50",w=t.expense_codes?.name||"Unknown",A=t.expense_codes?.code||"Unknown",z=V[A]!==void 0,O=parseFloat(t.auto_value)||0,G=t.manual_value!==null?t.manual_value:"",L=document.createElement("tr");L.className=`${p} hover:bg-blue-50/50 transition-colors group ${e?`child-of-${e}`:""}`;let E="";z?E=`
                <td class="p-4 border-r border-slate-100 text-right bg-slate-50/50 group-hover:bg-transparent transition-colors font-mono text-slate-700 font-bold" id="auto-val-cell-${t.id}">
                    ${M(O)}
                </td>`:E=`
                <td class="p-3 text-right bg-indigo-50/30 group-hover:bg-transparent transition-colors">
                    <input type="number" min="0" id="manual-${t.id}" value="${G}" placeholder="সম্পাদনা করুন" class="w-full max-w-[180px] ml-auto px-3 py-2 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-right font-mono text-indigo-900 font-bold manual-input" ${o} />
                </td>`,L.innerHTML=`
            <td class="p-3 border-r border-slate-100 text-center">
                <span class="inline-block px-2.5 py-1 bg-slate-200 text-slate-700 font-mono text-sm rounded-lg font-bold">${A}</span>
            </td>
            <td class="p-4 border-r border-slate-100 font-medium text-slate-800">${w}</td>
            ${E}
            `,_.appendChild(L)}),y(),P()},P=()=>{if(l)return;let s=new Map;document.querySelectorAll(".manual-input").forEach(n=>{n.addEventListener("input",()=>{y()}),n.addEventListener("blur",e=>{const a=e.target,o=a.id.replace("manual-","");s.has(o)&&clearTimeout(s.get(o)),s.set(o,setTimeout(()=>{j(o,a)},500))})})},U=async()=>{if(!l){b?.classList.add("hidden"),c?.classList.remove("hidden"),k&&(k.textContent=v.budgetSheet.recalculating),u?.classList.add("hidden");try{console.log("Recalculating budget sheet...");const s=await C(i,d);for(const n of s){const e=r.find(a=>a.code_id===n.code_id);e&&parseFloat(e.auto_value)!==n.auto_value?(await d.from("budget_sheet").update({auto_value:n.auto_value}).eq("id",e.id),e.auto_value=n.auto_value):e||await d.from("budget_sheet").insert(n)}const{data:t}=await d.from("budget_sheet").select(`
                id,
                code_id,
                auto_value,
                manual_value,
                expense_codes (code, name, sort_order, parent_code, parent_title)
            `).eq("submission_id",i);r=t.sort((n,e)=>(n.expense_codes?.sort_order||0)-(e.expense_codes?.sort_order||0)),R()}catch(s){console.error("Recalculation failed",s)}finally{c?.classList.add("hidden"),b?.classList.remove("hidden"),u?.classList.remove("hidden")}}};try{const[{data:s},{data:t}]=await Promise.all([d.from("submissions").select("status").eq("id",i).single(),d.from("budget_cycles").select("fiscal_year").eq("id",$).single()]);s&&s.status==="submitted"&&(l=!0);const n=document.getElementById("budget-header-text");n&&t&&(n.textContent=`বাজেট (${t.fiscal_year})`);let{data:e}=await d.from("budget_sheet").select(`
          id,
          code_id,
          auto_value,
          manual_value,
          expense_codes (code, name, sort_order, parent_code, parent_title)
        `).eq("submission_id",i);if(!e||e.length===0){console.log("Initializing budget sheet via formula engine...");const a=await C(i,d);if(a.length>0){await d.from("budget_sheet").insert(a);const{data:o}=await d.from("budget_sheet").select(`
              id,
              code_id,
              auto_value,
              manual_value,
              expense_codes (code, name, sort_order, parent_code, parent_title)
            `).eq("submission_id",i);e=o}}else if(!l){console.log("Auto-recalculating budget sheet on load...");const a=await C(i,d);let o=!1;for(const g of a){const p=e.find(w=>w.code_id===g.code_id);p&&parseFloat(p.auto_value)!==g.auto_value&&(await d.from("budget_sheet").update({auto_value:g.auto_value}).eq("id",p.id),o=!0)}if(o){const{data:g}=await d.from("budget_sheet").select(`
                id,
                code_id,
                auto_value,
                manual_value,
                expense_codes (code, name, sort_order, parent_code, parent_title)
                `).eq("submission_id",i);e=g}}if(c&&c.classList.add("hidden"),b&&b.classList.remove("hidden"),!l&&u&&u.classList.remove("hidden"),!e)return;r=e.sort((a,o)=>(a.expense_codes?.sort_order||0)-(o.expense_codes?.sort_order||0)),R(),u&&!l&&u.addEventListener("click",U),l?D?.classList.remove("hidden"):m?.classList.remove("hidden"),m?.addEventListener("click",async()=>{if(!(l||!confirm("আপনি কি নিশ্চিত যে এই বাজেট চূড়ান্তভাবে দাখিল করতে চান? দাখিলের পর আর সম্পাদনা করা যাবে না।"))){m.disabled=!0,m.textContent="দাখিল হচ্ছে...";try{await d.from("submissions").update({status:"submitted",submitted_at:new Date().toISOString()}).eq("id",i),alert("বাজেট সফলভাবে দাখিল হয়েছে!"),window.location.href="/dashboard"}catch(o){console.error("Submit error:",o),alert("দাখিল করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।"),m.disabled=!1,m.textContent="চূড়ান্ত দাখিল করুন"}}})}catch(s){console.error("Error loading budget sheet:",s),c&&(c.innerHTML='<p class="text-red-500">ডেটা লোড করতে সমস্যা হয়েছে।</p>')}});
