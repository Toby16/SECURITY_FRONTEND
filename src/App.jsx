import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import './App.css'
import Auth        from './pages/Auth.jsx'
import SSOCallback from './pages/SSOCallback.jsx'
import Verify      from './pages/Verify.jsx'
import Dashboard   from './pages/Dashboard.jsx'
import IPLookup    from './pages/scanoracle/IPLookup.jsx'
import IPLookupCategory from './pages/scanoracle/IPLookupCategory.jsx'
import Bolt from './pages/bolt/Bolt.jsx'
import BoltInfo from './pages/bolt/BoltInfo.jsx'
import MechFind from './pages/mechfind/MechFind.jsx'
import Petro from './pages/petro/Petro.jsx'
import MedicNear from './pages/medicnear/MedicNear.jsx'
import NotFound    from './pages/NotFound.jsx'
import PrivateRoute from './components/PrivateRoute.jsx'
function App() {
  useEffect(() => { document.title = 'Ghostroute Security' }, [])
  return (
    <div className="app">
      <main className="app-main">
        <Routes>
          {/* Public */}
          <Route path="/auth"          element={<Auth />} />
          <Route path="/auth/callback" element={<SSOCallback />} />
          <Route path="/verify"        element={<Verify />} />
          {/* Protected */}
          <Route path="/" element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          } />
	  <Route path="/dashboard" element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          } />
          <Route path="/scanoracle/iplookup" element={
            <PrivateRoute><IPLookup /></PrivateRoute>
          } />
	  <Route path="/scanoracle/iplookup/category" element={
            <PrivateRoute><IPLookupCategory /></PrivateRoute>
          } />
	  <Route path="/bolt" element={
	    <PrivateRoute><Bolt /></PrivateRoute>
	  } />
	  <Route path="/bolt/info" element={
	    <PrivateRoute><BoltInfo /></PrivateRoute>
	  } />
	  <Route path="/mechfind" element={
	    <PrivateRoute><MechFind /></PrivateRoute>
	  } />
	  <Route path="/petro" element={
	    <PrivateRoute><Petro /></PrivateRoute>
	  } />
	  <Route path="/medicnear" element={
	    <PrivateRoute><MedicNear /></PrivateRoute>
	  } />
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}
export default App
