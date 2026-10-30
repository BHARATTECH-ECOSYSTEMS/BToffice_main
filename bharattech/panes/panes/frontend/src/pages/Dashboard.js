import { useState } from 'react';
import CheckInOutButton from '../components/CheckInOutButton';
import AttendanceList from '../components/AttendanceList';

const Dashboard = () => {
  const [refresh, setRefresh] = useState(false);
  
  const handleAttendanceChange = () => {
    setRefresh(!refresh);
  };
  
  return (
    <div className="dashboard">
      <h2>Attendance Dashboard</h2>
      <div className="check-in-out-section">
        <CheckInOutButton onAttendanceChange={handleAttendanceChange} />
      </div>
      <AttendanceList refresh={refresh} />
    </div>
  );
};

export default Dashboard;