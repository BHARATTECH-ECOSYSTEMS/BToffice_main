import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import Navbar from '../components/Navbar';
import axios from 'axios';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/tasks/my-tasks');
        const tasks = res.data;
        const total = tasks.length;
        const pending = tasks.filter(task => task.status === 'pending').length;
        const inProgress = tasks.filter(task => task.status === 'in-progress').length;
        const completed = tasks.filter(task => task.status === 'completed').length;
        
        setStats({ totalTasks: total, pendingTasks: pending, inProgressTasks: inProgress, completedTasks: completed });
      } catch (err) {
        console.error(err);
      }
    };
    
    fetchStats();
  }, []);

  return (
    <div>
      <Navbar />
      <div className="container mt-4">
        <h2>Welcome, {user?.name}</h2>
        <div className="row mt-4">
          <div className="col-md-3">
            <div className="card text-white bg-primary mb-3">
              <div className="card-header">Total Tasks</div>
              <div className="card-body">
                <h5 className="card-title">{stats.totalTasks}</h5>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-warning mb-3">
              <div className="card-header">Pending Tasks</div>
              <div className="card-body">
                <h5 className="card-title">{stats.pendingTasks}</h5>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-info mb-3">
              <div className="card-header">In Progress</div>
              <div className="card-body">
                <h5 className="card-title">{stats.inProgressTasks}</h5>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-success mb-3">
              <div className="card-header">Completed</div>
              <div className="card-body">
                <h5 className="card-title">{stats.completedTasks}</h5>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Link to="/my-tasks" className="btn btn-primary me-2">View My Tasks</Link>
          {user && (user.role === 'admin' || user.role === 'manager') && (
            <Link to="/assigned-tasks" className="btn btn-secondary">View Assigned Tasks</Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;