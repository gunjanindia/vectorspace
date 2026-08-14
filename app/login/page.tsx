"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [form,setForm]=useState({email:"",password:""});
  const [error,setError]=useState("");
  const router=useRouter();
  async function submit(e:React.FormEvent){
    e.preventDefault(); setError("");
    const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    const d=await r.json();
    if(!r.ok){setError(d.error||"Login failed");return;}
    router.push(d.role==="ADMIN"?"/admin":"/dashboard");
  }
  return <main className="form-wrap"><div className="form">
    <h1>Welcome back</h1><p className="muted">Login to continue learning.</p>
    {error && <p style={{color:"crimson"}}>{error}</p>}
    <form onSubmit={submit}>
      <label>Email</label><input className="input" required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
      <label>Password</label><input className="input" required type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
      <button className="btn btn-primary" style={{width:"100%"}}>Login</button>
    </form>
    <p>New learner? <Link href="/register" style={{color:"var(--blue)"}}>Create account</Link></p>
  </div></main>;
}
