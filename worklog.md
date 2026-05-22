---
Task ID: 3
Agent: Main Agent
Task: Add {{image_url}} embedding support in rationale boxes

Work Log:
- Created shared utility component `client/src/utils/RationaleContent.jsx`
- Component parses `{{url}}` tokens in rationale text and renders inline images
- Images auto-resolve relative/absolute URLs with fallback to window.origin
- Click-to-enlarge overlay for viewing images fullscreen
- Error state shows "[Image failed to load]" if URL is broken
- Updated 3 files to use RationaleContent:
  - `TestReviewExamView.jsx` - post-exam review rationale display
  - `TestSession.jsx` - tutor mode rationale display (during exam)
  - `ManageQuestions.jsx` - admin preview modal (both test-like preview + merge modal)
- Resolved merge conflict with remote (remote had new test-like preview feature)
- Build passed, pushed to main

Stage Summary:
- Created: `client/src/utils/RationaleContent.jsx` - reusable rationale renderer with {{url}} support
- Syntax: Write `{{https://example.com/image.png}}` inside rationale text to embed images
- Supports multiple images per rationale, click-to-enlarge, error handling
- Pushed as commit f1174f92 to main
