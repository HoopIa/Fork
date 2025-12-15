import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { getOctokit } from '@/lib/github'
import { uploadVersionImage, getVersionImages } from '@/lib/version-images'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
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
      const images = await getVersionImages(octokit, username, recipeName, repoName)
      return res.status(200).json({ images })
    }
    
    if (req.method === 'POST') {
      const { sha, version, image, filename } = req.body
      
      if (!sha || !version || !image || !filename) {
        return res.status(400).json({ error: 'sha, version, image, and filename are required' })
      }
      
      const result = await uploadVersionImage(
        octokit,
        username,
        recipeName,
        sha,
        version,
        image,
        filename,
        repoName
      )
      
      return res.status(200).json({ 
        success: true, 
        ...result 
      })
    }
    
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

