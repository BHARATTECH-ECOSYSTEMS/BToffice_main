import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const CheckInOutButton = ({ onAttendanceChange }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const checkStatus = async () => {
    try {
      const res = await axios.get('/attendance/my-attendance');
      const lastAttendance = res.data.data.attendance[0];
      setIsCheckedIn(lastAttendance?.status === 'checked-in');
    } catch (err) {
      console.error('Failed to check status', err);
    }
  };

  const handleCheckInOut = async () => {
    setIsLoading(true);
    try {
      if (isCheckedIn) {
        await axios.post('/attendance/checkout');
      } else {
        await axios.post('/attendance/checkin');
      }
      setIsCheckedIn(!isCheckedIn);
      if (onAttendanceChange) onAttendanceChange();
    } catch (err) {
      console.error('Check in/out failed', err);
      alert(err.response?.data?.message || 'Failed to check in/out');
    } finally {
      setIsLoading(false);
    }
  };

  // Check initial status when component mounts
  useState(() => {
    checkStatus();
  }, []);

  return (
    <button
      onClick={handleCheckInOut}
      disabled={isLoading}
      className={`btn ${isCheckedIn ? 'btn-checkout' : 'btn-checkin'}`}
    >
      {isLoading ? 'Processing...' : isCheckedIn ? 'Check Out' : 'Check In'}
    </button>
  );
};

export default CheckInOutButton;