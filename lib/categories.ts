import { Octokit } from '@octokit/rest'

// Common recipe categories
export const RECIPE_CATEGORIES = [
  'Appetizers',
  'Soups & Stews',
  'Salads',
  'Main Dishes',
  'Pasta & Noodles',
  'Bread & Baked Goods',
  'Desserts',
  'Breakfast & Brunch',
  'Beverages',
  'Sauces & Condiments',
  'Snacks',
  'Side Dishes',
  'Other',
]

// Get category for a recipe
export async function getRecipeCategory(
  octokit: Octokit,
  username: string,
  recipeName: string,
  repoName: string = 'recipes'
): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: `${recipeName}/.category.json`,
    })
    
    if ('content' in data && data.content) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8')
      const categoryData = JSON.parse(content)
      return categoryData.category || null
    }
  } catch {
    // Category file doesn't exist
  }
  
  return null
}

// Save category for a recipe
export async function saveRecipeCategory(
  octokit: Octokit,
  username: string,
  recipeName: string,
  category: string,
  repoName: string = 'recipes'
): Promise<void> {
  const categoryPath = `${recipeName}/.category.json`
  
  // Get existing SHA if file exists
  let sha: string | undefined
  try {
    const { data } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: categoryPath,
    })
    if ('sha' in data) {
      sha = data.sha
    }
  } catch {
    // File doesn't exist
  }
  
  // Save category
  await octokit.repos.createOrUpdateFileContents({
    owner: username,
    repo: repoName,
    path: categoryPath,
    message: `Update category for ${recipeName}`,
    content: Buffer.from(JSON.stringify({ category }, null, 2)).toString('base64'),
    sha: sha,
  })
}

// Get the most recent version image for a recipe (thumbnail)
// Returns a proxy URL for private repo support
async function getRecipeThumbnail(
  octokit: Octokit,
  username: string,
  recipeName: string,
  repoName: string
): Promise<string | null> {
  // Try metadata file first
  try {
    const { data: versionImagesData } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: `${recipeName}/.version-images.json`,
    })
    
    if ('content' in versionImagesData && versionImagesData.content) {
      const content = Buffer.from(versionImagesData.content, 'base64').toString('utf-8')
      const allImages = JSON.parse(content) as Array<{
        sha: string
        version: number
        imagePath: string
        imageUrl: string
        uploadedAt?: string
      }>
      
      if (allImages.length > 0) {
        // Deduplicate: if multiple images for same version, keep most recent upload
        const imageMap = new Map<string, typeof allImages[0]>()
        
        // Sort by uploadedAt ascending so later entries overwrite earlier ones
        const sorted = [...allImages].sort((a, b) => 
          new Date(a.uploadedAt || 0).getTime() - new Date(b.uploadedAt || 0).getTime()
        )
        
        for (const img of sorted) {
          imageMap.set(img.sha, img)
        }
        
        // Get deduplicated images and sort by version (highest first)
        const deduplicated = Array.from(imageMap.values())
        deduplicated.sort((a, b) => b.version - a.version)
        
        // Return proxy URL for the most recent version
        if (deduplicated.length > 0) {
          const latestVersion = deduplicated[0].version
          return `/api/recipes/${encodeURIComponent(recipeName)}/image?version=${latestVersion}`
        }
      }
    }
  } catch {
    // No version images metadata
  }
  
  // Fallback: scan version-images folder directly
  try {
    const { data: folderData } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: `${recipeName}/version-images`,
    })
    
    if (Array.isArray(folderData) && folderData.length > 0) {
      // Sort by version number (extract from filename like "v1-image.jpg")
      const imageFiles = folderData
        .filter((item: any) => item.type === 'file' && item.name.match(/^v\d+-/))
        .map((item: any) => {
          const versionMatch = item.name.match(/^v(\d+)-/)
          return {
            version: versionMatch ? parseInt(versionMatch[1], 10) : 0,
          }
        })
        .sort((a, b) => b.version - a.version)
      
      if (imageFiles.length > 0) {
        // Return proxy URL
        return `/api/recipes/${encodeURIComponent(recipeName)}/image?version=${imageFiles[0].version}`
      }
    }
  } catch {
    // No version-images folder
  }
  
  return null
}

// Get all recipes with their categories and thumbnails
export async function getRecipesWithCategories(
  octokit: Octokit,
  username: string,
  repoName: string = 'recipes'
): Promise<Array<{ name: string; category: string | null; thumbnail: string | null }>> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: '',
    })
    
    if (Array.isArray(data)) {
      const recipes = data
        .filter(item => item.type === 'dir' && item.name !== '.git')
        .map(item => item.name)
      
      // Get categories and thumbnails for all recipes
      const recipesWithCategories = await Promise.all(
        recipes.map(async (recipeName) => {
          const [category, thumbnail] = await Promise.all([
            getRecipeCategory(octokit, username, recipeName, repoName),
            getRecipeThumbnail(octokit, username, recipeName, repoName),
          ])
          return { name: recipeName, category, thumbnail }
        })
      )
      
      return recipesWithCategories
    }
    return []
  } catch (error) {
    return []
  }
}

