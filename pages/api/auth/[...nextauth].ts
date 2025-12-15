import NextAuth, { NextAuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'

// Validate required environment variables
if (!process.env.GITHUB_CLIENT_ID) {
  console.error('Missing GITHUB_CLIENT_ID environment variable')
}
if (!process.env.GITHUB_CLIENT_SECRET) {
  console.error('Missing GITHUB_CLIENT_SECRET environment variable')
}
if (!process.env.NEXTAUTH_SECRET) {
  console.error('Missing NEXTAUTH_SECRET environment variable')
}

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'repo user:email read:user',
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token
      }
      if (profile) {
        token.githubUsername = (profile as any).login
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.githubUsername = token.githubUsername as string
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  debug: process.env.NODE_ENV === 'development',
}

export default NextAuth(authOptions)

