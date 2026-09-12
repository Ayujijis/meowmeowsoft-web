import { NavLink, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="shell">
      <header className="site-header">
        <NavLink to="/" end className="wordmark">
          Meow Meow Soft
        </NavLink>
        <nav className="nav" aria-label="Primary">
          <NavLink to="/" end>
            Work
          </NavLink>
          <NavLink to="/models">3D</NavLink>
          <NavLink to="/about">About</NavLink>
        </nav>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>© {new Date().getFullYear()} Meow Meow Soft · Matías</p>
        <p>
          <a href="mailto:hello@meowmeowsoft.com">hello@meowmeowsoft.com</a>
        </p>
      </footer>
    </div>
  )
}
