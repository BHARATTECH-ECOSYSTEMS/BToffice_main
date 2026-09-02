import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const Users = () => {
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

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map((user) => (
          <li key={user._id}>{user.name} ({user.role})</li>
        ))}
      </ul>
    </div>
  );
};

export default Users;