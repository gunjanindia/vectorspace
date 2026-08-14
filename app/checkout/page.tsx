import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import CheckoutClient from "./checkout-client";
import { sanitizeRichText } from "@/lib/richText";

export default async function Checkout({searchParams}:{searchParams:Promise<{course?:string}>}) {
  const {course:courseId}=await searchParams;
  const user=await getCurrentUser();
  if(!user) redirect("/login");
  if(!courseId) redirect("/courses");

  const course=await db.course.findUnique({where:{id:courseId}});
  if(!course) redirect("/courses");

  return <main className="form-wrap"><div className="form">
    <span className="badge">SECURE CHECKOUT</span>
    <h1>{course.title}</h1>
    <div className="muted rich-view short-description" dangerouslySetInnerHTML={{__html:sanitizeRichText(course.shortDescription)}} />
    <p className="price">₹{(course.pricePaise/100).toLocaleString("en-IN")}</p>
    <CheckoutClient courseId={course.id}/>
  </div></main>;
}
