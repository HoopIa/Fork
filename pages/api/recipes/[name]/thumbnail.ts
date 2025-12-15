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
  
  try {
    console.log(`[Thumbnail] Looking for images for recipe: ${recipeName}`)
    console.log(`[Thumbnail] Repo: ${username}/${repoName}`)
    
    // Try version-images folder first
    try {
      console.log(`[Thumbnail] Checking path: ${recipeName}/version-images`)
      const { data: folderData } = await octokit.repos.getContent({
        owner: username,
        repo: repoName,
        path: `${recipeName}/version-images`,
      })
      console.log(`[Thumbnail] Found folder with ${Array.isArray(folderData) ? folderData.length : 0} items`)
      
      if (Array.isArray(folderData) && folderData.length > 0) {
        // Sort by version number to get latest
        const imageFiles = folderData
          .filter((file: any) => file.type === 'file' && file.name.match(/^v\d+-/))
          .map((file: any) => {
            const versionMatch = file.name.match(/^v(\d+)-/)
            return {
              version: versionMatch ? parseInt(versionMatch[1], 10) : 0,
              name: file.name,
            }
          })
          .sort((a, b) => b.version - a.version)
        
        if (imageFiles.length > 0) {
          // Get the highest version
          const latestVersion = imageFiles[0].version
          
          // Find the most recent upload for this version (highest timestamp)
          const versionFiles = folderData
            .filter((file: any) => file.type === 'file' && file.name.startsWith(`v${latestVersion}-`))
            .sort((a: any, b: any) => {
              const tsA = parseInt(a.name.match(/v\d+-(\d+)/)?.[1] || '0', 10)
              const tsB = parseInt(b.name.match(/v\d+-(\d+)/)?.[1] || '0', 10)
              return tsB - tsA
            })
          
          const latestImage = versionFiles[0]
          
          if (latestImage) {
            const ext = latestImage.name.split('.').pop()?.toLowerCase()
            const contentType = ext === 'png' ? 'image/png' 
              : ext === 'gif' ? 'image/gif'
              : ext === 'webp' ? 'image/webp'
              : 'image/jpeg'
            
            // For large files, use download_url with auth
            if (latestImage.download_url) {
              const response = await fetch(latestImage.download_url, {
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
            
            // Fallback for small files
            try {
              const { data: fileData } = await octokit.repos.getContent({
                owner: username,
                repo: repoName,
                path: `${recipeName}/version-images/${latestImage.name}`,
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
      }
    } catch (err: any) {
      console.log(`[Thumbnail] No version-images folder: ${err.message}`)
    }
    
    // Fallback: try regular images folder
    try {
      const { data: imagesData } = await octokit.repos.getContent({
        owner: username,
        repo: repoName,
        path: `${recipeName}/images`,
      })
      
      if (Array.isArray(imagesData) && imagesData.length > 0) {
        const firstImage = imagesData.find((item: any) => item.type === 'file')
        
        if (firstImage) {
          const ext = firstImage.name.split('.').pop()?.toLowerCase()
          const contentType = ext === 'png' ? 'image/png' 
            : ext === 'gif' ? 'image/gif'
            : ext === 'webp' ? 'image/webp'
            : 'image/jpeg'
          
          // For large files, use download_url with auth
          if (firstImage.download_url) {
            const response = await fetch(firstImage.download_url, {
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
          
          // Fallback for small files
          try {
            const { data: fileData } = await octokit.repos.getContent({
              owner: username,
              repo: repoName,
              path: `${recipeName}/images/${firstImage.name}`,
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
    } catch {
      // No images folder
    }
    
    return res.status(404).json({ error: 'No thumbnail found' })
  } catch (error: any) {
    console.error('Error fetching thumbnail:', error.message)
    return res.status(404).json({ error: 'Thumbnail not found' })
  }
}

