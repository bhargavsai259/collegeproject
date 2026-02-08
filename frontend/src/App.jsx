import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { ThreeDViewRoute } from './routes'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <h1>Roomify Demo</h1>
        <nav style={{ marginBottom: 16 }}>
          <Link to="/3dview" style={{ marginRight: 12 }}>3D View</Link>
          <Link to="/">Home</Link>
        </nav>  
        <Routes>
          <Route path="/3dview" element={<ThreeDViewRoute />} />
          <Route path="/" element={<div>Welcome to Roomify!</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
