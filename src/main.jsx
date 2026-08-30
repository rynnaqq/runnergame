import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { loadHighScore, useGameStore } from './store/useGameStore.js'

useGameStore.setState({ highScore: loadHighScore() })

createRoot(document.getElementById('root')).render(<App />)
