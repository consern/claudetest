import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ReviewWorkspacePage } from './pages/ReviewWorkspacePage';
import { SettingsPage } from './pages/SettingsPage';
import { TaskWorkspacePage } from './pages/TaskWorkspacePage';

function linkClass(input: { isActive: boolean }): string {
  return input.isActive ? 'active' : '';
}

export default function App() {
  return (
    <div className="shell shell-app">
      <aside className="app-sidebar">
        <div className="brand-mark">AI</div>
        <nav className="app-nav">
          <NavLink className={linkClass} to="/tasks">
            Code
          </NavLink>
          <NavLink className={linkClass} to="/home">
            Sessions
          </NavLink>
          <NavLink className={linkClass} to="/reviews">
            Reviews
          </NavLink>
          <NavLink className={linkClass} to="/settings">
            Settings
          </NavLink>
        </nav>
      </aside>
      <main className="app-content">
        <Routes>
          <Route path="/home" element={<HomePage />} />
          <Route path="/tasks" element={<TaskWorkspacePage />} />
          <Route path="/reviews" element={<ReviewWorkspacePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>
    </div>
  );
}
