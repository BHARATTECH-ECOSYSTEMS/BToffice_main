import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const Attendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [users, setUsers] = useState([]);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await axios.get('/api/users', {
        headers: { 'x-auth-token': token },
      });
      setUsers(res.data);
    };
    fetchUsers();
  }, [token]);

  const handleMarkAttendance = async (userId, status) => {
    const res = await axios.post(
      '/api/attendance',
      { userId, date: new Date(), status },
      { headers: { 'x-auth-token': token } }
    );
    setAttendance([...attendance, res.data]);
  };

  return (
    <div>
      <h1>Attendance</h1>
      <ul>
        {users.map((user) => (
          <li key={user._id}>
            {user.name}
            <button onClick={() => handleMarkAttendance(user._id, 'present')}>Present</button>
            <button onClick={() => handleMarkAttendance(user._id, 'absent')}>Absent</button>
            <button onClick={() => handleMarkAttendance(user._id, 'late')}>Late</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Attendance;