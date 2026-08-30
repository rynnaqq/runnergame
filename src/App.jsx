import GameCanvas from './components/Canvas/GameCanvas.jsx'
import Player from './components/Canvas/Player.jsx'
import TrackManager from './components/Canvas/TrackManager.jsx'
import Obstacles from './components/Canvas/Obstacles.jsx'
import SceneryManager from './components/Canvas/SceneryManager.jsx'
import ParticleEffects from './components/Canvas/ParticleEffects.jsx'
import GameOverModal from './components/UI/GameOverModal.jsx'
import HUD from './components/UI/HUD.jsx'
import { useCollision } from './hooks/useCollision.js'

function CollisionSystem() {
  useCollision()
  return null
}

export default function App() {
  return (
    <div id="game-region" tabIndex={-1} className="relative h-full w-full outline-none">
      <GameCanvas>
        <TrackManager />
        <SceneryManager />
        <Obstacles />
        <Player />
        <ParticleEffects />
        <CollisionSystem />
      </GameCanvas>
      <HUD />
      <GameOverModal />
    </div>
  )
}
