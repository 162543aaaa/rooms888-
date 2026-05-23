import React, { useState, useEffect } from 'react';

export interface BookedSlot {
  id: string;
  userName: string;
  userDepartment: string;
  startTime: string; // UTC ISO string
  endTime: string;   // UTC ISO string
}

interface TimePickerProps {
  operatingStart?: string; // e.g. "08:00"
  operatingEnd?: string;   // e.g. "20:00"
  bookedSlots?: BookedSlot[];
  maxDurationHours?: number; // e.g. 4
  onChange?: (startISO: string | null, endISO: string | null, durationMinutes: number) => void;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  operatingStart = '08:00',
  operatingEnd = '20:00',
  bookedSlots = [],
  maxDurationHours = 4,
  onChange,
  onDateRangeChange,
}) => {
  const getTodayStr = (): string => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [startDate, setStartDate] = useState<string>(getTodayStr);
  const [startTime, setStartTime] = useState<string>('');
  const [endDate, setEndDate] = useState<string>(getTodayStr);
  const [endTime, setEndTime] = useState<string>('');
  
  const [inputError, setInputError] = useState<string | null>(null);

  // Trigger date range updates to the parent so it fetches relevant bookings
  useEffect(() => {
    if (onDateRangeChange && startDate && endDate) {
      onDateRangeChange(startDate, endDate);
    }
  }, [startDate, endDate, onDateRangeChange]);

  // Helper to convert HH:MM to raw minutes
  const toMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Helper to snap time to nearest 15-minute increment
  const snapTimeStr = (timeStr: string): string => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    
    const roundedM = Math.round(m / 15) * 15;
    let finalH = h;
    let finalM = roundedM;
    if (roundedM === 60) {
      if (h === 23) {
        finalM = 45; // Cap at 23:45 to prevent jumping backwards to 00:00 of the same day
      } else {
        finalM = 0;
        finalH = h + 1;
      }
    }
    return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
  };

  // Check if the selected time-of-day is within operating hours
  const isWithinOperatingHours = (timeStr: string): boolean => {
    const mins = toMinutes(timeStr);
    const startM = toMinutes(operatingStart);
    const endM = toMinutes(operatingEnd);
    return mins >= startM && mins <= endM;
  };

  // Check absolute overlap with existing bookings
  const checkOverlap = (startLocal: Date, endLocal: Date): boolean => {
    const startM = startLocal.getTime();
    const endM = endLocal.getTime();
    return bookedSlots.some((slot) => {
      const slotStart = new Date(slot.startTime).getTime();
      const slotEnd = new Date(slot.endTime).getTime();
      // Overlap condition: (Requested_Start < Existing_End) AND (Requested_End > Existing_Start)
      return startM < slotEnd && endM > slotStart;
    });
  };

  // Validation hook
  useEffect(() => {
    setInputError(null);

    if (!startDate || !startTime || !endDate || !endTime) {
      if (onChange) onChange(null, null, 0);
      return;
    }

    const startLocal = new Date(`${startDate}T${startTime}`);
    const endLocal = new Date(`${endDate}T${endTime}`);

    if (isNaN(startLocal.getTime()) || isNaN(endLocal.getTime())) {
      setInputError('วันที่หรือเวลาไม่ถูกต้อง');
      if (onChange) onChange(null, null, 0);
      return;
    }

    if (startLocal >= endLocal) {
      setInputError('วันเวลาเริ่มต้นต้องอยู่ก่อนวันเวลาสิ้นสุด');
      if (onChange) onChange(null, null, 0);
      return;
    }

    // Overlap validation
    if (checkOverlap(startLocal, endLocal)) {
      setInputError('ช่วงเวลานี้มีการจองทับซ้อนกับคิวการจองของผู้อื่นที่มีอยู่แล้ว');
      if (onChange) onChange(null, null, 0);
      return;
    }

    const duration = (endLocal.getTime() - startLocal.getTime()) / (1000 * 60);

    if (onChange) {
      onChange(startLocal.toISOString(), endLocal.toISOString(), duration);
    }
  }, [startDate, startTime, endDate, endTime, bookedSlots]);

  const handleStartBlur = () => {
    if (startTime) {
      setStartTime(snapTimeStr(startTime));
    }
  };

  const handleEndBlur = () => {
    if (endTime) {
      setEndTime(snapTimeStr(endTime));
    }
  };

  const handleReset = () => {
    setStartDate(getTodayStr());
    setStartTime('');
    setEndDate(getTodayStr());
    setEndTime('');
    setInputError(null);
  };

  // Helper to format date nicely in Thai format for list
  const formatThaiDate = (isoStr: string): string => {
    const d = new Date(isoStr);
    const day = d.getDate();
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const month = months[d.getMonth()];
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${hours}:${minutes} น.`;
  };

  return (
    <div className="digi-log-container">
      <style>{`
        .digi-log-container {
          background-color: #FAF5EF;
          border: 3px solid #2C1E1A;
          box-shadow: 6px 6px 0px 0px #2C1E1A;
          padding: 24px;
          font-family: 'Kanit', sans-serif;
          color: #2C1E1A;
          max-width: 100%;
          position: relative;
          overflow: hidden;
        }

        .digi-log-container::before {
          content: " ";
          display: block;
          position: absolute;
          top: 0; left: 0; bottom: 0; right: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.04) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.02), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.02));
          background-size: 100% 4px, 6px 100%;
          z-index: 10;
          pointer-events: none;
        }

        .digi-log-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px double #2C1E1A;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }

        .digi-log-title {
          font-size: 1.25rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-shadow: 2px 2px 0px rgba(255, 107, 107, 0.4);
        }

        .digi-log-badge {
          background-color: #F3A87C;
          border: 1px solid #2C1E1A;
          padding: 2px 6px;
          font-size: 0.75rem;
          font-weight: bold;
          box-shadow: 2px 2px 0px 0px #2C1E1A;
        }

        .dt-picker-section {
          border: 2px solid #2C1E1A;
          background-color: #FFFDF9;
          padding: 14px;
          box-shadow: 3px 3px 0px #2C1E1A;
          margin-bottom: 16px;
        }

        .dt-section-title {
          font-weight: bold;
          font-size: 0.9rem;
          text-transform: uppercase;
          margin-bottom: 8px;
          color: #E2725B;
          border-bottom: 1px dashed #2C1E1A;
          padding-bottom: 4px;
        }

        .dt-inputs-row {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 12px;
        }

        .time-input-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .time-input-label {
          font-weight: bold;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #8C827A;
        }

        .time-input-box {
          font-family: 'Kanit', sans-serif;
          font-size: 1rem;
          font-weight: bold;
          padding: 8px;
          border: 2px solid #2C1E1A;
          background-color: #FFFDF9;
          outline: none;
          color: #2C1E1A;
          width: 100%;
        }

        .time-input-box:focus {
          border-color: #E2725B;
        }

        .info-panel {
          background-color: #FFFDF9;
          border: 2px solid #2C1E1A;
          box-shadow: 3px 3px 0px 0px #2C1E1A;
          padding: 12px;
          margin-top: 16px;
          font-size: 0.85rem;
        }

        .warning-banner {
          background-color: #FF5A5F;
          color: white;
          border: 2px solid #2C1E1A;
          font-weight: bold;
          text-align: center;
          padding: 8px;
          margin-top: 12px;
          font-size: 0.8rem;
          box-shadow: 3px 3px 0px 0px #2C1E1A;
        }

        .reset-btn {
          margin-top: 12px;
          width: 100%;
          background: #E8E5DF;
          border: 2px solid #2C1E1A;
          font-family: inherit;
          font-weight: bold;
          padding: 6px;
          cursor: pointer;
          box-shadow: 2px 2px 0px 0px #2C1E1A;
        }

        .reset-btn:hover {
          background: #D8D4CE;
        }

        .blocked-slots-box {
          border: 1px dashed #2C1E1A;
          padding: 10px;
          margin-top: 16px;
          font-size: 0.8rem;
          background-color: #FFFDF9;
        }

        .blocked-badge {
          display: block;
          background-color: #E6E1DA;
          color: #8C827A;
          padding: 6px;
          font-size: 0.75rem;
          border: 1px solid #8C827A;
          margin-bottom: 6px;
          background-image: repeating-linear-gradient(
            45deg,
            #DDD8D1,
            #DDD8D1 4px,
            #E6E1DA 4px,
            #E6E1DA 8px
          );
        }
      `}</style>

      <div className="digi-log-header">
        <span className="digi-log-title">📼 ระบุกรอบเวลาจองข้ามวัน</span>
        <span className="digi-log-badge">เปิดทำการ: {operatingStart} - {operatingEnd} น.</span>
      </div>

      {/* Start Date & Time picker */}
      <div className="dt-picker-section">
        <div className="dt-section-title">⏱️ วันและเวลาเริ่มใช้ห้อง</div>
        <div className="dt-inputs-row">
          <div className="time-input-field">
            <label className="time-input-label">ระบุวันที่เริ่มต้น</label>
            <input
              type="date"
              className="time-input-box"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="time-input-field">
            <label className="time-input-label">ระบุเวลาเริ่มต้น</label>
            <input
              type="time"
              className="time-input-box"
              step="900"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              onBlur={handleStartBlur}
            />
          </div>
        </div>
      </div>

      {/* End Date & Time picker */}
      <div className="dt-picker-section">
        <div className="dt-section-title">⏱️ วันและเวลาเลิกใช้ห้อง</div>
        <div className="dt-inputs-row">
          <div className="time-input-field">
            <label className="time-input-label">ระบุวันที่สิ้นสุด</label>
            <input
              type="date"
              className="time-input-box"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="time-input-field">
            <label className="time-input-label">ระบุเวลาสิ้นสุด</label>
            <input
              type="time"
              className="time-input-box"
              step="900"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              onBlur={handleEndBlur}
            />
          </div>
        </div>
      </div>

      <p style={{ fontSize: '0.75rem', color: '#8C827A', fontStyle: 'italic', marginTop: '4px' }}>
        * ระบบรองรับการกรอกข้ามวัน และจะปรับเวลาเป็นเศษ 15 นาทีให้โดยอัตโนมัติ
      </p>

      {/* Blocked slots list */}
      <div className="blocked-slots-box">
        <strong>ช่วงเวลาที่มีการจองแล้วในช่วงวันที่เลือก:</strong>
        <div style={{ marginTop: '6px' }}>
          {bookedSlots.length === 0 ? (
            <span style={{ color: '#4A7C82' }}>ไม่มีการจองคิวทับซ้อน (ว่างทุกกรอบเวลา)</span>
          ) : (
            bookedSlots.map((slot, index) => (
              <div key={index} className="blocked-badge">
                📅 จองแล้วโดยคุณ {slot.userName} ({slot.userDepartment}) คิว: {formatThaiDate(slot.startTime)} ถึง {formatThaiDate(slot.endTime)}
              </div>
            ))
          )}
        </div>
      </div>

      {startDate && startTime && endDate && endTime && !inputError && (
        <div className="info-panel">
          <div>⏱️ <strong>เวลาเริ่มต้น:</strong> {startDate} {startTime} น.</div>
          <div>⏱️ <strong>เวลาสิ้นสุด:</strong> {endDate} {endTime} น.</div>
          <div style={{ marginTop: '6px', fontWeight: 'bold' }}>
            ⏳ <strong>ระยะเวลารวม:</strong> {((new Date(`${endDate}T${endTime}`).getTime() - new Date(`${startDate}T${startTime}`).getTime()) / (1000 * 60 * 60)).toFixed(2)} ชั่วโมง ({((new Date(`${endDate}T${endTime}`).getTime() - new Date(`${startDate}T${startTime}`).getTime()) / (1000 * 60))} นาที)
          </div>
        </div>
      )}

      {inputError && (
        <div className="warning-banner">
          🚨 ข้อผิดพลาด: {inputError}
        </div>
      )}

      {(startTime || endTime) && (
        <button type="button" className="reset-btn" onClick={handleReset}>
          ล้างข้อมูลและระบุใหม่ [Reset]
        </button>
      )}
    </div>
  );
};
