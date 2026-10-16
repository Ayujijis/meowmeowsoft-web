import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import Project from './pages/Project.jsx'
import NotFound from './pages/NotFound.jsx'
import Board from './pages/Board.jsx'

const Models = lazy(() => import('./pages/Models.jsx'))
const DbmakerLab = lazy(() => import('./pages/DbmakerLab.jsx'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/board" element={<Board />} />
          <Route
            path="/models"
            element={
              <Suspense fallback={<p className="lede">Loading models…</p>}>
                <Models />
              </Suspense>
            }
          />
          <Route
            path="/dbmaker-lab"
            element={
              <Suspense fallback={<p className="lede">Loading DBmaker lab…</p>}>
                <DbmakerLab />
              </Suspense>
            }
          />
          <Route path="/projects/:slug" element={<Project />} />
          <Route path="/work" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
