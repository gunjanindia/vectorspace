import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function POST(req:Request){
  const user=await getCurrentUser();
  if(!user) return NextResponse.json({error:"Login required"},{status:401});
  const {orderId}=await req.json();

  const order=await db.order.findFirst({where:{id:orderId,userId:user.id}});
  if(!order) return NextResponse.json({error:"Order not found"},{status:404});

  await db.$transaction([
    db.order.update({where:{id:order.id},data:{status:"PAID",gatewayPaymentId:`DEV-${Date.now()}`}}),
    db.enrollment.upsert({
      where:{userId_courseId:{userId:user.id,courseId:order.courseId}},
      update:{status:"ACTIVE"},
      create:{userId:user.id,courseId:order.courseId,status:"ACTIVE"}
    })
  ]);

  return NextResponse.json({ok:true});
}
