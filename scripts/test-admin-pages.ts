async function testAdminPages() {
  console.log("=================================================");
  console.log("   VERIFYING ALL ADMIN PAGES & METRIC LINKS      ");
  console.log("=================================================\n");

  const baseUrl = "http://localhost:3000";

  // Login as admin
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@vectorspaceacademy.com",
      password: "Admin@12345"
    })
  });

  if (!loginRes.ok) throw new Error("Admin login failed");
  const cookie = loginRes.headers.get("set-cookie")!.split(";")[0];
  console.log("✓ Admin logged in successfully.\n");

  const routes = [
    { name: "Admin Dashboard", url: "/admin" },
    { name: "Students Directory (Metric 1)", url: "/admin/students" },
    { name: "Courses Manager (Metric 2)", url: "/admin/courses" },
    { name: "Learning Paths Manager (Metric 3)", url: "/admin/learning-paths" },
    { name: "Promo Codes Manager (Metric 4)", url: "/admin/promos" },
    { name: "Orders Ledger (Metric 5)", url: "/admin/orders" }
  ];

  for (const r of routes) {
    const res = await fetch(`${baseUrl}${r.url}`, {
      headers: { Cookie: cookie }
    });
    console.log(`✓ ${r.name} -> Status: ${res.status} OK`);
    if (!res.ok) throw new Error(`Route ${r.url} returned status ${res.status}`);
  }

  console.log("\n=================================================");
  console.log("   🎉 ALL 5 ADMIN LIST PAGES FULLY VERIFIED!     ");
  console.log("=================================================");
}

testAdminPages().catch(e => {
  console.error("Verification failed:", e);
  process.exit(1);
});
