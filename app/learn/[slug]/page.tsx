import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import LessonPlayerClient from "./lesson-player-client";

type Lesson={id:string;title:string;description:string|null;type:string;videoUrl:string|null;content:string|null;durationMin:number;sortOrder:number};
type Module={id:string;title:string;sortOrder:number;lessons:Lesson[]};
type Course={id:string;slug:string;title:string;shortDescription:string;description:string;level:string;durationHours:number;pricePaise:number;mode:string;published:boolean;featured:boolean;thumbnailUrl:string|null;modules:Module[]};

export default async function Learn({ params }: {params:Promise<{slug:string}>}) {
  const {slug}=await params;
  const user=await getCurrentUser();
  if(!user) redirect("/login");

  const course=await db.course.findUnique({
    where:{slug},
    include:{modules:{orderBy:{sortOrder:"asc"},include:{lessons:{orderBy:{sortOrder:"asc"}}}}}
  }) as Course|null;
  if(!course) notFound();

  const enrollment=await db.enrollment.findUnique({where:{userId_courseId:{userId:user.id,courseId:course.id}}});
  if(!enrollment) redirect(`/courses/${slug}`);

  const firstLesson=course.modules[0]?.lessons[0];
  return <main className="learn-layout">
    <aside className="sidebar">
      <h3>{course.title}</h3>
      {course.modules.map(m=><div key={m.id} style={{marginTop:20}}>
        <strong>{m.title}</strong>
        {m.lessons.map(l=><div className="lesson-item" key={l.id} data-lesson-id={l.id}>{l.title}</div>)}
      </div>)}
    </aside>
    <LessonPlayerClient course={course} initialLessonId={firstLesson?.id} enrollmentCompleted={enrollment.status === "COMPLETED"} />
  </main>;
}
