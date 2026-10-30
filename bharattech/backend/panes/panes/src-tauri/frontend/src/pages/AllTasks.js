import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import axios from 'axios';

const AllTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/tasks');
        setTasks(res.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    
    fetchTasks();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <Navbar />
      <div className="container mt-4">
        <h2>All Tasks</h2>
        <div className="row">
          {tasks.map(task => (
            <div key={task._id} className="col-md-4 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5>{task.title}</h5>
                </div>
                <div className="card-body">
                  <p className="card-text">{task.description}</p>
                  <p className="card-text"><small className="text-muted">Assigned by: {task.assignedBy.name}</small></p>
                  <p className="card-text"><small className="text-muted">Assigned to: {task.assignedTo.name}</small></p>
                  <span className={`badge bg-${task.status === 'pending' ? 'warning' : task.status === 'in-progress' ? 'info' : 'success'}`}>
                    {task.status.replace('-', ' ')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AllTasks;