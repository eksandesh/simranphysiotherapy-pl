// ---------- Types ----------
export type Patient = { id: string; name: string; age: string; gender: string; phone: string; condition: string; status: string; notes: string; date: string }
// pp = id of the patient's assigned package ('' = walk-in). fee = per-visit fee for walk-ins (billed once Completed).
export type Visit = { id: string; patient: string; date: string; time: string; status: string; notes: string; pp: string; fee: number }
// Package Master entry
export type Pkg = { id: string; name: string; sessions: number; rate: number; active: boolean }
// A package bought by a patient. Name/sessions/rate are a snapshot, so editing the master never changes past sales.
export type Assigned = { id: string; patient: string; pkg: string; name: string; sessions: number; rate: number; date: string }
export type Payment = { id: string; patient: string; date: string; amount: number; mode: string; note: string; pp: string; visit: string }
export type Clinic = { version: 2; patients: Patient[]; visits: Visit[]; packages: Pkg[]; assigned: Assigned[]; payments: Payment[]; demo: boolean }

export const MODES = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Other']

// ---------- Formatting ----------
export function day(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export const pretty = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
export const money = (n: number) => '₹' + Number((Math.round(n * 100) / 100).toFixed(2)).toLocaleString('en-IN')

// ---------- Package / billing maths (always derived, never stored, so edits can't double-deduct) ----------
/** Sessions used = Completed appointments linked to that package. */
export const used = (d: Clinic, ppId: string) => d.visits.filter(v => v.pp === ppId && v.status === 'Completed').length
export const left = (d: Clinic, a: Assigned) => Math.max(0, a.sessions - used(d, a.id))
export const remainingFor = (d: Clinic, patient: string) => d.assigned.filter(a => a.patient === patient).reduce((s, a) => s + left(d, a), 0)
/** Everything the patient owes: package totals + completed walk-in fees. */
export const billed = (d: Clinic, patient: string) =>
  d.assigned.filter(a => a.patient === patient).reduce((s, a) => s + a.sessions * a.rate, 0) +
  d.visits.filter(v => v.patient === patient && !v.pp && v.status === 'Completed').reduce((s, v) => s + v.fee, 0)
export const received = (d: Clinic, patient: string) => d.payments.filter(p => p.patient === patient).reduce((s, p) => s + p.amount, 0)
/** Positive = due, negative = advance paid. */
export const balance = (d: Clinic, patient: string) => Math.round((billed(d, patient) - received(d, patient)) * 100) / 100
export const nextReceipt = (d: Clinic) => `R-${Math.max(1000, ...d.payments.map(p => Number(p.id.slice(2)) || 0)) + 1}`
export function attention(d: Clinic) {
  return d.patients.map(p => {
    const mine = d.assigned.filter(a => a.patient === p.id)
    const sessions = remainingFor(d, p.id)
    const due = Math.max(0, balance(d, p.id))
    const renew = mine.length > 0 && sessions <= 1 && p.status !== 'Recovered'
    return { p, sessions, due, renew }
  }).filter(x => x.renew || x.due > 0.004)
}

// ---------- Sample data ----------
export function seed(): Clinic {
  const names = ['Aarav Sharma', 'Priya Patel', 'Rajesh Kumar', 'Ananya Singh', 'Vikram Mehta', 'Neha Gupta', 'Arjun Shah', 'Meera Joshi']
  const conditions = ['Lower back pain', 'Frozen shoulder', 'Knee rehabilitation', 'Cervical spondylosis', 'Sports injury', 'Postural imbalance', 'Ankle rehabilitation', 'Shoulder stiffness']
  const patients: Patient[] = names.map((name, i) => ({ id: `SP-${1008 - i}`, name, age: String([42, 35, 58, 29, 46, 37, 24, 61][i]), gender: ['Male', 'Female'][i % 2], phone: '', condition: conditions[i], status: ['Active', 'Active', 'Recovered', 'Active', 'Follow-up', 'Active', 'Follow-up', 'Recovered'][i], notes: '', date: day(new Date(Date.now() - i * 86400000)) }))
  const t = day()
  return {
    version: 2, demo: true, patients,
    visits: patients.slice(0, 5).map((p, i) => ({ id: `V-${i}`, patient: p.id, date: t, time: ['09:00', '10:30', '11:00', '14:00', '15:30'][i], status: i < 2 ? 'Completed' : 'Scheduled', notes: '', pp: i === 0 ? 'ap-1' : i === 1 ? 'ap-2' : '', fee: i === 2 ? 600 : 0 })),
    packages: [{ id: 'pk-1', name: '10-Session Pack', sessions: 10, rate: 500, active: true }, { id: 'pk-2', name: 'Back & Neck Care (12)', sessions: 12, rate: 450, active: true }],
    assigned: [{ id: 'ap-1', patient: 'SP-1008', pkg: 'pk-1', name: '10-Session Pack', sessions: 10, rate: 500, date: t }, { id: 'ap-2', patient: 'SP-1007', pkg: 'pk-2', name: 'Back & Neck Care (12)', sessions: 12, rate: 450, date: t }],
    payments: [{ id: 'R-1001', patient: 'SP-1008', date: t, amount: 2500, mode: 'UPI', note: 'Advance', pp: 'ap-1', visit: '' }, { id: 'R-1002', patient: 'SP-1007', date: t, amount: 5400, mode: 'Cash', note: 'Paid in full', pp: 'ap-2', visit: '' }],
  }
}

// ---------- Storage (IndexedDB) ----------
let connection: Promise<IDBDatabase> | undefined
function database() { return connection ??= new Promise((ok, fail) => { const r = indexedDB.open('simran-physio-clinic', 1); r.onupgradeneeded = () => r.result.createObjectStore('records'); r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error) }) }
/** Upgrades a v1 (or v2) record set to the current shape. Existing patients/visits are untouched. */
export function migrate(d: any): Clinic {
  return {
    version: 2, demo: !!d.demo, patients: d.patients,
    visits: d.visits.map((v: any) => ({ ...v, pp: v.pp ?? '', fee: Number(v.fee) || 0 })),
    packages: d.packages ?? [],
    assigned: (d.assigned ?? []).map((a: any) => ({ ...a, pkg: a.pkg ?? '' })),
    payments: (d.payments ?? []).map((p: any) => ({ ...p, pp: p.pp ?? '', visit: p.visit ?? '' })),
  }
}
export async function load(): Promise<Clinic> {
  const db = await database()
  const value = await new Promise<any>((ok, fail) => { const r = db.transaction('records').objectStore('records').get('clinic'); r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error) })
  if (value) { const m = migrate(value); if (value.version !== 2) await save(m); return m }
  const d = seed(); await save(d); return d
}
export async function save(data: Clinic) {
  const db = await database()
  await new Promise<void>((ok, fail) => { const t = db.transaction('records', 'readwrite'); t.objectStore('records').put(data, 'clinic'); t.oncomplete = () => ok(); t.onerror = t.onabort = () => fail(t.error) })
}
export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ---------- CSV reports ----------
export function report(d: Clinic, kind: string, id = '') {
  const name = (pid: string) => d.patients.find(p => p.id === pid)?.name || ''
  const pk = (ppId: string) => d.assigned.find(a => a.id === ppId)?.name || ''
  const mine = (pid: string) => !id || id === pid
  let rows: string[][]
  if (kind === 'Patient register') {
    rows = [['Patient ID', 'Name', 'Age', 'Gender', 'Phone', 'Condition', 'Status', 'Notes', 'Registered', 'Sessions left', 'Billed', 'Received', 'Balance due'],
      ...d.patients.filter(p => mine(p.id)).map(p => [p.id, p.name, p.age, p.gender, p.phone, p.condition, p.status, p.notes, p.date, String(remainingFor(d, p.id)), String(billed(d, p.id)), String(received(d, p.id)), String(balance(d, p.id))])]
  } else if (kind === 'Payments') {
    rows = [['Receipt', 'Date', 'Patient ID', 'Patient', 'Amount', 'Mode', 'Towards', 'Note'],
      ...d.payments.filter(p => mine(p.patient)).sort((a, b) => a.date.localeCompare(b.date)).map(p => [p.id, p.date, p.patient, name(p.patient), String(p.amount), p.mode, pk(p.pp) || (p.visit ? 'Visit fee' : 'General'), p.note])]
  } else if (kind === 'Package balances') {
    rows = [['Patient ID', 'Patient', 'Package', 'Start', 'Sessions', 'Used', 'Remaining', 'Cost per session', 'Package total', 'Paid towards package'],
      ...d.assigned.filter(a => mine(a.patient)).map(a => [a.patient, name(a.patient), a.name, a.date, String(a.sessions), String(used(d, a.id)), String(left(d, a)), String(a.rate), String(a.sessions * a.rate), String(d.payments.filter(p => p.pp === a.id).reduce((s, p) => s + p.amount, 0))])]
  } else if (kind === 'Pending dues') {
    rows = [['Patient ID', 'Patient', 'Phone', 'Billed', 'Received', 'Balance due'],
      ...d.patients.filter(p => mine(p.id) && balance(d, p.id) > 0.004).map(p => [p.id, p.name, p.phone, String(billed(d, p.id)), String(received(d, p.id)), String(balance(d, p.id))])]
  } else {
    rows = [['Patient ID', 'Patient', 'Date', 'Time', 'Status', 'Package / Walk-in', 'Walk-in fee', 'Session notes'],
      ...d.visits.filter(v => mine(v.patient) && (kind !== 'Completed sessions' || v.status === 'Completed')).map(v => [v.patient, name(v.patient), v.date, v.time, v.status, pk(v.pp) || 'Walk-in', String(v.fee), v.notes])]
  }
  // Guard against spreadsheet formula injection (pure numbers, e.g. an advance of -500, are safe as-is)
  const cell = (v: string) => '"' + (/^\s*[=+@-]/.test(v) && isNaN(Number(v)) ? "'" : '') + v.replaceAll('"', '""') + '"'
  download(`Simran-${kind}-${day()}.csv`, '\uFEFF' + rows.map(r => r.map(cell).join(',')).join('\r\n'), 'text/csv;charset=utf-8')
}

// ---------- Backup validation ----------
export function valid(d: any): boolean {
  const str = (o: any, ks: string[]) => !!o && ks.every(k => typeof o[k] === 'string')
  const num = (o: any, ks: string[]) => !!o && ks.every(k => typeof o[k] === 'number' && Number.isFinite(o[k]))
  const date = /^\d{4}-\d{2}-\d{2}$/
  if (!d || (d.version !== 1 && d.version !== 2) || typeof d.demo !== 'boolean' || !Array.isArray(d.patients) || !Array.isArray(d.visits)) return false
  const packages = d.packages ?? [], assigned = d.assigned ?? [], payments = d.payments ?? []
  if (![packages, assigned, payments].every(Array.isArray)) return false
  const ids = new Set<string>(d.patients.map((p: Patient) => p.id))
  const aids = new Set<string>(assigned.map((a: Assigned) => a.id))
  return d.patients.every((p: any) => str(p, ['id', 'name', 'age', 'gender', 'phone', 'condition', 'status', 'notes', 'date']) && date.test(p.date)) &&
    ids.size === d.patients.length &&
    d.visits.every((v: any) => str(v, ['id', 'patient', 'date', 'time', 'status', 'notes']) && ids.has(v.patient) &&
      (v.pp === undefined || (typeof v.pp === 'string' && (v.pp === '' || aids.has(v.pp)))) &&
      (v.fee === undefined || (typeof v.fee === 'number' && v.fee >= 0))) &&
    packages.every((k: any) => str(k, ['id', 'name']) && num(k, ['sessions', 'rate']) && typeof k.active === 'boolean') &&
    assigned.every((a: any) => str(a, ['id', 'patient', 'name', 'date']) && num(a, ['sessions', 'rate']) && ids.has(a.patient) && date.test(a.date)) &&
    aids.size === assigned.length &&
    payments.every((p: any) => str(p, ['id', 'patient', 'date', 'mode', 'note']) && num(p, ['amount']) && ids.has(p.patient) && date.test(p.date)) &&
    new Set(payments.map((p: Payment) => p.id)).size === payments.length
}
