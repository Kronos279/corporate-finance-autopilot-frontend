import { useNavigate } from 'react-router-dom';
import './Navbar.css';

export default function Navbar({ showBack = false, onThemeToggle, theme }) {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {showBack && (
          <button className="back-btn" onClick={() => navigate('/')}>
            ← Back
          </button>
        )}
        <div className="logo">
          <div className="logo-icon">CF</div>
          <span className="logo-text">Corporate Finance Autopilot - Built by Ashutosh</span>
        </div>
      </div>
      <div className="navbar-right">
        <button className="icon-btn" onClick={onThemeToggle} title="Toggle theme">
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
      </div>
    </nav>
  );
}
