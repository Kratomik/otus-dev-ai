import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Calculator from './pages/Calculator'
import AuthLayout from './components/AuthLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Progress from './pages/Progress'
import Recommendations from './pages/Recommendations'

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        }
      />
      <Route
        path="/register"
        element={
          <AuthLayout>
            <Register />
          </AuthLayout>
        }
      />
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
