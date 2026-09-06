"use client";

import { useState, useMemo, useRef } from "react";
import { GraduationCap, ChevronRight, FileText, Calendar, CheckCircle2, Clock, MapPin, BookOpen, Download, CalendarPlus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { memo } from "react";
import dynamic from "next/dynamic";
import ConfigLoader from "./components/ConfigLoader";
import { getCourseColor } from "./utils/colors";

const ExportCalendarModal = dynamic(() => import("./components/ExportCalendarModal"), {
  ssr: false,
});

interface ScheduleItem {
  courseCode: string;
  courseName?: string;
  day: string;
  time: string;
  venue: string;
}

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = {
  "Monday": "Mon",
  "Tuesday": "Tue",
  "Wednesday": "Wed",
  "Thursday": "Thu",
  "Friday": "Fri",
  "Saturday": "Sat",
  "Sunday": "Sun"
} as const;

export default function Home() {
  const [step, setStep] = useState<"landing" | "upload" | "processing" | "result">("landing");
  const timetableRef = useRef<HTMLDivElement>(null);
  const downloadTimetableRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [regFile, setRegFile] = useState<File | null>(null);
  const [tableFile, setTableFile] = useState<File | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Debug helper for testing UI state directly in dev environment
  if (typeof window !== "undefined") {
    (window as unknown as { __autoclass_set_sample_data: () => void }).__autoclass_set_sample_data = () => {
      setSchedule([
        {
          courseCode: "CS101",
          courseName: "Intro to Computer Science",
          day: "Monday",
          time: "08:00 - 10:00",
          venue: "Lab A"
        },
        {
          courseCode: "MATH201",
          courseName: "Linear Algebra",
          day: "Wednesday",
          time: "11:30 - 13:00",
          venue: "Room 302"
        }
      ]);
      setStep("result");
    };
  }

  const filteredDays = useMemo(() => {
    const weekdays = DAYS_ORDER.slice(0, 5);
    const weekends = DAYS_ORDER.slice(5);

    const activeWeekends = weekends.filter(day =>
      schedule.some(item => item.day === day)
    );

    return [...weekdays, ...activeWeekends];
  }, [schedule]);

  const scheduleByDay = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = {};
    filteredDays.forEach(day => {
      map[day] = [];
    });

    schedule.forEach(item => {
      if (map[item.day]) {
        map[item.day].push(item);
      }
    });

    filteredDays.forEach(day => {
      map[day].sort((a, b) => a.time.localeCompare(b.time));
    });

    return map;
  }, [schedule, filteredDays]);

  const handleDownloadPDF = async () => {
    if (!downloadTimetableRef.current) return;

    setIsDownloading(true);
    try {
      // Dynamic lazy-loading of heavy PDF generation libraries on demand
      const [html2canvasModule, jspdfModule] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf")
      ]);
      const html2canvas = html2canvasModule.default;
      const jsPDF = jspdfModule.jsPDF;

      const canvas = await html2canvas(downloadTimetableRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#f6f8fa"
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save("AutoClass-Timetable.pdf");
    } catch (err) {
      console.error("Error generating PDF:", err);
      setError("Failed to generate PDF. The document might be too complex or there was a system error. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleGenerate = async () => {
    if (!regFile || !tableFile) {
      alert("Please upload both documents.");
      return;
    }

    setStep("processing");
    setError(null);

    const formData = new FormData();
    formData.append("registration", regFile);
    formData.append("timetable", tableFile);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || "Failed to process documents";
        const errorCode = data.code ? ` (${data.code})` : "";
        const errorDetails = data.details ? `\nDetails: ${data.details}` : "";
        throw new Error(`${errorMsg}${errorCode}${errorDetails}`);
      }

      setSchedule(data.schedule);
      setStep("result");
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred while generating your schedule.");
      setStep("upload");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-[#fafafa]">
      <AnimatePresence mode="wait">
        {step === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="v-card w-full max-w-xl p-8 sm:p-16 flex flex-col items-center text-center space-y-12"
          >
            <div className="w-40 h-40 relative flex items-center justify-center">
              <div className="absolute inset-0 border-[6px] border-gh-red rounded-full flex items-center justify-center overflow-hidden shadow-lg">
                 <div className="w-24 h-24 bg-gh-red/5 rounded-full flex items-center justify-center">
                    <GraduationCap className="w-14 h-14 text-gh-red" strokeWidth={1.5} />
                 </div>
              </div>
              <div className="absolute -bottom-4 bg-white px-4 py-1.5 border border-v-border rounded-full text-xs font-bold uppercase tracking-[0.2em] text-v-text-main shadow-sm font-bebas">
                AutoClass
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-v-text-main tracking-tight sm:text-5xl">
                Build your schedule.
              </h1>
              <p className="text-base sm:text-lg text-v-text-secondary max-w-md mx-auto leading-relaxed">
                Extract your university timetable and registration documents into a clean, modern view.
              </p>
            </div>

            <button
              onClick={() => setStep("upload")}
              className="v-button-black w-full max-w-[240px] text-lg py-4 cursor-pointer"
            >
              Get Started
            </button>
          </motion.div>
        )}

        {step === "upload" && (
           <motion.div
            key="upload"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-4xl space-y-6 sm:space-y-10"
          >
            <div className="flex items-center space-x-2 text-v-text-secondary mb-6 sm:mb-12">
              <button onClick={() => setStep("landing")} className="hover:text-v-text-main transition-colors font-bebas text-lg">AutoClass</button>
              <ChevronRight className="w-4 h-4 opacity-30" />
              <span className="font-medium text-v-text-main">Upload Documents</span>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm mb-6 flex items-start gap-3"
              >
                <div className="w-2 h-2 bg-red-600 rounded-full mt-1.5 shrink-0 animate-pulse" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold">Something went wrong</span>
                  <p className="opacity-90 leading-relaxed whitespace-pre-wrap">{error}</p>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <MemoizedUploadBox
                title="Registration Document"
                description="Upload your registered courses PDF"
                icon={<FileText className="w-10 h-10 text-black" strokeWidth={1} />}
                onFileSelect={setRegFile}
                selectedFile={regFile}
              />
              <MemoizedUploadBox
                title="Teaching Timetable"
                description="Upload the general university timetable"
                icon={<Calendar className="w-10 h-10 text-black" strokeWidth={1} />}
                onFileSelect={setTableFile}
                selectedFile={tableFile}
              />
            </div>

            <div className="flex flex-col items-center gap-3 pt-8">
              <button
                onClick={handleGenerate}
                disabled={!regFile || !tableFile}
                className="v-button-black flex items-center space-x-3 px-10 py-4 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed cursor-pointer group"
              >
                <span className="text-lg">Generate Schedule</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              {(!regFile || !tableFile) && (
                <p className="text-xs text-v-text-secondary text-center font-medium">
                  Please upload both <strong>Registration Document</strong> and <strong>Teaching Timetable</strong> to proceed.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {step === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center w-full max-w-lg p-8 sm:p-16 v-card"
          >
            <ConfigLoader />
          </motion.div>
        )}

        {step === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[95vw] space-y-6 sm:space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 sm:mb-12">
              <div className="flex items-center space-x-2 text-v-text-secondary">
                <button onClick={() => setStep("landing")} className="hover:text-v-text-main transition-colors font-bebas text-lg">AutoClass</button>
                <ChevronRight className="w-4 h-4 opacity-30" />
                <span className="font-medium text-v-text-main">Generated Schedule</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsCalendarModalOpen(true)}
                  className="v-button-black flex items-center gap-2 px-6 cursor-pointer"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>Add to Calendar</span>
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="v-button-outline flex items-center gap-2 px-6 disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {isDownloading ? "Generating..." : "Download PDF"}
                </button>
                <button
                  onClick={() => setStep("upload")}
                  className="v-button-outline px-6 cursor-pointer"
                >
                  Start Over
                </button>
              </div>
            </div>

            {schedule.length > 0 ? (
              <>
                {/* On-screen responsive view */}
                <div ref={timetableRef} className="p-6 sm:p-10 bg-white border border-v-border rounded-[2rem] shadow-2xl">
                  <div className="flex items-center gap-4 sm:gap-6 mb-8 sm:mb-12">
                    <div className="w-16 h-16 border-[4px] border-gh-red rounded-full flex items-center justify-center shadow-sm">
                      <GraduationCap className="w-8 h-8 text-gh-red" />
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-v-text-main tracking-tighter font-bebas">AUTOCLASS</h2>
                      <p className="text-[10px] sm:text-sm text-v-text-secondary tracking-widest uppercase">Academic Schedule</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {filteredDays.map(day => (
                      <div key={day} className="flex flex-col gap-4">
                        <div className="px-4 py-2 bg-[#fafafa] rounded-xl border border-v-border">
                          <h3 className="text-xs font-black text-v-text-secondary uppercase tracking-[0.2em]">
                            {DAY_SHORT[day as keyof typeof DAY_SHORT]}
                          </h3>
                        </div>

                        <div className="flex flex-col gap-3">
                          {scheduleByDay[day].length > 0 ? (
                            scheduleByDay[day].map((item, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-4 rounded-2xl border border-black/5 shadow-sm relative overflow-hidden group/item flex flex-col gap-3"
                                style={{ backgroundColor: getCourseColor(item.courseCode) }}
                              >
                                <div className="absolute top-0 left-0 w-1 h-full bg-black/10 group-hover/item:w-1.5 transition-all" />

                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                  <span className="flex items-center gap-1 text-xs font-black text-black tracking-wider uppercase">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    {item.courseCode}
                                  </span>
                                  {item.courseName && (
                                    <span className="text-[10px] font-medium text-black/80 truncate max-w-full">
                                      - {item.courseName}
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-black/80">
                                    <Clock className="w-3.5 h-3.5 shrink-0 opacity-50" />
                                    <span>{item.time}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-black/80">
                                    <MapPin className="w-3.5 h-3.5 shrink-0 opacity-50" />
                                    <span className="truncate">{item.venue}</span>
                                  </div>
                                </div>
                              </motion.div>
                            ))
                          ) : (
                            <div className="h-20 rounded-2xl border border-dashed border-v-border flex items-center justify-center">
                              <span className="text-[10px] font-bold text-v-text-secondary/30 uppercase tracking-widest">No Classes</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hidden Off-screen Desktop Landscape view strictly for high-quality PDF downloads */}
                <div className="absolute left-[-9999px] top-[-9999px] pointer-events-none select-none">
                  <div
                    ref={downloadTimetableRef}
                    className="p-10 bg-[#f6f8fa] border border-v-border rounded-[2rem]"
                    style={{ width: "1200px" }}
                  >
                    <div className="flex items-center gap-6 mb-12">
                      <div className="w-16 h-16 border-[4px] border-gh-red rounded-full flex items-center justify-center shadow-sm">
                        <GraduationCap className="w-8 h-8 text-gh-red" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-v-text-main tracking-tighter font-bebas">AUTOCLASS</h2>
                        <p className="text-sm text-v-text-secondary tracking-widest uppercase">Academic Schedule • 2024</p>
                      </div>
                    </div>

                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${filteredDays.length}, minmax(0, 1fr))` }}>
                      {filteredDays.map(day => (
                        <div key={day} className="flex flex-col gap-4">
                          <div className="px-4 py-2 bg-[#fafafa] rounded-xl border border-v-border">
                            <h3 className="text-xs font-black text-v-text-secondary uppercase tracking-[0.2em]">
                              {DAY_SHORT[day as keyof typeof DAY_SHORT]}
                            </h3>
                          </div>

                          <div className="flex flex-col gap-3">
                            {scheduleByDay[day].length > 0 ? (
                              scheduleByDay[day].map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-4 rounded-2xl border border-black/5 shadow-sm relative overflow-hidden flex flex-col gap-3"
                                  style={{ backgroundColor: getCourseColor(item.courseCode) }}
                                >
                                  <div className="absolute top-0 left-0 w-1 h-full bg-black/10" />

                                  <div className="flex items-baseline gap-1.5 flex-wrap">
                                    <span className="flex items-center gap-1 text-xs font-black text-black tracking-wider uppercase">
                                      <BookOpen className="w-3.5 h-3.5" />
                                      {item.courseCode}
                                    </span>
                                    {item.courseName && (
                                      <span className="text-[10px] font-medium text-black/80 truncate max-w-full">
                                        - {item.courseName}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-black/80">
                                      <Clock className="w-3.5 h-3.5 shrink-0 opacity-50" />
                                      <span>{item.time}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-black/80">
                                      <MapPin className="w-3.5 h-3.5 shrink-0 opacity-50" />
                                      <span className="truncate">{item.venue}</span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="h-20 rounded-2xl border border-dashed border-v-border flex items-center justify-center">
                                <span className="text-[10px] font-bold text-v-text-secondary/30 uppercase tracking-widest">No Classes</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="v-card p-20 text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-[#fafafa] rounded-2xl flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-v-text-secondary opacity-30" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-bold text-v-text-main">No classes found</p>
                  <p className="text-sm text-v-text-secondary max-w-xs mx-auto">
                    We couldn&apos;t extract any schedule data from these documents.
                  </p>
                </div>
                <button
                  onClick={() => setStep("upload")}
                  className="v-button-outline px-8"
                >
                  Try again
                </button>
              </div>
            )}

            <footer className="pt-16 text-center">
              <p className="text-xs font-bold text-v-text-secondary uppercase tracking-[0.2em] opacity-50">
                AutoClass • Automated Schedule Extraction • Always verify results
              </p>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      <ExportCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        schedule={schedule}
      />
    </main>
  );
}

const MemoizedUploadBox = memo(function UploadBox({
  title,
  description,
  icon,
  onFileSelect,
  selectedFile
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}) {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        onFileSelect(file);
      } else {
        alert("Please upload a PDF document.");
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      document.getElementById(title)?.click();
    }
  };

  return (
    <div
      className={`v-card p-6 sm:p-10 flex flex-col items-start text-left space-y-4 sm:space-y-6 cursor-pointer group relative overflow-hidden transition-all duration-300 outline-hidden focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
        isDragActive ? "border-black bg-black/5 scale-[1.02]" : ""
      } ${selectedFile ? "border-black" : ""}`}
      onClick={() => document.getElementById(title)?.click()}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      tabIndex={0}
      role="button"
      aria-label={`${title}: ${selectedFile ? `Selected file ${selectedFile.name}` : description}`}
      onKeyDown={handleKeyDown}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${selectedFile ? "bg-black rotate-[360deg]" : "bg-[#fafafa] group-hover:bg-black group-hover:text-white"}`}>
        {selectedFile ? <CheckCircle2 className="w-7 h-7 text-white" /> : icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-v-text-main tracking-tight">{title}</h3>
        <p className="text-sm text-v-text-secondary leading-relaxed">
          {selectedFile ? selectedFile.name : description}
        </p>
      </div>
      <input
        type="file"
        className="hidden"
        id={title}
        onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
        accept="application/pdf"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="pt-4 flex items-center justify-between w-full">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-v-text-main group-hover:gap-4 transition-all">
          {selectedFile ? "Replace file" : "Select Document"}
          <ChevronRight className="w-3 h-3" />
        </div>
        {selectedFile && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFileSelect(null);
            }}
            aria-label={`Remove ${selectedFile.name}`}
            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer z-10"
          >
            <X className="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>
        )}
      </div>

      {/* Subtle background decoration */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-black/[0.02] rounded-full group-hover:scale-150 transition-transform duration-700" />
    </div>
  );
});
