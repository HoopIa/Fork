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

// Check if a recipe has any images (version-images or legacy images folder)
async function hasRecipeImages(
  octokit: Octokit,
  username: string,
  recipeName: string,
  repoName: string
): Promise<boolean> {
  // Check version-images folder
  try {
    const { data: folderData } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: `${recipeName}/version-images`,
    })
    
    if (Array.isArray(folderData) && folderData.length > 0) {
      return folderData.some((file: any) => 
        file.type === 'file' && file.name.match(/^v\d+-/)
      )
    }
  } catch {
    // No version-images folder
  }
  
  // Check legacy images folder
  try {
    const { data: imagesData } = await octokit.repos.getContent({
      owner: username,
      repo: repoName,
      path: `${recipeName}/images`,
    })
    
    if (Array.isArray(imagesData) && imagesData.length > 0) {
      return imagesData.some((item: any) => item.type === 'file')
    }
  } catch {
    // No images folder
  }
  
  return false
}

// Get the thumbnail URL for a recipe (uses proxy API)
async function getRecipeThumbnail(
  octokit: Octokit,
  username: string,
  recipeName: string,
  repoName: string
): Promise<string | null> {
  const hasImages = await hasRecipeImages(octokit, username, recipeName, repoName)
  
  if (hasImages) {
    // Return proxy URL - the thumbnail API handles finding the right image
    return `/api/recipes/${encodeURIComponent(recipeName)}/thumbnail`
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

