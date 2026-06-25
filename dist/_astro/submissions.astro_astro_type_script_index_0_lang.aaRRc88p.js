import{s as l}from"./supabase.DyS_ZLhl.js";import{a as b,b as p,t as x}from"./bangla.B9xk0lp1.js";document.addEventListener("astro:page-load",async()=>{if(!window.location.pathname.includes("/superadmin/submissions"))return;const m=document.getElementById("loading-state"),u=document.getElementById("submissions-container"),a=document.getElementById("submissions-body"),o=document.getElementById("filter-cycle"),f=document.getElementById("filter-status"),g=document.getElementById("apply-filters-btn");let c=[];const y=t=>{if(!t)return"--";const s=new Date(t);return x(s.toLocaleDateString("en-GB"))},v=t=>t==="submitted"?'<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">দাখিলকৃত</span>':t==="draft"?'<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">খসড়া</span>':t==="needs_resubmit"?'<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">ফেরত</span>':`<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">${t}</span>`,r=async()=>{m?.classList.remove("hidden"),u?.classList.add("hidden");try{const{data:t}=await l.from("cycles").select("*").order("id",{ascending:!1});t&&o.options.length<=1&&t.forEach(i=>{const d=document.createElement("option");d.value=i.id,d.textContent=`${b(i.fiscal_year)} - ${p(i.budget_type)}`,o.appendChild(d)});let s=l.from("submissions").select(`
            id,
            status,
            submitted_at,
            offices ( name, budget_id ),
            cycles ( fiscal_year, budget_type, id )
        `).order("submitted_at",{ascending:!1});o.value!=="all"&&(s=s.eq("cycle_id",o.value)),f.value!=="all"&&(s=s.eq("status",f.value));const{data:e,error:n}=await s;if(n)throw n;c=e||[],h()}catch(t){console.error(t),a&&(a.innerHTML='<tr><td colspan="5" class="p-4 text-center text-rose-500">ডেটা লোড করতে সমস্যা হয়েছে।</td></tr>')}finally{m?.classList.add("hidden"),u?.classList.remove("hidden")}},h=()=>{if(a){if(a.innerHTML="",c.length===0){a.innerHTML='<tr><td colspan="5" class="p-8 text-center text-slate-500">কোনো দাখিল পাওয়া যায়নি</td></tr>';return}c.forEach(t=>{const s=document.createElement("tr");s.className="hover:bg-slate-50 transition-colors group";let e=`
          <button data-action="view" data-id="${t.id}" class="action-btn text-blue-600 hover:text-blue-800 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors font-medium text-sm">
            ভিউ
          </button>
        `;t.status==="submitted"?e+=`
              <button data-action="resubmit" data-id="${t.id}" class="action-btn text-rose-600 hover:text-rose-800 px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 transition-colors font-medium text-sm ml-2">
                ফেরত পাঠান
              </button>
            `:(t.status==="draft"||t.status==="needs_resubmit")&&(e+=`
              <button data-action="lock" data-id="${t.id}" class="action-btn text-emerald-600 hover:text-emerald-800 px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 transition-colors font-medium text-sm ml-2">
                লক করুন
              </button>
            `),s.innerHTML=`
          <td class="p-4">
             <div class="font-bold text-slate-800">${t.offices?.name||"--"}</div>
             <div class="text-slate-500 text-sm font-mono mt-0.5">${x(t.offices?.budget_id||"--")}</div>
          </td>
          <td class="p-4">
             <div class="font-medium text-slate-700">${b(t.cycles?.fiscal_year)}</div>
             <div class="text-slate-500 text-sm mt-0.5">${p(t.cycles?.budget_type)}</div>
          </td>
          <td class="p-4">${v(t.status)}</td>
          <td class="p-4 text-slate-600 font-mono text-sm">${y(t.submitted_at)}</td>
          <td class="p-4 text-right">${e}</td>
        `,a.appendChild(s)}),_()}},_=()=>{document.querySelectorAll(".action-btn").forEach(t=>{t.addEventListener("click",async s=>{const e=s.currentTarget,n=e.getAttribute("data-action"),i=e.getAttribute("data-id");if(n==="view"){alert("বাজেট শিট ভিউয়ার তৈরি করা হচ্ছে...");return}if(n==="resubmit"){if(!confirm("আপনি কি নিশ্চিত যে এই বাজেটটি সংশোধনের জন্য ফেরত পাঠাতে চান?"))return;e.disabled=!0,e.textContent="...";try{await l.from("submissions").update({status:"needs_resubmit"}).eq("id",i),await r()}catch{alert("ত্রুটি হয়েছে"),e.disabled=!1}}if(n==="lock"){if(!confirm("আপনি কি নিশ্চিত যে এই বাজেটটি দাখিলকৃত হিসেবে লক করতে চান?"))return;e.disabled=!0,e.textContent="...";try{await l.from("submissions").update({status:"submitted",submitted_at:new Date().toISOString()}).eq("id",i),await r()}catch{alert("ত্রুটি হয়েছে"),e.disabled=!1}}})})};g?.addEventListener("click",r),r()});
