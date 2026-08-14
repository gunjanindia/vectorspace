"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export default function CheckoutClient({courseId}:{courseId:string}) {
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const router=useRouter();
  async function pay(){
    setLoading(true); setError("");
    const r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({courseId})});
    const d=await r.json();
    setLoading(false);
    if(!r.ok){setError(d.error||"Unable to create order");return;}
    // Version 1: simulated successful payment for local development.
    // Replace this step with Razorpay Checkout in production.
    const confirm=await fetch("/api/orders/confirm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:d.orderId})});
    if(!confirm.ok){setError("Payment confirmation failed");return;}
    router.push("/dashboard");
  }
  return <>
    {error&&<p style={{color:"crimson"}}>{error}</p>}
    <button disabled={loading} onClick={pay} className="btn btn-primary" style={{width:"100%"}}>
      {loading?"Processing...":"Pay & Enroll"}
    </button>
    <p className="muted" style={{fontSize:12,marginTop:15}}>
      Local Version 1 uses a development payment confirmation. Configure the Razorpay server-side order and webhook before production use.
    </p>
  </>;
}
