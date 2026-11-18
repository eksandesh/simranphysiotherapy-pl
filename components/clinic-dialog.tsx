'use client'
import {useEffect,useRef,useState,type ReactNode} from 'react'
import {X,Trash2} from 'lucide-react'
import {day,used,money,MODES,type Clinic,type Patient,type Visit} from '@/lib/clinic'
export function Dialog({title,close,children,wide}:{title:string;close:()=>void;children:ReactNode;wide?:boolean}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const d=ref.current!;d.showModal();return ()=>d.close()},[]);return <dialog ref={ref} className={wide?'wide':undefined} onCancel={close} onClick={e=>{if(e.target===ref.current)close()}}><div className="dialoghead"><h2>{title}</h2><button aria-label="Close dialog" onClick={close}><X size={20}/></button></div>{children}</dialog>}
export function PatientForm({p,commit}:{p?:Patient;commit:(p:Patient)=>void}){return <form onSubmit={e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>;if(!f.name.trim()||!f.condition.trim())return;commit({...f,name:f.name.trim(),condition:f.condition.trim(),id:p?.id||'',date:p?.date||day()} as Patient)}}><div className="fields"><label>Full name<input name="name" autoFocus required maxLength={100} defaultValue={p?.name}/></label><div className="pair"><label>Age<input type="number" name="age" min="0" max="125" required defaultValue={p?.age}/></label><label>Gender<select name="gender" defaultValue={p?.gender}><option>Female</option><option>Male</option><option>Other</option><option>Not specified</option></select></label></div><label>Phone number<input name="phone" type="tel" maxLength={30} defaultValue={p?.phone}/></label><label>Condition<input name="condition" required maxLength={150} defaultValue={p?.condition}/></label><label>Care status<select name="status" defaultValue={p?.status}><option>Active</option><option>Follow-up</option><option>Recovered</option></select></label><label>Clinical notes<textarea name="notes" rows={3} defaultValue={p?.notes}/></label></div><button className="primary formend">Save patient</button></form>}

export function VisitForm({d,v,fixed,commit,onDelete}:{d:Clinic;v?:Visit;fixed?:string;commit:(v:Visit,pay?:{amount:number;mode:string})=>void;onDelete?:()=>void}){
  const firstPack=(pid:string)=>d.assigned.filter(a=>a.patient===pid&&a.sessions-used(d,a.id)>0).sort((a,b)=>a.date.localeCompare(b.date))[0]?.id||''
  const [patient,setPatient]=useState(v?.patient||fixed||''),[status,setStatus]=useState(v?.status||'Scheduled'),[pp,setPp]=useState(v?v.pp:firstPack(fixed||'')),[err,setErr]=useState('')
  const options=d.assigned.filter(a=>a.patient===patient&&(a.id===v?.pp||a.sessions-used(d,a.id)>0))
  const pack=d.assigned.find(a=>a.id===pp)
  const remaining=pack?pack.sessions-used(d,pack.id):0
  const consumes=status==='Completed'&&v?.status!=='Completed'||status==='Completed'&&v?.pp!==pp
  return <form onSubmit={e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>
    if(!patient)return
    if(status==='Completed'&&pp){const a=d.assigned.find(x=>x.id===pp);const others=d.visits.filter(x=>x.pp===pp&&x.status==='Completed'&&x.id!==v?.id).length
      if(!a||a.sessions-others<=0){setErr('No sessions left on this package. Assign a new package or choose Walk-in.');return}}
    const amount=Number(f.received)||0
    commit({id:v?.id||crypto.randomUUID(),patient,date:f.date,time:f.time,status,notes:f.notes,pp,fee:pp?0:Math.max(0,Number(f.fee)||0)},amount>0?{amount,mode:f.mode}:undefined)}}>
    <div className="fields">
      <label>Patient<select value={patient} required onChange={e=>{setPatient(e.target.value);setPp(firstPack(e.target.value));setErr('')}}><option value="" disabled>Select a patient</option>{d.patients.map(p=><option key={p.id} value={p.id}>{p.name} · {p.id}</option>)}</select></label>
      <label>Package<select value={pp} onChange={e=>{setPp(e.target.value);setErr('')}}><option value="">Walk-in (pay per visit)</option>{options.map(a=><option key={a.id} value={a.id}>{a.name} · {Math.max(0,a.sessions-used(d,a.id))} left</option>)}</select></label>
      <div className="pair"><label>Date<input name="date" type="date" required defaultValue={v?.date||day()}/></label><label>Time<input name="time" type="time" required defaultValue={v?.time}/></label></div>
      <label>Session status<select value={status} onChange={e=>{setStatus(e.target.value);setErr('')}}><option>Scheduled</option><option>Completed</option><option>Cancelled</option></select></label>
      {!pack&&d.assigned.some(a=>a.patient===patient)&&!options.length&&<div className="calc warn">This patient has no sessions left on their package, so this visit will be billed as a walk-in. Assign a new package from the patient record to continue a pack.</div>}
      {pack?<div className="calc">{status==='Completed'?(consumes?`This session uses 1 of ${remaining} remaining → ${Math.max(0,remaining-1)} left after saving`:`Session counted · ${remaining} left on this package`):`${remaining} session${remaining===1?'':'s'} left · 1 is deducted when marked Completed`}</div>
        :<label>Fee for this visit (₹)<input name="fee" type="number" min="0" step="0.01" defaultValue={v?.fee||''} placeholder="Walk-in fee"/></label>}
      <div className="pair"><label>{v?'Add payment received (₹)':'Payment received now (₹)'}<input name="received" type="number" min="0" step="0.01" placeholder="Optional"/></label><label>Mode<select name="mode">{MODES.map(m=><option key={m}>{m}</option>)}</select></label></div>
      <label>Session notes<textarea name="notes" rows={3} defaultValue={v?.notes}/></label>
    </div>
    {err&&<div role="alert" className="formerr">{err}</div>}
    <div className="buttons formend"><button className="primary">Save appointment</button>{onDelete&&<button type="button" className="secondary" onClick={onDelete}><Trash2 size={15}/>Delete</button>}</div>
  </form>
}
