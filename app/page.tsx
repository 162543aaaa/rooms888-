'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TimePicker, BookedSlot } from '@/components/TimePicker';

interface Room {
  id: string;
  name: string;
  capacity: number;
  maxDurationMinutes: number;
  status: string;
}

interface Booking {
  id: string;
  roomId: string;
  userName: string;
  userDepartment: string;
  userEmail: string;
  startTime: string;
  endTime: string;
}

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  // Date range for fetching bookings
  const [queryStartDate, setQueryStartDate] = useState<string>('');
  const [queryEndDate, setQueryEndDate] = useState<string>('');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Form states
  const [userName, setUserName] = useState<string>('');
  const [userDepartment, setUserDepartment] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [savedProfiles, setSavedProfiles] = useState<{ name: string; department: string }[]>([]);

  // Time picker states
  const [startISO, setStartISO] = useState<string | null>(null);
  const [endISO, setEndISO] = useState<string | null>(null);
  const [durationMins, setDurationMins] = useState<number>(0);
  const [submitStatus, setSubmitStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const [operatingStart, setOperatingStart] = useState<string>('08:00');
  const [operatingEnd, setOperatingEnd] = useState<string>('20:00');
  const [globalMaxDuration, setGlobalMaxDuration] = useState<number>(240);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  // Fetch System Settings
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setOperatingStart(data.operatingStartHour || '08:00');
          setOperatingEnd(data.operatingEndHour || '20:00');
          setGlobalMaxDuration(data.maxDurationMinutes || 240);
        }
      })
      .catch((err) => console.error('Error fetching settings:', err));
  }, []);

  // Load saved profiles from localStorage on mount
  useEffect(() => {
    try {
      const profilesJson = localStorage.getItem('saved_profiles');
      if (profilesJson) {
        setSavedProfiles(JSON.parse(profilesJson));
      }
    } catch (e) {
      console.error('Error loading saved profiles:', e);
    }
  }, []);

  const handleProfileSelect = (indexStr: string) => {
    if (indexStr === '') {
      setUserName('');
      setUserDepartment('');
      return;
    }
    const idx = Number(indexStr);
    const profile = savedProfiles[idx];
    if (profile) {
      setUserName(profile.name);
      setUserDepartment(profile.department);
    }
  };

  const handleClearProfiles = () => {
    if (confirm('คุณต้องการล้างประวัติโปรไฟล์ผู้จองที่บันทึกไว้ทั้งหมดใช่หรือไม่?')) {
      localStorage.removeItem('saved_profiles');
      setSavedProfiles([]);
    }
  };

  // 1. Fetch Rooms
  useEffect(() => {
    fetch('/api/rooms')
      .then((res) => res.json())
      .then((data) => {
        setRooms(data);
        if (data.length > 0) {
          setSelectedRoomId(data[0].id);
        }
      })
      .catch((err) => console.error('Error fetching rooms:', err));
  }, []);

  // 2. Fetch Bookings for room & dates
  const fetchBookings = useCallback(async () => {
    if (!selectedRoomId || !queryStartDate || !queryEndDate) return;

    setLoading(true);
    try {
      const [sYear, sMonth, sDay] = queryStartDate.split('-').map(Number);
      const [eYear, eMonth, eDay] = queryEndDate.split('-').map(Number);
      
      const startOfDayLocal = new Date(sYear, sMonth - 1, sDay, 0, 0, 0);
      const endOfDayLocal = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);

      const res = await fetch(
        `/api/bookings?roomId=${selectedRoomId}&start=${startOfDayLocal.toISOString()}&end=${endOfDayLocal.toISOString()}`
      );
      const data: Booking[] = await res.json();
      setBookings(data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRoomId, queryStartDate, queryEndDate]);

  useEffect(() => {
    fetchBookings();
  }, [selectedRoomId, queryStartDate, queryEndDate, fetchBookings]);

  // Reset selections when changing rooms
  useEffect(() => {
    setStartISO(null);
    setEndISO(null);
    setDurationMins(0);
    setSubmitStatus(null);
  }, [selectedRoomId]);

  // 3. Handle TimePicker changes
  const handleTimeChange = (start: string | null, end: string | null, duration: number) => {
    setStartISO(start);
    setEndISO(end);
    setDurationMins(duration);
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setQueryStartDate(start);
    setQueryEndDate(end);
  };

  // 4. Submit Booking
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId || !startISO || !endISO || !userName || !userDepartment) {
      alert('กรุณากรอกข้อมูลให้ครบและกำหนดเวลาใช้งานที่ถูกต้องด้วยนะเพื่อน!');
      return;
    }

    setSubmitStatus(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: selectedRoomId,
          userName,
          userDepartment,
          userEmail: '', // Email is not required
          notes: notes || '',
          startTime: startISO,
          endTime: endISO,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitStatus({
          success: false,
          message: data.error || 'ช่วงเวลานี้ชนกับคิวการจองของผู้อื่น!',
        });
      } else {
        setSubmitStatus({
          success: true,
          message: 'เรียบร้อย! ระบบจองห้องของคุณสำเร็จแล้ว 📼',
        });

        // บันทึกโปรไฟล์ลงในประวัติผู้จอง
        const exists = savedProfiles.some(
          (p) => p.name === userName && p.department === userDepartment
        );
        if (!exists) {
          const updated = [...savedProfiles, { name: userName, department: userDepartment }];
          setSavedProfiles(updated);
          localStorage.setItem('saved_profiles', JSON.stringify(updated));
        }

        setStartISO(null);
        setEndISO(null);
        setDurationMins(0);
        setNotes('');
        fetchBookings();
      }
    } catch (err) {
      console.error(err);
      setSubmitStatus({
        success: false,
        message: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาลองอีกครั้ง',
      });
    }
  };

  const isDurationExceeded = false;

  // Helper to format date nicely in Thai format
  const formatThaiDate = (isoStr: string | null): string => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const day = d.getDate();
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const month = months[d.getMonth()];
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} เวลา ${hours}:${minutes} น.`;
  };

  // Convert bookings array to match TimePicker's BookedSlot interface
  const formattedBookings: BookedSlot[] = bookings.map((b) => ({
    id: b.id,
    userName: b.userName,
    userDepartment: b.userDepartment,
    startTime: b.startTime,
    endTime: b.endTime,
  }));

  return (
    <main style={{ fontFamily: "'Kanit', sans-serif" }}>
      {/* Title */}
      <div className="retro-box" style={{ marginBottom: '30px', backgroundColor: '#E2725B', color: '#FFFDF9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', margin: 0, textShadow: '3px 3px 0px #2C1E1A' }}>📼 ROOMS888</h1>
            <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#FAF5EF' }}>
              จองห้องประชุมด่วนจี๋ ไม่มีบัญชีก็จองได้ ง่าย ไหลลื่น รองรับการจองข้ามวัน ⚡
            </p>
          </div>
          <div>
            <a href="/admin" className="retro-btn retro-btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              📟 เข้าโหมดแอดมิน
            </a>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }} className="grid-responsive">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="retro-box">
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', borderBottom: '2px dashed #2C1E1A', paddingBottom: '8px' }}>
              1. เลือกห้องเรียน/ห้องประชุม
            </h2>

            <div className="retro-input-group">
              <label className="retro-input-label">ห้องที่ต้องการจอง</label>
              <select
                className="retro-select"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
              >
                {rooms.length === 0 ? (
                  <option>กำลังโหลดรายชื่อห้อง...</option>
                ) : (
                  rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedRoom && (
              <div style={{ marginTop: '12px', fontSize: '0.85rem', padding: '10px', backgroundColor: '#F5EBE0', border: '1px solid #2C1E1A' }}>
                🏢 <strong>ความจุห้อง:</strong> {selectedRoom.capacity} คน | 
                ⏱️ <strong>จองสูงสุดต่อครั้ง:</strong> {selectedRoom.maxDurationMinutes / 60} ชั่วโมง ({selectedRoom.maxDurationMinutes} นาที)
              </div>
            )}
          </div>

          {selectedRoomId && (
            <div className="retro-box" style={{ position: 'relative' }}>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', borderBottom: '2px dashed #2C1E1A', paddingBottom: '8px' }}>
                2. ระบุกรอบเวลาจอง
              </h2>
              
              {loading && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(250, 245, 239, 0.8)',
                  zIndex: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontFamily: "'Kanit', sans-serif",
                  border: '3px solid #2C1E1A',
                  color: '#2C1E1A',
                  fontSize: '1.1rem'
                }}>
                  📟 กำลังตรวจสอบคิวห้อง...
                </div>
              )}

              <TimePicker
                operatingStart={operatingStart}
                operatingEnd={operatingEnd}
                bookedSlots={formattedBookings}
                onChange={handleTimeChange}
                onDateRangeChange={handleDateRangeChange}
              />
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <form className="retro-box" onSubmit={handleBookingSubmit}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', borderBottom: '2px dashed #2C1E1A', paddingBottom: '8px' }}>
              3. ข้อมูลติดต่อผู้จอง
            </h2>

            {/* ระบบจดจำประวัติผู้ใช้งาน */}
            {savedProfiles.length > 0 && (
              <div className="retro-input-group" style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#F5EBE0', border: '2px solid #2C1E1A' }}>
                <label className="retro-input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>👤 เลือกโปรไฟล์ที่จดจำไว้</span>
                  <button
                    type="button"
                    onClick={handleClearProfiles}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#FF5A5F',
                      textDecoration: 'underline',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontFamily: 'inherit'
                    }}
                  >
                    ล้างประวัติ
                  </button>
                </label>
                <select
                  className="retro-select"
                  style={{ marginTop: '4px', backgroundColor: '#FFFDF9', fontSize: '0.85rem', padding: '6px' }}
                  onChange={(e) => handleProfileSelect(e.target.value)}
                  defaultValue=""
                >
                  <option value="">-- เลือกโปรไฟล์ที่เคยบันทึก --</option>
                  {savedProfiles.map((p, idx) => (
                    <option key={idx} value={idx}>
                      {p.name} ({p.department})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="retro-input-group">
              <label className="retro-input-label">ชื่อผู้จอง / ตัวแทน</label>
              <input
                type="text"
                className="retro-input"
                placeholder="เช่น สมชาย ใจดี"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>

            <div className="retro-input-group">
              <label className="retro-input-label">แผนก / ฝ่าย / ทีม</label>
              <input
                type="text"
                className="retro-input"
                placeholder="เช่น การตลาด / นักพัฒนาดีไซน์"
                required
                value={userDepartment}
                onChange={(e) => setUserDepartment(e.target.value)}
              />
            </div>

            <div className="retro-input-group" style={{ marginBottom: '24px' }}>
              <label className="retro-input-label">โน้ตเพิ่มเติม / รายละเอียดการจอง</label>
              <textarea
                className="retro-input"
                placeholder="ระบุวัตถุประสงค์การใช้ห้อง อุปกรณ์ที่จำเป็น หรือโน้ตอื่นๆ (ถ้ามี)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={{ resize: 'vertical', minHeight: '80px', width: '100%' }}
              />
            </div>

            {/* Booking Summary */}
            <div style={{ marginTop: '20px', borderTop: '2px dashed #2C1E1A', paddingTop: '15px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>สรุปข้อมูลการจองห้อง</h3>
              {startISO && endISO ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                  <div>📍 <strong>ห้องประชุม:</strong> {selectedRoom?.name}</div>
                  <div>📅 <strong>เริ่มต้น:</strong> {formatThaiDate(startISO)}</div>
                  <div>📅 <strong>สิ้นสุด:</strong> {formatThaiDate(endISO)}</div>
                  <div>⏳ <strong>ระยะเวลารวม:</strong> {(durationMins / 60).toFixed(2)} ชั่วโมง ({durationMins} นาที)</div>
                  {notes && (
                    <div style={{ wordBreak: 'break-all' }}>📝 <strong>โน้ตเพิ่มเติม:</strong> {notes}</div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', color: '#8C827A', fontStyle: 'italic' }}>
                  กรุณากรอกระบุวันและเวลาในแบบฟอร์มเพื่อสรุปข้อมูล
                </p>
              )}
            </div>

            {/* Confirm Submit Button */}
            <button
              type="submit"
              className="retro-btn"
              style={{ marginTop: '20px', width: '100%', justifyContent: 'center' }}
              disabled={!startISO || !endISO || isDurationExceeded}
            >
              📼 ยืนยันการจองห้องประชุม
            </button>
          </form>

          {submitStatus && (
            <div
              className="retro-box"
              style={{
                backgroundColor: submitStatus.success ? '#D4EDDA' : '#F8D7DA',
                border: '3px solid #2C1E1A',
                boxShadow: '4px 4px 0px #2C1E1A',
                fontWeight: 'bold',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              {submitStatus.success ? '🎉 สำเร็จ:' : '❌ ล้มเหลว:'} {submitStatus.message}
            </div>
          )}

          {/* Teenage Rules */}
          <div className="retro-box" style={{ backgroundColor: '#FAF5EF', borderStyle: 'dotted' }}>
            <h3 style={{ fontSize: '1rem', color: '#E2725B', marginBottom: '8px' }}>📟 กฎเหล็กความซนวัยรุ่น ROOMS888</h3>
            <p style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
              เฮ้เพื่อน! มีระเบียบในการใช้งานเสร็จแล้ว อย่าลืมเก็บเศษขยะขนมน้ำหวานไปทิ้ง เคารพกลุ่มถัดไปด้วยล่ะ การจองเป็นแบบเรียลไทม์ทันที ดังนั้นอย่ากดจองเล่นๆ ถ้าเกิดไม่มาใช้งานจริง แยกย้าย! ✌️
            </p>
          </div>
        </div>
      </div>
      
      <style>{`
        @media (max-width: 768px) {
          .grid-responsive {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
