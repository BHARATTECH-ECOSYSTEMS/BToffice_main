import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import Navbar from '../components/Navbar';
import axios from 'axios';

const AssignedTasks = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, usersRes] = await Promise.all([
          axios.get('http://localhost:5000/api/tasks/assigned-by-me'),
          axios.get('http://localhost:5000/api/auth/users')
        ]);
        setTasks(tasksRes.data);
        setUsers(usersRes.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/tasks', newTask);
      setTasks([...tasks, res.data]);
      setNewTask({ title: '', description: '', assignedTo: '' });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <Navbar />
      <div className="container mt-4">
        <h2>Assigned Tasks</h2>
        <div className="card mb-4">
          <div className="card-header">
            <h5>Create New Task</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="title" className="form-label">Title</label>
                <input
                  type="text"
                  className="form-control"
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="description" className="form-label">Description</label>
                <textarea
                  className="form-control"
                  id="description"
                  rows="3"
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  required
                ></textarea>
              </div>
              <div className="mb-3">
                <label htmlFor="assignedTo" className="form-label">Assign To</label>
                <select
                  className="form-select"
                  id="assignedTo"
                  value={newTask.assignedTo}
                  onChange={(e) => setNewTask({...newTask, assignedTo: e.target.value})}
                  required
                >
                  <option value="">Select User</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>{user.name} ({user.role})</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary">Assign Task</button>
            </form>
          </div>
        </div>
        <div className="row">
          {tasks.map(task => (
            <div key={task._id} className="col-md-4 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5>{task.title}</h5>
                </div>
                <div className="card-body">
                  <p className="card-text">{task.description}</p>
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

export default AssignedTasks;