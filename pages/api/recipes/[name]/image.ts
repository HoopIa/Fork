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
  const version = req.query.version as string
  
  if (!version) {
    return res.status(400).json({ error: 'Version parameter required' })
  }
  
  try {
    // Try to find image in version-images folder
    const { data: folderData } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: `${recipeName}/version-images`,
    })
    
    if (Array.isArray(folderData)) {
      // Find image for this version
      const imageFile = folderData.find((file: any) => 
        file.type === 'file' && file.name.startsWith(`v${version}-`)
      )
      
      if (imageFile) {
        // Fetch the actual image content
        const { data: fileData } = await octokit.repos.getContent({
          owner: username,
          repo: repoName,
          path: `${recipeName}/version-images/${imageFile.name}`,
        })
        
        if ('content' in fileData && fileData.content) {
          // Determine content type from filename
          const ext = imageFile.name.split('.').pop()?.toLowerCase()
          const contentType = ext === 'png' ? 'image/png' 
            : ext === 'gif' ? 'image/gif'
            : ext === 'webp' ? 'image/webp'
            : 'image/jpeg'
          
          // Send as base64 image
          const buffer = Buffer.from(fileData.content, 'base64')
          res.setHeader('Content-Type', contentType)
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
          return res.send(buffer)
        }
      }
    }
    
    return res.status(404).json({ error: 'Image not found' })
  } catch (error: any) {
    console.error('Error fetching image:', error.message)
    return res.status(404).json({ error: 'Image not found' })
  }
}

