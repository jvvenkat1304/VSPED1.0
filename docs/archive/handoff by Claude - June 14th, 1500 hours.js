const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, Footer, PageBreak
} = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const headerBorder = { style: BorderStyle.SINGLE, size: 1, color: "2563EB" };
const headerBorders = { top: headerBorder, bottom: headerBorder, left: headerBorder, right: headerBorder };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [new TextRun({ text, bold: true, size: 32, color: "1E3A5F" })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, color: "2563EB" })]
  });
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 22, color: "374151" })]
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 20, ...opts })]
  });
}

function bullet(text, bold = false) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 20, bold })]
  });
}

function subbullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 1 },
    spacing: { before: 30, after: 30 },
    children: [new TextRun({ text, size: 19 })]
  });
}

function code(text) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    indent: { left: 720 },
    children: [new TextRun({ text, font: "Courier New", size: 18, color: "1F2937" })]
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" } },
    children: [new TextRun("")]
  });
}

function statusTable(rows) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3500, 2000, 3860],
    rows: [
      new TableRow({
        children: [
          new TableCell({ borders: headerBorders, shading: { fill: "1E3A5F", type: ShadingType.CLEAR }, width: { size: 3500, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "Component", bold: true, color: "FFFFFF", size: 20 })] })] }),
          new TableCell({ borders: headerBorders, shading: { fill: "1E3A5F", type: ShadingType.CLEAR }, width: { size: 2000, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "Status", bold: true, color: "FFFFFF", size: 20 })] })] }),
          new TableCell({ borders: headerBorders, shading: { fill: "1E3A5F", type: ShadingType.CLEAR }, width: { size: 3860, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "Notes", bold: true, color: "FFFFFF", size: 20 })] })] }),
        ]
      }),
      ...rows.map(([comp, status, notes], i) => new TableRow({
        children: [
          new TableCell({ borders, shading: { fill: i % 2 === 0 ? "F8FAFC" : "FFFFFF", type: ShadingType.CLEAR }, width: { size: 3500, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: comp, size: 19, bold: true })] })] }),
          new TableCell({ borders, shading: { fill: i % 2 === 0 ? "F8FAFC" : "FFFFFF", type: ShadingType.CLEAR }, width: { size: 2000, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: status, size: 19, color: status.includes("✅") ? "16A34A" : status.includes("🟡") ? "D97706" : "6B7280" })] })] }),
          new TableCell({ borders, shading: { fill: i % 2 === 0 ? "F8FAFC" : "FFFFFF", type: ShadingType.CLEAR }, width: { size: 3860, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: notes, size: 19 })] })] }),
        ]
      }))
    ]
  });
}

function twoColTable(rows) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3000, 6360],
    rows: rows.map(([k, v], i) => new TableRow({
      children: [
        new TableCell({ borders, shading: { fill: i % 2 === 0 ? "EFF6FF" : "FFFFFF", type: ShadingType.CLEAR }, width: { size: 3000, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, size: 19 })] })] }),
        new TableCell({ borders, shading: { fill: i % 2 === 0 ? "EFF6FF" : "FFFFFF", type: ShadingType.CLEAR }, width: { size: 6360, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: v, size: 19, font: v.startsWith("http") || v.startsWith("sb_") || v.startsWith("eyJ") || v.startsWith("supabase") ? "Courier New" : undefined })] })] }),
      ]
    }))
  });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
        ]
      },
      {
        reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, font: "Arial", color: "1E3A5F" }, paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: "Arial", color: "2563EB" }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "V-SPED Handoff Document  |  Page ", size: 16, color: "9CA3AF" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "9CA3AF" }),
            new TextRun({ text: " of ", size: 16, color: "9CA3AF" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "9CA3AF" }),
          ]
        })]
      })
    },
    children: [

      // ── COVER ──────────────────────────────────────────────────────────────
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 720, after: 120 },
        children: [new TextRun({ text: "V-SPED 1.0", bold: true, size: 64, color: "1E3A5F" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "Complete Development Handoff Document", size: 28, color: "2563EB" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "Vathsalya Child Neuro and Nurture Center", size: 22, color: "6B7280" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 600 },
        children: [new TextRun({ text: "June 14, 2026  \u2022  Session: Kiro IDE Setup & Authentication System", size: 20, color: "9CA3AF" })]
      }),

      // session info box
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4680, 4680],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: headerBorders, shading: { fill: "1E3A5F", type: ShadingType.CLEAR }, width: { size: 4680, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "AI Model", bold: true, color: "FFFFFF", size: 20 })] })] }),
            new TableCell({ borders: headerBorders, shading: { fill: "1E3A5F", type: ShadingType.CLEAR }, width: { size: 4680, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "Session Details", bold: true, color: "FFFFFF", size: 20 })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders, shading: { fill: "EFF6FF", type: ShadingType.CLEAR }, width: { size: 4680, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [
              new Paragraph({ children: [new TextRun({ text: "Name: Claude Sonnet 4.6", size: 19 })] }),
              new Paragraph({ children: [new TextRun({ text: "Made by: Anthropic", size: 19 })] }),
              new Paragraph({ children: [new TextRun({ text: "Interface: Claude.ai (Web)", size: 19 })] }),
              new Paragraph({ children: [new TextRun({ text: "Mode: Chat (no memory between tabs)", size: 19 })] }),
            ]}),
            new TableCell({ borders, shading: { fill: "EFF6FF", type: ShadingType.CLEAR }, width: { size: 4680, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [
              new Paragraph({ children: [new TextRun({ text: "Date: Sunday, June 14, 2026", size: 19 })] }),
              new Paragraph({ children: [new TextRun({ text: "Time: Afternoon session (~1 PM IST onwards)", size: 19 })] }),
              new Paragraph({ children: [new TextRun({ text: "Developer: Karan Karthik Palukuri", size: 19 })] }),
              new Paragraph({ children: [new TextRun({ text: "Project: V-SPED for Vathsalya CNNC", size: 19 })] }),
            ]}),
          ]}),
        ]
      }),

      new Paragraph({ spacing: { before: 480 }, children: [new TextRun("")] }),

      // ── SECTION 1 ──────────────────────────────────────────────────────────
      h1("1. Session Overview"),
      p("This document records everything accomplished in the June 14, 2026 development session for V-SPED. The session focused on two major goals: setting up Kiro IDE as the primary backend development environment, and completing the entire Supabase Edge Function authentication system including live SMS OTP delivery via MSG91."),
      p("By end of session, OTP SMS delivery was confirmed working on a real Indian mobile number."),

      divider(),

      // ── SECTION 2 ──────────────────────────────────────────────────────────
      h1("2. Tools & Environment"),

      h2("2.1 Development Environment"),
      twoColTable([
        ["IDE", "Kiro IDE (VS Code-based, AI-native IDE with Claude built in)"],
        ["Kiro Version", "Kiro Pro 148.27 / 1000 tokens (shown in status bar)"],
        ["AI in Kiro", "Claude Opus 4.8 with Autopilot mode (shown in Kiro sidebar)"],
        ["OS", "Windows (PowerShell terminal used throughout)"],
        ["Drive", "K:\\V-SPED\\VSPED1.0 (local project directory)"],
        ["Shell", "PowerShell (pwsh) — important for command syntax differences vs bash"],
        ["Git", "GitHub for Windows + Git installed; repo linked to Kiro"],
        ["GitHub Repo", "jvvenkat1304/VSPED1.0 (branch: main, PRODUCTION)"],
      ]),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("2.2 Extensions Installed in Kiro"),
      bullet("Deno by denoland — v3.52.0, 384,372 downloads — required for Edge Function TypeScript"),
      bullet("GitLens — Git history and blame in editor"),
      bullet("PostgreSQL by Chris Kolkman — attempted for SQL editor (blocked by IPv6, see Section 3)"),
      bullet("Thunder Client — API testing inside Kiro (installed for future use)"),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("2.3 Tech Stack"),
      twoColTable([
        ["Frontend", "FlutterFlow (browser-based, not in local repo)"],
        ["Backend", "Supabase (project ID: fedpulmkxjqoaxlanqhg, region: ap-south-1 Mumbai)"],
        ["SMS / OTP", "MSG91 (Indian SMS gateway, DLT-registered)"],
        ["Payments", "Razorpay (not yet integrated)"],
        ["Video Calls", "VideoSDK (not yet integrated)"],
        ["Edge Functions", "Deno / TypeScript deployed via Supabase CLI"],
        ["Database", "PostgreSQL via Supabase (26 tables, all migrations applied prior session)"],
      ]),

      divider(),

      // ── SECTION 3 ──────────────────────────────────────────────────────────
      h1("3. Kiro IDE Setup — Step by Step"),

      h2("3.1 What Was Attempted: PostgreSQL Extension"),
      p("We attempted to connect the PostgreSQL extension (Chris Kolkman) directly to the Supabase database for an in-IDE SQL editor. This failed for the following reason:"),
      bullet("Supabase blocks direct port 5432 connections from outside their network"),
      bullet("The Connection Pooler uses IPv6 by default — Karan's network is IPv4-only"),
      bullet("Enabling IPv4 requires a paid Supabase add-on — skipped to avoid extra cost"),
      p("Resolution: The Supabase SQL Editor in the browser (https://app.supabase.com/project/fedpulmkxjqoaxlanqhg/sql) was confirmed as the primary SQL tool. It works perfectly and requires no setup."),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("3.2 Supabase CLI Setup (Successful)"),
      p("The Supabase CLI was installed and linked. Commands run in sequence:"),
      code("npm install -g supabase"),
      code("supabase login                                    # opened browser for auth"),
      code("supabase link --project-ref fedpulmkxjqoaxlanqhg # 'Finished supabase link'"),
      p("Result: Kiro terminal is now fully authenticated and linked to the V-SPED Supabase project. All future CLI operations (deploy, secrets, etc.) work from here."),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("3.3 Folder Structure Created"),
      p("Three new Edge Function folders were scaffolded using:"),
      code("supabase functions new verify-otp   # answered Y to Deno VS Code settings"),
      code("supabase functions new create-pin"),
      code("supabase functions new verify-pin"),
      p("This created the following structure in the repo:"),
      code("VSPED1.0/"),
      code("  supabase/"),
      code("    functions/"),
      code("      send-otp/      index.ts   (written & deployed this session)"),
      code("      verify-otp/    index.ts   (written & deployed this session)"),
      code("      create-pin/    index.ts   (written & deployed this session)"),
      code("      verify-pin/    index.ts   (written & deployed this session)"),
      code("    config.toml"),
      code("  AUTH_SETUP by Kiro - June 13th"),
      code("  Handoff document by Kiro - chat 1 - June 13th"),
      code("  README.md"),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("3.4 Context File"),
      p("A .kiro/context.md file was recommended (to be created manually) containing project context so Kiro's AI gives relevant answers without re-explaining the stack each session."),

      divider(),

      // ── SECTION 4 ──────────────────────────────────────────────────────────
      h1("4. Edge Functions Written & Deployed"),

      h2("4.1 send-otp"),
      p("Purpose: Sends a 6-digit OTP SMS to an Indian mobile number via MSG91."),
      p("Endpoint: https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1/send-otp"),
      p("Input: { phone: '91XXXXXXXXXX' }"),
      p("Output: { success: true/false, message: string }"),
      p("Key implementation details:"),
      bullet("Calls MSG91 OTP API at https://control.msg91.com/api/v5/otp"),
      bullet("Reads MSG91_AUTH_KEY and MSG91_TEMPLATE_ID from Supabase secrets"),
      bullet("Sender ID field was intentionally removed — MSG91 handles it via the OTP template"),
      bullet("Note: The send-otp function did NOT previously exist in the local repo — it was created fresh this session and deployed"),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("4.2 verify-otp"),
      p("Purpose: Verifies the 6-digit OTP code entered by the user."),
      p("Endpoint: https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1/verify-otp"),
      p("Input: { phone: '91XXXXXXXXXX', otp_code: '123456' }"),
      p("Output: { success, user_id, session_token, is_new_user, role, message }"),
      p("Key implementation details:"),
      bullet("Uses supabase.auth.verifyOtp() with type: 'sms'"),
      bullet("Checks users table for pin_hash to determine if new or returning user"),
      bullet("Returns is_new_user: true if no PIN set yet — FlutterFlow uses this to route to PIN creation vs PIN entry"),
      bullet("Returns role from users table for dashboard routing"),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("4.3 create-pin"),
      p("Purpose: Hashes and stores the user's 4-digit PIN on first login."),
      p("Endpoint: https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1/create-pin"),
      p("Input: { user_id: 'uuid', pin: '1234' }"),
      p("Output: { success: true/false, message: string }"),
      p("Key implementation details:"),
      bullet("Validates PIN is exactly 4 numeric digits using regex /^\\d{4}$/"),
      bullet("Hashes PIN using Web Crypto API (SHA-256) — native to Deno, no external imports needed"),
      bullet("Stores hash in users.pin_hash — plain text PIN is never stored anywhere"),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("4.4 verify-pin"),
      p("Purpose: Verifies PIN on subsequent logins with lockout protection."),
      p("Endpoint: https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1/verify-pin"),
      p("Input: { user_id: 'uuid', pin: '1234' }"),
      p("Output: { success, user_id, role, message }"),
      p("Key implementation details:"),
      bullet("Hashes input PIN and compares to stored pin_hash"),
      bullet("Tracks failed attempts in users.failed_pin_attempts column"),
      bullet("After 3 failed attempts: locks account for 15 minutes using users.pin_locked_until"),
      bullet("Returns remaining attempts count in error message"),
      bullet("On success: resets failed_pin_attempts to 0 and clears pin_locked_until"),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("4.5 Deployment Commands Used"),
      code("supabase functions deploy send-otp"),
      code("supabase functions deploy verify-otp"),
      code("supabase functions deploy create-pin"),
      code("supabase functions deploy verify-pin"),
      p("All deployments showed 'WARNING: Docker is not running' — this is harmless. Docker is only needed for local testing. Deployments to Supabase servers succeeded regardless."),

      divider(),

      // ── SECTION 5 ──────────────────────────────────────────────────────────
      h1("5. Database Changes Made This Session"),

      h2("5.1 New Columns Added to users Table"),
      p("SQL run in Supabase SQL Editor. Result: 'No rows returned' (success)."),
      code("ALTER TABLE users"),
      code("ADD COLUMN IF NOT EXISTS failed_pin_attempts INTEGER DEFAULT 0,"),
      code("ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ DEFAULT NULL;"),
      p("These columns are required by the verify-pin Edge Function for lockout tracking."),

      divider(),

      // ── SECTION 6 ──────────────────────────────────────────────────────────
      h1("6. MSG91 Configuration & Debugging"),

      h2("6.1 Secrets Set in Supabase"),
      p("All three MSG91 secrets were set via Kiro terminal and verified with 'supabase secrets list':"),
      code("supabase secrets set MSG91_AUTH_KEY=\"[hidden]\""),
      code("supabase secrets set MSG91_TEMPLATE_ID=\"6a2e64e8e83b471d6e06a853\""),
      code("supabase secrets set MSG91_SENDER_ID=\"VATHAI\"  # later removed from function"),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("6.2 Debugging Journey"),
      p("Multiple issues were encountered and resolved:"),

      h3("Issue 1: Wrong API endpoint format"),
      bullet("Initial send-otp code used https://control.msg91.com/api/v5/otp"),
      bullet("MSG91 logs showed 400 errors: 'Template ID Missing or Invalid Template'"),

      h3("Issue 2: Wrong Template ID"),
      bullet("Was using VATHAI_VSPED template ID from the SMS Templates section: 6a1ae1b6c4dfd506b60ff3e4"),
      bullet("MSG91 has TWO separate template systems: SMS Templates and OTP Templates"),
      bullet("The OTP section (control.msg91.com/app/m/l/otp/templates) was completely empty — no templates"),
      bullet("SMS template IDs do NOT work with the OTP API"),

      h3("Issue 3: Sender ID field"),
      bullet("Sender ID was being passed in the API body but caused errors"),
      bullet("Removed sender field entirely — MSG91 OTP templates handle sender automatically"),

      h3("Resolution"),
      bullet("Created new OTP template in the correct OTP section: VSPED_OTP"),
      bullet("Template content: '##OTP## is your OTP for V-SPED app. Valid for 5 minutes. Do not share this code.'"),
      bullet("DLT Template ID linked from existing approved SMS template"),
      bullet("New OTP Template ID: 6a2e64e8e83b471d6e06a853"),
      bullet("Updated Supabase secret with new template ID, redeployed send-otp"),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("6.3 Test Result"),
      p("Final test using PowerShell Invoke-RestMethod (curl doesn't work in PowerShell due to quote handling):"),
      code("Invoke-RestMethod -Uri \"https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1/send-otp\""),
      code("  -Method POST"),
      code("  -Headers @{\"Content-Type\"=\"application/json\"; \"Authorization\"=\"Bearer eyJ...\"}"),
      code("  -Body '{\"phone\": \"919515827853\"}'"),
      p("Result: SMS received on real Indian mobile number. OTP delivery confirmed working. \u2705"),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("6.4 Important: Auth Key for Edge Function Testing"),
      p("Edge Functions require the LEGACY anon key (starts with eyJ...), NOT the new publishable key (starts with sb_publishable_...). Find it at:"),
      p("Supabase Dashboard > Settings > API > 'Legacy anon, service_role API keys' tab"),
      p("The new API key format is not yet supported for Edge Function Authorization headers."),

      divider(),

      // ── SECTION 7 ──────────────────────────────────────────────────────────
      h1("7. Current Project Status"),

      h2("7.1 Backend Components"),
      statusTable([
        ["Database Schema (26 tables)", "✅ 100% Complete", "All migrations applied June 13"],
        ["RLS Security Policies", "✅ 100% Complete", "60+ policies, all roles covered"],
        ["send-otp Edge Function", "✅ Complete & Tested", "SMS delivery confirmed working"],
        ["verify-otp Edge Function", "✅ Deployed", "Not yet tested end-to-end"],
        ["create-pin Edge Function", "✅ Deployed", "Not yet tested end-to-end"],
        ["verify-pin Edge Function", "✅ Deployed", "Not yet tested end-to-end"],
        ["MSG91 Integration", "✅ Working", "OTP template VSPED_OTP active"],
        ["Google OAuth", "🟡 Not configured", "Needs Google Cloud Console setup"],
        ["Apple OAuth", "🟡 Not configured", "Needs Apple Developer Portal setup"],
        ["Razorpay Payments", "⬜ Not started", "Deferred to later phase"],
        ["VideoSDK Integration", "⬜ Not started", "Deferred to later phase"],
        ["FlutterFlow Auth Wiring", "⬜ Not started", "Next major task"],
      ]),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("7.2 Overall Completion"),
      twoColTable([
        ["Database Layer", "100% complete"],
        ["Security (RLS)", "100% complete"],
        ["Edge Functions", "75% complete (4 deployed, untested except send-otp)"],
        ["Authentication System", "40% complete (backend done, FlutterFlow wiring pending)"],
        ["FlutterFlow UI", "Screens built, actions not yet wired to new Edge Functions"],
        ["External Integrations", "MSG91 working; Razorpay and VideoSDK pending"],
        ["Overall Backend", "~35% complete"],
      ]),

      divider(),

      // ── SECTION 8 ──────────────────────────────────────────────────────────
      h1("8. Important Credentials & URLs"),

      h2("8.1 Supabase"),
      twoColTable([
        ["Project ID", "fedpulmkxjqoaxlanqhg"],
        ["Region", "ap-south-1 (Mumbai)"],
        ["Dashboard", "https://app.supabase.com/project/fedpulmkxjqoaxlanqhg"],
        ["SQL Editor", "https://app.supabase.com/project/fedpulmkxjqoaxlanqhg/sql"],
        ["Edge Functions", "https://app.supabase.com/project/fedpulmkxjqoaxlanqhg/functions"],
        ["API Settings", "https://app.supabase.com/project/fedpulmkxjqoaxlanqhg/settings/api"],
        ["Base URL", "https://fedpulmkxjqoaxlanqhg.supabase.co"],
      ]),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("8.2 Edge Function URLs"),
      twoColTable([
        ["send-otp", "https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1/send-otp"],
        ["verify-otp", "https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1/verify-otp"],
        ["create-pin", "https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1/create-pin"],
        ["verify-pin", "https://fedpulmkxjqoaxlanqhg.supabase.co/functions/v1/verify-pin"],
      ]),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("8.3 MSG91"),
      twoColTable([
        ["Dashboard", "https://control.msg91.com"],
        ["OTP Templates", "https://control.msg91.com/app/m/l/otp/templates"],
        ["SMS Templates", "https://control.msg91.com/app/m/l/sms/templates"],
        ["OTP Template Name", "VSPED_OTP"],
        ["OTP Template ID", "6a2e64e8e83b471d6e06a853"],
        ["Sender IDs", "VATHAI, VNEUAI (both Added status)"],
        ["Auth Key", "Stored in Supabase secrets as MSG91_AUTH_KEY"],
      ]),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("8.4 Other"),
      twoColTable([
        ["FlutterFlow Project", "https://app.flutterflow.io/project/v-sped-e13q69"],
        ["GitHub Repo", "https://github.com/jvvenkat1304/VSPED1.0"],
        ["Vathsalya Website", "https://vathsalya.vercel.app"],
      ]),

      divider(),

      // ── SECTION 9 ──────────────────────────────────────────────────────────
      h1("9. Immediate Next Steps"),

      h2("9.1 Priority 1: Wire Auth Flow in FlutterFlow"),
      p("All backend is ready. FlutterFlow needs to call these functions in sequence:"),
      bullet("Phone Entry Page → calls send-otp with { phone: '91XXXXXXXXXX' }"),
      bullet("OTP Verification Page → calls verify-otp → gets back is_new_user and user_id"),
      bullet("If is_new_user: true → navigate to PIN Creation Page → calls create-pin"),
      bullet("If is_new_user: false → navigate to PIN Entry Page → calls verify-pin"),
      bullet("On verify-pin success → read role field → route to correct dashboard"),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("9.2 Priority 2: Test Remaining Edge Functions"),
      bullet("verify-otp: Test with real OTP received via SMS"),
      bullet("create-pin: Test PIN creation, verify pin_hash appears in Supabase users table"),
      bullet("verify-pin: Test correct PIN, wrong PIN, and 3-attempt lockout"),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("9.3 Priority 3: OAuth Setup"),
      bullet("Google OAuth: Set up in Google Cloud Console, add credentials to Supabase"),
      bullet("Apple OAuth: Set up in Apple Developer Portal, add credentials to Supabase"),

      new Paragraph({ spacing: { before: 200 }, children: [new TextRun("")] }),

      h2("9.4 Deferred Items (Later Phase)"),
      bullet("Razorpay payment integration"),
      bullet("VideoSDK video call integration"),
      bullet("Notification system"),
      bullet("Scheduled jobs"),
      bullet("PIN lockout UI in FlutterFlow"),
      bullet("Resend OTP functionality"),
      bullet("Forgot PIN flow"),

      divider(),

      // ── SECTION 10 ─────────────────────────────────────────────────────────
      h1("10. Key Learnings & Gotchas"),

      bullet("PowerShell curl does not work the same as bash curl. Always use Invoke-RestMethod in PowerShell for API testing.", true),
      bullet("Supabase Edge Functions need the LEGACY anon key (eyJ...) for Authorization header, not the new sb_publishable_ key.", true),
      bullet("MSG91 has two completely separate template systems: SMS Templates and OTP Templates. They are NOT interchangeable.", true),
      bullet("Docker not running warning during supabase functions deploy is harmless — local Docker is only for local testing.", true),
      bullet("Supabase blocks direct port 5432 connections from outside. Use the browser SQL editor for SQL queries.", true),
      bullet("Secrets set via supabase secrets set require a function redeploy to take effect.", true),
      bullet("The Deno extension in Kiro must be installed for Edge Function TypeScript to show correct syntax highlighting and autocomplete.", true),

      divider(),

      // ── FOOTER NOTE ────────────────────────────────────────────────────────
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 60 },
        children: [new TextRun({ text: "Generated by Claude Sonnet 4.6 (Anthropic)  \u2022  Claude.ai Web Interface", size: 16, color: "9CA3AF", italics: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Session Date: Sunday, June 14, 2026  \u2022  V-SPED v1.0  \u2022  Vathsalya CNNC", size: 16, color: "9CA3AF", italics: true })]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/mnt/user-data/outputs/VSPED_Handoff_June14_2026.docx', buffer);
  console.log('Done!');
});
