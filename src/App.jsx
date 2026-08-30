import GameCanvas from './components/Canvas/GameCanvas.jsx'
import Player from './components/Canvas/Player.jsx'
import TrackManager from './components/Canvas/TrackManager.jsx'
import Obstacles from './components/Canvas/Obstacles.jsx'
import { useCollision } from './hooks/useCollision.js'

function CollisionSystem() {
  useCollision()
  return null
}

export default function App() {
  return (
    <div id="game-region" tabIndex={-1} className="h-full w-full outline-none">
      <GameCanvas>
        <TrackManager />
        <Obstacles />
        <Player />
        <CollisionSystem />
      </GameCanvas>
    </div>
  )
}
