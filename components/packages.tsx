'use client'
import {useState} from 'react'
import {Package as PackageIcon,Trash2} from 'lucide-react'
import {type Clinic,type Pkg,money} from '@/lib/clinic'

export function PackagesPage({d,onPick}:{d:Clinic;onPick:(k:Pkg)=>void}){
  return <section className="panel patientpanel">
    <div className="panelhead"><h2>Package master</h2><small>{d.packages.length} package{d.packages.length===1?'':'s'}</small></div>
    <div className="tablewrap"><table><thead><tr><th>Package name</th><th>Sessions</th><th>Cost per session</th><th>Package total</th><th>Sold</th><th>Status</th></tr></thead>
      <tbody>{d.packages.map(k=><tr key={k.id} onClick={()=>onPick(k)}>
        <td><b>{k.name}</b></td><td>{k.sessions}</td><td>{money(k.rate)}</td><td>{money(k.sessions*k.rate)}</td>
        <td>{d.assigned.filter(a=>a.pkg===k.id).length}</td>
        <td><span className={'badge '+(k.active?'green':'blue')}><i/>{k.active?'Active':'Inactive'}</span></td>
      </tr>)}</tbody></table></div>
    {!d.packages.length&&<div className="empty"><PackageIcon/><p>No packages yet. Add one to start selling session packs.</p></div>}
  </section>
}

export function PackageForm({p,commit,onDelete}:{p?:Pkg;commit:(k:Pkg)=>void;onDelete?:()=>void}){
  const [sessions,setSessions]=useState(String(p?.sessions??10)),[rate,setRate]=useState(String(p?.rate??''))
  const total=(Number(sessions)||0)*(Number(rate)||0)
  return <form onSubmit={e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>
    const n=Math.floor(Number(f.sessions)),r=Number(f.rate)
    if(!f.name.trim()||!(n>=1)||!(r>=0))return
    commit({id:p?.id||crypto.randomUUID(),name:f.name.trim(),sessions:n,rate:r,active:f.status==='Active'})}}>
    <div className="fields">
      <label>Package name<input name="name" autoFocus required maxLength={80} defaultValue={p?.name} placeholder="e.g. 10-Session Pack"/></label>
      <div className="pair">
        <label>No. of sessions<input name="sessions" type="number" min="1" step="1" required value={sessions} onChange={e=>setSessions(e.target.value)}/></label>
        <label>Cost per session (₹)<input name="rate" type="number" min="0" step="0.01" required value={rate} onChange={e=>setRate(e.target.value)}/></label>
      </div>
      <div className="calc">Package total <b>{money(total)}</b></div>
      <label>Status<select name="status" defaultValue={p?.active===false?'Inactive':'Active'}><option>Active</option><option>Inactive</option></select></label>
      {p&&<small>Changes apply to new sales only. Packages already assigned to patients keep their original sessions and price.</small>}
    </div>
    <div className="buttons formend"><button className="primary">Save package</button>{onDelete&&<button type="button" className="secondary" onClick={onDelete}><Trash2 size={15}/>Delete</button>}</div>
  </form>
}
