import Head from 'next/head'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { ArrowLeft, LogOut } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  showBack?: boolean
  backHref?: string
  actions?: React.ReactNode
}

export default function Layout({
  children,
  title = 'Fork',
  description = 'Track your cooking recipes as they evolve over time',
  showBack = false,
  backHref = '/',
  actions,
}: LayoutProps) {
  const { data: session } = useSession()

  return (
    <>
      <Head>
        <title>{title === 'Fork' ? title : `${title} | Fork`}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta name="theme-color" content="#111827" />
      </Head>

      <div className="min-h-screen bg-white">
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm bg-white/95">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-4">
                {showBack && (
                  <Link 
                    href={backHref} 
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                )}
                <Link href="/" className="text-2xl font-bold text-gray-900 tracking-tight hover:text-gray-700 transition-colors">
                  Fork
                </Link>
              </div>
              
              <div className="flex items-center gap-4">
                {actions}
                {session && (
                  <>
                    <span className="text-sm text-gray-600 font-medium hidden sm:block">
                      {session.user?.name || session.user?.email}
                    </span>
                    <button
                      onClick={() => signOut()}
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="hidden sm:inline">Sign out</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </>
  )
}

