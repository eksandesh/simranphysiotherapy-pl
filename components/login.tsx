'use client'
import {useState} from 'react'
import {Eye,EyeOff,LogIn} from 'lucide-react'

// Fixed clinic login. Only a SHA-256 hash of "username:password" is stored in the code.
// NOTE: this is a front-end gate for an offline app. It keeps casual users out, but it is not
// strong security: anyone with developer tools could bypass it, and it does not encrypt local data.
const CREDENTIAL_HASH='42abce0550080dc4eaf8afed46cf8f59afe408f7e31c8aa944ff1ab39f6d3dd1'
export const AUTH_KEY='simran-auth'

async function sha256(text:string){
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf),b=>b.toString(16).padStart(2,'0')).join('')
}

export function Login({onLogin}:{onLogin:()=>void}){
  const [show,setShow]=useState(false),[error,setError]=useState(''),[fails,setFails]=useState(0),[busy,setBusy]=useState(false),[until,setUntil]=useState(0)
  return <div className="loginwrap">
    <form className="logincard" onSubmit={async e=>{
      e.preventDefault()
      if(Date.now()<until){setError(`Too many attempts. Try again in ${Math.ceil((until-Date.now())/1000)} seconds.`);return}
      const f=Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>
      if(!globalThis.crypto?.subtle){setError('Sign-in needs a secure (https) connection. Open the clinic site over https.');return}
      setBusy(true)
      const ok=(await sha256(`${f.username.trim()}:${f.password}`))===CREDENTIAL_HASH
      setBusy(false)
      if(ok){try{sessionStorage.setItem(AUTH_KEY,'1')}catch{}onLogin();return}
      const n=fails+1;setFails(n)
      if(n%5===0){setUntil(Date.now()+30000);setError('Too many attempts. Please wait 30 seconds.')}
      else setError('Incorrect username or password.')
    }}>
      <div className="brand loginbrand"><img src="/clinic-icon.svg" alt=""/><div><b>Simran</b><span>Physiotherapy</span></div></div>
      <h1>Sign in</h1>
      <p>Enter your clinic credentials to open the workspace.</p>
      <div className="fields">
        <label>Username<input name="username" autoFocus autoComplete="username" required/></label>
        <label>Password<span className="pwrow"><input name="password" type={show?'text':'password'} autoComplete="current-password" required/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></span></label>
      </div>
      {error&&<div role="alert" className="formerr">{error}</div>}
      <button className="primary formend" disabled={busy}><LogIn size={16}/>{busy?'Checking…':'Sign in'}</button>
    </form>
  </div>
}
