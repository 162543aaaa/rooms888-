'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Room {
  id: string;
  name: string;
  capacity: number;
  maxDurationMinutes: number;
  status: 'ACTIVE' | 'MAINTENANCE';
}

interface Booking {
  id: string;
  roomId: string;
  userName: string;
  userDepartment: string;
  userEmail: string;
  notes?: string;
  startTime: string;
  endTime: string;
  room: {
    name: string;
  };
}

interface SystemSettings {
  maxDurationMinutes: number;
  operatingStartHour: string;
  operatingEndHour: string;
  googleSheetUrl?: string | null;
}

export default function AdminDashboard() {
  const [password, setPassword] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Admin Data states
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Form states for creating room
  const [newRoomName, setNewRoomName] = useState<string>('');
  const [newRoomCapacity, setNewRoomCapacity] = useState<number>(6);
  const [newRoomMaxDuration, setNewRoomMaxDuration] = useState<number>(240);
  const [newRoomStatus, setNewRoomStatus] = useState<'ACTIVE' | 'MAINTENANCE'>('ACTIVE');

  // Form states for editing system settings
  const [globalMaxDuration, setGlobalMaxDuration] = useState<number>(240);
  const [globalStartHour, setGlobalStartHour] = useState<string>('08:00');
  const [globalEndHour, setGlobalEndHour] = useState<string>('20:00');
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rooms' | 'bookings' | 'settings'>('dashboard');

  // Load password from sessionStorage if exists
  useEffect(() => {
    const savedPassword = sessionStorage.getItem('admin_pass');
    if (savedPassword) {
      setPassword(savedPassword);
      verifyPassword(savedPassword);
    }
  }, []);

  const verifyPassword = async (pass: string) => {
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { 'x-admin-password': pass },
      });
      if (res.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_pass', pass);
        const data = await res.json();
        setSettings(data);
        setGlobalMaxDuration(data.maxDurationMinutes);
        setGlobalStartHour(data.operatingStartHour);
        setGlobalEndHour(data.operatingEndHour);
        setGoogleSheetUrl(data.googleSheetUrl || '');
        fetchAdminData(pass);
      } else {
        setErrorMsg('รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง!');
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('เกิดข้อผิดพลาดในการยืนยันตัวตนกับเซิร์ฟเวอร์');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    verifyPassword(password);
  };

  const fetchAdminData = useCallback(async (pass: string) => {
    try {
      const roomsRes = await fetch('/api/rooms?all=true');
      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        setRooms(roomsData);
      }

      const bookingsRes = await fetch('/api/admin/bookings', {
        headers: { 'x-admin-password': pass },
      });
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  }, []);

  // Room actions
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName || !newRoomCapacity) return;

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          name: newRoomName,
          capacity: Number(newRoomCapacity),
          status: newRoomStatus,
          maxDurationMinutes: Number(newRoomMaxDuration),
        }),
      });

      if (res.ok) {
        setNewRoomName('');
        fetchAdminData(password);
        alert('สร้างห้องประชุมสำเร็จแล้วเรียบร้อย!');
      } else {
        alert('ไม่สามารถสร้างห้องประชุมได้');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleRoomStatus = async (room: Room) => {
    const nextStatus = room.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/admin/rooms/${room.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        fetchAdminData(password);
      } else {
        alert('ไม่สามารถเปลี่ยนสถานะห้องประชุมได้');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('ยืนยันที่จะลบห้องประชุมนี้ใช่ไหม? (ข้อมูลการจองในห้องนี้ทั้งหมดจะถูกลบไปด้วยทันที!)')) return;

    try {
      const res = await fetch(`/api/admin/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password },
      });

      if (res.ok) {
        fetchAdminData(password);
      } else {
        alert('ลบห้องประชุมล้มเหลว');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Settings action
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          maxDurationMinutes: Number(globalMaxDuration),
          operatingStartHour: globalStartHour,
          operatingEndHour: globalEndHour,
          googleSheetUrl: googleSheetUrl,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        alert('บันทึกการตั้งค่าระบบหลักเสร็จสมบูรณ์!');
      } else {
        alert('ล้มเหลวในการบันทึกค่าระบบ');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Booking cancellation
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('ยืนยันยกเลิกรายการจองฉุกเฉินใช่ไหม? (กรุณาแจ้งความคืบหน้าแก่ผู้ใช้รายนี้ด้วยตนเองหลังจากยกเลิกแล้ว)')) return;

    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password },
      });

      if (res.ok) {
        fetchAdminData(password);
        alert('ลบและยกเลิกคิวจองนี้สำเร็จแล้ว!');
      } else {
        alert('การยกเลิกคิวจองล้มเหลว');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_pass');
    setIsAuthenticated(false);
    setPassword('');
  };

  // Analytics Calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const bookingsToday = bookings.filter(b => {
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    return start < tomorrow && end >= today;
  });

  const roomCounts: Record<string, number> = {};
  bookings.forEach(b => {
    roomCounts[b.roomId] = (roomCounts[b.roomId] || 0) + 1;
  });
  let mostPopularRoomId = '';
  let maxCount = 0;
  Object.entries(roomCounts).forEach(([roomId, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostPopularRoomId = roomId;
    }
  });
  const mostPopularRoom = rooms.find(r => r.id === mostPopularRoomId)?.name || 'ไม่มีข้อมูล';

  const deptCounts: Record<string, number> = {};
  bookings.forEach(b => {
    if (b.userDepartment) {
      const dept = b.userDepartment.trim();
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    }
  });
  let topDept = 'ไม่มีข้อมูล';
  let maxDeptCount = 0;
  Object.entries(deptCounts).forEach(([dept, count]) => {
    if (count > maxDeptCount) {
      maxDeptCount = count;
      topDept = dept;
    }
  });

  const roomStats = rooms.map(room => {
    const count = bookings.filter(b => b.roomId === room.id).length;
    return { name: room.name, count };
  }).sort((a, b) => b.count - a.count);
  const maxRoomBookings = Math.max(...roomStats.map(r => r.count), 1);

  const deptStats = Object.entries(deptCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxDeptBookings = Math.max(...deptStats.map(d => d.count), 1);

  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat
  bookings.forEach(b => {
    const day = new Date(b.startTime).getDay();
    weekdayCounts[day]++;
  });
  const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const maxDayBookings = Math.max(...weekdayCounts, 1);

  // Electricity Calculations
  const calculateBaseTariff = (units: number): number => {
    if (units <= 150) {
      return units * 3.2484;
    } else if (units <= 400) {
      return (150 * 3.2484) + ((units - 150) * 4.2234);
    } else {
      return (150 * 3.2484) + (250 * 4.2234) + ((units - 400) * 4.4214);
    }
  };

  const calculateTotalCost = (units: number): number => {
    if (units === 0) return 0;
    const baseCost = calculateBaseTariff(units);
    const ftCost = units * 0.0972;
    const serviceCharge = 64.05;
    const subtotal = baseCost + ftCost + serviceCharge;
    return subtotal * 1.07;
  };

  let totalBookedMinutes = 0;
  bookings.forEach(b => {
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    const diffMins = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60));
    totalBookedMinutes += diffMins;
  });
  const totalBookedHours = totalBookedMinutes / 60;
  const wattsPerRoom = 1228; // Lights: 40W, Aircon: 1000W, TV: 80W, Macbooks: 90W, iPads: 18W
  const totalUnits = (wattsPerRoom * totalBookedHours) / 1000;
  const totalElectricityCost = calculateTotalCost(totalUnits);

  const electricityByRoom = rooms.map(room => {
    let roomMinutes = 0;
    bookings.filter(b => b.roomId === room.id).forEach(b => {
      const start = new Date(b.startTime);
      const end = new Date(b.endTime);
      roomMinutes += Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60));
    });
    const hours = roomMinutes / 60;
    const units = (wattsPerRoom * hours) / 1000;
    const cost = calculateTotalCost(units);
    return { name: room.name, hours, units, cost };
  });

  // Login View
  if (!isAuthenticated) {
    return (
      <main style={{ maxWidth: '480px', marginTop: '10%', fontFamily: "'Kanit', sans-serif" }}>
        <div className="retro-box" style={{ backgroundColor: '#2C1E1A', color: '#FFFDF9', boxShadow: '6px 6px 0px #E2725B' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '1.75rem', textShadow: '2px 2px 0px #E2725B' }}>📟 ROOMS888 ระบบแอดมิน</h1>
            <p style={{ fontSize: '0.75rem', color: '#F3A87C' }}>พื้นที่เฉพาะผู้ดูแลระบบที่มีสิทธิ์เข้าถึงเท่านั้น</p>
          </div>

          <form onSubmit={handleLoginSubmit}>
            <div className="retro-input-group">
              <label className="retro-input-label" style={{ color: '#F3A87C' }}>รหัสผ่านหลักผู้ดูแลระบบ</label>
              <input
                type="password"
                className="retro-input"
                style={{ backgroundColor: '#FFFDF9', color: '#2C1E1A', border: '3px solid #E2725B' }}
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="retro-btn" style={{ width: '100%', justifyContent: 'center', backgroundColor: '#E2725B', color: 'white' }}>
              🔑 เข้าสู่แผงควบคุม
            </button>

            {errorMsg && (
              <div style={{ backgroundColor: '#FF5A5F', border: '2px solid white', padding: '10px', color: 'white', marginTop: '15px', fontWeight: 'bold', fontSize: '0.8rem', textAlign: 'center' }}>
                🚨 {errorMsg}
              </div>
            )}
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <a href="/" style={{ color: '#F3A87C', fontSize: '0.85rem', textDecoration: 'underline' }}>
              ← กลับไปหน้าหลักผู้ใช้
            </a>
          </div>
        </div>
      </main>
    );
  }

  // Dashboard View
  return (
    <main style={{ maxWidth: '1200px', fontFamily: "'Kanit', sans-serif" }}>
      {/* Header */}
      <div className="retro-box" style={{ marginBottom: '30px', backgroundColor: '#2C1E1A', color: '#FFFDF9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', textShadow: '2px 2px 0px #E2725B' }}>📟 ROOMS888 แผงควบคุมแอดมิน</h1>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#F3A87C' }}>
            จัดการห้องประชุม กำหนดกรอบเวลาทำการ และยกเลิก/แทรกแซงคิวจองฉุกเฉินได้ทันที
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/" className="retro-btn retro-btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            🏠 กลับหน้าหลัก
          </a>
          <button onClick={handleLogout} className="retro-btn retro-btn-danger" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            🔒 ล็อกระบบ
          </button>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '25px',
        borderBottom: '4px solid #2C1E1A',
        paddingBottom: '10px',
        overflowX: 'auto'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`retro-btn ${activeTab === 'dashboard' ? '' : 'retro-btn-secondary'}`}
          style={{
            padding: '8px 16px',
            fontSize: '0.9rem',
            whiteSpace: 'nowrap',
            backgroundColor: activeTab === 'dashboard' ? '#E2725B' : undefined,
            color: activeTab === 'dashboard' ? 'white' : undefined,
          }}
        >
          📊 แดชบอร์ดสถิติ
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rooms')}
          className={`retro-btn ${activeTab === 'rooms' ? '' : 'retro-btn-secondary'}`}
          style={{
            padding: '8px 16px',
            fontSize: '0.9rem',
            whiteSpace: 'nowrap',
            backgroundColor: activeTab === 'rooms' ? '#E2725B' : undefined,
            color: activeTab === 'rooms' ? 'white' : undefined,
          }}
        >
          🏢 จัดการห้องประชุม
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bookings')}
          className={`retro-btn ${activeTab === 'bookings' ? '' : 'retro-btn-secondary'}`}
          style={{
            padding: '8px 16px',
            fontSize: '0.9rem',
            whiteSpace: 'nowrap',
            backgroundColor: activeTab === 'bookings' ? '#E2725B' : undefined,
            color: activeTab === 'bookings' ? 'white' : undefined,
          }}
        >
          🗓️ ปฏิทิน & คิวจองห้อง
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`retro-btn ${activeTab === 'settings' ? '' : 'retro-btn-secondary'}`}
          style={{
            padding: '8px 16px',
            fontSize: '0.9rem',
            whiteSpace: 'nowrap',
            backgroundColor: activeTab === 'settings' ? '#E2725B' : undefined,
            color: activeTab === 'settings' ? 'white' : undefined,
          }}
        >
          🔧 ตั้งค่าระบบหลัก
        </button>
      </div>

      {/* Tab Contents */}
      
      {/* 1. Dashboard View */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Stats Cards Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px'
          }}>
            <div className="retro-box" style={{ backgroundColor: '#FAF5EF', borderLeft: '8px solid #E2725B' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#8C827A' }}>📈 จำนวนการจองทั้งหมด</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '10px' }}>{bookings.length} ครั้ง</div>
            </div>
            <div className="retro-box" style={{ backgroundColor: '#FAF5EF', borderLeft: '8px solid #D4A373' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#8C827A' }}>🏢 ห้องประชุมในระบบ</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '10px' }}>{rooms.length} ห้อง</div>
              <div style={{ fontSize: '0.75rem', color: '#2C1E1A', marginTop: '5px' }}>
                🟢 พร้อมใช้ {rooms.filter(r => r.status === 'ACTIVE').length} | 🔴 ปิดซ่อม {rooms.filter(r => r.status === 'MAINTENANCE').length}
              </div>
            </div>
            <div className="retro-box" style={{ backgroundColor: '#FAF5EF', borderLeft: '8px solid #E2725B' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#8C827A' }}>วันนี้มีรายการจอง</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '10px' }}>{bookingsToday.length} คิว</div>
            </div>
            <div className="retro-box" style={{ backgroundColor: '#FAF5EF', borderLeft: '8px solid #FFD166' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#8C827A' }}>⚡ ค่าไฟโดยประมาณ (PEA ปัตตานี)</div>
              <div style={{ fontSize: '2.0rem', fontWeight: 'bold', marginTop: '10px' }}>{totalElectricityCost.toFixed(2)} บาท</div>
              <div style={{ fontSize: '0.72rem', color: '#2C1E1A', marginTop: '5px' }}>
                ยอดไฟฟ้า {totalUnits.toFixed(2)} ยูนิต (Ft 0.0972, บริการ 64.05, VAT 7%)
              </div>
            </div>
            <div className="retro-box" style={{ backgroundColor: '#FAF5EF', borderLeft: '8px solid #2C1E1A' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#8C827A' }}>👑 ห้องประชุมที่ฮอตสุด</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '10px', wordBreak: 'break-word' }}>
                {mostPopularRoom}
              </div>
              {maxCount > 0 && (
                <div style={{ fontSize: '0.75rem', color: '#8C827A', marginTop: '5px' }}>
                  (ยอดจอง {maxCount} ครั้ง)
                </div>
              )}
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }} className="grid-responsive">
            {/* Chart 1: Room Popularity */}
            <div className="retro-box">
              <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '2px dashed #2C1E1A', paddingBottom: '8px' }}>
                📊 สถิติจำนวนครั้งการจองแต่ละห้อง
              </h2>
              {roomStats.length === 0 ? (
                <div style={{ textAlign: 'center', fontStyle: 'italic', padding: '20px', color: '#8C827A' }}>ไม่มีข้อมูลการจอง</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {roomStats.map(r => (
                    <div key={r.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold' }}>📼 {r.name}</span>
                        <span>{r.count} ครั้ง</span>
                      </div>
                      <div style={{
                        height: '24px',
                        border: '2px solid #2C1E1A',
                        backgroundColor: '#FFFDF9',
                        boxShadow: 'inset 2px 2px 0px rgba(0,0,0,0.05)',
                        position: 'relative'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${(r.count / maxRoomBookings) * 100}%`,
                          backgroundColor: '#E2725B',
                          borderRight: r.count > 0 ? '2px solid #2C1E1A' : 'none',
                          transition: 'width 0.5s ease-in-out'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chart 2: Department Distribution */}
            <div className="retro-box">
              <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '2px dashed #2C1E1A', paddingBottom: '8px' }}>
                📊 สัดส่วนการจองแยกตามแผนก/ฝ่าย
              </h2>
              {deptStats.length === 0 ? (
                <div style={{ textAlign: 'center', fontStyle: 'italic', padding: '20px', color: '#8C827A' }}>ไม่มีข้อมูลการจอง</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {deptStats.map(d => (
                    <div key={d.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold' }}>👥 {d.name}</span>
                        <span>{d.count} ครั้ง</span>
                      </div>
                      <div style={{
                        height: '24px',
                        border: '2px solid #2C1E1A',
                        backgroundColor: '#FFFDF9',
                        boxShadow: 'inset 2px 2px 0px rgba(0,0,0,0.05)',
                        position: 'relative'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${(d.count / maxDeptBookings) * 100}%`,
                          backgroundColor: '#D4A373',
                          borderRight: d.count > 0 ? '2px solid #2C1E1A' : 'none',
                          transition: 'width 0.5s ease-in-out'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chart 3 & Recent Activity Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px' }} className="grid-responsive">
            {/* Chart 3: Weekly Distribution (Vertical Bar Chart) */}
            <div className="retro-box">
              <h2 style={{ fontSize: '1.2rem', marginBottom: '24px', borderBottom: '2px dashed #2C1E1A', paddingBottom: '8px' }}>
                📅 ยอดการจองรายวันในสัปดาห์
              </h2>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                height: '180px',
                padding: '10px 10px 0 10px',
                borderBottom: '4px solid #2C1E1A',
                gap: '8px'
              }}>
                {dayNames.map((name, idx) => {
                  const count = weekdayCounts[idx];
                  const barHeight = (count / maxDayBookings) * 100;
                  
                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1,
                      height: '100%',
                      justifyContent: 'flex-end'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '4px' }}>
                        {count > 0 ? `${count}คิว` : '-'}
                      </div>
                      <div style={{
                        width: '100%',
                        maxHeight: '130px',
                        height: `${barHeight}%`,
                        backgroundColor: idx === 0 || idx === 6 ? '#D4A373' : '#E2725B',
                        border: '2px solid #2C1E1A',
                        borderBottom: 'none',
                        boxShadow: '2px -2px 0px rgba(0,0,0,0.05)',
                        minHeight: count > 0 ? '8px' : '0px'
                      }} />
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        marginTop: '8px',
                        whiteSpace: 'nowrap',
                        textAlign: 'center'
                      }}>
                        {name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity Log */}
            <div className="retro-box">
              <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '2px dashed #2C1E1A', paddingBottom: '8px' }}>
                ⚡ กิจกรรมการจองล่าสุด
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {bookings.length === 0 ? (
                  <div style={{ textAlign: 'center', fontStyle: 'italic', padding: '20px', color: '#8C827A' }}>
                    ไม่มีข้อมูลกิจกรรมการจอง
                  </div>
                ) : (
                  bookings.slice(-5).reverse().map((b) => {
                    const startD = new Date(b.startTime);
                    return (
                      <div key={b.id} style={{
                        padding: '8px 12px',
                        border: '2px solid #2C1E1A',
                        backgroundColor: '#FFFDF9',
                        fontSize: '0.8rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <strong>{b.userName}</strong> ({b.userDepartment}) จอง <strong>{b.room.name}</strong>
                          <div style={{ fontSize: '0.7rem', color: '#8C827A', marginTop: '2px' }}>
                            เริ่มใช้งาน: {startD.toLocaleDateString()} เวลา {String(startD.getHours()).padStart(2, '0')}:{String(startD.getMinutes()).padStart(2, '0')} น.
                          </div>
                        </div>
                        <span style={{
                          backgroundColor: '#E2725B',
                          color: '#fff',
                          padding: '2px 6px',
                          fontWeight: 'bold',
                          fontSize: '0.7rem',
                          border: '1.5px solid #2C1E1A'
                        }}>
                          จองแล้ว
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Row for Room Electricity Breakdown and Device Assumptions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginTop: '30px' }} className="grid-responsive">
            {/* Electricity Breakdown Table */}
            <div className="retro-box">
              <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '2px dashed #2C1E1A', paddingBottom: '8px' }}>
                ⚡ ตารางประเมินการใช้ไฟฟ้าและค่าไฟแยกตามห้อง
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #2C1E1A' }}>
                      <th style={{ padding: '8px 4px' }}>ห้องประชุม</th>
                      <th style={{ padding: '8px 4px' }}>ชั่วโมงการจอง</th>
                      <th style={{ padding: '8px 4px' }}>หน่วยไฟ (ยูนิต)</th>
                      <th style={{ padding: '8px 4px' }}>ค่าไฟโดยประมาณ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {electricityByRoom.map(r => (
                      <tr key={r.name} style={{ borderBottom: '1px solid #E2E2E2' }}>
                        <td style={{ padding: '8px 4px', fontWeight: 'bold' }}>📼 {r.name}</td>
                        <td style={{ padding: '8px 4px' }}>{r.hours.toFixed(2)} ชม.</td>
                        <td style={{ padding: '8px 4px' }}>{r.units.toFixed(2)} หน่วย</td>
                        <td style={{ padding: '8px 4px', fontWeight: 'bold', color: '#E2725B' }}>{r.cost.toFixed(2)} บาท</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Load Assumptions */}
            <div className="retro-box" style={{ backgroundColor: '#FAF5EF' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '2px dashed #2C1E1A', paddingBottom: '8px' }}>
                💡 สมมติฐานและสูตรการคำนวณโหลดไฟ
              </h2>
              <div style={{ fontSize: '0.8rem', lineHeight: '1.5' }}>
                <div style={{ margin: '0 0 10px 0' }}>
                  <strong>สูตรคำนวณตามเกณฑ์ PEA อ.เมืองปัตตานี:</strong>
                  <ul style={{ paddingLeft: '15px', margin: '4px 0' }}>
                    <li>พลังงานไฟฟ้า (ยูนิต) = (1,228 วัตต์ × ชั่วโมงการจอง) ÷ 1,000</li>
                    <li>ค่า Ft = ยูนิต × 0.0972 บาท</li>
                    <li>ค่าบริการรายเดือน = 64.05 บาท</li>
                    <li>ภาษีมูลค่าเพิ่ม (VAT) = 7%</li>
                  </ul>
                  <code style={{ display: 'block', backgroundColor: '#2C1E1A', color: 'white', padding: '6px', margin: '6px 0', fontFamily: 'monospace' }}>
                    ค่าไฟฟ้าฐาน (ประเภท 2.1 กิจการขนาดเล็ก):<br />
                    - 150 หน่วยแรก: 3.2484 บาท/หน่วย<br />
                    - 250 หน่วยถัดไป: 4.2234 บาท/หน่วย<br />
                    - ส่วนเกิน 400 หน่วย: 4.4214 บาท/หน่วย
                  </code>
                  <code style={{ display: 'block', backgroundColor: '#2C1E1A', color: 'white', padding: '6px', margin: '6px 0', fontFamily: 'monospace' }}>
                    รวมค่าไฟ = (ค่าไฟฟ้าฐาน + ค่า Ft + 64.05) × 1.07
                  </code>
                </div>
                <strong>เครื่องใช้ไฟฟ้าสมมติฐานประจำห้องประชุม:</strong>
                <ul style={{ paddingLeft: '20px', margin: '8px 0 0 0' }}>
                  <li>💡 ไฟส่องสว่าง/ไฟหลอก 4 ดวง (รวม 40 วัตต์)</li>
                  <li>❄️ เครื่องปรับอากาศ 12,500 BTU (1,000 วัตต์)</li>
                  <li>📺 โทรทัศน์ 40 นิ้ว (80 วัตต์)</li>
                  <li>💻 Laptop/Macbook 1-2 เครื่อง (เฉลี่ย 90 วัตต์)</li>
                  <li>📱 iPad/Tablet 1-2 เครื่อง (เฉลี่ย 18 วัตต์)</li>
                  <li style={{ fontWeight: 'bold', marginTop: '6px', color: '#E2725B' }}>
                    ⚡ กำลังไฟฟ้ารวมเฉลี่ย: 1,228 วัตต์ (1.228 kW ต่อชั่วโมง)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Room Management View */}
      {activeTab === 'rooms' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }} className="grid-responsive">
          {/* List Rooms */}
          <div className="retro-box">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', borderBottom: '2px dashed #2C1E1A', paddingBottom: '8px' }}>
              🏢 รายชื่อห้องประชุมทั้งหมด
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {rooms.map((room) => (
                <div
                  key={room.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    border: '2px solid #2C1E1A',
                    backgroundColor: room.status === 'ACTIVE' ? '#FFFDF9' : '#F5EBE0',
                  }}
                >
                  <div>
                    <strong>{room.name}</strong>
                    <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                      ความจุ: {room.capacity} คน | โควตาจองสูงสุด: {room.maxDurationMinutes / 60} ชม.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => handleToggleRoomStatus(room)}
                      className="retro-btn"
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        backgroundColor: room.status === 'ACTIVE' ? '#D4A373' : '#E2725B',
                      }}
                    >
                      {room.status === 'ACTIVE' ? '⏸️ ปิดปรับปรุง' : '▶️ เปิดใช้งาน'}
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      className="retro-btn retro-btn-danger"
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      🗑️ ลบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Room Form */}
          <div className="retro-box">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', borderBottom: '2px dashed #2C1E1A', paddingBottom: '8px' }}>
              [+] สร้างห้องประชุมใหม่
            </h2>
            <form onSubmit={handleCreateRoom}>
              <div className="retro-input-group">
                <label className="retro-input-label">ชื่อห้องประชุม</label>
                <input
                  type="text"
                  className="retro-input"
                  placeholder="เช่น ห้องสมุทรปราการ (ชั้น 3)"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="retro-input-group">
                  <label className="retro-input-label">ความจุคน</label>
                  <input
                    type="number"
                    className="retro-input"
                    min="1"
                    required
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(Number(e.target.value))}
                  />
                </div>
                <div className="retro-input-group">
                  <label className="retro-input-label">จองได้สูงสุด (นาที)</label>
                  <input
                    type="number"
                    className="retro-input"
                    min="15"
                    step="15"
                    required
                    value={newRoomMaxDuration}
                    onChange={(e) => setNewRoomMaxDuration(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="retro-input-group">
                <label className="retro-input-label">สถานะเริ่มต้น</label>
                <select
                  className="retro-select"
                  value={newRoomStatus}
                  onChange={(e) => setNewRoomStatus(e.target.value as 'ACTIVE' | 'MAINTENANCE')}
                >
                  <option value="ACTIVE">ACTIVE (พร้อมใช้งาน)</option>
                  <option value="MAINTENANCE">MAINTENANCE (ปรับปรุง)</option>
                </select>
              </div>

              <button type="submit" className="retro-btn" style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}>
                🛠️ บันทึกเพิ่มห้องใหม่
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Booking Calendar & Overrides View */}
      {activeTab === 'bookings' && (
        <div className="retro-box">
          <h2 style={{ fontSize: '1.3rem', marginBottom: '20px', borderBottom: '2px dashed #2C1E1A', paddingBottom: '8px' }}>
            🗓️ ปฏิทินรายการจองและแทรกแซง (คิวทั้งหมด)
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bookings.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', fontStyle: 'italic', color: '#8C827A' }}>
                ไม่มีรายการจองห้องประชุมค้างอยู่ในระบบ
              </div>
            ) : (
              bookings.map((booking) => {
                const startD = new Date(booking.startTime);
                const endD = new Date(booking.endTime);
                
                // คำนวณระยะเวลาจอง
                const durationMs = endD.getTime() - startD.getTime();
                const durationMin = Math.round(durationMs / (1000 * 60));
                const hours = Math.floor(durationMin / 60);
                const mins = durationMin % 60;
                const durationStr = hours > 0 
                  ? `${hours} ชั่วโมง${mins > 0 ? ` ${mins} นาที` : ''}`
                  : `${durationMin} นาที`;
                
                return (
                  <div
                    key={booking.id}
                    style={{
                      padding: '16px',
                      border: '2px solid #2C1E1A',
                      backgroundColor: '#FFFDF9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '20px'
                    }}
                    className="grid-responsive"
                  >
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flex: 1 }} className="grid-responsive">
                      {/* Room Tag */}
                      <div style={{
                        backgroundColor: '#E2725B',
                        color: 'white',
                        padding: '10px 16px',
                        fontWeight: 'bold',
                        border: '2px solid #2C1E1A',
                        minWidth: '150px',
                        textAlign: 'center',
                        textShadow: '1px 1px 0px #2C1E1A'
                      }}>
                        📼 {booking.room.name}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                          👤 ผู้จอง: {booking.userName} ({booking.userDepartment})
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#8C827A', marginTop: '4px' }}>
                          ⏰ <strong>เริ่ม:</strong> {startD.toLocaleDateString()} {String(startD.getHours()).padStart(2, '0')}:{String(startD.getMinutes()).padStart(2, '0')} น.
                          &nbsp;&nbsp;|&nbsp;&nbsp;
                          ⏰ <strong>สิ้นสุด:</strong> {endD.toLocaleDateString()} {String(endD.getHours()).padStart(2, '0')}:{String(endD.getMinutes()).padStart(2, '0')} น.
                          &nbsp;&nbsp;|&nbsp;&nbsp;
                          ⏳ <strong>ใช้เวลา:</strong> {durationStr}
                        </div>
                        {booking.notes && (
                          <div style={{
                            marginTop: '8px',
                            padding: '6px 10px',
                            backgroundColor: '#FAF5EF',
                            borderLeft: '4px solid #E2725B',
                            fontSize: '0.8rem',
                            wordBreak: 'break-all'
                          }}>
                            📝 <strong>โน้ต:</strong> {booking.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        className="retro-btn retro-btn-danger"
                        style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                      >
                        ยกเลิกคิวจอง
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. Global System Settings View */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px' }} className="grid-responsive">
          {/* Settings Form */}
          <div className="retro-box">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', borderBottom: '2px dashed #2C1E1A', paddingBottom: '8px' }}>
              🔧 การตั้งค่าระบบหลัก
            </h2>

            <form onSubmit={handleUpdateSettings}>
              <div className="retro-input-group">
                <label className="retro-input-label">ระยะจองเริ่มต้นทั่วไป (นาที)</label>
                <input
                  type="number"
                  className="retro-input"
                  required
                  value={globalMaxDuration}
                  onChange={(e) => setGlobalMaxDuration(Number(e.target.value))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="retro-input-group">
                  <label className="retro-input-label">เวลาเริ่มทำการ</label>
                  <input
                    type="text"
                    className="retro-input"
                    placeholder="08:00"
                    required
                    value={globalStartHour}
                    onChange={(e) => setGlobalStartHour(e.target.value)}
                  />
                </div>
                <div className="retro-input-group">
                  <label className="retro-input-label">เวลาหมดการจอง</label>
                  <input
                    type="text"
                    className="retro-input"
                    placeholder="20:00"
                    required
                    value={globalEndHour}
                    onChange={(e) => setGlobalEndHour(e.target.value)}
                  />
                </div>
              </div>

              <div className="retro-input-group" style={{ marginTop: '15px' }}>
                <label className="retro-input-label">Google Sheets Web App URL (บันทึกข้อมูลการจองลง Sheet)</label>
                <input
                  type="url"
                  className="retro-input"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={googleSheetUrl}
                  onChange={(e) => setGoogleSheetUrl(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: '#8C827A' }}>
                  * ปล่อยว่างไว้หากไม่ต้องการส่งข้อมูลไป Google Sheets
                </span>
              </div>

              <button type="submit" className="retro-btn" style={{ width: '100%', marginTop: '20px', justifyContent: 'center' }}>
                💾 บันทึกตั้งค่าระบบหลัก
              </button>
            </form>
          </div>

          {/* Setup Guide */}
          <div className="retro-box" style={{ backgroundColor: '#FAF5EF', borderStyle: 'dotted' }}>
            <h2 style={{ fontSize: '1.3rem', color: '#E2725B', marginBottom: '16px', borderBottom: '2px dashed #2C1E1A', paddingBottom: '8px' }}>
              📋 คู่มือเชื่อมต่อ Google Sheets
            </h2>
            
            <div style={{ fontSize: '0.85rem' }}>
              <ol style={{ paddingLeft: '20px', margin: '0 0 15px 0', lineHeight: '1.5' }}>
                <li>สร้างไฟล์ Google Sheets ใหม่</li>
                <li>ไปที่เมนู <strong>ส่วนขยาย (Extensions)</strong> &gt; <strong>Apps Script</strong></li>
                <li>ลบโค้ดเดิมออกทั้งหมด แล้วคัดลอกโค้ดด้านล่างนี้ไปวาง:</li>
              </ol>

              <textarea
                readOnly
                value={`function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Booking ID", 
        "ห้องประชุม", 
        "ชื่อผู้จอง", 
        "แผนก / ฝ่าย / ทีม", 
        "เวลาเริ่มต้น (UTC)", 
        "เวลาสิ้นสุด (UTC)", 
        "โน้ตเพิ่มเติม", 
        "วันที่ทำรายการ (UTC)"
      ]);
    }
    
    sheet.appendRow([
      data.id || "",
      data.roomName || "",
      data.userName || "",
      data.userDepartment || "",
      data.startTime || "",
      data.endTime || "",
      data.notes || "",
      data.createdAt || new Date().toISOString()
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}
                style={{
                  width: '100%',
                  height: '180px',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  padding: '10px',
                  backgroundColor: '#2C1E1A',
                  color: '#FFFDF9',
                  border: '2px solid #2C1E1A',
                  boxShadow: 'inset 2px 2px 0px rgba(0,0,0,0.2)',
                  resize: 'none',
                  marginBottom: '10px'
                }}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
              <p style={{ margin: '0 0 15px 0', fontSize: '0.75rem', color: '#E2725B', fontWeight: 'bold' }}>
                💡 คำแนะนำ: ดับเบิลคลิกในกล่องด้านบนเพื่อเลือกโค้ดทั้งหมดแล้วคัดลอกได้ทันที
              </p>

              <ol start={4} style={{ paddingLeft: '20px', margin: '0', lineHeight: '1.5' }}>
                <li>กด <strong>ทำให้ใช้งานได้ (Deploy)</strong> &gt; <strong>การทำให้ใช้งานได้ใหม่ (New deployment)</strong></li>
                <li>เลือกประเภทเป็น <strong>เว็บแอป (Web app)</strong></li>
                <li>ตั้งค่า <em>เรียกใช้ในฐานะ</em> เป็น <strong>ฉัน (Me)</strong> และ <em>ผู้มีสิทธิ์เข้าถึง</em> เป็น <strong>ทุกคน (Anyone)</strong></li>
                <li>กด <strong>ทำให้ใช้งานได้ (Deploy)</strong> อนุมัติสิทธิ์ให้เสร็จสิ้น แล้วคัดลอก <strong>URL เว็บแอป (Web app URL)</strong> มาใส่ในช่องด้านซ้าย</li>
              </ol>
            </div>
          </div>
        </div>
      )}

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
