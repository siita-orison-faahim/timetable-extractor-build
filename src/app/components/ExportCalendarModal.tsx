"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Bell, X, Download, Check } from "lucide-react";
import { ScheduleItem, generateICS, downloadICSFile } from "../utils/icsGenerator";

interface ExportCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleItem[];
}

export default function ExportCalendarModal({
  isOpen,
  onClose,
  schedule,
}: ExportCalendarModalProps) {
  // Compute default start date (upcoming Monday or today if today is Monday)
  const getDefaultStartDate = () => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = day === 0 ? 1 : (day === 1 ? 0 : 8 - day);
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + diff);
    return nextMonday.toISOString().split("T")[0];
  };

  // Compute default end date (12 weeks after default start date)
  const getDefaultEndDate = (startStr: string) => {
    const [year, month, day] = startStr.split("-").map(Number);
    const startDate = new Date(year, month - 1, day);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 12 * 7); // 12 weeks
    return endDate.toISOString().split("T")[0];
  };

  const initialStartDate = getDefaultStartDate();
  const initialEndDate = getDefaultEndDate(initialStartDate);

  const [startDate, setStartDate] = useState<string>(initialStartDate);
  const [endDate, setEndDate] = useState<string>(initialEndDate);
  const [enableNotification, setEnableNotification] = useState<boolean>(true);
  const [isExported, setIsExported] = useState<boolean>(false);

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (newStart) {
      setEndDate(getDefaultEndDate(newStart));
    }
  };

  const handleExport = () => {
    if (!startDate || !endDate) return;

    const icsString = generateICS(schedule, {
      startDate,
      endDate,
      enableNotification,
    });

    downloadICSFile(icsString, "AutoClass-Schedule.ics");
    setIsExported(true);

    setTimeout(() => {
      setIsExported(false);
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-v-border relative overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 text-v-text-secondary hover:text-v-text-main hover:bg-black/5 rounded-full transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6 text-v-text-main" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-v-text-main font-bebas tracking-wide">
                  Export to Calendar
                </h3>
                <p className="text-xs text-v-text-secondary">
                  Add your class schedule to iOS or Android calendar
                </p>
              </div>
            </div>

            {/* Form controls */}
            <div className="space-y-5">
              {/* Semester Dates */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-v-text-secondary block">
                  Semester Duration
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-v-text-secondary font-medium block mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#fafafa] border border-v-border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 font-medium text-v-text-main"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-v-text-secondary font-medium block mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#fafafa] border border-v-border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 font-medium text-v-text-main"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-v-text-secondary/70">
                  Pre-filled for 12 weeks. Customize if your semester is longer or shorter.
                </p>
              </div>

              {/* Notification toggle switch */}
              <div className="pt-2 border-t border-v-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-v-text-main" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-v-text-main block">
                        Class Reminders
                      </span>
                      <span className="text-xs text-v-text-secondary block">
                        Notify 15 minutes before each class
                      </span>
                    </div>
                  </div>

                  {/* Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableNotification}
                      onChange={(e) => setEnableNotification(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={handleExport}
                disabled={!startDate || !endDate}
                className="v-button-black w-full flex items-center justify-center gap-2 py-3.5 disabled:opacity-50 cursor-pointer"
              >
                {isExported ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Exported to Calendar!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Calendar File (.ics)</span>
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="v-button-outline w-full py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
