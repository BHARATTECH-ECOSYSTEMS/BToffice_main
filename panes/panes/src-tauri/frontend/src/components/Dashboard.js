import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [punchStatus, setPunchStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/punch/history', {
          headers: { 'x-auth-token': localStorage.getItem('token') }
        });
        setHistory(res.data);
        const lastPunch = res.data[0];
        if (lastPunch && !lastPunch.punchOut) {
          setPunchStatus('in');
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchHistory();
  }, []);

  const handlePunchIn = async () => {
    try {
      await axios.post('http://localhost:5000/api/punch/in', {}, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setPunchStatus('in');
      window.location.reload();
    } catch (err) {
      alert(err.response.data.error);
    }
  };

  const handlePunchOut = async () => {
    try {
      await axios.post('http://localhost:5000/api/punch/out', {}, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setPunchStatus('out');
      window.location.reload();
    } catch (err) {
      alert(err.response.data.error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div>
      <h2>Dashboard</h2>
      <button onClick={handleLogout}>Logout</button>
      <div>
        {punchStatus === 'in' ? (
          <button onClick={handlePunchOut}>Punch Out</button>
        ) : (
          <button onClick={handlePunchIn}>Punch In</button>
        )}
      </div>
      <div>
        <h3>Punch History</h3>
        <ul>
          {history.map((punch) => (
            <li key={punch._id}>
              {new Date(punch.punchIn).toLocaleString()} - {punch.punchOut ? new Date(punch.punchOut).toLocaleString() : 'Not punched out'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;