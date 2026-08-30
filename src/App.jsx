import GameCanvas from './components/Canvas/GameCanvas.jsx'
import Player from './components/Canvas/Player.jsx'

export default function App() {
  return (
    <div id="game-region" tabIndex={-1} className="h-full w-full outline-none">
      <GameCanvas>
        <mesh position={[0, 0, -20]}>
          <boxGeometry args={[8, 0.2, 60]} />
          <meshStandardMaterial color="#555" />
        </mesh>
        <Player />
      </GameCanvas>
    </div>
  )
}
