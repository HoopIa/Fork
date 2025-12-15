import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { getOctokit } from '@/lib/github'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.accessToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const octokit = getOctokit(session.accessToken)
  const username = session.githubUsername || session.user?.name || 'user'
  const repoName = process.env.GITHUB_REPO_NAME || 'recipes'
  const recipeName = req.query.name as string
  
  const debug: any = {
    recipeName,
    username,
    repoName,
    folders: {},
    errors: [],
  }
  
  // Check recipe folder structure
  try {
    const { data: recipeFolder } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: recipeName,
    })
    
    if (Array.isArray(recipeFolder)) {
      debug.folders.recipe = recipeFolder.map((f: any) => ({
        name: f.name,
        type: f.type,
        path: f.path,
      }))
    }
  } catch (err: any) {
    debug.errors.push(`Recipe folder error: ${err.message}`)
  }
  
  // Check version-images folder
  try {
    const { data: versionImages } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: `${recipeName}/version-images`,
    })
    
    if (Array.isArray(versionImages)) {
      debug.folders.versionImages = versionImages.map((f: any) => ({
        name: f.name,
        type: f.type,
        size: f.size,
        download_url: f.download_url,
      }))
    }
  } catch (err: any) {
    debug.errors.push(`Version-images folder error: ${err.message}`)
  }
  
  // Check .version-images.json metadata
  try {
    const { data: metadata } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: `${recipeName}/.version-images.json`,
    })
    
    if ('content' in metadata && metadata.content) {
      const content = Buffer.from(metadata.content, 'base64').toString('utf-8')
      debug.metadata = JSON.parse(content)
    }
  } catch (err: any) {
    debug.errors.push(`Metadata file error: ${err.message}`)
  }
  
  // Check legacy images folder
  try {
    const { data: imagesFolder } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: `${recipeName}/images`,
    })
    
    if (Array.isArray(imagesFolder)) {
      debug.folders.images = imagesFolder.map((f: any) => ({
        name: f.name,
        type: f.type,
        size: f.size,
        download_url: f.download_url,
      }))
    }
  } catch (err: any) {
    debug.errors.push(`Images folder error: ${err.message}`)
  }
  
  return res.status(200).json(debug)
}

