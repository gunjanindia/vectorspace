"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Register() {
  const [form,setForm]=useState({name:"",email:"",password:"",phone:""});
  const [error,setError]=useState("");
  const router=useRouter();
  async function submit(e:React.FormEvent){
    e.preventDefault(); setError("");
    const r=await fetch("/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    const d=await r.json();
    if(!r.ok){setError(d.error||"Registration failed");return;}
    router.push("/dashboard");
  }
  return <main className="form-wrap"><div className="form">
    <h1>Create your account</h1><p className="muted">Join Vector Space Skills Academy.</p>
    {error && <p style={{color:"crimson"}}>{error}</p>}
    <form onSubmit={submit}>
      <label>Name</label><input className="input" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
      <label>Email</label><input className="input" required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
      <label>Mobile</label><input className="input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
      <label>Password</label><input className="input" required minLength={8} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
      <button className="btn btn-primary" style={{width:"100%"}}>Create Account</button>
    </form>
    <p>Already registered? <Link href="/login" style={{color:"var(--blue)"}}>Login</Link></p>
  </div></main>;
}
