import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { getOctokit } from '@/lib/github'
import { saveRecipeCategory, getRecipeCategory } from '@/lib/categories'

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
      const category = await getRecipeCategory(octokit, username, recipeName, repoName)
      return res.status(200).json({ category })
    }
    
    if (req.method === 'PUT' || req.method === 'POST') {
      const { category } = req.body
      
      if (!category || typeof category !== 'string') {
        return res.status(400).json({ error: 'Category is required' })
      }
      
      await saveRecipeCategory(octokit, username, recipeName, category, repoName)
      return res.status(200).json({ success: true, category })
    }
    
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

