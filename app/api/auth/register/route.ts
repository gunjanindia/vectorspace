import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

const schema=z.object({
  name:z.string().min(2),
  email:z.string().email(),
  password:z.string().min(8),
  phone:z.string().optional()
});

export async function POST(req:Request){
  try{
    const data=schema.parse(await req.json());
    const email=data.email.toLowerCase();
    const exists=await db.user.findUnique({where:{email}});
    if(exists) return NextResponse.json({error:"Email already registered"},{status:409});
    const passwordHash=await bcrypt.hash(data.password,12);
    const user=await db.user.create({
      data:{
        name: data.name,
        email,
        phone: data.phone || null,
        passwordHash
      }
    });
    await createSession(user.id);
    return NextResponse.json({ok:true});
  }catch(e: any){
    console.error("Register validation error:", e);
    return NextResponse.json({error: e?.errors ? e.errors[0]?.message : "Invalid registration data"},{status:400});
  }
}
