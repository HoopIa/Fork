import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { getOctokit, getRecipe, saveRecipe, Recipe } from '@/lib/github'

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
      const recipe = await getRecipe(octokit, username, recipeName, repoName)
      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' })
      }
      return res.status(200).json({ recipe })
    }
    
    if (req.method === 'POST' || req.method === 'PUT') {
      const recipe: Recipe = req.body
      const message = req.body.commitMessage || `Update ${recipe.name} recipe`
      await saveRecipe(octokit, username, recipe, repoName, message)
      return res.status(200).json({ success: true })
    }
    
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

