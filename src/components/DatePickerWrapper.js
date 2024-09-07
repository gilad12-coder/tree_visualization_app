import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DatePickerWrapper = ({
  date,
  handleDateChange,
  isRange = false,
  placeholderText,
  wrapperColor = 'bg-blue-100',
  wrapperOpacity = 'bg-opacity-50'
}) => {
  const currentYear = useMemo(() => {
    if (isRange && Array.isArray(date)) {
      return (date[1] || date[0] || new Date()).getFullYear();
    } else if (date) {
      return (Array.isArray(date) ? date[0] : date).getFullYear();
    }
    return new Date().getFullYear();
  }, [date, isRange]);

  const years = useMemo(() => 
    Array.from({ length: 201 }, (_, i) => currentYear - 100 + i),
    [currentYear]
  );
  
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <motion.div
      className={`${wrapperColor} ${wrapperOpacity} rounded-xl p-3 flex items-center justify-center`}
      whileHover={{
        boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)",
      }}
    >
      <div className="flex items-center space-x-3">
        <Calendar size={20} className="text-blue-500 flex-shrink-0" />
        <DatePicker
          selected={isRange ? (Array.isArray(date) ? date[0] : null) : date}
          onChange={handleDateChange}
          startDate={isRange && Array.isArray(date) ? date[0] : null}
          endDate={isRange && Array.isArray(date) ? date[1] : null}
          selectsRange={isRange}
          dateFormat="yyyy-MM-dd"
          placeholderText={placeholderText || "Select date"}
          className="bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400 font-medium text-center w-full"
          calendarClassName="custom-calendar"
          wrapperClassName="date-picker-wrapper w-full"
          renderCustomHeader={({
            date: headerDate,
            changeYear,
            changeMonth,
            decreaseMonth,
            increaseMonth,
            prevMonthButtonDisabled,
            nextMonthButtonDisabled,
          }) => (
            <div className="flex items-center justify-between px-2 py-2">
              <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled} className="text-gray-600 hover:text-blue-500">
                {"<"}
              </button>
              <div className="flex space-x-2">
                <select
                  value={headerDate.getFullYear()}
                  onChange={({ target: { value } }) => changeYear(Number(value))}
                  className="custom-select"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <select
                  value={months[headerDate.getMonth()]}
                  onChange={({ target: { value } }) =>
                    changeMonth(months.indexOf(value))
                  }
                  className="custom-select"
                >
                  {months.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={increaseMonth} disabled={nextMonthButtonDisabled} className="text-gray-600 hover:text-blue-500">
                {">"}
              </button>
            </div>
          )}
        />
      </div>
    </motion.div>
  );
};

export default DatePickerWrapper;