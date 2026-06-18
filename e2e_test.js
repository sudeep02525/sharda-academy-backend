import fs from 'fs';

const API_BASE = 'http://localhost:5000/api';
const SAMS_API = `${API_BASE}/sams`;
const AUTH_API = `${API_BASE}/auth`;

const log = (msg) => console.log(`[E2E TEST] ${msg}`);

async function request(url, options = {}) {
  const isMultipart = options.body && options.body.toString() === '[object FormData]';
  const headers = isMultipart 
    ? { ...options.headers }
    : { 'Content-Type': 'application/json', ...options.headers };

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
  } catch (err) {
    if (!res.ok) throw new Error(`Status ${res.status}: ${text.substring(0, 500)}`);
    throw err;
  }
}

async function runTests() {
  try {
    log("Starting E2E Integration Tests...");

    // 1. Admin Login
    log("Logging in as Admin...");
    const adminLogin = await request(`${AUTH_API}/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: "sudeepdas2525@zohomail.in",
        password: "Sudeep@00"
      })
    });
    const adminToken = adminLogin.token;
    if (!adminToken) throw new Error("Admin login failed");
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    log("✅ Admin Logged In");

    // 2. Create a Teacher
    log("Creating a Test Teacher...");
    const teacherEmail = `teacher_${Date.now()}@test.com`;
    await request(`${SAMS_API}/admin/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: "Test Teacher",
        email: teacherEmail,
        phone: "9999999999",
        role: "teacher",
        password: "password123"
      })
    });
    
    // Login as Teacher
    const teacherLogin = await request(`${AUTH_API}/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: teacherEmail,
        password: "password123"
      })
    });
    const teacherToken = teacherLogin.token;
    const teacherId = teacherLogin.user.id;
    const teacherHeaders = { Authorization: `Bearer ${teacherToken}` };
    log("✅ Teacher Created & Logged In");

    // 3. Create a Student
    log("Creating a Test Student...");
    const studentEmail = `student_${Date.now()}@test.com`;
    await request(`${SAMS_API}/admin/students`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: "Test Student",
        email: studentEmail,
        phone: "8888888888",
        role: "student",
        classLevel: "10",
        password: "password123"
      })
    });

    // Login as Student
    const studentLogin = await request(`${AUTH_API}/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: studentEmail,
        password: "password123"
      })
    });
    const studentToken = studentLogin.token;
    const studentHeaders = { Authorization: `Bearer ${studentToken}` };
    log("✅ Student Created & Logged In");

    // ---------------------------------------------------------------------------------
    // TEST FLOW 1: Admin to Student (Notices)
    // ---------------------------------------------------------------------------------
    log("\n--- TEST FLOW 1: Admin -> Student ---");
    const noticeTitle = `Test Notice ${Date.now()}`;
    await request(`${SAMS_API}/admin/notices`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: noticeTitle,
        content: "This is a test notice for students",
        category: "Student",
        author: "Admin",
      })
    });

    // Student fetches notices
    const studentNotices = await request(`${SAMS_API}/notices`, { headers: studentHeaders });
    const foundNotice = studentNotices.data.find(n => n.title === noticeTitle);
    if (!foundNotice) throw new Error("Student could not see the Admin's Notice");
    log("✅ Admin -> Student Notice flow SUCCESS");


    // ---------------------------------------------------------------------------------
    // TEST FLOW 2: Admin to Teacher (Courses)
    // ---------------------------------------------------------------------------------
    log("\n--- TEST FLOW 2: Admin -> Teacher ---");
    const courseName = `Test Course ${Date.now()}`;
    await request(`${SAMS_API}/admin/courses`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: courseName,
        description: "Test Description",
        classLevel: "10",
        assignedTeacherId: teacherId
      })
    });

    // Teacher fetches courses
    const teacherCourses = await request(`${SAMS_API}/teacher/courses`, { headers: teacherHeaders });
    const foundCourse = teacherCourses.data.find(c => c.name === courseName);
    if (!foundCourse) throw new Error("Teacher could not see the assigned Course");
    log("✅ Admin -> Teacher Course assignment flow SUCCESS");

    // ---------------------------------------------------------------------------------
    // TEST FLOW 3: Teacher to Student (Homework, Study Material, Results)
    // ---------------------------------------------------------------------------------
    log("\n--- TEST FLOW 3: Teacher -> Student ---");
    
    // a) Homework
    const hwTitle = `Test HW ${Date.now()}`;
    await request(`${SAMS_API}/admin/homework`, {
      method: 'POST',
      headers: teacherHeaders,
      body: JSON.stringify({
        title: hwTitle,
        description: "Solve this",
        classLevel: "10",
        subject: "Math",
        dueDate: new Date().toISOString()
      })
    });

    // Student fetches homework
    const studentHomeworks = await request(`${SAMS_API}/homework`, { headers: studentHeaders });
    const foundHW = studentHomeworks.data.find(h => h.title === hwTitle);
    if (!foundHW) throw new Error("Student could not see the Teacher's Homework");
    log("✅ Teacher -> Student Homework flow SUCCESS");

    // b) Study Material
    const matTitle = `Test Material ${Date.now()}`;
    await request(`${SAMS_API}/admin/studymaterial`, {
      method: 'POST',
      headers: teacherHeaders,
      body: JSON.stringify({
        title: matTitle,
        description: "Read this",
        classLevel: "10",
        subject: "Science",
        fileUrl: "/fake-url.pdf"
      })
    });

    // Student fetches materials
    const studentMaterials = await request(`${SAMS_API}/studymaterial`, { headers: studentHeaders });
    const foundMat = studentMaterials.data.find(m => m.title === matTitle);
    if (!foundMat) throw new Error("Student could not see the Teacher's Study Material");
    log("✅ Teacher -> Student Study Material flow SUCCESS");

    log("\n🎉 ALL E2E INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉");
  } catch (error) {
    console.error("\n❌ E2E TEST FAILED!");
    console.error(error.message);
  }
}

runTests();
