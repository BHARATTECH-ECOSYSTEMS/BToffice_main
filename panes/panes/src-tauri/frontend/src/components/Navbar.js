import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">
        <Link className="navbar-brand" to="/">Task Manager</Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/">Dashboard</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/my-tasks">My Tasks</Link>
            </li>
            {user && (user.role === 'admin' || user.role === 'manager') && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/assigned-tasks">Assigned Tasks</Link>
                </li>
                {user.role === 'admin' && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/all-tasks">All Tasks</Link>
                  </li>
                )}
              </>
            )}
          </ul>
          <ul className="navbar-nav">
            {user ? (
              <li className="nav-item">
                <button className="btn btn-link nav-link" onClick={logout}>Logout</button>
              </li>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/login">Login</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/register">Register</Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;