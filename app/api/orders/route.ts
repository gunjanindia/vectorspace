import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function POST(req:Request){
  try{
    const user=await getCurrentUser();
    if(!user) return NextResponse.json({error:"Login required"},{status:401});
    const {courseId}=await req.json();
    const course=await db.course.findUnique({where:{id:courseId}});
    if(!course) return NextResponse.json({error:"Course not found"},{status:404});

    const existing=await db.enrollment.findUnique({where:{userId_courseId:{userId:user.id,courseId}}});
    if(existing) return NextResponse.json({error:"Already enrolled"},{status:409});

    const order=await db.order.create({
      data:{
        orderNumber:`VSA-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        userId:user.id,
        courseId,
        amountPaise:course.pricePaise,
        status:"PENDING"
      }
    });

    // Production: create a Razorpay order here and store gatewayOrderId.
    return NextResponse.json({orderId:order.id,amountPaise:order.amountPaise});
  }catch{
    return NextResponse.json({error:"Could not create order"},{status:500});
  }
}
