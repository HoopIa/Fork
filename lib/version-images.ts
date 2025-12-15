import { Octokit } from '@octokit/rest'

export interface VersionImage {
  sha: string
  version: number
  imagePath: string
  imageUrl: string
  uploadedAt: string
}

// Get version images metadata (deduplicated, most recent upload wins)
// If refreshUrls is true, verifies images exist and gets fresh URLs
export async function getVersionImages(
  octokit: Octokit,
  username: string,
  recipeName: string,
  repoName: string = 'recipes',
  refreshUrls: boolean = false
): Promise<VersionImage[]> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: `${recipeName}/.version-images.json`,
    })
    
    if ('content' in data && data.content) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8')
      const allImages: VersionImage[] = JSON.parse(content)
      
      // Deduplicate: if multiple images for same version/sha, keep most recent
      const imageMap = new Map<string, VersionImage>()
      
      // Sort by uploadedAt ascending so later entries overwrite earlier ones
      const sorted = [...allImages].sort((a, b) => 
        new Date(a.uploadedAt || 0).getTime() - new Date(b.uploadedAt || 0).getTime()
      )
      
      for (const img of sorted) {
        // Key by SHA to ensure uniqueness per version commit
        imageMap.set(img.sha, img)
      }
      
      // Convert back to array and sort by version (newest version first)
      let deduplicated = Array.from(imageMap.values())
      deduplicated.sort((a, b) => b.version - a.version)
      
      // Optionally refresh URLs by checking if images still exist
      if (refreshUrls) {
        deduplicated = await Promise.all(
          deduplicated.map(async (img) => {
            try {
              const { data: fileData } = await octokit.repos.getContent({
                owner: username,
                repo: repoName,
                path: img.imagePath,
              })
              if ('download_url' in fileData && fileData.download_url) {
                return { ...img, imageUrl: fileData.download_url }
              }
            } catch {
              // Image file doesn't exist anymore
            }
            return img
          })
        )
      }
      
      return deduplicated
    }
  } catch {
    // File doesn't exist
  }
  
  // Fallback: scan the version-images folder directly
  try {
    const { data: folderData } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: `${recipeName}/version-images`,
    })
    
    if (Array.isArray(folderData)) {
      const images: VersionImage[] = []
      for (const file of folderData) {
        if (file.type === 'file' && file.name.match(/^v\d+-/)) {
          // Extract version from filename (e.g., "v1-image.jpg" -> 1)
          const versionMatch = file.name.match(/^v(\d+)-/)
          if (versionMatch) {
            images.push({
              sha: file.sha,
              version: parseInt(versionMatch[1], 10),
              imagePath: `${recipeName}/version-images/${file.name}`,
              imageUrl: file.download_url || '',
              uploadedAt: new Date().toISOString(),
            })
          }
        }
      }
      
      // Sort by version (newest first)
      images.sort((a, b) => b.version - a.version)
      return images
    }
  } catch {
    // No version-images folder
  }
  
  return []
}

// Save version image metadata
export async function saveVersionImage(
  octokit: Octokit,
  username: string,
  recipeName: string,
  sha: string,
  version: number,
  imagePath: string,
  imageUrl: string,
  repoName: string = 'recipes'
): Promise<void> {
  const metadataPath = `${recipeName}/.version-images.json`
  
  // Get existing metadata
  let existingImages: VersionImage[] = []
  let fileSha: string | undefined
  
  try {
    const { data } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: metadataPath,
    })
    
    if ('content' in data && data.content) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8')
      existingImages = JSON.parse(content)
    }
    if ('sha' in data) {
      fileSha = data.sha
    }
  } catch {
    // File doesn't exist yet
  }
  
  // Update or add image for this version
  const existingIndex = existingImages.findIndex(img => img.sha === sha)
  const newImage: VersionImage = {
    sha,
    version,
    imagePath,
    imageUrl,
    uploadedAt: new Date().toISOString(),
  }
  
  if (existingIndex >= 0) {
    existingImages[existingIndex] = newImage
  } else {
    existingImages.push(newImage)
  }
  
  // Sort by version number (newest first)
  existingImages.sort((a, b) => b.version - a.version)
  
  // Save metadata
  await octokit.repos.createOrUpdateFileContents({
    owner: username,
    repo: repoName,
    path: metadataPath,
    message: `Add image for version ${version}`,
    content: Buffer.from(JSON.stringify(existingImages, null, 2)).toString('base64'),
    sha: fileSha,
  })
}

// Upload version-specific image to GitHub (replaces existing image for that version)
export async function uploadVersionImage(
  octokit: Octokit,
  username: string,
  recipeName: string,
  sha: string,
  version: number,
  base64Image: string,
  filename: string,
  repoName: string = 'recipes'
): Promise<{ imagePath: string; imageUrl: string }> {
  // Get file extension from filename
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
  
  // Use consistent filename so it replaces the old image
  const imagePath = `${recipeName}/version-images/v${version}-image.${ext}`
  
  // Remove data URL prefix if present
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image
  
  // Check if there's an existing image for this version and delete it
  const existingImages = await getVersionImages(octokit, username, recipeName, repoName)
  const existingImage = existingImages.find(img => img.sha === sha)
  
  if (existingImage && existingImage.imagePath !== imagePath) {
    // Delete the old image file
    try {
      const { data: oldFile } = await octokit.repos.getContent({
        owner: username,
        repo: repoName,
        path: existingImage.imagePath,
      })
      
      if ('sha' in oldFile) {
        await octokit.repos.deleteFile({
          owner: username,
          repo: repoName,
          path: existingImage.imagePath,
          message: `Replace image for ${recipeName} version ${version}`,
          sha: oldFile.sha,
        })
      }
    } catch {
      // Old file doesn't exist, continue
    }
  }
  
  // Check if file already exists (for update with same extension)
  let existingFileSha: string | undefined
  try {
    const { data: existingFile } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: imagePath,
    })
    if ('sha' in existingFile) {
      existingFileSha = existingFile.sha
    }
  } catch {
    // File doesn't exist
  }
  
  // Upload the image (create or update)
  await octokit.repos.createOrUpdateFileContents({
    owner: username,
    repo: repoName,
    path: imagePath,
    message: `${existingFileSha ? 'Update' : 'Add'} image for ${recipeName} version ${version}`,
    content: base64Data,
    sha: existingFileSha,
  })
  
  // Get the download URL
  const { data } = await octokit.repos.getContent({
    owner: username,
    repo: repoName,
    path: imagePath,
  })
  
  const imageUrl = 'download_url' in data ? data.download_url || '' : ''
  
  // Save metadata
  await saveVersionImage(octokit, username, recipeName, sha, version, imagePath, imageUrl, repoName)
  
  return { imagePath, imageUrl }
}

// Get the most recent version image (for hero display)
export async function getLatestVersionImage(
  octokit: Octokit,
  username: string,
  recipeName: string,
  repoName: string = 'recipes'
): Promise<string | null> {
  const images = await getVersionImages(octokit, username, recipeName, repoName)
  
  if (images.length > 0) {
    // Images are sorted by version (newest first)
    return images[0].imageUrl
  }
  
  return null
}

// Get all version images sorted by version (newest first: V3, V2, V1)
export async function getAllVersionImages(
  octokit: Octokit,
  username: string,
  recipeName: string,
  repoName: string = 'recipes'
): Promise<{ version: number; imageUrl: string }[]> {
  // Always refresh URLs for display to ensure they're valid
  const images = await getVersionImages(octokit, username, recipeName, repoName, true)
  
  // Already sorted by version (newest first)
  return images
    .filter(img => img.imageUrl) // Only return images with valid URLs
    .map(img => ({
      version: img.version,
      imageUrl: img.imageUrl,
    }))
}

