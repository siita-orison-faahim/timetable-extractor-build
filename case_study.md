# Case Study: AutoClass – AI-Powered Timetable Extraction & Calendar Sync

## Executive Summary
**AutoClass** is a web application built with **Next.js 15**, **TypeScript**, and **Tailwind CSS**. It automates the extraction and synthesis of university course registration documents and general university teaching timetables into a digitized academic schedule.

Recently, AutoClass added **Calendar Export functionality**, allowing students to seamlessly add their generated timetables directly to native iOS (Apple Calendar), Android (Google / Samsung Calendar), and desktop calendar applications.

---

## Technical Architecture

```
                                +---------------------------+
                                |      Next.js Frontend     |
                                |  (Landing / Upload / UI)  |
                                +-------------+-------------+
                                              |
                                              v
                                +---------------------------+
                                |  Next.js Serverless Route |
                                |      (/api/generate)      |
                                +-------------+-------------+
                                              |
                                              v
                                +---------------------------+
                                |    Google Gemini AI API   |
                                | (PDF Multi-modal Extract) |
                                +-------------+-------------+
                                              |
                                              v
                                +---------------------------+
                                |  iCalendar Generator      |
                                |   (src/app/utils/ics)     |
                                +---------------------------+
```

### Core Technologies
- **Framework**: Next.js 15 (App Router), React 19
- **Language**: TypeScript
- **Styling & Animations**: Tailwind CSS v4, Framer Motion, Lucide Icons
- **AI Processing**: Google Generative AI (Gemini 3.5 / 3 / 2.0 Flash)
- **Exports**:
  - **PDF Export**: `html2canvas-pro` + `jspdf`
  - **Device Calendar Sync**: RFC 5545 iCalendar (`.ics`) standard with weekly recurrence rules (`RRULE`) and 15-minute advance alerts (`VALARM`).

---

## Key Features

### 1. Document Extraction & AI Synthesis
- Students upload two PDF files:
  1. **Course Registration PDF**: Personal list of enrolled subjects.
  2. **University Timetable PDF**: Master schedule containing all course times and venues.
- AutoClass utilizes Gemini's multi-modal capabilities to cross-reference registered courses with the timetable, returning structured JSON with course codes, titles, class days, times, and venue locations.

### 2. Modern Interactive Schedule Dashboard
- Responsive grid view highlighting daily class schedules with unique course color coding.
- Visual day filtering showing weekdays and active weekend classes.

### 3. Device Calendar Export (.ics)
- **Cross-Platform Compatibility**: Supports native iOS Calendar, Google Calendar, Samsung Calendar, Microsoft Outlook, and Apple Calendar.
- **Customizable Semester Duration**: Pre-fills start date (upcoming Monday) and end date (12 weeks later) with optional custom date range configuration.
- **Class Reminders**: Toggleable option to embed 15-minute advance alarms (`VALARM`) before every class.

---

## Setup & Configuration

### Environment Variables
AutoClass requires a **Google Gemini API Key**:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

1. Obtain a free API key at [Google AI Studio](https://aistudio.google.com/).
2. Add `GEMINI_API_KEY` to `.env.local` for local development or project Environment Variables in Vercel.

---

## Local Development & Build Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run ESLint checks
npm run lint

# Build production bundle
npm run build
```
