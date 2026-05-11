import Navbar from './Navbar'

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#0B0D0E' }}>
      <Navbar />
      <main className="flex-1 ml-56 px-8 py-8" style={{ background: '#0B0D0E' }}>
        {children}
      </main>
    </div>
  )
}
