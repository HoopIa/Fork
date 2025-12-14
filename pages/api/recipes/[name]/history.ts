import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { getOctokit, getRecipeHistory, getRecipeVersion } from '@/lib/github'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.accessToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const octokit = getOctokit(session.accessToken)
  const username = session.githubUsername || session.user?.name || 'user'
  const repoName = process.env.GITHUB_REPO_NAME || 'recipes'
  const recipeName = req.query.name as string
  
  try {
    if (req.method === 'GET') {
      const sha = req.query.sha as string | undefined
      
      if (sha) {
        // Get specific version
        const recipe = await getRecipeVersion(octokit, username, recipeName, sha, repoName)
        if (!recipe) {
          return res.status(404).json({ error: 'Version not found' })
        }
        return res.status(200).json({ recipe })
      } else {
        // Get history
        const history = await getRecipeHistory(octokit, username, recipeName, repoName)
        return res.status(200).json({ history })
      }
    }
    
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

