import { useState, useEffect } from 'react';
import axios from 'axios';

const AttendanceList = ({ refresh }) => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await axios.get('/attendance/my-attendance');
        setAttendance(res.data.data.attendance);
      } catch (err) {
        console.error('Failed to fetch attendance', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAttendance();
  }, [refresh]);

  if (loading) return <div>Loading attendance records...</div>;
  
  return (
    <div className="attendance-list">
      <h3>Your Attendance Records</h3>
      {attendance.length === 0 ? (
        <p>No attendance records found</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map(record => (
              <tr key={record._id}>
                <td>{new Date(record.checkIn).toLocaleDateString()}</td>
                <td>{new Date(record.checkIn).toLocaleTimeString()}</td>
                <td>
                  {record.checkOut
                    ? new Date(record.checkOut).toLocaleTimeString()
                    : 'Not checked out'}
                </td>
                <td className={`status-${record.status}`}>{record.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AttendanceList;