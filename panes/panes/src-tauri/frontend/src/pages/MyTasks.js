import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import Navbar from '../components/Navbar';
import axios from 'axios';

const MyTasks = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/tasks/my-tasks');
        setTasks(res.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    
    fetchTasks();
  }, []);

  const updateStatus = async (taskId, status) => {
    try {
      await axios.patch(`http://localhost:5000/api/tasks/${taskId}/status`, { status });
      setTasks(tasks.map(task => 
        task._id === taskId ? { ...task, status } : task
      ));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <Navbar />
      <div className="container mt-4">
        <h2>My Tasks</h2>
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
                  <div className="mb-3">
                    <span className={`badge bg-${task.status === 'pending' ? 'warning' : task.status === 'in-progress' ? 'info' : 'success'}`}>
                      {task.status.replace('-', ' ')}
                    </span>
                  </div>
                  {user.role !== 'admin' && (
                    <div className="btn-group" role="group">
                      <button
                        type="button"
                        className={`btn btn-sm ${task.status === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                        onClick={() => updateStatus(task._id, 'pending')}
                      >
                        Pending
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${task.status === 'in-progress' ? 'btn-info' : 'btn-outline-info'}`}
                        onClick={() => updateStatus(task._id, 'in-progress')}
                      >
                        In Progress
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${task.status === 'completed' ? 'btn-success' : 'btn-outline-success'}`}
                        onClick={() => updateStatus(task._id, 'completed')}
                      >
                        Completed
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyTasks;