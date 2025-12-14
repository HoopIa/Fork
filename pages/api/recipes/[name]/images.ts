import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { getOctokit } from '@/lib/github'

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
    if (req.method === 'POST') {
      const { image, filename } = req.body
      
      if (!image || !filename) {
        return res.status(400).json({ error: 'Image and filename are required' })
      }
      
      // Remove data URL prefix if present
      const base64Data = image.includes(',') ? image.split(',')[1] : image
      
      // Ensure images directory exists by trying to create it
      const imagePath = `${recipeName}/images/${filename}`
      
      try {
        await octokit.repos.getContent({
          owner: username,
          repo: repoName,
          path: `${recipeName}/images`,
        })
      } catch {
        // Images directory doesn't exist, create a placeholder file to create the directory
        // GitHub will create the directory structure automatically
      }
      
      // Upload the image
      await octokit.repos.createOrUpdateFileContents({
        owner: username,
        repo: repoName,
        path: imagePath,
        message: `Add image to ${recipeName}`,
        content: base64Data,
      })
      
      // Get the download URL
      const { data } = await octokit.repos.getContent({
        owner: username,
        repo: repoName,
        path: imagePath,
      })
      
      const downloadUrl = 'download_url' in data ? data.download_url : null
      
      return res.status(200).json({ 
        success: true, 
        url: downloadUrl,
        path: imagePath 
      })
    }
    
    if (req.method === 'DELETE') {
      const { filename } = req.body
      
      if (!filename) {
        return res.status(400).json({ error: 'Filename is required' })
      }
      
      const imagePath = `${recipeName}/images/${filename}`
      
      // Get current SHA
      const { data } = await octokit.repos.getContent({
        owner: username,
        repo: repoName,
        path: imagePath,
      })
      
      if ('sha' in data) {
        await octokit.repos.deleteFile({
          owner: username,
          repo: repoName,
          path: imagePath,
          message: `Remove image from ${recipeName}`,
          sha: data.sha,
        })
      }
      
      return res.status(200).json({ success: true })
    }
    
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

