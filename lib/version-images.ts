import { Octokit } from '@octokit/rest'

export interface VersionImage {
  sha: string
  version: number
  imagePath: string
  imageUrl: string
  uploadedAt: string
}

// Get version images metadata
export async function getVersionImages(
  octokit: Octokit,
  username: string,
  recipeName: string,
  repoName: string = 'recipes'
): Promise<VersionImage[]> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: `${recipeName}/.version-images.json`,
    })
    
    if ('content' in data && data.content) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8')
      return JSON.parse(content)
    }
  } catch {
    // File doesn't exist
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

// Upload version-specific image to GitHub
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
  // Store in version-images folder with version number prefix
  const imagePath = `${recipeName}/version-images/v${version}-${filename}`
  
  // Remove data URL prefix if present
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image
  
  // Upload the image
  await octokit.repos.createOrUpdateFileContents({
    owner: username,
    repo: repoName,
    path: imagePath,
    message: `Add image for ${recipeName} version ${version}`,
    content: base64Data,
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

