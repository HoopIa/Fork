import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { getOctokit, getRecipeHistory, getRecipeVersion } from '@/lib/github'
import { getRatings } from '@/lib/ratings'
import { getVersionImages } from '@/lib/version-images'

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
        // Get history with version numbers
        const history = await getRecipeHistory(octokit, username, recipeName, repoName)
        const ratings = await getRatings(octokit, username, recipeName, repoName)
        const versionImages = await getVersionImages(octokit, username, recipeName, repoName)
        
        // Add version numbers, ratings, and version-specific images
        const historyWithVersions = history.map((commit, index) => {
          const version = history.length - index
          const rating = ratings.find(r => r.sha === commit.sha)
          const versionImage = versionImages.find(img => img.sha === commit.sha)
          
          return {
            ...commit,
            version,
            rating: rating?.rating || null,
            image: versionImage?.imageUrl || null, // Single version-specific image
          }
        })
        
        return res.status(200).json({ history: historyWithVersions })
      }
    }
    
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

