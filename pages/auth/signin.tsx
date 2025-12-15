import { signIn, getSession } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { BookOpen, AlertCircle } from 'lucide-react'

export default function SignIn() {
  const router = useRouter()
  const hasInitiatedSignIn = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initiateSignIn = async () => {
      // Check if already signed in
      const session = await getSession()
      if (session) {
        router.push('/')
        return
      }

      // Check for errors in query params
      const { error: queryError } = router.query
      if (queryError) {
        setError(`Sign-in failed: ${queryError}`)
        return
      }

      // Only initiate sign-in once
      if (!hasInitiatedSignIn.current) {
        hasInitiatedSignIn.current = true
        try {
          await signIn('github', { callbackUrl: '/', redirect: true })
        } catch (err) {
          setError('Failed to initiate sign-in. Please try again.')
          hasInitiatedSignIn.current = false
        }
      }
    }

    // Wait for router to be ready before checking query params
    if (router.isReady) {
      initiateSignIn()
    }
  }, [router.isReady, router.query, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Sign-in Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => {
                setError(null)
                hasInitiatedSignIn.current = false
                router.push('/')
              }}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="text-center">
        <BookOpen className="w-16 h-16 mx-auto text-orange-500 mb-4 animate-pulse" />
        <p className="text-lg text-gray-600">Redirecting to GitHub...</p>
      </div>
    </div>
  )
}

