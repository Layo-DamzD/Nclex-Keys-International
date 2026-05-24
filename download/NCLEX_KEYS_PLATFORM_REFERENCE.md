# NCLEX KEYS INTERNATIONAL — COMPLETE PLATFORM REFERENCE
## Every Feature, Function, Sidebar Section, Language & Hosting Detail

---

# PART 1: TECHNOLOGY STACK & HOSTING

## Languages Used
| Language | Where Used | Purpose |
|----------|-----------|---------|
| JavaScript (ES6+) | Client (`client/src/`), Server (`server/`) | Entire application codebase |
| JSX | `client/src/**/*.jsx` | React component templates |
| CSS | `client/src/**/*.css`, `client/src/index.css` | Styling (inline + external stylesheets) |
| JSON | `package.json`, `constants/`, configs | Configuration, constants, env |
| HTML | `index.html`, `public/` | Entry points, PWA manifest, sitemap, robots |

## Frameworks & Libraries

### Frontend (Client)
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.x | UI component library |
| Vite | 5.x | Build tool & dev server |
| React Router DOM | 6.x | Client-side routing |
| Axios | 1.x | HTTP API calls |
| AOS (Animate On Scroll) | 2.x | Scroll animations |
| Bootstrap | 5.x | CSS framework / responsive grid |
| Font Awesome | 6.x | Icon library |
| Chart.js | 4.x | Charts (admin analytics) |
| react-chartjs-2 | 5.x | React Chart.js wrapper |
| Firebase (client SDK) | 11.x | Push notifications, service worker |

### Backend (Server)
| Technology | Version | Purpose |
|-----------|---------|---------|
| Express | 5.2.1 | Web framework |
| Mongoose | 9.2.1 | MongoDB ODM |
| bcryptjs | 3.0.3 | Password hashing |
| jsonwebtoken | 9.0.3 | JWT authentication |
| nodemailer | 6.10.1 | Email sending (SMTP) |
| multer | 2.0.2 | File upload handling |
| cloudinary | 2.9.0 | Cloud image storage |
| firebase-admin | 13.6.1 | FCM push notifications |
| cors | 2.8.6 | Cross-origin support |
| express-validator | 7.3.1 | Input validation |
| z-ai-web-dev-sdk | 0.0.17 | AI chat integration (Brainiac AI tutor) |
| dotenv | 17.3.1 | Environment variables |
| crypto | 1.0.1 | Token generation |

### External Services / APIs
| Service | Purpose |
|---------|---------|
| MongoDB Atlas | Database (remote, hosted on Render) |
| Luxand Cloud API | Facial recognition (face enrollment, search, liveness) |
| Firebase Cloud Messaging (FCM) | Push notifications |
| Cloudinary | Image/document cloud storage |
| SMTP (Gmail or custom) | Transactional emails |
| Z-AI SDK | AI chatbot (Brainiac NCLEX tutor) |
| Render | Backend server hosting |
| Vercel | Frontend hosting |

## Hosting Architecture
| Component | Host | Notes |
|-----------|------|-------|
| Backend API | Render | Express server, MongoDB Atlas connection |
| Frontend SPA | Vercel | React+Vite build, Vercel rewrites proxy API calls |
| Database | MongoDB Atlas | Remote cloud database |
| Images/Files | Cloudinary | Cloud storage for uploads |
| Push Notifications | Firebase | FCM for web push |

---

# PART 2: ALL ROUTES (130+ ENDPOINTS)

## Authentication Routes (`/api/auth`) — 18 endpoints
| Method | Path | Auth | Function | Description |
|--------|------|------|----------|-------------|
| POST | `/student/register` | Public | registerStudent | Register student (legacy) |
| POST | `/student/login` | Public | loginStudent | Student login (email+password, device tracking) |
| POST | `/student/verify-face` | Public | verifyStudentFace | Face verification via Luxand (liveness + match) |
| POST | `/student/send-otp` | Public | sendStudentSignupOtp | Send email OTP for signup |
| POST | `/student/verify-otp-and-register` | Public | verifyOtpAndRegisterStudent | Full OTP-based student registration with face enrollment |
| POST | `/student/verify-public-test-email` | Public | verifyPublicTestEmail | Link public test lead to registered student |
| POST | `/forgot-password` | Public | forgotPassword | Student forgot password (generates reset token) |
| POST | `/reset-password/:token` | Public | resetPassword | Reset student password via email token |
| POST | `/reset-password-otp` | Public | resetPasswordWithOtp | Reset student password via OTP |
| POST | `/admin/register` | Public | registerAdmin | Admin registration |
| POST | `/admin/login` | Public | loginAdmin | Admin login (email+password+access code) |
| POST | `/admin/verify-signup-code` | Public | verifyAdminSignupCode | Verify admin email verification code |
| POST | `/admin/forgot-password` | Public | forgotAdminPassword | Admin forgot password (sends OTP email) |
| POST | `/admin/reset-password/:token` | Public | resetAdminPassword | Reset admin password via token |
| POST | `/admin/reset-password-otp` | Public | resetAdminPasswordWithOtp | Reset admin password via OTP |
| POST | `/admin/forgot-access-code` | Public | forgotAdminAccessCode | Recover admin access code (name+password verification) |
| GET | `/me` | protect | getMe | Get current authenticated user |
| POST | `/admin/approve/:adminId` | protect, superAdminOnly | approveAdmin | Approve pending admin |

## Admin Routes (`/api/admin`) — 50+ endpoints
| Method | Path | Auth | Function | Description |
|--------|------|------|----------|-------------|
| GET | `/stats` | protect, adminOnly | getAdminStats | Dashboard statistics (counts, rates) |
| GET | `/upload-counts` | protect, adminOnly | getUploadCounts | Upload statistics (daily/monthly/yearly) |
| GET | `/questions/export` | protect, adminOnly | exportQuestions | Export all questions as CSV |
| GET | `/questions/recent` | protect, adminOnly | getRecentQuestions | Last 10 recently created questions |
| GET | `/questions` | protect, adminOnly | getQuestions | Paginated questions with search/filter |
| GET | `/questions/:id` | protect, adminOnly | getQuestionById | Get single question |
| POST | `/questions` | protect, adminOnly | createQuestion | Create new question |
| PUT | `/questions/:id` | protect, adminOnly | updateQuestion | Update question |
| DELETE | `/questions/:id` | protect, adminOnly | deleteQuestion | Delete single question |
| POST | `/questions/bulk-delete` | protect, adminOnly | bulkDeleteQuestions | Delete multiple questions |
| POST | `/questions/bulk-import` | protect, adminOnly, multer | bulkImportQuestions | CSV bulk import (all question types) |
| POST | `/questions/import-url` | protect, adminOnly | importFromUrl | Import questions from URL |
| POST | `/questions/check-duplicate` | protect, adminOnly | checkDuplicate | Jaccard similarity duplicate check |
| POST | `/recalculate-scores` | protect, adminOnly | recalculateTestScores | Re-evaluate all test results with updated SATA scoring |
| GET | `/students` | protect, adminOnly | getStudents | List students with search/filter |
| POST | `/students` | protect, adminOnly | createStudentByAdmin | Create student account |
| PUT | `/students/:id/toggle-status` | protect, superAdminOnly | toggleStudentStatus | Activate/deactivate student |
| DELETE | `/students/:id` | protect, superAdminOnly | deleteStudent | Delete student |
| PUT | `/students/:id/payment-date` | protect, adminOnly | updateStudentPaymentDate | Update subscription start date |
| POST | `/students/notify` | protect, adminOnly | sendNotification | Send push notifications to students |
| POST | `/tests` | protect, adminOnly | createAdminTest | Create test + assign to students |
| GET | `/students/list` | protect, adminOnly | getStudentList | Student dropdown list |
| GET | `/students/:studentId/progress` | protect, adminOnly | getStudentProgress | Detailed student progress report |
| DELETE | `/students/:id/devices` | protect, adminOnly | clearStudentDeviceHistory | Clear all trusted devices |
| DELETE | `/students/:id/devices/:deviceRecordId` | protect, adminOnly | removeStudentDevice | Remove specific device |
| GET | `/test-results/:resultId` | protect, adminOnly | getTestResultForReview | Review student test result |
| GET | `/content/materials` | protect, adminOnly | getStudyMaterials | List study materials |
| POST | `/content/materials` | protect, adminOnly | createStudyMaterial | Create study material |
| PUT | `/content/materials/:id` | protect, adminOnly | updateStudyMaterial | Update study material |
| DELETE | `/content/materials/:id` | protect, adminOnly | deleteStudyMaterial | Delete study material |
| POST | `/content/upload` | protect, adminOnly, multer | uploadFile | Upload file to Cloudinary/MongoDB |
| GET | `/instructors` | protect, superAdminOnly | getInstructors | List instructors |
| POST | `/instructors` | protect, superAdminOnly | createInstructor | Create instructor |
| PUT | `/instructors/:id` | protect, superAdminOnly | updateInstructor | Update instructor |
| PUT | `/instructors/:id/toggle-status` | protect, superAdminOnly | toggleInstructorStatus | Activate/deactivate instructor |
| DELETE | `/instructors/:id` | protect, superAdminOnly | deleteInstructor | Delete instructor |
| GET | `/logs` | protect, superAdminOnly | getSystemLogs | System audit logs |
| GET | `/feedback` | protect, superAdminOnly | getFeedback | List student feedback |
| PUT | `/feedback/:id` | protect, superAdminOnly | updateFeedback | Reply to feedback |
| DELETE | `/feedback/:id` | protect, superAdminOnly | deleteFeedback | Delete feedback |
| GET | `/exam-support/conversations` | protect, superAdminOnly | getExamSupportConversations | Active exam support chats |
| GET | `/exam-support/messages` | protect, superAdminOnly | getExamSupportMessagesAdmin | Chat messages |
| POST | `/exam-support/messages` | protect, superAdminOnly | sendExamSupportMessageAdmin | Send message as admin |
| GET | `/users/admins` | protect, superAdminOnly | getAllAdmins | List all admins |
| PUT | `/approve/:adminId` | protect, superAdminOnly | approveAdmin | Approve admin registration |
| GET | `/users/:adminId/student-scope` | protect, superAdminOnly | getAdminStudentScope | Get admin's managed students |
| PUT | `/users/:adminId/student-scope` | protect, superAdminOnly | updateAdminStudentScope | Set admin's managed students |
| DELETE | `/users/:adminId` | protect, superAdminOnly | deleteAdmin | Delete admin |
| GET | `/settings` | protect, adminOnly | getAdminSettings | Get admin settings |
| PUT | `/settings/profile` | protect, adminOnly | updateAdminProfileSettings | Update admin name |
| PUT | `/settings/password` | protect, adminOnly | updateAdminPasswordSettings | Change admin password |
| DELETE | `/settings/devices` | protect, adminOnly | clearAdminDeviceSettings | Clear admin device records |
| GET | `/landing-page/:pageKey` | protect, superAdminOnly | getLandingPageConfig | Get landing page CMS config |
| PUT | `/landing-page/:pageKey` | protect, superAdminOnly | saveLandingPageConfig | Save landing page CMS config |

## Student Routes (`/api/student`) — 43 endpoints
| Method | Path | Auth | Function | Description |
|--------|------|------|----------|-------------|
| GET | `/dashboard/stats` | protect | getDashboardStats | Dashboard stats (QBank count, tests, pass rate) |
| GET | `/recent-tests` | protect | getRecentTests | Last 5 test results |
| GET | `/activity` | protect | getRecentActivity | Last 10 activities |
| GET | `/available-tests` | protect | getAvailableTests | Tests assigned by admin |
| GET | `/categories` | protect | getCategories | All categories with subcategories |
| GET | `/subcategory-counts` | protect | getSubcategoryCounts | Question counts per subcategory |
| GET | `/client-needs-counts` | protect | getClientNeedsCounts | Question counts by client needs |
| GET | `/question-status-counts` | protect | getQuestionStatusCounts | Counts: unused/incorrect/marked/omitted/correct |
| POST | `/generate-test` | protect | generateTest | Generate custom test |
| POST | `/submit-test` | protect | submitTest | Submit completed test |
| GET | `/test/:id` | protect | getPreparedTest | Get prepared test questions |
| GET | `/test-history` | protect | getTestHistory | All test results |
| GET | `/test-result/:id` | protect | getTestResult | Single test result with answers |
| GET | `/incorrect-questions` | protect | getIncorrectQuestions | All incorrectly answered questions |
| POST | `/redo-question` | protect | redoQuestion | Redo an incorrect question |
| GET | `/study-materials` | authOnly | getStudyMaterials | List active study materials |
| GET | `/download-material` | authOnly | downloadMaterial | Proxy download (CORS) |
| GET | `/performance` | protect | getPerformanceData | Performance trends |
| GET | `/performance-detailed` | protect | getPerformanceDataDetailed | Detailed performance with breakdown |
| GET | `/profile` | protect | getProfile | Get student profile |
| PUT | `/profile` | protect | updateProfile | Update profile (name, exam date, etc.) |
| POST | `/change-password` | protect | changePassword | Change password |
| GET | `/assigned-tests` | protect | getAssignedTests | Tests assigned by admin |
| POST | `/cat/start` | protect | startCATSession | Start CAT/Assessment session |
| POST | `/cat/answer` | protect | submitCATAnswer | Submit CAT answer (adaptive loop) |
| POST | `/cat/resume` | protect | resumeCATSession | Resume in-progress CAT |
| POST | `/cat/abandon` | protect | abandonCATSession | Abandon CAT session |
| GET | `/cat/session` | protect | getCatSessionStatus | Check CAT session status |
| GET | `/check-weekly-review` | protect | checkWeeklyReview | Check if 7+ days since last review |
| POST | `/mark-review-done` | protect | markReviewDone | Mark weekly review done |
| GET | `/public-test-review-status` | protect | getPublicTestReviewStatus | Check unreviewed public test |
| POST | `/public-test-review-reviewed` | protect | markPublicTestReviewReviewed | Mark public test reviewed |
| POST | `/feedback` | protect | submitStudentFeedback | Submit feedback (rating + message) |
| GET | `/exam-support/messages` | protect | getExamSupportMessages | Get exam support messages |
| POST | `/exam-support/messages` | protect | sendExamSupportMessage | Send exam support message |
| POST | `/mark-welcome-seen` | protect | markWelcomeSeen | Mark welcome popup seen |
| POST | `/dismiss-popup` | protect | dismissPopup | Dismiss popup by ID |
| POST | `/save-test-progress` | protect | saveTestProgress | Save/resume test progress |
| GET | `/resume-test/:id` | protect | resumeTestSession | Resume in-progress test |
| POST | `/exit-test/:id` | protect | exitTestSession | Exit test, finalize score |
| POST | `/fcm-token` | protect | registerFcmToken | Register push notification token |
| DELETE | `/fcm-token` | protect | unregisterFcmToken | Unregister push token |
| POST | `/cat/exit` | protect | exitCATSession | Exit CAT session |

## Analytics Routes (`/api/admin/analytics`) — 7 endpoints
| Method | Path | Function |
|--------|------|----------|
| GET | `/usage-by-type` | Question usage by type |
| GET | `/success-by-category` | Success rate per category |
| GET | `/difficulty-distribution` | Easy/medium/hard distribution |
| GET | `/daily-trend` | Daily test completion trends |
| GET | `/most-used` | Top 20 most used questions |
| GET | `/category-stats` | Detailed category statistics |
| GET | `/client-needs-stats` | Client needs statistics |

## Chat Routes (`/api/chat`) — 7 endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/send` | Public | Send message, get AI response |
| POST | `/escalate` | Public | Escalate to human support |
| GET | `/history/:sessionId` | Public | Chat history |
| GET | `/admin/escalated` | authOnly, adminOnly | All escalated conversations |
| GET | `/admin/session/:sessionId` | authOnly, adminOnly | Full conversation for admin |
| POST | `/admin/respond` | authOnly, adminOnly | Admin responds to escalated chat |
| POST | `/admin/resolve` | authOnly, adminOnly | Mark as resolved |

## Test Routes (`/api/admin/tests`) — 6 endpoints
| Method | Path | Function |
|--------|------|----------|
| GET | `/` | List all tests |
| POST | `/` | Create test |
| GET | `/students` | Get students for assignment |
| GET | `/:id` | Get single test |
| PUT | `/:id` | Update test |
| DELETE | `/:id` | Delete test |

## Case Study Routes (`/api/admin/case-studies`) — 5 endpoints
| Method | Path | Function |
|--------|------|----------|
| GET | `/` | List case studies |
| POST | `/` | Create case study (auto-creates linked Question) |
| GET | `/:id` | Get single case study |
| PUT | `/:id` | Update case study (syncs linked Question) |
| DELETE | `/:id` | Delete case study + linked Question |

## Content Routes (`/api/content`) — 2 endpoints
| Method | Path | Auth | Function |
|--------|------|------|----------|
| GET | `/landing-page/:pageKey` | Public | Get public landing page config |
| POST | `/public-test/lead` | Public | Save public test lead |

## Inline Server Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/test` | Server status + DB connection |
| GET | `/api/health` | Health check |
| GET | `/api/images/:imageId` | Serve image from MongoDB |
| GET | `/api/images` | List images (paginated) |
| DELETE | `/api/images/:imageId` | Delete image |

---

# PART 3: ADMIN SIDEBAR — ALL SECTIONS

## Superadmin Sidebar (Full Access)
| Section ID | Icon | Label | Component | Description |
|-----------|------|-------|-----------|-------------|
| **dashboard** | tachometer-alt | Dashboard | AdminStats + QuickActions + RecentQuestions | Quick stats, shortcuts, recent activity |
| **questions** | question-circle | Manage Questions | ManageQuestions | Full CRUD, search, filter, bulk operations |
| **upload** | cloud-upload-alt | Upload Questions | UploadQuestion | Single question creation (all types) |
| **draft-questions** | save | Draft Questions | DraftQuestions | Manage unpublished/draft questions |
| **case-studies** | folder-open | Case Studies | CaseStudyBuilder + CaseStudiesList | Build/manage layered, bowtie, trend, matrix case studies |
| **create-test** | plus-circle | Create Test | CreateTest | Create tests, assign to students |
| **landing-page** | edit | Edit Landing Page | LandingPageStudio | CMS editor for home/brainiac pages |
| **analytics** | chart-line | Usage Analytics | UsageAnalytics | Platform analytics with charts |
| **category-stats** | chart-pie | Category Stats | CategoryStats | Question distribution by category |
| **all-students** | users | Your Students | AllStudents | Student management (CRUD, search, notify) |
| **progress-report** | chart-bar | Progress Report | ProgressReport | Individual student progress reports |
| **content-management** | folder | Content Management | ContentManagement | Study materials management |
| **exam-support** | comments | Exam Support Chat | ExamSupportChat | Live exam support conversations |
| **admin-approval** | user-check | Admin Approval | AdminApproval | Approve/reject pending admin registrations |
| **logs** | history | System Logs | SystemLogs | Audit logs with filters |
| **student-feedback** | comment-dots | Student Feedback | StudentFeedback | View/reply to student feedback |
| **settings** | cog | Settings | AdminSettings | Profile, password, sidebar theme |
| **Logout** | sign-out-alt | Logout | — | Clears session, navigates to login |

## Regular Admin Sidebar (Restricted)
| Section ID | Available? |
|-----------|-----------|
| dashboard | YES |
| questions | YES |
| upload | YES |
| draft-questions | YES |
| case-studies | YES |
| create-test | YES |
| landing-page | NO (superadmin only) |
| analytics | NO (superadmin only) |
| category-stats | YES |
| all-students | YES |
| progress-report | YES |
| content-management | YES |
| exam-support | NO (superadmin only) |
| admin-approval | NO (superadmin only) |
| logs | NO (superadmin only) |
| student-feedback | NO (superadmin only) |
| settings | YES |

## Badge System (Superadmin)
Every 30 seconds, polls 3 APIs for unread counts:
- admin-approval: pending admin registrations
- student-feedback: new unread feedback
- exam-support: unread exam support messages

---

# PART 4: STUDENT SIDEBAR — ALL SECTIONS

| Section ID | Icon | Label | Component | Description |
|-----------|------|-------|-----------|-------------|
| **dashboard** | tachometer-alt | Dashboard | StatsCards + RecentTests + ActivityFeed | Stats overview, recent tests, activity timeline |
| **prepared-tests** | file-alt | Take Prepared Test | AvailableTests | Tests created/assigned by admin |
| **create-test** | plus-circle | Create Test | TestCustomization | Custom test by category, subcategory, question type |
| **previous-tests** | history | Previous Tests | PreviousTests | Full test history with review/resume |
| **incorrect-questions** | exclamation-circle | Incorrect Question | IncorrectQuestions | Bank of incorrectly answered questions |
| **performance** | chart-line | Performance Analysis | PerformanceAnalysis | Detailed performance charts/metrics |
| **topic-analysis** | chart-pie | Topic Analysis | TopicAnalysis | Performance by topic/category |
| **materials** | book | Study Materials | StudyMaterials | Downloadable study materials |
| **profile** | user-circle | My Profile | Profile | Name, exam date, password change |
| **Logout** | sign-out-alt | Logout | — | Clears tokens, navigates to login |

## Student Sidebar Header
- Avatar icon
- Student name
- Student ID (formatted as NCXKEYS-XXXXXX)
- Program label (NCLEX-RN or NCLEX-PN)

---

# PART 5: ALL DATABASE MODELS (17 Models)

## 1. User (user.js)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | YES | Full name |
| email | String, unique | YES | Email |
| password | String | YES | Bcrypt-hashed password |
| role | String, enum | NO | 'student', 'admin', 'superadmin', 'pending_verification' |
| status | String, enum | NO | 'active', 'inactive' |
| subscriptionStartDate | Date | NO | Start of 30-day subscription |
| program | String, enum | NO | 'NCLEX-RN', 'NCLEX-PN' |
| phone, country, examDate | String/Date | NO | Profile info |
| approved | Boolean | NO | Admin approval status |
| accessCode | String | NO | Admin permanent access code |
| adminEmailVerified | Boolean | NO | Admin email verification |
| luxandPersonId | String | NO | Luxand face person ID |
| faceEnrolledAt | Date | NO | Face enrollment date |
| seenQuestions | [ObjectId] | NO | Questions student has seen |
| customTestUsedQuestions | [ObjectId] | NO | Questions used in custom tests |
| customTestOmittedQuestions | [ObjectId] | NO | Omitted questions |
| fcmTokens | [String] | NO | FCM push tokens (max 8) |
| trustedDevices | [{deviceId, label, verifiedAt, lastUsedAt}] | NO | Student device trust records |
| adminDeviceLogins | [{deviceId, label, userAgent, ipAddress, firstSeenAt, lastSeenAt}] | NO | Admin device records |
| managedStudents | [ObjectId] | NO | Admin's scoped student IDs |
| incorrectQuestions | [{questionId, lastAttempted, attemptCount}] | NO | Tracked wrong answers |
| publicTestResult | {source, score, total, attempted, percentage, submittedAt, reviewedAt} | NO | Public test result |
| dismissedPopups | Map<String, Number> | NO | Popup dismissal timestamps |

## 2. Question (Question.js)
| Field | Type | Description |
|-------|------|-------------|
| type | String, enum | 'multiple-choice', 'sata', 'fill-blank', 'highlight', 'drag-drop', 'matrix', 'hotspot', 'cloze-dropdown', 'case-study' |
| category, subcategory | String | Question categorization |
| clientNeed, clientNeedSubcategory | String | NCLEX client need categorization |
| isNextGen | Boolean | Next Generation NCLEX flag |
| questionText, questionImageUrl | String | Question content |
| options, optionImages | [String] | Answer choices |
| correctAnswer | Mixed | Correct answer (letter, array, or object) |
| rationale, rationaleImageUrl | String | Explanation |
| difficulty | String, enum | 'easy', 'medium', 'hard' |
| isDraft | Boolean | Draft/published status |
| timesUsed, correctAttempts, incorrectAttempts | Number | Usage statistics |
| matrixRows, matrixColumns | Mixed | Matrix question data |
| hotspotImageUrl, hotspotTargets | Mixed | Hotspot question data |
| clozeTemplate, clozeBlanks | Mixed | Cloze dropdown data |
| caseStudyId, caseStudyType | Mixed | Case study linkage |
| scenario, sections, questions | Mixed | Case study content |
| highlightStart, highlightEnd, highlightSelectableWords, highlightCorrectWords | Number/[Number] | Highlight question data |
| irtDiscrimination, irtDifficulty, irtGuessing, irtModel | Number/String | IRT parameters |

## 3. CaseStudy (CaseStudy.js)
| Field | Type | Description |
|-------|------|-------------|
| title, category, subcategory | String | Identification |
| scenario | String | Patient scenario |
| type | String, enum | '6-question' (layered), 'bowtie', 'trend', 'matrix' |
| sections | [{sectionId, title, content}] | Additional data sections |
| questions | [embedded] | Sub-questions (with trendData, bowtieCondition/Actions/Parameters, hotspotTargets, clozeBlanks) |
| linkedQuestionId | ObjectId | Auto-linked Question document for student use |
| createdBy | ObjectId | Creator admin |

## 4. Test (Test.js)
| Field | Type | Description |
|-------|------|-------------|
| title, description, category | String | Test info |
| questions | [ObjectId ref Question] | Test questions |
| duration | Number | Duration in minutes |
| passingScore | Number | Default 70 |
| assignmentType | String, enum | 'all', 'individual' |
| assignedStudents | [ObjectId] | Assigned students |
| proctored | Boolean | Proctoring flag |

## 5. TestResult (testResult.js)
| Field | Type | Description |
|-------|------|-------------|
| student | ObjectId | Student reference |
| testId, testName, testType | Mixed | Test identification |
| score, totalQuestions, totalPoints, earnedPoints | Number | Score data |
| percentage, passed | Number, Boolean | Result |
| timeTaken | Number | Time in seconds |
| status | String, enum | 'completed', 'in_progress', 'exited' |
| theta, se | Number | CAT ability estimate |
| confidence | {level, percentage} | Confidence level |
| answers | [answerSchema] | Full answer details per question |
| proctoring | Mixed | Proctoring data |
| testSessionData | Object | Full session snapshot for resume |

## 6. CatSession (CatSession.js) — 48h TTL auto-expire
| Field | Type | Description |
|-------|------|-------------|
| student | ObjectId | Student |
| testType | String, enum | 'cat', 'assessment' |
| administered, responses, earnedMarks, totalMarks | Array | Administered questions & results |
| theta, se, thetaHistory | Number/[Number] | Adaptive testing state |
| answerDetails | [{questionId, userAnswer, earnedMarks, totalMarks, isCorrect, questionType, scenario}] | Full answer details |
| questionPoolIds | [ObjectId] | Pool question IDs |
| engineConfig | Object | Engine config snapshot |
| currentQuestionId, questionNumber | Mixed | Current state |
| weakCategories, strongCategories | [String] | Assessment categories |

## 7. Other Models
| Model | Key Fields |
|-------|-----------|
| **Feedback** | student, message, rating(1-5), status(new/read/replied), reply |
| **ChatMessage** | sessionId, senderRole, message, escalated, resolved |
| **SystemLog** | user, action, details, ip, userAgent, level |
| **Activity** | student, type(test/video/progress/notification), text, detail |
| **Instructor** | name, email, title, bio, specialties, photoUrl, socialLinks |
| **StudyMaterial** | title, category, fileUrl, fileType, isActive |
| **Image** | imageId, filename, mimeType, data(base64), category |
| **LandingPageConfig** | pageKey, config(full CMS data) |
| **AssessmentConfig** | Singleton with all CAT engine parameters |
| **PublicTestLead** | name, email, score, percentage, answers, ip, location, device |
| **ExamSupportMessage** | student, sessionId, senderRole, message, isRead flags |

---

# PART 6: COMPLETE FEATURE LIST (Every Feature & Function)

## AUTHENTICATION & SECURITY FEATURES

### 1. Student Registration
- OTP-based email verification (send OTP → verify OTP → register)
- Access code required (STUDENT_SIGNUP_ACCESS_CODE env var)
- Program selection (NCLEX-RN / NCLEX-PN)
- Exam date, phone, country
- Face enrollment via Luxand API (liveness check + face capture)
- Welcome email sent on registration
- Terms acceptance required

### 2. Student Login
- Email + password authentication
- JWT token stored in localStorage
- **Device Detection**: Generates unique device ID (localStorage), tracks first-seen dates
- **Face Verification**: On new/unknown device → face verification required via Luxand (liveness + face matching, threshold 0.78)
- **Auto-Deactivate**: Expired subscriptions (30 days from start) automatically set status to 'inactive'
- **Suspended Account**: Shows WhatsApp support link for reactivation

### 3. Admin Registration
- Name, email, password
- Sends email verification code
- Superadmins approved immediately (auto-login)
- Regular admins require manual approval by superadmin
- Generates permanent access code sent via email

### 4. Admin Login
- Email + password + 6-digit permanent access code
- JWT stored in sessionStorage
- Device tracking with platform/browser detection
- Access code can be recovered via forgot-access-code flow (name + password verification)

### 5. Password Reset
- **Students**: Email → OTP → new password (or token-based via email link)
- **Admins**: Email → OTP → new password (or token-based via email link)
- OTP expiration: 10 minutes

### 6. Route Protection
- **ProtectedRoute**: Checks localStorage token + user context, redirects unauthenticated
- **AdminRoute**: Checks sessionStorage adminToken, verifies admin role via `/api/auth/me`

### 7. Auto-Deactivate Account
- On EVERY authenticated request (`protect` middleware), checks if student subscription has expired
- 30-day subscription window from `subscriptionStartDate` or `createdAt`
- Expired students: `status` set to 'inactive', receives 403 response
- On reactivation (admin toggles status), subscription resets if expired

## ADMIN DASHBOARD FEATURES

### 8. Quick Stats (AdminStats)
- Total students count
- Total questions (published, excluding drafts)
- Questions per subject/category breakdown
- Questions per client needs breakdown
- Case study count (layered + standalone)
- Uncategorized question count
- Total platform usage
- Overall success rate

### 9. Quick Actions (QuickActions)
- Navigation shortcuts to key admin sections
- Export all questions CSV
- Question counts summary

### 10. Recent Questions (RecentQuestions)
- Last 10 recently created questions
- Shows question type, category, creation date

### 11. Manage Questions (ManageQuestions)
- Paginated table of all questions
- **Search**: Text search across question text, options, rationale
- **Filters**: Category, subcategory, type, difficulty, client need, draft status
- **Sort**: By creation date
- **Actions**: View, edit, delete, bulk select
- **Bulk Operations**: Bulk delete
- **Pagination**: Configurable page size

### 12. Upload Question (UploadQuestion)
- Create single question manually
- Supports ALL question types:
  - Multiple Choice (single answer)
  - SATA (Select All That Apply)
  - Fill in the Blank
  - Highlight (click correct words in text)
  - Drag and Drop (two-box system)
  - Matrix (rows × columns grid)
  - Hotspot (click on image)
  - Cloze Dropdown (dropdowns in text)
- Correct answer validation on publish
- Rationale with image support
- Question image upload
- Draft/publish toggle

### 13. Bulk Import Questions (in UploadQuestion)
- CSV file upload
- Custom CSV parser handles quoted fields, newlines
- Supports: MC, SATA, fill-blank, highlight, matrix, hotspot, cloze-dropdown, case-study
- Upsert logic (by type+category+subcategory+questionText)
- Returns: inserted count, updated count, error count
- Massive function (~500 lines)

### 14. Import from URL
- Fetches HTML from URL
- Extracts text content
- Parses numbered questions using regex
- Creates questions from parsed content

### 15. Duplicate Check
- Jaccard similarity algorithm
- 50% threshold → reports similarity
- 80% threshold → marks as duplicate
- Compared against published questions

### 16. Draft Questions (DraftQuestions)
- View all draft/unpublished questions
- Same CRUD as Manage Questions but filtered to drafts
- Publish drafts individually

### 17. Case Study Builder (CaseStudyBuilder)
- Build case studies with 4 types:
  - **6-question (Layered/Unfolding)**: Progressive patient scenario with 6 sub-questions
  - **Bowtie (Standalone)**: Condition → Actions → Parameters format
  - **Trend (Standalone)**: Data trend analysis questions
  - **Matrix**: Matrix-style case study questions
- Category/subcategory assignment
- Scenario text + additional data sections
- Auto-creates linked Question document in Question collection
- Edit existing case studies
- Syncs changes to linked Question

### 18. Case Studies List (CaseStudiesList)
- View all case studies
- Filter by type
- Delete case studies (also deletes linked Question)

### 19. Create Test (CreateTest)
- Title, description, category
- Select questions from QBank
- Duration in minutes
- Passing score (default 70)
- Assignment type: all students or individual
- Student selection (multi-select)
- Proctoring toggle
- Creates Activity notifications for assigned students
- Sends email to assigned students (with proctoring warning)

### 20. Landing Page Studio (LandingPageStudio) — Superadmin Only
- CMS editor for landing pages ('home' and 'brainiac')
- Block-based layout editing
- Section reordering
- Hero configuration (title, description, features, media)
- Stats section editing
- Program section editing
- Testimonials management
- Real-time preview
- Save/load from database

### 21. Usage Analytics (UsageAnalytics) — Superadmin Only
- Usage by question type (Chart.js bar chart)
- Success by category (Chart.js bar chart)
- Difficulty distribution (pie chart)
- Daily test completion trends (line chart)
- Most used questions (top 20 table)
- Date range filtering

### 22. Category Stats (CategoryStats)
- Question distribution by category
- Subcategory breakdown
- Success rates
- Difficulty distribution per category
- Usage statistics

### 23. All Students (AllStudents)
- Paginated student table
- **Search**: By name, email
- **Filter**: Active/inactive, program
- **Actions**:
  - Create student (modal)
  - Toggle active/inactive status (superadmin only)
  - Delete student (superadmin only)
  - Update payment/subscription date
  - Clear device history
  - Remove specific device
  - View progress report
- **Send Notification**: Push notification + in-app activity
  - Superadmin can target all students
  - Regular admins only their scoped students

### 24. Create Student Modal (CreateStudentModal)
- Name, email, phone, country, program, exam date, password
- Subscription start date
- Welcome email sent

### 25. Progress Report (ProgressReport)
- Select student
- Test history with scores
- Category performance breakdown
- Subcategory performance
- Incorrect questions count
- Detailed progress analysis

### 26. Content Management (ContentManagement)
- Study materials CRUD
- **Categories**: Study Guide, Cheat Sheet, Practice Test, Flashcards, Video, Other
- **File Upload**: To Cloudinary (or MongoDB Image fallback)
- **File Types**: pdf, docx, pptx, mp4, other
- **Notifications**: Adding/updating materials triggers push + email + activity to all active students

### 27. Exam Support Chat (ExamSupportChat) — Superadmin Only
- View active exam support conversations
- Unread message count per conversation
- Read messages + mark as read
- Send messages as admin
- Aggregation pipeline for conversation grouping

### 28. Admin Approval (AdminApproval) — Superadmin Only
- View pending admin registrations
- Approve/reject admins
- View all existing admins

### 29. System Logs (SystemLogs) — Superadmin Only
- Paginated system audit logs
- **Filter**: Date range, log level (info/warning/error)
- Shows: user, action, IP, user agent, timestamp

### 30. Student Feedback (StudentFeedback) — Superadmin Only
- View all student feedback
- Filter by status (new/read/replied)
- Reply to feedback
- Delete feedback

### 31. Admin Settings (AdminSettings)
- **Profile**: Update display name
- **Password**: Change password (requires current password)
- **Sidebar Theme**: Purple gradient / Blue gradient
- **Clear Devices**: Remove all device login records

### 32. Upload Counts (getUploadCounts)
- Today's upload count
- This month's upload count
- This year's upload count
- Total draft vs published counts
- 30-day daily upload breakdown
- Per-admin upload breakdown

### 33. Export Questions
- Export all questions as CSV
- BOM header for Excel compatibility
- Proper field quoting/escaping
- Includes all question types

### 34. Recalculate Test Scores
- Re-evaluates ALL past test results
- Uses updated SATA scoring: earned = correctPicked - wrongPicked
- Updates scores, percentages, pass/fail status
- Useful when scoring algorithm changes

### 35. Admin Student Scope
- Superadmin can assign specific students to regular admins
- Scoped admins only see/manage their assigned students
- All question/test/stats endpoints respect scope filtering

### 36. Instructors Management (Instructors) — Superadmin Only
- CRUD for instructors
- Name, email, title, bio, specialties
- Photo URL
- Social links (Facebook, Twitter, LinkedIn, Instagram)
- Active/inactive toggle

### 37. Assessment Settings (AssessmentSettings) — Superadmin Only
- Configure CAT engine parameters:
  - Min/max items (85/150)
  - Passing standard (theta threshold)
  - Confidence level (0.95)
  - SE decay rate, borderline detection
  - Partial/negative scoring toggles
  - Question type inclusion toggles (MC, SATA, fill-blank, matrix, drag-drop, highlight, hotspot, cloze, bowtie, case-study)

## STUDENT DASHBOARD FEATURES

### 38. Dashboard Home (StatsCards + RecentTests + ActivityFeed)
- **Stats Cards**: QBank total, tests taken, pass rate, average score
- **Subscription Alert**: Days remaining on 30-day subscription
- **Recent Tests**: Last 5 test results with scores
- **Activity Feed**: Last 10 activities (test completed, notification, etc.)

### 39. Take Prepared Test (AvailableTests)
- Tests assigned/created by admin
- Shows test title, duration, passing score, proctoring flag
- Start test → navigates to TestSession

### 40. Create Test (TestCustomization)
- **Total QBank Display**: Shows total available questions with professional message
- **Category Selection**: Multi-select categories
- **Subcategory Selection**: Per-category subcategory counts, multi-select
- **Question Count**: Slider or input
- **Timer**: Per-question timer toggle (85 seconds default)
- **Question Types**: MC, SATA, NGN (Next Gen) mode toggles
- **NGN Mode**: Shows SATA, Unfolding, Standalone pill toggles
- **Filter Mode**: By status (unused, incorrect, marked, all, correct, omitted) — hidden UI but functional

### 41. Test Session (TestSession) — FULL TEST ENGINE
- **Question Types Supported**:
  - Multiple Choice (single answer, letter selection)
  - SATA (select all that apply, multi-answer)
  - Fill in the Blank (text input)
  - Drag and Drop (two-box drag system)
  - Highlight (click correct words in text)
  - Hotspot (click on image target)
  - Matrix (grid selection)
  - Case Study (tabbed sub-questions)
  - Cloze Dropdown (dropdowns within text)
  - Ordered Response
  - Bowtie (condition → actions → parameters)
- **Timer**: Per-question timer (85s) + total test timer
- **Mark for Review**: Flag questions
- **Question Navigator**: Modal showing all questions with status indicators
- **Tutor Mode**: Reveal answers inline after answering (configurable)
- **Calculator**: Built-in calculator modal
- **Exam Support Chat**: In-test chat widget
- **Assessment Speedometer**: SVG semicircle gauge showing real-time performance
- **Anti-Cheat**: Copy/paste/cut/right-click/keyboard shortcuts blocked
- **Auto-Save**: Server auto-save every 30 seconds + sendBeacon on beforeunload
- **Pause/Resume**: Full test state saved to server, resumable
- **Exit**: Mark unanswered as omitted, finalize score
- **Proctoring**: Support for proctored tests

### 42. CAT Session (CatSession) — COMPUTER ADAPTIVE TESTING
- **Adaptive Algorithm**:
  - Starts at theta = 0 (average ability)
  - Selects questions based on proximity to current theta
  - Content balancing prevents type streaks
  - Top-N random selection (3 or 5 for borderline)
  - Updates theta after each answer (±adjustment factor)
  - Standard Error (SE) decays over time
  - Borderline detection (slower SE decay near passing threshold)
- **Stopping Rules**:
  - Min 85 questions reached
  - Max 150 questions reached (immediate decision)
  - 95% confidence interval check (early stop)
  - Timeout evaluation (average of last 60 theta values)
- **Partial Scoring**: For NGN types (case-study, drag-drop, hotspot, bowtie, matrix, cloze, highlight, SATA)
- **Negative Scoring**: Penalizes wrong answers (extra theta penalty)
- **Assessment Mode**: Pre-loads weak/strong categories, builds targeted pool
- **Save/Resume**: Full session persistence in MongoDB (48h TTL)

### 43. Previous Tests (PreviousTests)
- Full test history table
- Score, percentage, pass/fail, date, time taken
- **Resume**: In-progress tests can be resumed
- **Review**: View detailed test results
- **Re-enter**: Continue test session

### 44. Incorrect Questions (IncorrectQuestions)
- Bank of all incorrectly answered questions
- Shows question text, type, category
- **Redo**: Submit new answer, updates tracking
- Tracks attempt count per question

### 45. Performance Analysis (PerformanceAnalysis)
- Category-wise performance charts
- Test score trends
- Weak area identification
- Overall performance metrics
- Uses Chart.js for visualizations

### 46. Topic Analysis (TopicAnalysis)
- Performance breakdown by topic/category
- Subcategory performance
- Success rates per area
- Detailed topic-level analytics

### 47. Study Materials (StudyMaterials)
- List of active study materials
- Material categories (Study Guide, Cheat Sheet, etc.)
- Download via proxy (avoids CORS issues with Cloudinary)
- File type icons

### 48. Profile (Profile)
- View/edit name, program, phone, country, exam date
- Change password (requires current password)
- Program label display

### 49. Weekly Review Popup (WeeklyReviewPopup)
- Checks if 7+ days since last review
- Prompts student to take assessment/review
- Mark as done → updates lastReview timestamp

### 50. Student Feedback Modal (StudentFeedbackModal)
- 1-5 star rating
- Text feedback message
- Saved to Feedback model

### 51. Notification System
- **FCM Push Notifications**: Firebase Cloud Messaging for browser push
- **In-App Notifications**: Activity feed in dashboard
- **Email Notifications**: Various transactional emails
- Token management (max 8 per student, deduplication)
- Foreground message handling

### 52. Popup Dismissal System (3-tier)
1. **Server-side**: `dismissedPopups` Map on User model (source of truth)
2. **sessionStorage**: Session-level dismissal
3. **localStorage**: Device-level dismissal
- Prevents re-triggering of popups across sessions

### 53. Subscription Management
- 30-day subscription from `subscriptionStartDate`
- Days remaining displayed on dashboard
- Auto-deactivation on expiry (every auth check)
- Admin can update payment/subscription date

### 54. Public Test Review
- Students who took public test before signing up can claim their result
- Prompt shown to claim and review public test performance
- Links public test lead to registered user

## PUBLIC / LANDING PAGE FEATURES

### 55. Home Page
- CMS-driven content (fetched from admin Landing Page Studio)
- Structured mode: Configurable section order (hero, stats, program, testimonials)
- Legacy fallback: Hardcoded Hero, Stats, Program, Testimonials components
- 3-second loading timeout → fallback

### 56. Brainiac Page
- AI tutor showcase page
- CMS-driven (admin editable)
- BrainiacSection component

### 57. Public Knowledge Test (PublicKnowledgeTest)
- 22 hardcoded questions (MC, SATA, fill-blank)
- Anti-cheat measures (no copy/paste/right-click/shortcuts)
- Question navigator
- Post-submit: email gate → saves lead with score, answers, geolocation, device info
- Lock card shown after submission ("Message admin to see result")
- Claimable by registered students later

### 58. About Page
- Mission, stats (97% pass rate, 10K+ questions, 1000+ nurses)
- Features, CTA sections

### 59. Contact Page
- Email and WhatsApp contact cards

### 60. PWA (Progressive Web App)
- Service worker registration
- Install prompt tracking
- Offline capability
- Firebase messaging service worker
- Manifest with icons (192px, 512px)

### 61. AI Chat (Brainiac)
- Z-AI powered NCLEX tutor chatbot
- System prompt defines "Keys" persona
- Escalation to human support
- Chat history per session
- Admin can view/respond/resolve escalated chats

### 62. Maintenance Mode
- Server-side: Blocks all API with 403 when MAINTENANCE_MODE=true
- Client-side: Shows MaintenancePage with 403 message
- Currently disabled (false)

---

# PART 7: EMAIL SYSTEM (11 Email Types)

| Email | Trigger | Recipient |
|-------|---------|-----------|
| Password Reset (Student) | forgot-password | Student |
| Password Reset OTP (Student) | forgot-password (OTP flow) | Student |
| Password Reset (Admin) | forgot-admin-password | Admin |
| Password Reset OTP (Admin) | forgot-admin-password (OTP) | Admin |
| Admin Signup Verification | admin/register | New admin (with access code) |
| Admin Access Code Recovery | forgot-access-code | Admin |
| Student Welcome | student/register or verify-otp | New student |
| Student Signup OTP | student/send-otp | Student |
| Test Assignment | admin/create-test | Assigned students |
| Chat Escalation | chat/escalate | Admin/support |
| Public Test Lead | public-test/lead submission | Admin/notification |
| Study Material Update | admin creates/updates material | All active students |
| Exam Support Alert | student first exam-support message | Admin |

---

# PART 8: NOTIFICATION SYSTEM

### Push Notifications (FCM)
- Multicast sending (batches of 500)
- Token deduplication (max 8 per student)
- Invalid token tracking/cleanup
- Admin can send to all students or specific students

### In-App Activity Feed
- Types: test, video, progress, achievement, test_completed, notification
- Shows in student dashboard
- Created on: test submission, test assignment, material updates, admin notifications

### Browser Notifications
- Foreground message handling
- Permission request (once, persisted)

---

# PART 9: CAT ENGINE (Computer Adaptive Testing)

### Parameters (Configurable via AssessmentSettings)
| Parameter | Default | Range |
|-----------|---------|-------|
| passingStandard | 0.0 | -3 to +3 |
| minItems | 85 | 15-150 |
| maxItems | 150 | 50-300 |
| confidenceThreshold | 0.95 | 0.5-0.999 |
| initialAdjustment | 0.3 | 0.05-1.0 |
| minAdjustment | 0.05 | 0.01-0.5 |
| seDecay | 0.95 | 0.80-0.99 |
| borderlineSeDecay | 0.975 | 0.90-0.995 |
| borderlineThreshold | 0.2 | 0.05-1.0 |
| negativePenalty | 0.15 | 0.01-1.0 |
| partialThreshold | 0.6 | 0.1-0.9 |

### Question Selection Logic
1. Calculate proximity of each available question's difficulty to current theta
2. Apply content-balancing penalties (prevent type streaks)
3. Random selection from top-N candidates (3 or 5 for borderline)
4. Ensure no question is administered twice

### Adaptive Logic
1. After each answer: calculate correctness (with partial scoring for NGN)
2. If correct: theta += adjustment (positive shift)
3. If wrong: theta -= adjustment (negative shift, extra penalty for negative scoring)
4. SE decays after each response
5. Borderline detection slows SE decay
6. Check stopping rules after each response

### Scoring (Per Question Type)
| Type | Scoring |
|------|---------|
| MC | 1 point correct, 0 wrong |
| SATA | partial_negative: earned = correctPicked - wrongPicked |
| Fill-blank | Exact text match |
| Matrix | Per-row scoring |
| Drag-drop | Per-item scoring |
| Highlight | Per-word scoring |
| Hotspot | Proximity-based scoring |
| Cloze | Per-blank scoring |
| Case-study | Per-sub-question scoring |
| Bowtie | Per-section scoring |

---

# PART 10: CLIENT ROUTES (26 Routes)

| Path | Component | Protection | Description |
|------|-----------|------------|-------------|
| / | Home | Public | Landing page (CMS-driven) |
| /about | About | Public | About page |
| /contact | Contact | Public | Contact page |
| /brainiac | Brainiac | Public | AI tutor page |
| /test-your-knowledge | PublicKnowledgeTest | Public | Pre-signup practice test |
| /login | StudentLogin | Public | Student login |
| /signup | StudentSignup | Public | Student signup (OTP flow) |
| /forgot-password | ForgotPassword | Public | Student password reset |
| /reset-password/:token | ResetPassword | Public | Token-based reset |
| /dashboard | StudentDashboard | ProtectedRoute | Student SPA |
| /test-session | TestSession | ProtectedRoute | Test taking engine |
| /cat-session | CatSession | ProtectedRoute | CAT testing engine |
| /test-review/:resultId | StudentTestReviewPage | ProtectedRoute | Student test review |
| /NCLEXkeys | AdminSecret | Public | Secret admin gateway |
| /admin/login | AdminLogin | Public | Admin login |
| /admin/signup | AdminSignup | Public | Admin registration |
| /admin/forgot-password | AdminForgotPassword | Public | Admin password reset |
| /admin/forgot-access-code | AdminForgotAccessCode | Public | Access code recovery |
| /admin/reset-password/:token | AdminResetPassword | Public | Admin token reset |
| /admin/dashboard | AdminDashboard | AdminRoute | Admin SPA |
| /admin/test-results/:resultId/review | AdminTestReviewPage | AdminRoute | Admin test review |
| /admin/review/:resultId | AdminTestReviewPage | AdminRoute | Admin test review |
| * | Navigate to / | Catch-all | 404 redirect |

---

# PART 11: QUESTION TYPES

| Type | Admin Name | Student Name | Description |
|------|-----------|-------------|-------------|
| multiple-choice | Multiple Choice | MC | Single correct answer (A/B/C/D) |
| sata | SATA | SATA | Select All That Apply (multiple correct) |
| fill-blank | Fill in the Blank | Fill Blank | Text input answer |
| highlight | Highlight | Highlight | Click correct words in text |
| drag-drop | Drag and Drop | Drag Drop | Two-box drag system |
| matrix | Matrix | Matrix | Grid with rows × columns |
| hotspot | Hotspot | Hotspot | Click on image target |
| cloze-dropdown | Cloze Dropdown | Cloze | Dropdowns within text |
| case-study (6-question) | Layered | Unfolding | Progressive scenario with 6 questions |
| case-study (bowtie) | Bowtie | Standalone | Condition → Actions → Parameters |
| case-study (trend) | Trend | Standalone | Data trend analysis |
| case-study (matrix) | Matrix Case Study | Matrix | Matrix within case study |
| ordered-response | Ordered Response | Ordered Response | Order items correctly |

---

# PART 12: AUTO-DEACTIVATE ACCOUNT SYSTEM

### How It Works:
1. **Subscription Period**: 30 days from `subscriptionStartDate` (or `createdAt` if not set)
2. **Check Location**: `protect` middleware in `authMiddleware.js` — runs on EVERY authenticated student request
3. **Check Logic**: `isStudentSubscriptionExpired(user)` compares current date to subscription end date
4. **Action**: If expired → sets `user.status = 'inactive'`, saves to DB, returns 403
5. **Reactivation**: Admin uses `toggleStudentStatus` → sets status to 'active'. If subscription expired, resets `subscriptionStartDate` to now (fresh 30 days)
6. **Also in Registration**: `registerStudent` and `verifyOtpAndRegisterStudent` both check and auto-deactivate expired students during registration
7. **Student Login**: `loginStudent` checks if student is active before issuing JWT

---

# PART 13: KEY CONSTANTS

### NCLEX Client Needs Categories (17)
Analyze Cues, Basic Care and Comfort, Clinical Judgment, Coordinated Care, Evaluate Outcomes, Health Promotion and Maintenance, Management of Care, Pharmacological and Parenteral Therapies, Physiological Adaptation, Prioritization of Care, Prioritize Hypotheses, Psychosocial Integrity, Recognize Cues, Reduction of Risk Potential, Safety and Infection Control, Take Actions, Test-Taking Strategies

### Question Categories (14 with subcategories)
Adult Health (35 sub), Critical Care (23 sub), Dosage Calculations (26 sub), EKG/Cardiac Monitoring (47 sub), Emergency Nursing (30 sub), Fundamentals (39 sub), Health Promotion & Maintenance (37 sub), Lab Values & Diagnostics (52 sub), Leadership & Management (38 sub), Maternal & Newborn Health (20 sub), Mental Health (46 sub), Pediatrics (25 sub), Pharmacology (35 sub)

### Subscription
- STUDENT_SUBSCRIPTION_DAYS = 30
- STUDENT_SIGNUP_ACCESS_CODE = from env (default 'NCKeys5832')
- MAX_FCM_TOKENS_PER_STUDENT = 8
- Per-question timer: 85 seconds
- CAT passing standard: theta = 0.0
- CAT min/max items: 85/150
- CAT confidence threshold: 0.95

---

# PART 14: USER ROLES

| Role | Capabilities |
|------|-------------|
| **superadmin** | Full access to everything: all admin features, landing page editor, analytics, logs, exam support, student feedback, admin approval, manage all students |
| **admin** | Manage questions, upload, drafts, case studies, create tests, view students (scoped), progress reports, content management, settings. Cannot access: landing page, analytics, exam support, admin approval, logs, student feedback |
| **pending_verification** | Cannot log in until superadmin approves |
| **student** | Full student dashboard, tests, CAT, study materials, feedback, profile |

---

# PART 15: CLOUDINARY CONFIGURATION

Used for:
- Question images (questionImageUrl, optionImages, rationaleImageUrl)
- Study material file uploads
- Instructor photos
- Landing page media

Fallback: If Cloudinary upload fails, files stored in MongoDB Image model (base64)

---

# PART 16: LUXAND FACE VERIFICATION

Functions:
- `createPersonFromFace`: Enroll face during registration
- `searchFaceMatches`: Find matching face on login
- `detectLiveness`: Check if face is live (anti-spoof)
- `evaluateFaceMatch`: Evaluate if specific person matched (threshold 0.78)

Used in:
- Student registration (face enrollment)
- Student login (new device → face verification)

---

END OF REFERENCE DOCUMENT
