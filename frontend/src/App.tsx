import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Calculator from './pages/Calculator'
import Progress from './pages/Progress'
import Recommendations from './pages/Recommendations'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/calculator" replace />} />
        <Route path="calculator" element={<Calculator />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="progress" element={<Progress />} />
      </Route>
      <Route path="*" element={<Navigate to="/calculator" replace />} />
    </Routes>
  )
}
