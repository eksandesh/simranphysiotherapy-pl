'use client'
import {useState} from 'react'
import {ChevronRight,Plus,Printer,Trash2,UserRoundPlus,Package as PackageIcon} from 'lucide-react'
import {type Clinic,type Patient,type Payment,type Assigned,MODES,day,pretty,money,used,left,balance,billed,received,nextReceipt} from '@/lib/clinic'

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string))

export function printReceipt(d:Clinic,p:Payment){
  const pt=d.patients.find(x=>x.id===p.patient),a=d.assigned.find(x=>x.id===p.pp),bal=balance(d,p.patient)
  const towards=a?`${a.name} (${a.sessions} sessions)`:p.visit?'Session fee':'Treatment'
  const w=window.open('','_blank','width=720,height=820')
  if(!w)return false
  w.document.write(`<!doctype html><title>Receipt ${esc(p.id)}</title><style>body{font:15px/1.5 Arial,sans-serif;color:#1c302f;max-width:560px;margin:30px auto;padding:0 20px}h1{font-size:24px;margin:0}h2{font-size:15px;font-weight:600;color:#677672;margin:2px 0 22px}table{width:100%;border-collapse:collapse}td{padding:9px 0;border-bottom:1px solid #dee6e3}td:last-child{text-align:right}.big td{font-size:19px;font-weight:700;border-bottom:2px solid #1c302f}.foot{margin-top:26px;font-size:12px;color:#677672}</style>
<h1>Simran Physiotherapy</h1><h2>Payment receipt</h2>
<table><tr><td>Receipt no.</td><td>${esc(p.id)}</td></tr><tr><td>Date</td><td>${esc(pretty(p.date))}</td></tr><tr><td>Received from</td><td>${esc(pt?.name||'')} (${esc(p.patient)})</td></tr><tr><td>Towards</td><td>${esc(towards)}</td></tr><tr><td>Payment mode</td><td>${esc(p.mode)}</td></tr>${p.note?`<tr><td>Note</td><td>${esc(p.note)}</td></tr>`:''}<tr class="big"><td>Amount received</td><td>${esc(money(p.amount))}</td></tr><tr><td>${bal>0.004?'Balance due':bal<-0.004?'Advance with clinic':'Balance'}</td><td>${esc(money(Math.abs(bal)))}</td></tr></table>
<p class="foot">Thank you. This is a computer-generated receipt.</p>`)
  w.document.close();w.focus();setTimeout(()=>w.print(),250)
  return true
}

/** Packages, billing summary and payments for one patient (shown inside the patient record). */
export function PatientBilling({d,p,onAssign,onPay,onRemove}:{d:Clinic;p:Patient;onAssign:()=>void;onPay:(x?:Payment)=>void;onRemove:(a:Assigned)=>void}){
  const mine=d.assigned.filter(a=>a.patient===p.id).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id))
  const pays=d.payments.filter(x=>x.patient===p.id).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id,undefined,{numeric:true}))
  const bal=balance(d,p.id)
  return <>
    <h3>Packages</h3>
    {mine.map(a=>{const u=used(d,a.id),l=left(d,a),paid=d.payments.filter(x=>x.pp===a.id).reduce((s,x)=>s+x.amount,0)
      return <div className="pkgcard" key={a.id}>
        <div className="pkgtop"><b>{a.name}</b><span className={'badge '+(l===0?'red':l===1?'amber':'green')}>{l===0?'Completed':`${l} left`}</span></div>
        <div className="meter" role="img" aria-label={`${u} of ${a.sessions} sessions used`}><i style={{width:`${Math.min(100,u/a.sessions*100)}%`}}/></div>
        <small><b className="remain">Remaining: {l} of {a.sessions}</b> · {u} attended · {money(a.rate)} per session</small>
        <small>Package total {money(a.sessions*a.rate)} · Paid towards it {money(paid)} · Started {pretty(a.date)}</small>
        {u===0&&<button className="link" onClick={()=>onRemove(a)}><Trash2 size={13}/>Remove package</button>}
      </div>})}
    {!mine.length&&<p>No package assigned. Walk-in visits are billed per visit.</p>}
    <div className="buttons"><button className="secondary" onClick={onAssign}><PackageIcon size={15}/>Assign package</button></div>
    <h3 className="gap">Billing summary</h3>
    <div className="sumgrid">
      <div><small>Billed</small><b>{money(billed(d,p.id))}</b></div>
      <div><small>Received</small><b>{money(received(d,p.id))}</b></div>
      <div><small>{bal<-0.004?'Advance':'Balance due'}</small><b className={bal>0.004?'owe':bal<-0.004?'adv':''}>{money(Math.abs(bal))}</b></div>
    </div>
    <h3 className="gap">Payments</h3>
    {pays.map(x=><button className="history" key={x.id} onClick={()=>onPay(x)}>{pretty(x.date)} · {money(x.amount)} · {x.mode}{x.pp&&d.assigned.find(a=>a.id===x.pp)?` · ${d.assigned.find(a=>a.id===x.pp)!.name}`:''}<ChevronRight size={14}/></button>)}
    {!pays.length&&<p>No payments recorded.</p>}
    <div className="buttons"><button className="secondary" onClick={()=>onPay()}><Plus size={15}/>Record payment</button></div>
  </>
}

export function PaymentForm({d,p,fixed,commit,onDelete}:{d:Clinic;p?:Payment;fixed?:string;commit:(p:Payment)=>void;onDelete?:()=>void}){
  const [patient,setPatient]=useState(p?.patient||fixed||'')
  const packs=d.assigned.filter(a=>a.patient===patient)
  const bal=patient?balance(d,patient):0
  const [err,setErr]=useState('')
  return <form onSubmit={e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>
    const amount=Number(f.amount)
    if(!patient){setErr('Select a patient.');return}
    if(!(amount>0)){setErr('Enter an amount greater than zero.');return}
    commit({id:p?.id||'',patient,date:f.date,amount,mode:f.mode,note:(f.note||'').trim(),pp:f.pp||'',visit:p?.visit||''})}}>
    <div className="fields">
      <label>Patient<select value={patient} disabled={!!p} onChange={e=>setPatient(e.target.value)} required><option value="" disabled>Select a patient</option>{d.patients.map(x=><option key={x.id} value={x.id}>{x.name} · {x.id}</option>)}</select></label>
      {patient&&<div className="calc">{bal>0.004?'Balance due':bal<-0.004?'Advance paid':'Balance'} <b>{money(Math.abs(bal))}</b></div>}
      <div className="pair">
        <label>Amount received (₹)<input name="amount" type="number" min="0.01" step="0.01" required autoFocus defaultValue={p?.amount}/></label>
        <label>Date<input name="date" type="date" required defaultValue={p?.date||day()}/></label>
      </div>
      <div className="pair">
        <label>Payment mode<select name="mode" defaultValue={p?.mode||'Cash'}>{MODES.map(m=><option key={m}>{m}</option>)}</select></label>
        <label>Towards<select name="pp" key={patient} defaultValue={p&&p.patient===patient?p.pp:''}><option value="">General / visit fee</option>{packs.map(a=><option key={a.id} value={a.id}>{a.name} · {pretty(a.date)}</option>)}</select></label>
      </div>
      <label>Note<input name="note" maxLength={120} defaultValue={p?.note} placeholder="Optional"/></label>
    </div>
    {err&&<div role="alert" className="formerr">{err}</div>}
    <div className="buttons formend"><button className="primary">{p?'Save changes':'Save payment'}</button>
      {p&&<button type="button" className="secondary" onClick={()=>{if(!printReceipt(d,p))setErr('Allow pop-ups to print the receipt.')}}><Printer size={15}/>Receipt</button>}
      {onDelete&&<button type="button" className="secondary" onClick={onDelete}><Trash2 size={15}/>Delete</button>}</div>
  </form>
}

export function AssignForm({d,patient,commit,goPackages}:{d:Clinic;patient:string;commit:(a:Assigned,pay?:{amount:number;mode:string})=>void;goPackages:()=>void}){
  const list=d.packages.filter(k=>k.active)
  const [pkId,setPkId]=useState(list[0]?.id||''),[rate,setRate]=useState(String(list[0]?.rate??0))
  const k=list.find(x=>x.id===pkId)
  if(!k)return <><p>Create a package in the Packages page first, then assign it here.</p><button className="primary" onClick={goPackages}>Go to Packages</button></>
  const total=k.sessions*(Number(rate)||0)
  return <form onSubmit={e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>
    const r=Number(rate);if(!(r>=0))return
    const amount=Number(f.received)||0
    commit({id:crypto.randomUUID(),patient,pkg:k.id,name:k.name,sessions:k.sessions,rate:r,date:f.date},amount>0?{amount,mode:f.mode}:undefined)}}>
    <div className="fields">
      <label>Package<select value={pkId} onChange={e=>{setPkId(e.target.value);setRate(String(list.find(x=>x.id===e.target.value)?.rate??0))}}>{list.map(x=><option key={x.id} value={x.id}>{x.name} · {x.sessions} sessions</option>)}</select></label>
      <div className="pair">
        <label>Cost per session (₹)<input type="number" min="0" step="0.01" required value={rate} onChange={e=>setRate(e.target.value)}/></label>
        <label>Start date<input name="date" type="date" required defaultValue={day()}/></label>
      </div>
      <div className="calc">{k.sessions} sessions × {money(Number(rate)||0)} = <b>{money(total)}</b></div>
      <div className="pair">
        <label>Payment received now (₹)<input name="received" type="number" min="0" step="0.01" placeholder="Optional"/></label>
        <label>Mode<select name="mode">{MODES.map(m=><option key={m}>{m}</option>)}</select></label>
      </div>
    </div>
    <button className="primary formend">Assign package</button>
  </form>
}

export function PaymentsPage({d,onPay,onPatient}:{d:Clinic;onPay:(p:Payment)=>void;onPatient:(p:Patient)=>void}){
  const [month,setMonth]=useState(''),[mode,setMode]=useState('All modes')
  const today=day(),sum=(f:(p:Payment)=>boolean)=>d.payments.filter(f).reduce((s,p)=>s+p.amount,0)
  const rows=d.payments.filter(p=>(!month||p.date.startsWith(month))&&(mode==='All modes'||p.mode===mode)).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id,undefined,{numeric:true}))
  const dues=d.patients.map(p=>({p,b:balance(d,p.id)})).filter(x=>x.b>0.004).sort((a,b)=>b.b-a.b)
  const name=(id:string)=>d.patients.find(p=>p.id===id)?.name||''
  const stats=[{l:'Today',n:sum(p=>p.date===today)},{l:'This month',n:sum(p=>p.date.startsWith(today.slice(0,7)))},{l:'Total received',n:sum(()=>true)},{l:'Pending dues',n:dues.reduce((s,x)=>s+x.b,0)}]
  return <>
    <div className="statgrid">{stats.map(s=><div className="stat" key={s.l}><div className="statline"><span>{s.l}</span></div><strong>{money(s.n)}</strong></div>)}</div>
    <section className="panel patientpanel" style={{marginTop:18}}>
      <div className="panelhead"><h2>Payments received</h2><div className="filters"><input type="month" aria-label="Filter by month" value={month} onChange={e=>setMonth(e.target.value)}/><select aria-label="Filter by payment mode" value={mode} onChange={e=>setMode(e.target.value)}>{['All modes',...MODES].map(m=><option key={m}>{m}</option>)}</select></div></div>
      <div className="tablewrap"><table><thead><tr><th>Receipt</th><th>Date</th><th>Patient</th><th>Towards</th><th>Mode</th><th>Amount</th></tr></thead>
        <tbody>{rows.map(p=><tr key={p.id} onClick={()=>onPay(p)}><td>{p.id}</td><td>{pretty(p.date)}</td><td><b>{name(p.patient)}</b></td><td>{d.assigned.find(a=>a.id===p.pp)?.name||(p.visit?'Visit fee':'General')}</td><td>{p.mode}</td><td><b>{money(p.amount)}</b></td></tr>)}</tbody></table></div>
      {!rows.length&&<div className="empty"><p>No payments found.</p></div>}
      {rows.length>0&&<p className="tablefoot">{rows.length} payment{rows.length===1?'':'s'} · {money(rows.reduce((s,p)=>s+p.amount,0))}</p>}
    </section>
    <section className="panel patientpanel" style={{marginTop:18}}>
      <div className="panelhead"><h2>Pending dues</h2></div>
      <div className="tablewrap"><table><thead><tr><th>Patient</th><th>Billed</th><th>Received</th><th>Balance due</th></tr></thead>
        <tbody>{dues.map(({p,b})=><tr key={p.id} onClick={()=>onPatient(p)}><td><b>{p.name}</b><small>{p.id}{p.phone?` · ${p.phone}`:''}</small></td><td>{money(billed(d,p.id))}</td><td>{money(received(d,p.id))}</td><td><b className="owe">{money(b)}</b></td></tr>)}</tbody></table></div>
      {!dues.length&&<div className="empty"><UserRoundPlus/><p>No pending dues.</p></div>}
    </section>
  </>
}
