import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const isSameDay = (left, right) =>
  left?.getFullYear() === right?.getFullYear() &&
  left?.getMonth() === right?.getMonth() &&
  left?.getDate() === right?.getDate();

const buildCalendarDays = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const days = [];

  const previousMonthLastDay = new Date(year, month, 0).getDate();
  for (let index = startingDayOfWeek - 1; index >= 0; index -= 1) {
    days.push({
      date: new Date(year, month - 1, previousMonthLastDay - index),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({
      date: new Date(year, month, day),
      isCurrentMonth: true,
    });
  }

  const remainingDays = 42 - days.length;
  for (let day = 1; day <= remainingDays; day += 1) {
    days.push({
      date: new Date(year, month + 1, day),
      isCurrentMonth: false,
    });
  }

  return days;
};

export function Calendar({ className = "", onSelect }) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(today);

  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth),
    [visibleMonth],
  );

  const handlePrevMonth = () => {
    setVisibleMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setVisibleMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const handleToday = () => {
    setVisibleMonth(startOfMonth(today));
    setSelectedDate(today);
    onSelect?.(today);
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setVisibleMonth(startOfMonth(date));
    onSelect?.(date);
  };

  const monthLabel = visibleMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className={`rounded-lg bg-white shadow-sm ${className}`}>
      <div className="flex h-full flex-col p-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="rounded p-1 transition hover:bg-gray-100"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{monthLabel}</span>
            <button
              onClick={handleToday}
              className="rounded-full border border-blue-200 px-2 py-0.5 text-[11px] font-medium text-blue-700 transition hover:bg-blue-50"
            >
              Today
            </button>
          </div>
          <button
            onClick={handleNextMonth}
            className="rounded p-1 transition hover:bg-gray-100"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="py-1 text-center text-xs text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid flex-1 grid-cols-7 gap-1">
          {calendarDays.map(({ date, isCurrentMonth }) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);

            return (
              <button
                key={date.toISOString()}
                onClick={() => handleSelectDate(date)}
                className={`rounded py-1.5 text-xs transition ${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : isCurrentMonth
                      ? "text-gray-700 hover:bg-gray-100"
                      : "text-gray-300 hover:bg-gray-50"
                } ${isToday && !isSelected ? "border border-blue-200 text-blue-700" : "border border-transparent"}`}
                aria-pressed={isSelected}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
