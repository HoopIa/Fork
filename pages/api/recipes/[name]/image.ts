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
      // Find all images for this version and pick the most recent (highest timestamp)
      const versionImages = folderData
        .filter((file: any) => file.type === 'file' && file.name.startsWith(`v${version}-`))
        .sort((a: any, b: any) => {
          // Extract timestamp from filename (e.g., v1-1765771961985-image.jpg)
          const tsA = parseInt(a.name.match(/v\d+-(\d+)/)?.[1] || '0', 10)
          const tsB = parseInt(b.name.match(/v\d+-(\d+)/)?.[1] || '0', 10)
          return tsB - tsA // Most recent first
        })
      
      const imageFile = versionImages[0]
      
      if (imageFile) {
        // Determine content type from filename
        const ext = imageFile.name.split('.').pop()?.toLowerCase()
        const contentType = ext === 'png' ? 'image/png' 
          : ext === 'gif' ? 'image/gif'
          : ext === 'webp' ? 'image/webp'
          : 'image/jpeg'
        
        // For large files (>1MB), GitHub doesn't return content inline
        // We need to use the download_url with authentication
        if (imageFile.download_url) {
          // Fetch the image using the authenticated token
          const response = await fetch(imageFile.download_url, {
            headers: {
              'Authorization': `token ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3.raw',
            },
          })
          
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            
            res.setHeader('Content-Type', contentType)
            res.setHeader('Cache-Control', 'public, max-age=3600')
            return res.send(buffer)
          }
        }
        
        // Fallback: try to get content directly (for small files)
        try {
          const { data: fileData } = await octokit.repos.getContent({
            owner: username,
            repo: repoName,
            path: `${recipeName}/version-images/${imageFile.name}`,
          })
          
          if ('content' in fileData && fileData.content) {
            const buffer = Buffer.from(fileData.content, 'base64')
            res.setHeader('Content-Type', contentType)
            res.setHeader('Cache-Control', 'public, max-age=3600')
            return res.send(buffer)
          }
        } catch {
          // Content not available inline
        }
      }
    }
    
    return res.status(404).json({ error: 'Image not found' })
  } catch (error: any) {
    console.error('[Image] Error:', error.message)
    return res.status(404).json({ error: 'Image not found' })
  }
}

