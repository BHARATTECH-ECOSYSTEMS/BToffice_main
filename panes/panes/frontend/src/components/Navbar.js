import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  
  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="navbar-brand">Attendance System</Link>
        <div className="navbar-links">
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <button onClick={logout} className="btn-logout">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;