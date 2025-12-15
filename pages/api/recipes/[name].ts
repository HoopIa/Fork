import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { getOctokit, getRecipe, saveRecipe, Recipe } from '@/lib/github'
import { getLatestVersionImage } from '@/lib/version-images'

// Helper to recursively delete all files in a directory
async function deleteRecipeDirectory(
  octokit: ReturnType<typeof getOctokit>,
  username: string,
  recipeName: string,
  repoName: string
): Promise<void> {
  // Get all files in the recipe directory
  const { data } = await octokit.repos.getContent({
    owner: username,
    repo: repoName,
    path: recipeName,
  })

  if (Array.isArray(data)) {
    for (const item of data) {
      if (item.type === 'dir') {
        // Recursively get files in subdirectory
        const { data: subData } = await octokit.repos.getContent({
          owner: username,
          repo: repoName,
          path: item.path,
        })
        
        if (Array.isArray(subData)) {
          for (const subItem of subData) {
            if (subItem.type === 'file' && 'sha' in subItem) {
              await octokit.repos.deleteFile({
                owner: username,
                repo: repoName,
                path: subItem.path,
                message: `Delete ${recipeName}`,
                sha: subItem.sha,
              })
            }
          }
        }
      } else if (item.type === 'file' && 'sha' in item) {
        await octokit.repos.deleteFile({
          owner: username,
          repo: repoName,
          path: item.path,
          message: `Delete ${recipeName}`,
          sha: item.sha,
        })
      }
    }
  }
}

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
      
      // Get the latest version image as hero
      const heroImage = await getLatestVersionImage(octokit, username, recipeName, repoName)
      
      return res.status(200).json({ recipe, heroImage })
    }
    
    if (req.method === 'POST' || req.method === 'PUT') {
      const recipe: Recipe = req.body
      const message = req.body.commitMessage || `Update ${recipe.name} recipe`
      const oldName = req.body.oldName || recipeName
      await saveRecipe(octokit, username, recipe, repoName, message, oldName)
      return res.status(200).json({ success: true, newName: recipe.name })
    }
    
    if (req.method === 'DELETE') {
      await deleteRecipeDirectory(octokit, username, recipeName, repoName)
      return res.status(200).json({ success: true })
    }
    
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

