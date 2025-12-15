import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { getOctokit, getRecipeHistory, getRecipeImagesForVersion } from '@/lib/github'
import { saveRating, getRatings, RecipeRating } from '@/lib/ratings'

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
      // Get history with version numbers and ratings
      const history = await getRecipeHistory(octokit, username, recipeName, repoName)
      const ratings = await getRatings(octokit, username, recipeName, repoName)
      
      // Get images for each version and combine with ratings
      const historyWithRatings = await Promise.all(
        history.map(async (commit, index) => {
          const rating = ratings.find(r => r.sha === commit.sha)
          // Get images for this version
          const images = await getRecipeImagesForVersion(octokit, username, recipeName, commit.sha, repoName)
          
          return {
            ...commit,
            version: history.length - index, // Version numbers start from 1, newest is highest
            rating: rating?.rating || null,
            images: images.length > 0 ? images : null, // null if no images, so we can default to previous
          }
        })
      )
      
      // Fill in missing images with previous version's images
      let previousImages: string[] | null = null
      for (let i = historyWithRatings.length - 1; i >= 0; i--) {
        if (historyWithRatings[i].images) {
          previousImages = historyWithRatings[i].images
        } else if (previousImages) {
          historyWithRatings[i].images = previousImages
        }
      }
      
      return res.status(200).json({ history: historyWithRatings })
    }
    
    if (req.method === 'POST') {
      const { sha, rating, version } = req.body
      
      if (!sha || rating === undefined || !version) {
        return res.status(400).json({ error: 'SHA, rating, and version are required' })
      }
      
      if (rating < 1.0 || rating > 10.0) {
        return res.status(400).json({ error: 'Rating must be between 1.0 and 10.0' })
      }
      
      await saveRating(octokit, username, recipeName, sha, rating, version, repoName)
      return res.status(200).json({ success: true })
    }
    
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

