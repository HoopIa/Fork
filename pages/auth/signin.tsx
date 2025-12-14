import { signIn } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { BookOpen } from 'lucide-react'

export default function SignIn() {
  const router = useRouter()

  useEffect(() => {
    // Auto-redirect to GitHub sign in
    signIn('github', { callbackUrl: '/' })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="text-center">
        <BookOpen className="w-16 h-16 mx-auto text-orange-500 mb-4 animate-pulse" />
        <p className="text-lg text-gray-600">Redirecting to GitHub...</p>
      </div>
    </div>
  )
}

