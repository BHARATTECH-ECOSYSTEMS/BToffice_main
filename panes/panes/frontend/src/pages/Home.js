import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();
  
  return (
    <div className="home">
      <h1>Attendance System</h1>
      <p>Track your work hours with our simple check-in/check-out system.</p>
      
      {user ? (
        <Link to="/dashboard" className="btn">Go to Dashboard</Link>
      ) : (
        <div className="auth-buttons">
          <Link to="/login" className="btn">Login</Link>
          <Link to="/register" className="btn">Register</Link>
        </div>
      )}
    </div>
  );
};

export default Home;